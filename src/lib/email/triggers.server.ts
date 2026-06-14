// High-level email triggers. These wrap enqueueTemplatedEmail with typed
// inputs and pull common data (club name, magic link URL, formatted dates,
// per-tenant theme) in one place. Server-only.
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { enqueueTemplatedEmail } from './send.server'
import { loadEmailThemeForCompetition, type EmailTheme } from './tenant-theme.server'

function appBaseUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.PUBLIC_APP_URL ||
    'https://last-one-standing.oneshotclub.ie'
  ).replace(/\/+$/, '')
}

export function magicLinkFor(token: string): string {
  return `${appBaseUrl()}/pick?token=${encodeURIComponent(token)}`
}

export function competitionShareUrl(competitionId: string): string {
  return `${appBaseUrl()}/?c=${encodeURIComponent(competitionId)}`
}

export function firstNameOf(fullName: string | null | undefined): string {
  if (!fullName) return 'Player'
  const trimmed = fullName.trim()
  if (!trimmed) return 'Player'
  return trimmed.split(/\s+/)[0]
}

const DUBLIN = 'Europe/Dublin'
const DATE_FMT = new Intl.DateTimeFormat('en-IE', {
  timeZone: DUBLIN,
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatDeadline(date: Date | string | null | undefined): string {
  if (!date) return 'TBC'
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return 'TBC'
  return DATE_FMT.format(d)
}

export function humanCountdown(toDate: Date | string): string {
  const target = typeof toDate === 'string' ? new Date(toDate) : toDate
  const diffMs = target.getTime() - Date.now()
  if (diffMs <= 0) return 'Deadline passed'
  const totalMins = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMins / (60 * 24))
  const hours = Math.floor((totalMins % (60 * 24)) / 60)
  if (days > 0) return `You have ${days} day${days === 1 ? '' : 's'} ${hours} hour${hours === 1 ? '' : 's'} to make your pick`
  if (hours > 0) return `You have ${hours} hour${hours === 1 ? '' : 's'} to make your pick`
  const mins = totalMins % 60
  return `You have ${mins} minute${mins === 1 ? '' : 's'} to make your pick`
}

function themePropFor(theme: EmailTheme) {
  return {
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    panelTextColor: theme.panelTextColor,
    metaTextColor: theme.metaTextColor,
    logoUrl: theme.logoUrl,
    clubName: theme.clubName,
  }
}

interface Competition {
  id: string
  name: string
  club_name: string | null
  prize_pool: number
}

async function getCompetition(id: string): Promise<Competition | null> {
  const { data } = await supabaseAdmin.from('competitions').select('id, name, club_name, prize_pool').eq('id', id).maybeSingle()
  return data as any
}

async function teamBadgeUrl(_competitionId: string, teamName: string): Promise<string | null> {
  const { MASTER_TEAMS_COMPETITION_ID } = await import('@/lib/master-catalog')
  const { data } = await supabaseAdmin
    .from('teams').select('badge_url').eq('competition_id', MASTER_TEAMS_COMPETITION_ID).eq('name', teamName).maybeSingle()
  return data?.badge_url ?? null
}

async function countPlayers(competitionId: string, aliveOnly = false): Promise<number> {
  let q = supabaseAdmin.from('players').select('id', { count: 'exact', head: true }).eq('competition_id', competitionId)
  if (aliveOnly) q = q.eq('alive', true)
  const { count } = await q
  return count ?? 0
}

interface CompetitionStatsPayload {
  alive: number
  eliminated: number
  total: number
  picksPerWeek: Array<{ week: number; count: number }>
}

async function loadCompetitionStats(competitionId: string): Promise<CompetitionStatsPayload> {
  const { data: players } = await supabaseAdmin
    .from('players').select('id, alive').eq('competition_id', competitionId)
  const total = players?.length ?? 0
  const alive = (players ?? []).filter((p: any) => p.alive).length
  const eliminated = total - alive

  const { data: picks } = await supabaseAdmin
    .from('picks').select('week').eq('competition_id', competitionId)
  const counts = new Map<number, number>()
  for (const p of picks ?? []) {
    counts.set(p.week as number, (counts.get(p.week as number) ?? 0) + 1)
  }
  const picksPerWeek = Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([week, count]) => ({ week, count }))
  return { alive, eliminated, total, picksPerWeek }
}

// 1. Entry confirmation — automated, fires after first pick is recorded.
export async function sendEntryConfirmation(playerId: string, week: number): Promise<void> {
  const { data: player } = await supabaseAdmin.from('players').select('*').eq('id', playerId).maybeSingle()
  if (!player || !player.email) return
  const comp = await getCompetition(player.competition_id)
  if (!comp) return
  const theme = await loadEmailThemeForCompetition(player.competition_id)

  const { data: pick } = await supabaseAdmin
    .from('picks').select('team').eq('player_id', playerId).eq('week', week).maybeSingle()
  const team = pick?.team ?? '—'
  const badge = await teamBadgeUrl(player.competition_id, team)
  const { data: gw } = await supabaseAdmin
    .from('gameweeks').select('week_label, deadline_at')
    .eq('competition_id', player.competition_id).eq('week_number', week).maybeSingle()
  const weekLabel = gw?.week_label ?? `GW${week}`
  const players = await countPlayers(player.competition_id)

  await enqueueTemplatedEmail({
    templateName: 'entry-confirmation',
    to: player.email,
    idempotencyKey: `entry-${playerId}-w${week}`,
    fromName: theme.fromName,
    templateData: {
      firstName: firstNameOf(player.full_name),
      clubName: theme.clubName,
      competitionName: comp.name,
      team,
      teamBadgeUrl: badge ?? undefined,
      weekLabel,
      prizePool: Number(comp.prize_pool ?? 0),
      playersEntered: players,
      deadline: formatDeadline(gw?.deadline_at ?? null),
      magicLink: magicLinkFor(player.magic_token),
      theme: themePropFor(theme),
    },
  })
}

