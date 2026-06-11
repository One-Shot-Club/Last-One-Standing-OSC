import { useEffect, useMemo, useState } from "react";
import { Btn, Card, Eyebrow, Shell } from "@/components/oneshot/ui";
import { ClubHeader } from "@/components/oneshot/ClubHeader";
import { cn } from "@/lib/utils";

export interface NextGameweekData {
  player: { id: string; full_name: string; alive: boolean; email: string };
  competition: any;
  picks: Array<{ id: string; week: number; team: string; result?: string | null }>;
  gameweek: {
    id: string;
    week_number: number;
    week_label: string;
    deadline_at: string;
  } | null;
  fixtures: Array<{ id: string; home_team: string; away_team: string }>;
  badges: Record<string, string | null>;
  survivalStats: {
    total: number;
    alive: number;
    eliminated: number;
    alivePct: number;
    eliminatedPct: number;
  };
  topPicksLastWeek: Array<{ team: string; count: number }>;
  lastWeekLabel: string | null;
  preview?: boolean;
}

function useCountdown(target: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return { label: "—", ms: 0, locked: false, urgent: false };
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return { label: "Picks locked", ms: 0, locked: true, urgent: false };
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const label =
    d > 0 ? `${d}d ${h}h ${m}m ${String(s).padStart(2, "0")}s`
    : h > 0 ? `${h}h ${m}m ${String(s).padStart(2, "0")}s`
    : `${m}m ${String(s).padStart(2, "0")}s`;
  const urgent = ms <= 60 * 60 * 1000; // last hour
  return { label, ms, locked: false, urgent };
}

interface Props {
  data: NextGameweekData;
  /** When provided, lock-in is live. Omit for preview mode. */
  onSubmit?: (team: string) => Promise<void>;
  submitting?: boolean;
  submitError?: string | null;
}

