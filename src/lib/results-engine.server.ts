// Server-only: gameweek elimination engine. Not safe for client bundles
// because it imports supabaseAdmin (service-role key).
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { sendElimination, sendProgression } from '@/lib/email/triggers.server'

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
      await sendElimination({
        playerId: p.id, gameweekId, weekLabel: gw.week_label,
        pickedTeam: null, resultLine: null, noPick: true,
      })
      eliminated++
    } else if (!outcome || outcome.result !== 'W') {
      toEliminate.push(p.id)
      await supabaseAdmin.from('reminders_sent').insert({
        player_id: p.id, gameweek_id: gameweekId, kind: 'elim',
      } as never)
      await sendElimination({
        playerId: p.id, gameweekId, weekLabel: gw.week_label,
        pickedTeam: team, resultLine: outcome?.line ?? null,
      })
      eliminated++
    } else {
      await supabaseAdmin.from('reminders_sent').insert({
        player_id: p.id, gameweek_id: gameweekId, kind: 'progress',
      } as never)
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

  await supabaseAdmin.from('competitions').update({
    current_week: gw.week_number + 1,
  }).eq('id', competitionId)

  return { eliminated, progressed }
}
