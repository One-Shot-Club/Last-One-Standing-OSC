// PIN-gated server functions for the admin "Email Tasks" panel. Lists
// pending email tasks for a competition and runs them in bulk through the
// existing pgmq queue. Per-recipient idempotency keys mean clicking
// "Send" twice never duplicates an email.
import { createServerFn } from '@tanstack/react-start'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { verifyAdmin } from '@/lib/admin-auth.server'
import {
  sendElimination,
  sendProgression,
  sendPickReminder,
} from '@/lib/email/triggers.server'

type TaskKind = 'progression' | 'elimination' | 'reminder'

export interface AdminEmailTask {
  id: string
  competition_id: string
  gameweek_id: string | null
  kind: TaskKind
  recipient_count: number
  sent_count: number
  sent_at: string | null
  dismissed_at: string | null
  created_at: string
  // Joined display info
  week_number: number | null
  week_label: string | null
  deadline_at: string | null
}

export const listEmailTasks = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string }) => d)
  .handler(async ({ data }): Promise<AdminEmailTask[]> => {
    await verifyAdmin(data.competitionId, data.pin)

    const { data: tasks, error } = await supabaseAdmin
      .from('email_tasks')
      .select('*, gameweeks(week_number, week_label, deadline_at)')
      .eq('competition_id', data.competitionId)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error

    return (tasks ?? []).map((t: any) => ({
      id: t.id,
      competition_id: t.competition_id,
      gameweek_id: t.gameweek_id,
      kind: t.kind,
      recipient_count: t.recipient_count,
      sent_count: t.sent_count,
      sent_at: t.sent_at,
      dismissed_at: t.dismissed_at,
      created_at: t.created_at,
      week_number: t.gameweeks?.week_number ?? null,
      week_label: t.gameweeks?.week_label ?? null,
      deadline_at: t.gameweeks?.deadline_at ?? null,
    }))
  })

async function recipientPlayerIds(
  competitionId: string,
  task: { gameweek_id: string | null; kind: TaskKind },
): Promise<string[]> {
  if (!task.gameweek_id) return []

  if (task.kind === 'progression' || task.kind === 'elimination') {
    const wantKind = task.kind === 'progression' ? 'progress' : 'elim'
    const { data: rows } = await supabaseAdmin
      .from('reminders_sent')
      .select('player_id, players!inner(competition_id, email)')
      .eq('gameweek_id', task.gameweek_id)
      .eq('kind', wantKind)
      .eq('players.competition_id', competitionId)
    return (rows ?? [])
      .filter((r: any) => r.players?.email)
      .map((r: any) => r.player_id as string)
  }

  // reminder: alive players in competition without a pick for the gw's week
  const { data: gw } = await supabaseAdmin
    .from('gameweeks').select('week_number').eq('id', task.gameweek_id).maybeSingle()
  if (!gw) return []
  const { data: alive } = await supabaseAdmin
    .from('players').select('id, email')
    .eq('competition_id', competitionId).eq('alive', true)
  if (!alive?.length) return []
  const aliveIds = alive.filter((p) => p.email).map((p) => p.id)
  const { data: picks } = await supabaseAdmin
    .from('picks').select('player_id')
    .eq('competition_id', competitionId).eq('week', gw.week_number)
    .in('player_id', aliveIds)
  const picked = new Set((picks ?? []).map((p) => p.player_id))
  return aliveIds.filter((id) => !picked.has(id))
}

