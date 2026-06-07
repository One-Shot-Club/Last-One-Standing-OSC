import { createServerFn } from '@tanstack/react-start'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { processGameweekResultsInternal } from '@/lib/results-engine.server'
import { FIXTURES_BY_WEEK } from '@/lib/fixtures'



async function verifyAdmin(competitionId: string, pin: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from('competitions').select('id').eq('id', competitionId).eq('admin_pin', pin).maybeSingle()
  if (!data) throw new Error('Unauthorized')
}

// ---- Gameweeks ----

export const listGameweeks = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    const { data: rows } = await supabaseAdmin
      .from('gameweeks').select('*').eq('competition_id', data.competitionId)
      .order('week_number', { ascending: true })
    return rows ?? []
  })

export const upsertGameweek = createServerFn({ method: 'POST' })
  .inputValidator((d: {
    competitionId: string
    pin: string
    id?: string
    weekNumber: number
    weekLabel: string
    firstKickoffAt: string
    lastMatchEndsAt: string
  }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    const row = {
      id: data.id,
      competition_id: data.competitionId,
      week_number: data.weekNumber,
      week_label: data.weekLabel,
      first_kickoff_at: data.firstKickoffAt,
      last_match_ends_at: data.lastMatchEndsAt,
      // deadline_at is set by trigger
      deadline_at: data.firstKickoffAt,
    }
    const { data: saved, error } = await supabaseAdmin
      .from('gameweeks').upsert(row, { onConflict: 'id' }).select('*').single()
    if (error) throw error
    return saved
  })

export const deleteGameweek = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string; id: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    const { error } = await supabaseAdmin.from('gameweeks').delete().eq('id', data.id).eq('competition_id', data.competitionId)
    if (error) throw error
    return { ok: true }
  })

// ---- Teams ----

export const listTeams = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    const { data: rows } = await supabaseAdmin
      .from('teams').select('*').eq('competition_id', data.competitionId).order('name')
    return rows ?? []
  })

export const upsertTeam = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string; name: string; badgeUrl?: string | null; id?: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    const row = {
      id: data.id,
      competition_id: data.competitionId,
      name: data.name.trim(),
      badge_url: data.badgeUrl ?? null,
    }
    const { data: saved, error } = await supabaseAdmin
      .from('teams').upsert(row, { onConflict: 'competition_id,name' }).select('*').single()
    if (error) throw error
    return saved
  })

export const deleteTeam = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string; id: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    await supabaseAdmin.from('teams').delete().eq('id', data.id).eq('competition_id', data.competitionId)
    return { ok: true }
  })

// ---- Results ----

export const listResults = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string; gameweekId: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    const { data: rows } = await supabaseAdmin
      .from('results').select('*').eq('gameweek_id', data.gameweekId).order('created_at')
    return rows ?? []
  })

export const upsertResult = createServerFn({ method: 'POST' })
  .inputValidator((d: {
    competitionId: string
    pin: string
    id?: string
    gameweekId: string
    homeTeam: string
    awayTeam: string
    homeScore?: number | null
    awayScore?: number | null
  }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    let winner: 'home' | 'away' | 'draw' | null = null
    if (data.homeScore != null && data.awayScore != null) {
      if (data.homeScore > data.awayScore) winner = 'home'
      else if (data.awayScore > data.homeScore) winner = 'away'
      else winner = 'draw'
    }
    const row = {
      id: data.id,
      gameweek_id: data.gameweekId,
      home_team: data.homeTeam.trim(),
      away_team: data.awayTeam.trim(),
      home_score: data.homeScore ?? null,
      away_score: data.awayScore ?? null,
      winner,
      updated_at: new Date().toISOString(),
    }
    const { data: saved, error } = await supabaseAdmin
      .from('results').upsert(row, { onConflict: 'id' }).select('*').single()
    if (error) throw error
    return saved
  })

export const deleteResult = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string; id: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    await supabaseAdmin.from('results').delete().eq('id', data.id)
    return { ok: true }
  })

// (elimination engine moved to results-engine.server.ts)

export const processGameweekResults = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string; gameweekId: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    return processGameweekResultsInternal(data.competitionId, data.gameweekId)
  })

// ---- Pick screen context (player-facing, token-gated) ----

