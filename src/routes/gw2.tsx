import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getGw2Context, submitGw2Pick } from "@/lib/gameweeks.functions";
import { getFixtures, type Fixture } from "@/lib/fixtures";
import { Btn, Card, Eyebrow, Shell, StickyCTA } from "@/components/oneshot/ui";
import { ClubHeader } from "@/components/oneshot/ClubHeader";
import { cn } from "@/lib/utils";

type Search = { token: string };

export const Route = createFileRoute("/gw2")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: String(s.token ?? ""),
  }),
  component: Gw2,
});

function useCountdown(target: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return { label: "—", locked: false };
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return { label: "Picks locked", locked: true };
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const label = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
  return { label, locked: false };
}

function Gw2() {
  const { token } = Route.useSearch();
  const fetchCtx = useServerFn(getGw2Context);
  const submit = useServerFn(submitGw2Pick);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["gw2-context", token],
    queryFn: () => fetchCtx({ data: { token } }),
    enabled: !!token,
  });

  const fixtures = getFixtures(2);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cd = useCountdown(data?.gameweek?.deadline_at ?? null);

  const usedTeams = useMemo(
    () => new Set((data?.picks ?? []).map((p: any) => p.team)),
    [data],
  );

  if (!token) {
    return (
      <Shell>
        <p className="mt-10 text-sm text-muted-foreground">Missing magic link token.</p>
      </Shell>
    );
  }

  if (isLoading) {
    return (
      <Shell>
        <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <p className="mt-10 text-sm text-muted-foreground">Invalid or expired link.</p>
      </Shell>
    );
  }

  const { player, competition, gameweek } = data;

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

  const alreadyPickedThisWeek = (data.picks ?? []).some((p: any) => p.week === 2);
  const pickedTeam = (data.picks ?? []).find((p: any) => p.week === 2)?.team;

  async function handleSubmit() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await submit({ data: { token, team: selected } });
      await qc.invalidateQueries({ queryKey: ["gw2-context", token] });
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

      <div className="mt-8">
        <Eyebrow>Gameweek 2 · deadline</Eyebrow>
        <h1 className="display mt-2 text-3xl">{cd.label}</h1>
        {gameweek?.deadline_at && (
          <p className="mt-1 text-xs text-muted-foreground">
            Locks {new Date(gameweek.deadline_at).toLocaleString("en-IE", { timeZone: "Europe/Dublin" })}
          </p>
        )}
      </div>

      {alreadyPickedThisWeek && (
        <Card className="mt-4 border-primary/40">
          <p className="text-sm">
            Your pick for Gameweek 2:{" "}
            <span className="font-semibold text-primary">{pickedTeam}</span>
          </p>
        </Card>
      )}

      <div className="mt-8">
        <Eyebrow>Gameweek 2 fixtures</Eyebrow>
        <h2 className="display mt-2 text-2xl">Make your pick</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap the team you back to win. Teams you've already used are greyed out.
        </p>
      </div>

      <div className="mt-3 space-y-1.5">
        {fixtures.map((f, i) => (
          <FixtureCard
            key={i}
            fixture={f}
            selected={selected}
            usedTeams={usedTeams}
            disabled={cd.locked || alreadyPickedThisWeek}
            onSelect={setSelected}
          />
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

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

      {!alreadyPickedThisWeek && (
        <StickyCTA>
          <Btn disabled={!selected || cd.locked || busy} onClick={handleSubmit}>
            {cd.locked
              ? "Picks locked"
              : busy
              ? "Saving…"
              : selected
              ? `Lock in ${selected} →`
              : "Select a team"}
          </Btn>
        </StickyCTA>
      )}
    </Shell>
  );
}

function FixtureCard({
  fixture,
  selected,
  usedTeams,
  disabled,
  onSelect,
}: {
  fixture: Fixture;
  selected: string | null;
  usedTeams: Set<string>;
  disabled: boolean;
  onSelect: (t: string) => void;
}) {
  return (
    <Card className="p-1.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
        <TeamBtn
          name={fixture.home}
          badge={fixture.homeBadge}
          selected={selected === fixture.home}
          used={usedTeams.has(fixture.home)}
          disabled={disabled}
          onClick={() => onSelect(fixture.home)}
        />
        <span className="display px-1 text-[10px] text-primary">vs</span>
        <TeamBtn
          name={fixture.away}
          badge={fixture.awayBadge}
          selected={selected === fixture.away}
          used={usedTeams.has(fixture.away)}
          disabled={disabled}
          onClick={() => onSelect(fixture.away)}
        />
      </div>
    </Card>
  );
}

function TeamBtn({
  name,
  badge,
  selected,
  used,
  disabled,
  onClick,
}: {
  name: string;
  badge: string;
  selected: boolean;
  used: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const isDisabled = used || disabled;
  return (
    <button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={cn(
        "flex items-center gap-2 rounded-md border px-2 py-1 text-center transition",
        "border-[color:var(--border)] bg-[color:var(--surface-elevated)]",
        selected ? "border-primary ring-1 ring-primary" : "hover:border-primary/60",
        used && "opacity-40 line-through cursor-not-allowed",
        disabled && !used && "opacity-60 cursor-not-allowed",
      )}
    >
      <img src={badge} alt={name} className="h-5 w-5 object-contain" />
      <span className="text-[10px] font-semibold leading-tight">{name}</span>
    </button>
  );
}
