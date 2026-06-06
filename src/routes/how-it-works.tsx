import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getFixtures, type Fixture } from "@/lib/fixtures";
import { Btn, Card, Eyebrow, Shell, StickyCTA } from "@/components/oneshot/ui";
import { ClubHeader } from "@/components/oneshot/ClubHeader";
import { cn } from "@/lib/utils";

type Search = { c: string; n: string; e: string; p: string };

export const Route = createFileRoute("/how-it-works")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    c: String(s.c ?? ""),
    n: String(s.n ?? ""),
    e: String(s.e ?? ""),
    p: String(s.p ?? ""),
  }),
  component: HowItWorks,
});

const RULES = [
  "Pick one Premier League team each gameweek.",
  "If they win, you survive to next week. Lose/Draw = Elimination.",
  "You can't reuse a team for the rest of the comp.",
  "If you forget to make your pick in any given GameWeek, you will automatically be assigned to the 1st team available to you alphabetically.",
  "Last person standing wins the pot.",
];

function HowItWorks() {
  const { c, n, e, p } = Route.useSearch();
  const nav = useNavigate();
  const fixtures = getFixtures(1);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Shell>
      <ClubHeader clubName="Killeshin GAA" />

      <div className="mt-8">
        <Eyebrow>How it works</Eyebrow>
        <h1 className="display mt-2 text-3xl">The rules</h1>
        <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
          {RULES.map((r, i) => (
            <li key={i}>
              <span className="text-primary mr-2">{i + 1}.</span>
              {r}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8">
        <Eyebrow>Gameweek 1 fixtures</Eyebrow>
        <h2 className="display mt-2 text-2xl">Make your pick</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap the team you back to win.
        </p>
      </div>

      <div className="mt-3 space-y-1.5">
        {fixtures.map((f, i) => (
          <FixtureCard
            key={i}
            fixture={f}
            selected={selected}
            onSelect={setSelected}
          />
        ))}
      </div>

      <StickyCTA>
        <Btn
          disabled={!selected}
          onClick={() =>
            nav({
              to: "/pay",
              search: { c, n, e, p, t: selected! },
            })
          }
        >
          {selected ? `Confirm ${selected} — Pay Entry Fee →` : "Select a team"}
        </Btn>
      </StickyCTA>
    </Shell>
  );
}

function FixtureCard({
  fixture,
  selected,
  onSelect,
}: {
  fixture: Fixture;
  selected: string | null;
  onSelect: (t: string) => void;
}) {
  return (
    <Card className="p-1.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
        <TeamBtn
          name={fixture.home}
          badge={fixture.homeBadge}
          selected={selected === fixture.home}
          onClick={() => onSelect(fixture.home)}
        />
        <span className="display px-1 text-[10px] text-primary">vs</span>
        <TeamBtn
          name={fixture.away}
          badge={fixture.awayBadge}
          selected={selected === fixture.away}
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
  onClick,
}: {
  name: string;
  badge: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md border px-2 py-1 text-center transition",
        "border-[color:var(--border)] bg-[color:var(--surface-elevated)]",
        selected ? "border-primary ring-1 ring-primary" : "hover:border-primary/60",
      )}
    >
      <img src={badge} alt={name} className="h-5 w-5 object-contain" />
      <span className="text-[10px] font-semibold leading-tight">{name}</span>
    </button>
  );
}