// 2A. Elimination — invoked by admin task runner.
export async function sendElimination(opts: {
  playerId: string
  gameweekId: string
  weekLabel: string
  pickedTeam: string | null
  resultLine: string | null
  noPick?: boolean
}): Promise<void> {
  const { data: player } = await supabaseAdmin.from('players').select('*').eq('id', opts.playerId).maybeSingle()
  if (!player || !player.email) return
  const comp = await getCompetition(player.competition_id)
  if (!comp) return
  const theme = await loadEmailThemeForCompetition(player.competition_id)

  const { data: picks } = await supabaseAdmin
    .from('picks').select('week, team').eq('player_id', opts.playerId).order('week', { ascending: true })
  const pickHistory = (picks ?? []).map((p) => ({ week: `GW${p.week}`, team: p.team }))
  const survived = opts.noPick ? pickHistory.length : Math.max(0, pickHistory.length - 1)
  const stats = await loadCompetitionStats(player.competition_id)

  await enqueueTemplatedEmail({
    templateName: 'elimination',
    to: player.email,
    idempotencyKey: `elim-${opts.playerId}-${opts.gameweekId}`,
    fromName: theme.fromName,
    templateData: {
      firstName: firstNameOf(player.full_name),
      clubName: theme.clubName,
      weekLabel: opts.weekLabel,
      pickedTeam: opts.pickedTeam ?? '',
      resultLine: opts.resultLine ?? '',
      weeksSurvived: survived,
      pickHistory,
      shareUrl: competitionShareUrl(player.competition_id),
      noPick: !!opts.noPick,
      stats,
      theme: themePropFor(theme),
    },
  })
}

// 2B. Progression — invoked by admin task runner.
export async function sendProgression(opts: {
  playerId: string
  gameweekId: string
  weekLabel: string
  nextWeekLabel: string
  nextDeadline: string | null
}): Promise<void> {
  const { data: player } = await supabaseAdmin.from('players').select('*').eq('id', opts.playerId).maybeSingle()
  if (!player || !player.email) return
  const comp = await getCompetition(player.competition_id)
  if (!comp) return
  const theme = await loadEmailThemeForCompetition(player.competition_id)

  const remaining = await countPlayers(player.competition_id, true)
  const { data: priorPicks } = await supabaseAdmin
    .from('picks').select('team').eq('player_id', opts.playerId)
  const usedTeams = (priorPicks ?? []).map((p) => p.team)

  await enqueueTemplatedEmail({
    templateName: 'progression',
    to: player.email,
    idempotencyKey: `progress-${opts.playerId}-${opts.gameweekId}`,
    fromName: theme.fromName,
    templateData: {
      firstName: firstNameOf(player.full_name),
      clubName: theme.clubName,
      weekLabel: opts.weekLabel,
      nextWeekLabel: opts.nextWeekLabel,
      playersRemaining: remaining,
      prizePool: Number(comp.prize_pool ?? 0),
      deadline: formatDeadline(opts.nextDeadline),
      countdownCopy: opts.nextDeadline ? humanCountdown(opts.nextDeadline) : '',
      magicLink: magicLinkFor(player.magic_token),
      usedTeams,
      theme: themePropFor(theme),
    },
  })
}

// 3. Pick reminder — invoked by admin task runner (was 24h/1h cron).
export async function sendPickReminder(opts: {
  playerId: string
  gameweekId: string
  nextWeekLabel: string
  deadline: string | null
}): Promise<void> {
  const { data: player } = await supabaseAdmin.from('players').select('*').eq('id', opts.playerId).maybeSingle()
  if (!player || !player.email) return
  const comp = await getCompetition(player.competition_id)
  if (!comp) return
  const theme = await loadEmailThemeForCompetition(player.competition_id)

  const { data: priorPicks } = await supabaseAdmin
    .from('picks').select('team').eq('player_id', opts.playerId)
  const usedTeams = (priorPicks ?? []).map((p) => p.team)
  const remaining = await countPlayers(player.competition_id, true)

  await enqueueTemplatedEmail({
    templateName: 'pick-reminder',
    to: player.email,
    // Note: idempotencyKey scoped to gameweek_id so one reminder per player per gw.
    // If an admin wants to nudge again, dismiss + recreate the task.
    idempotencyKey: `reminder-${opts.playerId}-${opts.gameweekId}`,
    fromName: theme.fromName,
    templateData: {
      firstName: firstNameOf(player.full_name),
      clubName: theme.clubName,
      nextWeekLabel: opts.nextWeekLabel,
      deadline: formatDeadline(opts.deadline),
      countdownCopy: opts.deadline ? humanCountdown(opts.deadline) : '',
      playersRemaining: remaining,
      magicLink: magicLinkFor(player.magic_token),
      usedTeams,
      theme: themePropFor(theme),
    },
  })
}

// Legacy named export — kept so any in-flight imports keep building. Routes
// to the merged pick-reminder template regardless of kind.
export async function sendReminder(
  _kind: '24h' | '1h',
  opts: { playerId: string; gameweek: { id: string; week_label: string; deadline_at: string } },
): Promise<void> {
  await sendPickReminder({
    playerId: opts.playerId,
    gameweekId: opts.gameweek.id,
    nextWeekLabel: opts.gameweek.week_label,
    deadline: opts.gameweek.deadline_at,
  })
}