export const getPickContext = createServerFn({ method: 'GET' })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { data: player } = await supabaseAdmin
      .from('players').select('*').eq('magic_token', data.token).maybeSingle()
    if (!player) return null

    const { data: comp } = await supabaseAdmin
      .from('competitions').select('*').eq('id', player.competition_id).maybeSingle()

    const { data: picks } = await supabaseAdmin
      .from('picks').select('*').eq('player_id', player.id).order('week')

    // Current upcoming gameweek: deadline_at > now, smallest week_number
    const nowIso = new Date().toISOString()
    const { data: upcoming } = await supabaseAdmin
      .from('gameweeks').select('*')
      .eq('competition_id', player.competition_id)
      .gt('deadline_at', nowIso)
      .order('week_number', { ascending: true })
      .limit(1).maybeSingle()

    // If no upcoming gameweek, fall back to most recent locked/past one to show context
    const gameweek = upcoming ?? null

    let fixtures: any[] = []
    if (gameweek) {
      const { data: results } = await supabaseAdmin
        .from('results').select('*').eq('gameweek_id', gameweek.id)
      fixtures = results ?? []
    }

    // Team badges
    const { data: teams } = await supabaseAdmin
      .from('teams').select('name, badge_url').eq('competition_id', player.competition_id)
    const badges: Record<string, string | null> = {}
    for (const t of teams ?? []) badges[t.name] = t.badge_url ?? null

    return {
      player: { id: player.id, full_name: player.full_name, alive: player.alive, email: player.email },
      competition: comp,
      picks: picks ?? [],
      gameweek,
      fixtures,
      badges,
      now: nowIso,
    }
  })

// Submit pick gated by deadline + alive
export const submitPickV2 = createServerFn({ method: 'POST' })
  .inputValidator((d: { token: string; gameweekId: string; team: string }) => d)
  .handler(async ({ data }) => {
    const { data: player } = await supabaseAdmin
      .from('players').select('*').eq('magic_token', data.token).maybeSingle()
    if (!player) throw new Error('Invalid link')
    if (!player.alive) throw new Error("You've been eliminated")

    const { data: gw } = await supabaseAdmin
      .from('gameweeks').select('*').eq('id', data.gameweekId).maybeSingle()
    if (!gw) throw new Error('Gameweek not found')
    if (new Date(gw.deadline_at).getTime() <= Date.now()) throw new Error('Picks are locked for this gameweek')

    const { data: existing } = await supabaseAdmin
      .from('picks').select('team, week').eq('player_id', player.id)
    if (existing?.some((p) => p.team === data.team)) throw new Error(`You already used ${data.team}`)
    if (existing?.some((p) => p.week === gw.week_number)) throw new Error('You already picked this week')

    const { data: pick, error } = await supabaseAdmin.from('picks').insert({
      player_id: player.id,
      competition_id: player.competition_id,
      week: gw.week_number,
      team: data.team,
    }).select('*').single()
    if (error) throw error
    return pick
  })

// ---- GW2 hard-wired flow ----

export const getGw2Context = createServerFn({ method: 'GET' })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { data: player } = await supabaseAdmin
      .from('players').select('*').eq('magic_token', data.token).maybeSingle()
    if (!player) return null

    const { data: comp } = await supabaseAdmin
      .from('competitions').select('*').eq('id', player.competition_id).maybeSingle()

    const { data: picks } = await supabaseAdmin
      .from('picks').select('*').eq('player_id', player.id).order('week')

    const { data: gameweek } = await supabaseAdmin
      .from('gameweeks').select('*')
      .eq('competition_id', player.competition_id).eq('week_number', 2).maybeSingle()

    return {
      player: { id: player.id, full_name: player.full_name, alive: player.alive, email: player.email },
      competition: comp,
      picks: picks ?? [],
      gameweek,
      now: new Date().toISOString(),
    }
  })

