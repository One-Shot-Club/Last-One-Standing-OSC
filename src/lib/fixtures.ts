export type Fixture = {
  home: string;
  away: string;
  homeBadge: string;
  awayBadge: string;
};

const B = (id: number) =>
  `https://resources.premierleague.com/premierleague/badges/70/t${id}.png`;

// Premier League team -> official badge code
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

const fx = (home: string, away: string): Fixture => ({
  home,
  away,
  homeBadge: B(TEAMS[home]),
  awayBadge: B(TEAMS[away]),
});

export const FIXTURES_BY_WEEK: Record<number, Fixture[]> = {
  1: [
    fx("Brighton", "Manchester United"),
    fx("Burnley", "Wolverhampton Wanderers"),
    fx("Crystal Palace", "Arsenal"),
    fx("Fulham", "Bournemouth"),
    fx("Liverpool", "Tottenham"),
    fx("Manchester City", "Newcastle"),
    fx("Nottingham Forest", "Chelsea"),
    fx("Sunderland", "Aston Villa"),
    fx("West Ham", "Brentford"),
    fx("Leeds United", "Everton"),
  ],
  2: [
    fx("Bournemouth", "Newcastle"),
    fx("Fulham", "Manchester City"),
    fx("Sunderland", "West Ham"),
    fx("Liverpool", "Crystal Palace"),
    fx("Manchester United", "Aston Villa"),
    fx("Burnley", "Everton"),
    fx("Nottingham Forest", "Chelsea"),
    fx("Leeds United", "Arsenal"),
    fx("Tottenham", "Brighton"),
    fx("Wolverhampton Wanderers", "Brentford"),
  ],

  3: [
    fx("Arsenal", "Newcastle"),
    fx("Brighton", "Chelsea"),
    fx("Burnley", "Tottenham"),
    fx("Crystal Palace", "Bournemouth"),
    fx("Fulham", "Wolverhampton Wanderers"),
    fx("Leeds United", "Manchester United"),
    fx("Liverpool", "Aston Villa"),
    fx("Manchester City", "Brentford"),
    fx("Nottingham Forest", "Everton"),
    fx("Sunderland", "West Ham"),
  ],
};

export function getFixtures(week: number): Fixture[] {
  return FIXTURES_BY_WEEK[week] ?? FIXTURES_BY_WEEK[1];
}