export const runEmailTask = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string; taskId: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)

    const { data: task } = await supabaseAdmin
      .from('email_tasks').select('*').eq('id', data.taskId)
      .eq('competition_id', data.competitionId).maybeSingle()
    if (!task) throw new Error('Task not found')
    if (task.sent_at) return { ok: true, alreadySent: true, queued: 0 }

    const playerIds = await recipientPlayerIds(data.competitionId, { gameweek_id: task.gameweek_id, kind: task.kind as TaskKind })

    // Resolve gameweek metadata once
    const { data: gw } = task.gameweek_id
      ? await supabaseAdmin.from('gameweeks').select('id, week_number, week_label, deadline_at')
          .eq('id', task.gameweek_id).maybeSingle()
      : { data: null as any }

    let nextGw: { id: string; week_label: string; deadline_at: string } | null = null
    if (gw && (task.kind === 'progression')) {
      const { data: ngw } = await supabaseAdmin
        .from('gameweeks').select('id, week_label, deadline_at')
        .eq('competition_id', data.competitionId)
        .gt('week_number', gw.week_number)
        .order('week_number', { ascending: true })
        .limit(1).maybeSingle()
      nextGw = (ngw as any) ?? null
    }

    // For elimination we want the pick + result line per player
    const teamOutcomeByPlayer = new Map<string, { team: string | null; line: string | null }>()
    if (task.kind === 'elimination' && gw) {
      const { data: picks } = await supabaseAdmin
        .from('picks').select('player_id, team')
        .eq('competition_id', data.competitionId).eq('week', gw.week_number)
        .in('player_id', playerIds)
      const { data: results } = await supabaseAdmin
        .from('results').select('home_team, away_team, home_score, away_score, winner')
        .eq('gameweek_id', task.gameweek_id!)
      const lineByTeam = new Map<string, string>()
      for (const r of results ?? []) {
        const line = `${r.home_team} ${r.home_score} – ${r.away_score} ${r.away_team}`
        lineByTeam.set(r.home_team, line)
        lineByTeam.set(r.away_team, line)
      }
      for (const id of playerIds) {
        const pick = picks?.find((p) => p.player_id === id)
        teamOutcomeByPlayer.set(id, {
          team: pick?.team ?? null,
          line: pick ? lineByTeam.get(pick.team) ?? null : null,
        })
      }
    }

    let queued = 0
    for (const playerId of playerIds) {
      try {
        if (task.kind === 'progression') {
          await sendProgression({
            playerId,
            gameweekId: task.gameweek_id!,
            weekLabel: gw?.week_label ?? '',
            nextWeekLabel: nextGw?.week_label ?? `GW${(gw?.week_number ?? 0) + 1}`,
            nextDeadline: nextGw?.deadline_at ?? null,
          })
          queued++
        } else if (task.kind === 'elimination') {
          const out = teamOutcomeByPlayer.get(playerId)
          await sendElimination({
            playerId,
            gameweekId: task.gameweek_id!,
            weekLabel: gw?.week_label ?? '',
            pickedTeam: out?.team ?? null,
            resultLine: out?.line ?? null,
            noPick: !out?.team,
          })
          queued++
        } else if (task.kind === 'reminder') {
          await sendPickReminder({
            playerId,
            gameweekId: task.gameweek_id!,
            nextWeekLabel: gw?.week_label ?? '',
            deadline: gw?.deadline_at ?? null,
          })
          queued++
        }
      } catch (e) {
        console.error('[admin-tasks] send failed', { taskId: data.taskId, playerId, e })
      }
    }

    await supabaseAdmin.from('email_tasks').update({
      sent_at: new Date().toISOString(),
      sent_count: queued,
      recipient_count: playerIds.length,
    } as never).eq('id', data.taskId)

    return { ok: true, queued, recipients: playerIds.length }
  })

export const dismissEmailTask = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string; taskId: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    await supabaseAdmin.from('email_tasks').update({
      dismissed_at: new Date().toISOString(),
    } as never)
      .eq('id', data.taskId)
      .eq('competition_id', data.competitionId)
    return { ok: true }
  })

export const previewEmailTask = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string; taskId: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    const { data: task } = await supabaseAdmin
      .from('email_tasks').select('*').eq('id', data.taskId)
      .eq('competition_id', data.competitionId).maybeSingle()
    if (!task) throw new Error('Task not found')

    const templateName =
      task.kind === 'progression' ? 'progression' :
      task.kind === 'elimination' ? 'elimination' : 'pick-reminder'

    const { TEMPLATES } = await import('@/lib/email-templates/registry')
    const { loadEmailThemeForCompetition } = await import('@/lib/email/tenant-theme.server')
    const { render } = await import('@react-email/components')
    const React = await import('react')

    const theme = await loadEmailThemeForCompetition(data.competitionId)
    const tmpl = TEMPLATES[templateName]
    if (!tmpl) throw new Error('Template not found')

    const preview = {
      ...(tmpl.previewData ?? {}),
      clubName: theme.clubName,
      theme: {
        primaryColor: theme.primaryColor,
        accentColor: theme.accentColor,
        panelTextColor: theme.panelTextColor,
        metaTextColor: theme.metaTextColor,
        logoUrl: theme.logoUrl,
        clubName: theme.clubName,
      },
    }
    const element = React.createElement(tmpl.component as any, preview)
    const html = await render(element)
    const subject = typeof tmpl.subject === 'function' ? tmpl.subject(preview) : tmpl.subject
    return { html, subject }
  })
