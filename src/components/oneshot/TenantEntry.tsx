import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Card, Eyebrow, Shell, StickyCTA } from "@/components/oneshot/ui";
import { ClubHeader } from "@/components/oneshot/ClubHeader";
import { useTenantBranding } from "@/lib/tenant/branding";
import { cn } from "@/lib/utils";
import { SAMPLE_GW1 } from "@/lib/fixtures";
import type { TenantBranding, TenantEntryFixture } from "@/lib/tenant.functions";

export type EntryCompetition = {
  id: string;
  entry_fee: number | string | null;
  prize_pool: number | string | null;
  club_name: string | null;
  club_logo_url: string | null;
};

type EntryFixture = {
  home: string;
  away: string;
  homeBadge: string | null;
  awayBadge: string | null;
  kickoffAt: string | null;
};

function formatKickoff(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IE", {
    timeZone: "Europe/Dublin",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const RULES = [
  "Pick one Premier League team each gameweek.",
  "If they win, you survive to next week. Lose/Draw = Elimination.",
  "You can't reuse a team for the rest of the comp.",
  "Forget to pick? You're auto-assigned the first team alphabetically.",
  "Last person standing wins the pot.",
];

export function TenantEntry({
  tenant,
  competition,
  gameweek,
  fixtures,
  addMode,
}: {
  tenant: TenantBranding | null;
  competition: EntryCompetition | null;
  gameweek?: { id: string; week_number: number; deadline_at: string | null } | null;
  fixtures?: TenantEntryFixture[];
  addMode?: { n: string; e: string; p: string; o?: string } | null;
}) {
  useTenantBranding(tenant);
  const nav = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const liveFixtures: EntryFixture[] =
    fixtures && fixtures.length > 0 ? fixtures : SAMPLE_GW1;
  const weekNumber = gameweek?.week_number ?? 1;


  const clubName =
    tenant?.name ?? competition?.club_name ?? "LAST MAN STANDING";
  const logoUrl = tenant?.logo_url ?? competition?.club_logo_url ?? undefined;
  const prize = Number(competition?.prize_pool ?? 3000);
  const fee = Number(competition?.entry_fee ?? 10);

  return (
    <Shell bgUrl={tenant?.background_url ?? undefined} bgBlur={6}>
      <div className="mt-2">
        <ClubHeader clubName={clubName} logoUrl={logoUrl} />
      </div>

      <Card className="mt-8 text-center">
        <p className="eyebrow">Winner Takes All</p>
        <div className="display mt-2 text-6xl text-primary leading-none">
          €{prize.toLocaleString()}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Entry <span className="text-foreground font-semibold">€{fee}</span> · Last Man Standing
        </p>
      </Card>

      <div className="mt-8">
        <Eyebrow>Gameweek {weekNumber} fixtures</Eyebrow>
        <h2 className="display mt-2 text-2xl">Make your pick</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap the team you back to win.
        </p>
      </div>

      <div className="mt-3 space-y-1.5 pb-6">
        {liveFixtures.map((f, i) => (
          <FixtureCard
            key={i}
            fixture={f}
            selected={selected}
            onSelect={setSelected}
          />
        ))}
      </div>

      <div className="mt-4">
        <Eyebrow>How it works</Eyebrow>
        <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
          {RULES.map((r, i) => (
            <li key={i}>
              <span className="text-primary mr-2">{i + 1}.</span>
              {r}
            </li>
          ))}
        </ol>
      </div>

      <div className="h-20" />

      <StickyCTA>
        <Btn
          disabled={!selected || !competition}
          onClick={() =>
            nav({
              to: "/details",
              search: { c: competition!.id, t: selected! },
            })
          }
        >
          {selected ? `Continue with ${selected} →` : "Select a team"}
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
  fixture: EntryFixture;
  selected: string | null;
  onSelect: (t: string) => void;
}) {
  const kickoff = formatKickoff(fixture.kickoffAt);
  return (
    <Card className="p-1.5">
      {kickoff && (
        <div className="mb-1 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          {kickoff}
        </div>
      )}
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
  badge: string | null;
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
      {badge ? <img src={badge} alt={name} className="h-5 w-5 object-contain" /> : null}
      <span className="text-[10px] font-semibold leading-tight">{name}</span>
    </button>
  );
}
