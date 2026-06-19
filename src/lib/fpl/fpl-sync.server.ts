// Server-only sync helpers. Read FPL JSON, upsert into our DB.
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import {
  fetchBootstrap,
  fetchFixturesForEvent,
  badgeUrlForCode,
  type FplFixture,
} from './fpl-client.server'

const TEAMS_TTL_MS = 24 * 60 * 60 * 1000 // 24h

let _teamsLastSync: number | null = null

export async function syncTeams(force = false): Promise<Map<number, { name: string; short_name: string; badge_url: string }>> {
  const fresh = _teamsLastSync && Date.now() - _teamsLastSync < TEAMS_TTL_MS
  if (!force && fresh) {
    const { data } = await supabaseAdmin.from('pl_teams').select('*')
    return new Map((data ?? []).map((t) => [t.id as number, { name: t.name as string, short_name: t.short_name as string, badge_url: (t.badge_url as string) ?? '' }]))
  }

  const boot = await fetchBootstrap()
  const rows = boot.teams.map((t) => ({
    id: t.id,
    name: t.name,
    short_name: t.short_name,
    badge_url: badgeUrlForCode(t.code),
    updated_at: new Date().toISOString(),
  }))
  if (rows.length) {
    await supabaseAdmin.from('pl_teams').upsert(rows as never, { onConflict: 'id' })
  }
  _teamsLastSync = Date.now()

  return new Map(rows.map((r) => [r.id, { name: r.name, short_name: r.short_name, badge_url: r.badge_url }]))
}

/**
 * Import (or re-import) fixtures for a gameweek from FPL.
 * Writes to `results` upserting by fpl_fixture_id, and sets
 * `gameweeks.first_kickoff_at` / `last_match_ends_at` / `fpl_event` / `last_synced_at`.
 */
export async function importGameweekFixtures(args: {
  competitionId: string
  gameweekId: string
  fplEvent: number
}): Promise<{ imported: number; firstKickoff: string | null }> {
  const teams = await syncTeams()
  const fixtures = await fetchFixturesForEvent(args.fplEvent)

  if (!fixtures.length) {
    return { imported: 0, firstKickoff: null }
  }

  const rows = fixtures.map((f) => {
    const home = teams.get(f.team_h)
    const away = teams.get(f.team_a)
    return {
      gameweek_id: args.gameweekId,
      fpl_fixture_id: f.id,
      home_team: home?.name ?? `Team ${f.team_h}`,
      away_team: away?.name ?? `Team ${f.team_a}`,
      kickoff_at: f.kickoff_time,
      home_score: f.team_h_score,
      away_score: f.team_a_score,
      finished: f.finished,
      winner: winnerFromFixture(f),
      updated_at: new Date().toISOString(),
    }
  })

  await supabaseAdmin
    .from('results')
    .upsert(rows as never, { onConflict: 'fpl_fixture_id' })

  const kickoffs = fixtures.map((f) => f.kickoff_time).filter(Boolean) as string[]
  const firstKickoff = kickoffs.length ? kickoffs.slice().sort()[0] : null
  const lastKickoff = kickoffs.length ? kickoffs.slice().sort().slice(-1)[0] : null
  // Assume a match ends ~2h after kickoff; trigger auto-derives deadline_at from first_kickoff_at.
  const lastEnd = lastKickoff ? new Date(new Date(lastKickoff).getTime() + 2 * 60 * 60 * 1000).toISOString() : null

  if (firstKickoff) {
    await supabaseAdmin
      .from('gameweeks')
      .update({
        first_kickoff_at: firstKickoff,
        last_match_ends_at: lastEnd ?? firstKickoff,
        fpl_event: args.fplEvent,
        last_synced_at: new Date().toISOString(),
      } as never)
      .eq('id', args.gameweekId)
  } else {
    await supabaseAdmin
      .from('gameweeks')
      .update({ fpl_event: args.fplEvent, last_synced_at: new Date().toISOString() } as never)
      .eq('id', args.gameweekId)
  }

  return { imported: rows.length, firstKickoff }
}

/**
 * Refresh scores/finished flags for an already-imported gameweek.
 * Returns whether every fixture is finished (used by the cron to auto-process).
 */
export async function syncGameweekResults(args: {
  gameweekId: string
  fplEvent: number
}): Promise<{ updated: number; allFinished: boolean; total: number }> {
  const fixtures = await fetchFixturesForEvent(args.fplEvent)
  if (!fixtures.length) return { updated: 0, allFinished: false, total: 0 }

  let updated = 0
  for (const f of fixtures) {
    const { error, count } = await supabaseAdmin
      .from('results')
      .update({
        home_score: f.team_h_score,
        away_score: f.team_a_score,
        winner: winnerFromFixture(f),
        finished: f.finished,
        kickoff_at: f.kickoff_time,
        updated_at: new Date().toISOString(),
      } as never, { count: 'exact' })
      .eq('fpl_fixture_id', f.id)
      .eq('gameweek_id', args.gameweekId)
    if (!error && (count ?? 0) > 0) updated += count ?? 0
  }

  await supabaseAdmin
    .from('gameweeks')
    .update({ last_synced_at: new Date().toISOString() } as never)
    .eq('id', args.gameweekId)

  const allFinished = fixtures.length > 0 && fixtures.every((f) => f.finished)
  return { updated, allFinished, total: fixtures.length }
}

function winnerFromFixture(f: FplFixture): 'home' | 'away' | 'draw' | null {
  if (!f.finished) return null
  if (f.team_h_score == null || f.team_a_score == null) return null
  if (f.team_h_score > f.team_a_score) return 'home'
  if (f.team_a_score > f.team_h_score) return 'away'
  return 'draw'
}
