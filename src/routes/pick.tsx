import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getPlayerByToken, submitPick } from "@/lib/oneshot.functions";
import { getFixtures, type Fixture } from "@/lib/fixtures";
import { Card, Eyebrow, Logo, Shell, StickyCTA, Btn } from "@/components/oneshot/ui";
import { cn } from "@/lib/utils";

type Search = { token: string };

export const Route = createFileRoute("/pick")({
  validateSearch: (s: Record<string, unknown>): Search => ({ token: String(s.token ?? "") }),
  component: Pick,
});

function Pick() {
  const { token } = Route.useSearch();
  const nav = useNavigate();
  const fetchPlayer = useServerFn(getPlayerByToken);
  const submit = useServerFn(submitPick);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["player", token],
    queryFn: () => fetchPlayer({ data: { token } }),
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentWeek = data?.competition?.current_week ?? 1;
  const fixtures = useMemo(() => getFixtures(currentWeek), [currentWeek]);
  const usedTeams = useMemo(
    () => new Set((data?.picks ?? []).map((p) => p.team)),
    [data?.picks],
  );
  const alreadyPickedThisWeek = useMemo(
    () => (data?.picks ?? []).find((p) => p.week === currentWeek),
    [data?.picks, currentWeek],
  );

  if (isLoading) {
    return (
      <Shell>
        <Logo />
        <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  if (!data?.player) {
    return (
      <Shell>
        <Logo />
        <Card className="mt-10">
          <h1 className="display text-2xl">Invalid link</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This pick link isn't recognised. Ask your admin for a new one.
          </p>
        </Card>
      </Shell>
    );
  }

  async function onLock() {
    if (!selected || !data?.player || !data.competition) return;
    setSubmitting(true);
    setError(null);
    try {
      await submit({
        data: {
          playerId: data.player.id,
          competitionId: data.competition.id,
          week: currentWeek,
          team: selected,
        },
      });
      nav({ to: "/confirmed", search: { token, team: selected, c: data.competition.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      await refetch();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Shell>
      <header className="flex items-center justify-between">
        <Logo />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Hi, {data.player.full_name.split(" ")[0]}
        </span>
      </header>

      <div className="mt-8">
        <Eyebrow>Gameweek {currentWeek}</Eyebrow>
        <h1 className="display mt-2 text-4xl">Pick your team</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One pick. Can't reuse teams. Greyed = already used.
        </p>
      </div>

      {alreadyPickedThisWeek && (
        <Card className="mt-6 border-primary/40">
          <Eyebrow>Locked in</Eyebrow>
          <p className="mt-1 display text-2xl">{alreadyPickedThisWeek.team}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            You've already picked this week. Come back next gameweek.
          </p>
        </Card>
      )}

      <div className="mt-6 space-y-3">
        {fixtures.map((f, i) => (
          <FixtureCard
            key={i}
            fixture={f}
            selected={selected}
            onSelect={alreadyPickedThisWeek ? () => {} : setSelected}
            usedTeams={usedTeams}
            disabledAll={!!alreadyPickedThisWeek}
          />
        ))}
      </div>

      {error && (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      )}

      {!alreadyPickedThisWeek && (
        <StickyCTA>
          <Btn disabled={!selected || submitting} onClick={onLock}>
            {selected ? `Lock in ${selected} →` : "Select a team"}
          </Btn>
        </StickyCTA>
      )}
    </Shell>
  );
}

function FixtureCard({
  fixture,
  selected,
  onSelect,
  usedTeams,
  disabledAll,
}: {
  fixture: Fixture;
  selected: string | null;
  onSelect: (t: string) => void;
  usedTeams: Set<string>;
  disabledAll: boolean;
}) {
  const homeUsed = usedTeams.has(fixture.home);
  const awayUsed = usedTeams.has(fixture.away);
  const bothUsed = homeUsed && awayUsed;

  return (
    <Card className={cn("p-3", bothUsed && "opacity-50")}>
      {bothUsed && (
        <div className="mb-2 text-center text-xs uppercase tracking-widest text-muted-foreground">
          Both teams used
        </div>
      )}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamBtn
          name={fixture.home}
          badge={fixture.homeBadge}
          used={homeUsed}
          selected={selected === fixture.home}
          onClick={() => !homeUsed && !disabledAll && onSelect(fixture.home)}
        />
        <span className="display text-sm text-primary">vs</span>
        <TeamBtn
          name={fixture.away}
          badge={fixture.awayBadge}
          used={awayUsed}
          selected={selected === fixture.away}
          onClick={() => !awayUsed && !disabledAll && onSelect(fixture.away)}
        />
      </div>
    </Card>
  );
}

function TeamBtn({
  name,
  badge,
  used,
  selected,
  onClick,
}: {
  name: string;
  badge: string;
  used: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={used}
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition",
        "border-[color:var(--border)] bg-[color:var(--surface-elevated)]",
        selected && "border-primary ring-2 ring-primary",
        used && "cursor-not-allowed opacity-40",
        !used && !selected && "hover:border-primary/60",
      )}
    >
      <img src={badge} alt={name} className="h-10 w-10 object-contain" />
      <span className="text-[11px] font-semibold leading-tight">{name}</span>
    </button>
  );
}
