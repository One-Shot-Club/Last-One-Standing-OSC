import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getPickContext, submitPickV2 } from "@/lib/gameweeks.functions";
import { Btn, Card, Eyebrow, Shell } from "@/components/oneshot/ui";
import { ClubHeader } from "@/components/oneshot/ClubHeader";
import { cn } from "@/lib/utils";

type Search = { token: string };

export const Route = createFileRoute("/pick")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: String(s.token ?? ""),
  }),
  component: Pick,
});

function useCountdown(target: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return { label: "—", ms: 0, locked: false };
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return { label: "Picks locked", ms: 0, locked: true };
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const label = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  return { label, ms, locked: false };
}

function Pick() {
  const { token } = Route.useSearch();
  const fetchCtx = useServerFn(getPickContext);
  const submit = useServerFn(submitPickV2);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pick-context", token],
    queryFn: () => fetchCtx({ data: { token } }),
    enabled: !!token,
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cd = useCountdown(data?.gameweek?.deadline_at ?? null);

  const usedTeams = useMemo(
    () => new Set((data?.picks ?? []).map((p: any) => p.team)),
    [data],
  );

  const teamsInWeek = useMemo(() => {
    const t = new Set<string>();
    for (const f of data?.fixtures ?? []) {
      t.add(f.home_team);
      t.add(f.away_team);
    }
    return Array.from(t).sort();
  }, [data]);

  if (!token) {
    return (
      <Shell>
        <p className="mt-10 text-sm text-muted-foreground">Missing magic link token.</p>
      </Shell>
    );
  }

  if (isLoading || !data) {
    return (
      <Shell>
        <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  if (data === null) {
    return (
      <Shell>
        <p className="mt-10 text-sm text-muted-foreground">Invalid or expired link.</p>
      </Shell>
    );
  }

  const { player, competition, gameweek, fixtures, badges } = data;

  if (!player.alive) {
    return (
      <Shell>
        <ClubHeader clubName={competition?.club_name ?? "Killeshin GAA"} logoUrl={competition?.club_logo_url} />
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
        <ClubHeader clubName={competition?.club_name ?? "Killeshin GAA"} logoUrl={competition?.club_logo_url} />
        <div className="mt-10 text-center">
          <h1 className="display text-2xl">No upcoming gameweek yet</h1>
          <p className="mt-3 text-sm text-muted-foreground">Sit tight — fixtures will appear here once the admin sets them up.</p>
        </div>
      </Shell>
    );
  }

  const alreadyPickedThisWeek = (data.picks ?? []).some(
    (p: any) => p.week === gameweek.week_number,
  );

  async function handleSubmit() {
    if (!selected || !gameweek) return;
    setBusy(true);
    setError(null);
    try {
      await submit({ data: { token, gameweekId: gameweek.id, team: selected } });
      await qc.invalidateQueries({ queryKey: ["pick-context", token] });
      await refetch();
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <ClubHeader clubName={competition?.club_name ?? "Killeshin GAA"} logoUrl={competition?.club_logo_url} />

      <div className="mt-6">
        <Eyebrow>{gameweek.week_label} · deadline</Eyebrow>
        <h1 className="display mt-1 text-3xl">{cd.label}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Locks {new Date(gameweek.deadline_at).toLocaleString("en-IE", { timeZone: "Europe/Dublin" })}
        </p>
      </div>

      {alreadyPickedThisWeek && (
        <Card className="mt-4 border-primary/40">
          <p className="text-sm">
            Your pick for {gameweek.week_label}:{" "}
            <span className="font-semibold text-primary">
              {(data.picks ?? []).find((p: any) => p.week === gameweek.week_number)?.team}
            </span>
          </p>
        </Card>
      )}

      {!alreadyPickedThisWeek && (
        <>
          <h2 className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">Fixtures</h2>
          <div className="mt-2 space-y-2">
            {fixtures.length === 0 && (
              <p className="text-sm text-muted-foreground">Fixtures not loaded yet.</p>
            )}
            {fixtures.map((f: any) => (
              <Card key={f.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <TeamButton
                    name={f.home_team}
                    badge={badges[f.home_team]}
                    used={usedTeams.has(f.home_team)}
                    selected={selected === f.home_team}
                    disabled={cd.locked}
                    onClick={() => setSelected(f.home_team)}
                  />
                  <span className="text-xs text-muted-foreground">vs</span>
                  <TeamButton
                    name={f.away_team}
                    badge={badges[f.away_team]}
                    used={usedTeams.has(f.away_team)}
                    selected={selected === f.away_team}
                    disabled={cd.locked}
                    onClick={() => setSelected(f.away_team)}
                  />
                </div>
              </Card>
            ))}

            {/* Teams not in a fixture row (manual fallback) */}
            {teamsInWeek.length === 0 && (
              <p className="text-xs text-muted-foreground">No teams to choose from yet.</p>
            )}
          </div>

          <div className="mt-6">
            <Btn disabled={!selected || cd.locked || busy} onClick={handleSubmit}>
              {cd.locked ? "Picks locked" : busy ? "Saving…" : `Lock in ${selected ?? "a team"} →`}
            </Btn>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </div>
        </>
      )}

      <h2 className="mt-8 text-xs uppercase tracking-widest text-muted-foreground">
        Your picks so far
      </h2>
      <div className="mt-2 space-y-1">
        {(data.picks ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">No picks yet.</p>
        )}
        {(data.picks ?? []).map((p: any) => (
          <div key={p.id} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">GW{p.week}</span>
            <span>{p.team}</span>
          </div>
        ))}
      </div>
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
