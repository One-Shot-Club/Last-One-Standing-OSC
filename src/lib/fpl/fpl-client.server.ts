// Server-only thin wrapper around the public Fantasy Premier League JSON API.
// No auth required. Used to populate fixtures and results.

const BASE = 'https://fantasy.premierleague.com/api'

export type FplTeam = {
  id: number
  name: string
  short_name: string
  code: number // used to build official PL badge URL
}

export type FplBootstrap = {
  teams: FplTeam[]
}

export type FplFixture = {
  id: number
  event: number | null // FPL gameweek number
  kickoff_time: string | null // ISO
  team_h: number
  team_a: number
  team_h_score: number | null
  team_a_score: number | null
  finished: boolean
  finished_provisional: boolean
  started: boolean
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`FPL API ${path} failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

export async function fetchBootstrap(): Promise<FplBootstrap> {
  return get<FplBootstrap>('/bootstrap-static/')
}

export async function fetchFixturesForEvent(event: number): Promise<FplFixture[]> {
  return get<FplFixture[]>(`/fixtures/?event=${event}`)
}

export function badgeUrlForCode(code: number): string {
  // Same scheme as src/lib/fixtures.ts but keyed off FPL "code"
  return `https://resources.premierleague.com/premierleague/badges/70/t${code}.png`
}
