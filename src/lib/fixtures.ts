// Minimal static fixture sample. Used only by the marketing/preview pages
// (/how-it-works, TenantEntry, BrandPreview) which always render GW1.
// Real competition fixtures live in the DB and are populated via the
// "Import fixtures from FPL" button in the admin panel.
export type Fixture = {
  home: string;
  away: string;
  homeBadge: string;
  awayBadge: string;
  kickoffAt: string | null;
};

const B = (id: number) =>
  `https://resources.premierleague.com/premierleague/badges/70/t${id}.png`;

export const TEAMS: Record<string, number> = {
  "Arsenal": 3,
  "Aston Villa": 7,
  "Bournemouth": 91,
  "Brentford": 94,
  "Brighton": 36,
  "Burnley": 90,
  "Chelsea": 8,
  "Crystal Palace": 31,
  "Everton": 11,
  "Fulham": 54,
  "Leeds United": 2,
  "Liverpool": 14,
  "Manchester City": 43,
  "Manchester United": 1,
  "Newcastle": 4,
  "Nottingham Forest": 17,
  "Sunderland": 56,
  "Tottenham": 6,
  "West Ham": 21,
  "Wolverhampton Wanderers": 39,
};

const fx = (home: string, away: string, kickoffAt: string | null = null): Fixture => ({
  home,
  away,
  homeBadge: B(TEAMS[home]),
  awayBadge: B(TEAMS[away]),
  kickoffAt,
});

// Sample GW1 fixtures used by marketing/preview pages only.
export const SAMPLE_GW1: Fixture[] = [
  fx("Liverpool", "Tottenham"),
  fx("Manchester City", "Newcastle"),
  fx("Crystal Palace", "Arsenal"),
  fx("Brighton", "Manchester United"),
  fx("West Ham", "Brentford"),
];

export const FIXTURES_BY_WEEK: Record<number, Fixture[]> = {
  1: SAMPLE_GW1,
};

export function getFixtures(_week: number): Fixture[] {
  return SAMPLE_GW1;
}
