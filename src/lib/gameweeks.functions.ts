import { createServerFn } from '@tanstack/react-start'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import {
  sendElimination,
  sendProgression,
  formatDeadline,
} from '@/lib/email/triggers.server'

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

// ---- Process gameweek results (elimination engine) ----
// Iterates every alive player. If their pick was a winner → progression email.
// Otherwise (loss, draw, or no pick) → eliminate + elimination email.
// Idempotent via reminders_sent (kind 'elim' or 'progress').

export async function processGameweekResultsInternal(competitionId: string, gameweekId: string): Promise<{
  eliminated: number; progressed: number
}> {
  const { data: gw } = await supabaseAdmin.from('gameweeks').select('*').eq('id', gameweekId).maybeSingle()
  if (!gw) throw new Error('Gameweek not found')

  // Find next gameweek (for progression email)
  const { data: nextGw } = await supabaseAdmin
    .from('gameweeks').select('*')
    .eq('competition_id', competitionId)
    .gt('week_number', gw.week_number)
    .order('week_number', { ascending: true })
    .limit(1).maybeSingle()

  // Build team → winner map for this gameweek
  const { data: results } = await supabaseAdmin
    .from('results').select('*').eq('gameweek_id', gameweekId)
  const teamOutcome = new Map<string, { result: 'W' | 'L' | 'D'; line: string }>()
  for (const r of results ?? []) {
    if (r.winner == null) continue
    const line = `${r.home_team} ${r.home_score} – ${r.away_score} ${r.away_team}`
    if (r.winner === 'home') {
      teamOutcome.set(r.home_team, { result: 'W', line })
      teamOutcome.set(r.away_team, { result: 'L', line })
    } else if (r.winner === 'away') {
      teamOutcome.set(r.away_team, { result: 'W', line })
      teamOutcome.set(r.home_team, { result: 'L', line })
    } else {
      teamOutcome.set(r.home_team, { result: 'D', line })
      teamOutcome.set(r.away_team, { result: 'D', line })
    }
  }

  // Alive players in this competition
  const { data: players } = await supabaseAdmin
    .from('players').select('id, full_name, email, alive')
    .eq('competition_id', competitionId).eq('alive', true)

  // Picks for this gameweek
  const { data: picks } = await supabaseAdmin
    .from('picks').select('player_id, team').eq('competition_id', competitionId).eq('week', gw.week_number)
  const pickByPlayer = new Map((picks ?? []).map((p) => [p.player_id, p.team]))

  let eliminated = 0
  let progressed = 0
  const toEliminate: string[] = []

  for (const p of players ?? []) {
    const team = pickByPlayer.get(p.id)
    const outcome = team ? teamOutcome.get(team) : undefined

    // Idempotency check
    const { data: alreadyHandled } = await supabaseAdmin
      .from('reminders_sent').select('id')
      .eq('player_id', p.id).eq('gameweek_id', gameweekId).in('kind', ['elim', 'progress']).maybeSingle()
    if (alreadyHandled) continue

    if (!team) {
      // No pick → eliminate
      toEliminate.push(p.id)
      await supabaseAdmin.from('reminders_sent').insert({
        player_id: p.id, gameweek_id: gameweekId, kind: 'elim',
      })
      await sendElimination({
        playerId: p.id, gameweekId, weekLabel: gw.week_label,
        pickedTeam: null, resultLine: null, noPick: true,
      })
      eliminated++
    } else if (!outcome || outcome.result !== 'W') {
      // Pick was a loss/draw/no-result-yet treated as loss when locking
      toEliminate.push(p.id)
      await supabaseAdmin.from('reminders_sent').insert({
        player_id: p.id, gameweek_id: gameweekId, kind: 'elim',
      })
      await sendElimination({
        playerId: p.id, gameweekId, weekLabel: gw.week_label,
        pickedTeam: team, resultLine: outcome?.line ?? null,
      })
      eliminated++
    } else {
      // Survived
      await supabaseAdmin.from('reminders_sent').insert({
        player_id: p.id, gameweek_id: gameweekId, kind: 'progress',
      })
      await sendProgression({
        playerId: p.id, gameweekId, weekLabel: gw.week_label,
        nextWeekLabel: nextGw?.week_label ?? `GW${gw.week_number + 1}`,
        nextDeadline: nextGw?.deadline_at ?? null,
      })
      progressed++
    }
  }

  if (toEliminate.length) {
    await supabaseAdmin.from('players').update({ alive: false }).in('id', toEliminate)
  }

  await supabaseAdmin.from('gameweeks').update({
    results_locked: true, processed_at: new Date().toISOString(),
  }).eq('id', gameweekId)

  // Advance competition current_week
  await supabaseAdmin.from('competitions').update({
    current_week: gw.week_number + 1,
  }).eq('id', competitionId)

  return { eliminated, progressed }
}

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