export function NextGameweekView({ data, onSubmit, submitting, submitError }: Props) {
  const { player, competition, gameweek, fixtures, badges, picks, survivalStats, topPicksLastWeek, lastWeekLabel, preview } = data;
  const cd = useCountdown(gameweek?.deadline_at ?? null);
  const [selected, setSelected] = useState<string | null>(null);

  const usedTeams = useMemo(
    () => new Set((picks ?? []).map((p) => p.team)),
    [picks],
  );

  const alreadyPickedThisWeek = gameweek
    ? picks.some((p) => p.week === gameweek.week_number)
    : false;

  if (!player.alive) {
    return (
      <Shell>
        <ClubHeader clubName={competition?.club_name ?? "Last Man Standing"} />
        <div className="mt-10 text-center">
          <h1 className="display text-3xl">You've been eliminated</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Thanks for playing, {player.full_name.split(" ")[0]}. Watch out for the next competition.
          </p>
        </div>
      </Shell>
    );
  }

  if (!gameweek) {
    return (
      <Shell>
        <ClubHeader clubName={competition?.club_name ?? "Last Man Standing"} />
        <div className="mt-10 text-center">
          <h1 className="display text-2xl">No upcoming gameweek yet</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Sit tight — fixtures will appear here once the admin sets them up.
          </p>
        </div>
      </Shell>
    );
  }

  const firstName = player.full_name.split(" ")[0];
  const deadlineFmt = new Date(gameweek.deadline_at).toLocaleString("en-IE", {
    timeZone: "Europe/Dublin",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  async function handleSubmit() {
    if (!selected || !onSubmit) return;
    await onSubmit(selected);
    setSelected(null);
  }

  return (
    <Shell>
      {preview && (
        <div className="mb-3 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-center text-[11px] uppercase tracking-widest text-primary">
          Preview mode — synthetic data, no picks will be saved
        </div>
      )}

      <ClubHeader clubName={competition?.club_name ?? "Last Man Standing"} />

      {/* Hero: through to GWx */}
      <div className="mt-6 text-center">
        <Eyebrow>Through to {gameweek.week_label}</Eyebrow>
        <h1 className="display mt-1 text-3xl">You're through, {firstName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lastWeekLabel ? `Survived ${lastWeekLabel}.` : "Welcome to the next round."}{" "}
          Make your {gameweek.week_label} pick before the deadline.
        </p>
      </div>

      {/* Week + deadline + countdown */}
      <Card className="mt-6 text-center">
        <Eyebrow>{gameweek.week_label} · Deadline</Eyebrow>
        <p className="mt-1 text-xs text-muted-foreground">{deadlineFmt}</p>
        <h2
          className={cn(
            "display mt-3 text-4xl tabular-nums transition-colors",
            cd.urgent && !cd.locked && "animate-pulse text-destructive",
            cd.locked && "text-muted-foreground",
          )}
        >
          {cd.label}
        </h2>
      </Card>

      {alreadyPickedThisWeek && (
        <Card className="mt-4 border-primary/40">
          <p className="text-sm">
            Your pick for {gameweek.week_label}:{" "}
            <span className="font-semibold text-primary">
              {picks.find((p) => p.week === gameweek.week_number)?.team}
            </span>
          </p>
        </Card>
      )}

      {/* Your picks so far */}
      <section className="mt-8">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Your picks so far</h3>
        <Card className="mt-2 p-3">
          {picks.length === 0 && (
            <p className="text-xs text-muted-foreground">No picks yet.</p>
          )}
          <ul className="divide-y divide-[color:var(--border)]">
            {picks.map((p) => {
              const badge = badges[p.team];
              return (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-muted-foreground">GW{p.week}</span>
                  <span className="flex items-center gap-2">
                    {badge ? (
                      <img src={badge} alt="" className="h-5 w-5 rounded" />
                    ) : (
                      <span className="inline-block h-5 w-5 rounded bg-muted" />
                    )}
                    <span>{p.team}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      {/* Fixtures + pick */}
      {!alreadyPickedThisWeek && (
        <section className="mt-8">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground">
            {gameweek.week_label} fixtures
          </h3>
          <div className="mt-2 space-y-2">
            {fixtures.length === 0 && (
              <p className="text-sm text-muted-foreground">Fixtures not loaded yet.</p>
            )}
            {fixtures.map((f) => (
              <Card key={f.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <TeamButton
                    name={f.home_team}
                    badge={badges[f.home_team]}
                    used={usedTeams.has(f.home_team)}
                    selected={selected === f.home_team}
                    disabled={cd.locked || !!preview}
                    onClick={() => setSelected(f.home_team)}
                  />
                  <span className="text-xs text-muted-foreground">vs</span>
                  <TeamButton
                    name={f.away_team}
                    badge={badges[f.away_team]}
                    used={usedTeams.has(f.away_team)}
                    selected={selected === f.away_team}
                    disabled={cd.locked || !!preview}
                    onClick={() => setSelected(f.away_team)}
                  />
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-6">
            <Btn
              disabled={!selected || cd.locked || !!submitting || preview}
              onClick={handleSubmit}
            >
              {preview
                ? "Lock-in disabled in preview"
                : cd.locked
                  ? "Picks locked"
                  : submitting
                    ? "Saving…"
                    : `Lock in ${selected ?? "a team"} →`}
            </Btn>
            {submitError && <p className="mt-3 text-sm text-destructive">{submitError}</p>}
          </div>
        </section>
      )}

      {/* Survival stats */}
      <section className="mt-8">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground">Survival</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Card className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Still alive</p>
            <p className="display mt-1 text-2xl text-primary">{survivalStats.alive}</p>
            <p className="text-[11px] text-muted-foreground">{survivalStats.alivePct}% of {survivalStats.total}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Eliminated</p>
            <p className="display mt-1 text-2xl text-destructive">{survivalStats.eliminated}</p>
            <p className="text-[11px] text-muted-foreground">{survivalStats.eliminatedPct}% of {survivalStats.total}</p>
          </Card>
        </div>
      </section>

      {/* Top 3 picks last week */}
      {topPicksLastWeek.length > 0 && (
        <section className="mt-6">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground">
            Top picks {lastWeekLabel ? `· ${lastWeekLabel}` : "last week"}
          </h3>
          <Card className="mt-2 p-3">
            <ul className="flex flex-wrap gap-2">
              {topPicksLastWeek.map((t, i) => (
                <li
                  key={t.team}
                  className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-card px-3 py-1 text-xs"
                >
                  <span className="font-bold text-primary">#{i + 1}</span>
                  {badges[t.team] && (
                    <img src={badges[t.team] ?? undefined} alt="" className="h-4 w-4 rounded" />
                  )}
                  <span>{t.team}</span>
                  <span className="text-muted-foreground">· {t.count}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </Shell>
  );
}

function TeamButton({
  name, badge, used, selected, disabled, onClick,
}: {
  name: string;
  badge: string | null | undefined;
  used: boolean;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const isDisabled = used || disabled;
  return (
    <button
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={cn(
        "flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-[color:var(--border)] bg-card text-foreground",
        used && "opacity-40 line-through",
        disabled && !used && "opacity-50",
      )}
    >
      {badge ? (
        <img src={badge} alt="" className="h-6 w-6 rounded" />
      ) : (
        <span className="inline-block h-6 w-6 rounded bg-muted" />
      )}
      <span className="truncate">{name}</span>
    </button>
  );
}