export const submitGw2Pick = createServerFn({ method: 'POST' })
  .inputValidator((d: { token: string; team: string }) => d)
  .handler(async ({ data }) => {
    const { data: player } = await supabaseAdmin
      .from('players').select('*').eq('magic_token', data.token).maybeSingle()
    if (!player) throw new Error('Invalid link')
    if (!player.alive) throw new Error("You've been eliminated")

    const { data: gw } = await supabaseAdmin
      .from('gameweeks').select('*')
      .eq('competition_id', player.competition_id).eq('week_number', 2).maybeSingle()
    if (!gw) throw new Error('Gameweek 2 not configured yet')
    if (new Date(gw.deadline_at).getTime() <= Date.now()) throw new Error('Picks are locked for this gameweek')

    const { data: existing } = await supabaseAdmin
      .from('picks').select('team, week').eq('player_id', player.id)
    if (existing?.some((p) => p.team === data.team)) throw new Error(`You already used ${data.team}`)
    if (existing?.some((p) => p.week === gw.week_number)) throw new Error('You already picked this week')

    const { data: pick, error } = await supabaseAdmin.from('picks').insert({
      player_id: player.id,
      competition_id: player.competition_id,
      week: gw.week_number,
      team: data.team,
    }).select('*').single()
    if (error) throw error
    return pick
  })

// ---- Tab-based gameweek admin (seed + set winner) ----

export const seedGameweek = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string; weekNumber: number }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    let { data: gw } = await supabaseAdmin
      .from('gameweeks').select('*')
      .eq('competition_id', data.competitionId).eq('week_number', data.weekNumber).maybeSingle()
    if (!gw) {
      const kickoff = new Date(Date.now() + Math.max(1, data.weekNumber) * 7 * 86400000)
      const ends = new Date(kickoff.getTime() + 2 * 86400000)
      const { data: created, error } = await supabaseAdmin.from('gameweeks').insert({
        competition_id: data.competitionId,
        week_number: data.weekNumber,
        week_label: `GW${data.weekNumber}`,
        first_kickoff_at: kickoff.toISOString(),
        last_match_ends_at: ends.toISOString(),
        deadline_at: kickoff.toISOString(),
      }).select('*').single()
      if (error) throw error
      gw = created
    }
    const fixtures = FIXTURES_BY_WEEK[data.weekNumber] ?? []
    if (fixtures.length) {
      const { data: existing } = await supabaseAdmin
        .from('results').select('home_team, away_team').eq('gameweek_id', gw!.id)
      const have = new Set((existing ?? []).map((r: any) => `${r.home_team}|${r.away_team}`))
      const toInsert = fixtures
        .filter((f) => !have.has(`${f.home}|${f.away}`))
        .map((f) => ({ gameweek_id: gw!.id, home_team: f.home, away_team: f.away }))
      if (toInsert.length) {
        await supabaseAdmin.from('results').insert(toInsert)
      }
    }
    return gw
  })

export const setFixtureWinner = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string; resultId: string; winner: 'home' | 'away' | 'draw' }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    const scores = data.winner === 'home'
      ? { home_score: 1, away_score: 0 }
      : data.winner === 'away'
        ? { home_score: 0, away_score: 1 }
        : { home_score: 1, away_score: 1 }
    const { error } = await supabaseAdmin.from('results').update({
      ...scores, winner: data.winner, updated_at: new Date().toISOString(),
    }).eq('id', data.resultId)
    if (error) throw error
    return { ok: true }
  })

export const unlockGameweek = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string; gameweekId: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    const { data: gw } = await supabaseAdmin
      .from('gameweeks').select('*').eq('id', data.gameweekId).maybeSingle()
    if (!gw) throw new Error('Gameweek not found')

    // Revive players eliminated in this gameweek
    const { data: elims } = await supabaseAdmin
      .from('reminders_sent').select('player_id')
      .eq('gameweek_id', data.gameweekId).eq('kind', 'elim')
    const ids = (elims ?? []).map((r: any) => r.player_id)
    if (ids.length) {
      await supabaseAdmin.from('players').update({ alive: true }).in('id', ids)
    }

    // Clear handled markers so processing can run again
    await supabaseAdmin.from('reminders_sent').delete()
      .eq('gameweek_id', data.gameweekId).in('kind', ['elim', 'progress'])

    // Unlock gameweek + roll back competition pointer
    await supabaseAdmin.from('gameweeks').update({
      results_locked: false, processed_at: null,
    }).eq('id', data.gameweekId)

    await supabaseAdmin.from('competitions').update({
      current_week: gw.week_number,
    }).eq('id', data.competitionId)

    return { revived: ids.length }
  })
