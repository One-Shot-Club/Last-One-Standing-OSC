// Static fixtures for the 2026/27 Premier League season, used by
// marketing/preview pages (/how-it-works, TenantEntry empty-state,
// BrandPreview). Real per-tenant fixtures live in the DB and are imported
// from FPL via the admin panel.
export type Fixture = {
  home: string;
  away: string;
  homeBadge: string;
  awayBadge: string;
  kickoffAt: string | null;
};

// Premier League SVG badge IDs (2026/27 season).
export const TEAMS: Record<string, number> = {
  "Arsenal": 3,
  "Aston Villa": 7,
  "Bournemouth": 91,
  "Brentford": 94,
  "Brighton": 36,
  "Chelsea": 8,
  "Coventry City": 9,
  "Crystal Palace": 31,
  "Everton": 11,
  "Fulham": 54,
  "Hull City": 88,
  "Ipswich Town": 40,
  "Leeds United": 2,
  "Liverpool": 14,
  "Manchester City": 43,
  "Manchester United": 1,
  "Newcastle": 4,
  "Nottingham Forest": 17,
  "Sunderland": 56,
  "Tottenham": 6,
};

const B = (name: string) =>
  `https://resources.premierleague.com/premierleague25/badges/${TEAMS[name]}.svg`;

const fx = (home: string, away: string, kickoffAt: string | null = null): Fixture => ({
  home,
  away,
  homeBadge: B(home),
  awayBadge: B(away),
  kickoffAt,
});

// 2026/27 Premier League Matchweek 1 (Fri 21 Aug – Mon 24 Aug 2026).
// Source: premierleague.com/en/matches/premier-league/2026-27/matchweek-1
export const SAMPLE_GW1: Fixture[] = [
  fx("Arsenal", "Coventry City", "2026-08-21T14:00:00Z"),
  fx("Hull City", "Manchester United", "2026-08-22T06:30:00Z"),
  fx("Everton", "Crystal Palace", "2026-08-22T09:00:00Z"),
  fx("Ipswich Town", "Sunderland", "2026-08-22T09:00:00Z"),
  fx("Nottingham Forest", "Leeds United", "2026-08-22T09:00:00Z"),
  fx("Brentford", "Tottenham", "2026-08-22T11:30:00Z"),
  fx("Brighton", "Aston Villa", "2026-08-23T08:00:00Z"),
  fx("Manchester City", "Bournemouth", "2026-08-23T08:00:00Z"),
  fx("Newcastle", "Liverpool", "2026-08-23T10:30:00Z"),
  fx("Fulham", "Chelsea", "2026-08-24T14:00:00Z"),
];

export const FIXTURES_BY_WEEK: Record<number, Fixture[]> = {
  1: SAMPLE_GW1,
};

export function getFixtures(_week: number): Fixture[] {
  return SAMPLE_GW1;
}
