// Server-only: gameweek elimination engine. Not safe for client bundles
// because it imports supabaseAdmin (service-role key).
//
// Emails are NOT sent directly here. Instead this engine writes rows to
// `email_tasks` for the tenant admin to review and send manually from the
// Admin Panel. The entry-confirmation email remains automated (in
// oneshot.functions.ts) because it fires on a per-player action.
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export async function processGameweekResultsInternal(
  competitionId: string,
  gameweekId: string,
): Promise<{ eliminated: number; progressed: number }> {
  const { data: gw } = await supabaseAdmin
    .from('gameweeks').select('*').eq('id', gameweekId).maybeSingle()
  if (!gw) throw new Error('Gameweek not found')

  const { data: nextGw } = await supabaseAdmin
    .from('gameweeks').select('*')
    .eq('competition_id', competitionId)
    .gt('week_number', gw.week_number)
    .order('week_number', { ascending: true })
    .limit(1).maybeSingle()

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

  const { data: players } = await supabaseAdmin
    .from('players').select('id, full_name, email, alive')
    .eq('competition_id', competitionId).eq('alive', true)

  const { data: picks } = await supabaseAdmin
    .from('picks').select('player_id, team')
    .eq('competition_id', competitionId).eq('week', gw.week_number)
  const pickByPlayer = new Map((picks ?? []).map((p) => [p.player_id, p.team]))

  let eliminated = 0
  let progressed = 0
  const toEliminate: string[] = []

  for (const p of players ?? []) {
    const team = pickByPlayer.get(p.id)
    const outcome = team ? teamOutcome.get(team) : undefined

    // Categorise the player. reminders_sent rows here act as the source of
    // truth for which players the admin can send progression/elimination
    // emails to. The 'kind' values 'elim'/'progress' are reused.
    const { data: alreadyHandled } = await supabaseAdmin
      .from('reminders_sent').select('id')
      .eq('player_id', p.id).eq('gameweek_id', gameweekId)
      .in('kind', ['elim', 'progress']).maybeSingle()
    if (alreadyHandled) continue

    if (!team) {
      toEliminate.push(p.id)
      await supabaseAdmin.from('reminders_sent').insert({
        player_id: p.id, gameweek_id: gameweekId, kind: 'elim',
      } as never)
      eliminated++
    } else if (!outcome || outcome.result !== 'W') {
      toEliminate.push(p.id)
      await supabaseAdmin.from('reminders_sent').insert({
        player_id: p.id, gameweek_id: gameweekId, kind: 'elim',
      } as never)
      eliminated++
    } else {
      await supabaseAdmin.from('reminders_sent').insert({
        player_id: p.id, gameweek_id: gameweekId, kind: 'progress',
      } as never)
      progressed++
    }
  }

  if (toEliminate.length) {
    await supabaseAdmin.from('players').update({ alive: false }).in('id', toEliminate)
  }

  await supabaseAdmin.from('gameweeks').update({
    results_locked: true, processed_at: new Date().toISOString(),
  }).eq('id', gameweekId)

  await supabaseAdmin.from('competitions').update({
    current_week: gw.week_number + 1,
  }).eq('id', competitionId)

  // Create email tasks for the admin to send manually.
  await ensureEmailTasks({
    competitionId,
    tenantId: gw.tenant_id,
    justProcessedGameweekId: gameweekId,
    nextGameweekId: nextGw?.id ?? null,
    eliminatedCount: eliminated,
    progressedCount: progressed,
  })

  return { eliminated, progressed }
}

async function ensureEmailTasks(opts: {
  competitionId: string
  tenantId: string
  justProcessedGameweekId: string
  nextGameweekId: string | null
  eliminatedCount: number
  progressedCount: number
}) {
  const rows: Array<{
    competition_id: string
    tenant_id: string
    gameweek_id: string
    kind: 'progression' | 'elimination' | 'reminder'
    recipient_count: number
  }> = []

  if (opts.progressedCount > 0) {
    rows.push({
      competition_id: opts.competitionId,
      tenant_id: opts.tenantId,
      gameweek_id: opts.justProcessedGameweekId,
      kind: 'progression',
      recipient_count: opts.progressedCount,
    })
  }
  if (opts.eliminatedCount > 0) {
    rows.push({
      competition_id: opts.competitionId,
      tenant_id: opts.tenantId,
      gameweek_id: opts.justProcessedGameweekId,
      kind: 'elimination',
      recipient_count: opts.eliminatedCount,
    })
  }
  if (opts.nextGameweekId) {
    // Recipient count for the reminder is the number of players still alive
    // after processing (everyone who's eligible to pick next week).
    const { count: alive } = await supabaseAdmin
      .from('players').select('id', { count: 'exact', head: true })
      .eq('competition_id', opts.competitionId).eq('alive', true)
    if ((alive ?? 0) > 0) {
      rows.push({
        competition_id: opts.competitionId,
        tenant_id: opts.tenantId,
        gameweek_id: opts.nextGameweekId,
        kind: 'reminder',
        recipient_count: alive ?? 0,
      })
    }
  }

  if (!rows.length) return

  await supabaseAdmin
    .from('email_tasks')
    // Upsert so re-processing a gameweek doesn't error or duplicate.
    .upsert(rows as never, { onConflict: 'competition_id,gameweek_id,kind' })
}
