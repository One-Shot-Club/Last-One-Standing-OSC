// High-level email triggers. These wrap enqueueTemplatedEmail with typed
// inputs and pull common data (club name, magic link URL, formatted dates)
// in one place. Server-only.
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { enqueueTemplatedEmail } from './send.server'

function appBaseUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.PUBLIC_APP_URL ||
    'https://killeshin-gaa-lastmanstanding.oneshotclub.ie'
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

interface Player {
  id: string
  full_name: string
  email: string
  magic_token: string
  competition_id: string
}

interface Competition {
  id: string
  name: string
  club_name: string | null
  prize_pool: number
}

interface Gameweek {
  id: string
  week_number: number
  week_label: string
  deadline_at: string
}

async function getCompetition(id: string): Promise<Competition | null> {
  const { data } = await supabaseAdmin.from('competitions').select('id, name, club_name, prize_pool').eq('id', id).maybeSingle()
  return data as any
}

async function teamBadgeUrl(competitionId: string, teamName: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('teams').select('badge_url').eq('competition_id', competitionId).eq('name', teamName).maybeSingle()
  return data?.badge_url ?? null
}

async function countPlayers(competitionId: string, aliveOnly = false): Promise<number> {
  let q = supabaseAdmin.from('players').select('id', { count: 'exact', head: true }).eq('competition_id', competitionId)
  if (aliveOnly) q = q.eq('alive', true)
  const { count } = await q
  return count ?? 0
}

// 1. Entry confirmation
export async function sendEntryConfirmation(playerId: string, week: number): Promise<void> {
  const { data: player } = await supabaseAdmin.from('players').select('*').eq('id', playerId).maybeSingle()
  if (!player) return
  const comp = await getCompetition(player.competition_id)
  if (!comp) return
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
    templateData: {
      firstName: firstNameOf(player.full_name),
      clubName: comp.club_name ?? comp.name,
      competitionName: comp.name,
      team,
      teamBadgeUrl: badge ?? undefined,
      weekLabel,
      prizePool: Number(comp.prize_pool ?? 0),
      playersEntered: players,
      deadline: formatDeadline(gw?.deadline_at ?? null),
      magicLink: magicLinkFor(player.magic_token),
    },
  })
}

// 2A. Elimination
export async function sendElimination(opts: {
  playerId: string
  gameweekId: string
  weekLabel: string
  pickedTeam: string | null
  resultLine: string | null
  noPick?: boolean
}): Promise<void> {
  const { data: player } = await supabaseAdmin.from('players').select('*').eq('id', opts.playerId).maybeSingle()
  if (!player) return
  const comp = await getCompetition(player.competition_id)
  if (!comp) return
  const { data: picks } = await supabaseAdmin
    .from('picks').select('week, team').eq('player_id', opts.playerId).order('week', { ascending: true })
  const pickHistory = (picks ?? []).map((p) => ({ week: `GW${p.week}`, team: p.team }))
  // weeks survived = number of weeks they made it through alive. If they were
  // just eliminated this week, weeks survived = picks_count - 1 (their last
  // pick was the losing one). If no pick, survived = picks before this week.
  const survived = opts.noPick ? pickHistory.length : Math.max(0, pickHistory.length - 1)

  await enqueueTemplatedEmail({
    templateName: 'elimination',
    to: player.email,
    idempotencyKey: `elim-${opts.playerId}-${opts.gameweekId}`,
    templateData: {
      firstName: firstNameOf(player.full_name),
      clubName: comp.club_name ?? comp.name,
      weekLabel: opts.weekLabel,
      pickedTeam: opts.pickedTeam ?? '',
      resultLine: opts.resultLine ?? '',
      weeksSurvived: survived,
      pickHistory,
      shareUrl: competitionShareUrl(player.competition_id),
      noPick: !!opts.noPick,
    },
  })
}

// 2B. Progression
export async function sendProgression(opts: {
  playerId: string
  gameweekId: string
  weekLabel: string
  nextWeekLabel: string
  nextDeadline: string | null
}): Promise<void> {
  const { data: player } = await supabaseAdmin.from('players').select('*').eq('id', opts.playerId).maybeSingle()
  if (!player) return
  const comp = await getCompetition(player.competition_id)
  if (!comp) return
  const remaining = await countPlayers(player.competition_id, true)
  const { data: priorPicks } = await supabaseAdmin
    .from('picks').select('team').eq('player_id', opts.playerId)
  const usedTeams = (priorPicks ?? []).map((p) => p.team)

  // TESTING: hard-wire next week to GW2 so all progression emails point at the
  // GW2 selection page regardless of which week was just processed.
  const nextWeekLabel = 'GW2'
  const { data: gw2 } = await supabaseAdmin
    .from('gameweeks').select('deadline_at')
    .eq('competition_id', player.competition_id).eq('week_number', 2).maybeSingle()
  const nextDeadline = gw2?.deadline_at ?? opts.nextDeadline

  await enqueueTemplatedEmail({
    templateName: 'progression',
    to: player.email,
    idempotencyKey: `progress-${opts.playerId}-${opts.gameweekId}`,
    templateData: {
      firstName: firstNameOf(player.full_name),
      clubName: comp.club_name ?? comp.name,
      weekLabel: opts.weekLabel,
      nextWeekLabel,
      playersRemaining: remaining,
      prizePool: Number(comp.prize_pool ?? 0),
      deadline: formatDeadline(nextDeadline),
      countdownCopy: nextDeadline ? humanCountdown(nextDeadline) : '',
      magicLink: magicLinkFor(player.magic_token),
      usedTeams,
    },
  })
}

// 3 & 4. Reminders
export async function sendReminder(kind: '24h' | '1h', opts: {
  playerId: string
  gameweek: Gameweek
}): Promise<void> {
  const { data: player } = await supabaseAdmin.from('players').select('*').eq('id', opts.playerId).maybeSingle()
  if (!player) return
  const comp = await getCompetition(player.competition_id)
  if (!comp) return
  const { data: priorPicks } = await supabaseAdmin
    .from('picks').select('team').eq('player_id', opts.playerId)
  const usedTeams = (priorPicks ?? []).map((p) => p.team)
  const remaining = await countPlayers(player.competition_id, true)

  // TESTING: force reminder copy to reference GW2.
  const nextWeekLabel = 'GW2'
  const { data: gw2 } = await supabaseAdmin
    .from('gameweeks').select('deadline_at')
    .eq('competition_id', player.competition_id).eq('week_number', 2).maybeSingle()
  const deadline = gw2?.deadline_at ?? opts.gameweek.deadline_at

  await enqueueTemplatedEmail({
    templateName: kind === '24h' ? 'reminder-24h' : 'reminder-1h',
    to: player.email,
    idempotencyKey: `${kind}-${opts.playerId}-${opts.gameweek.id}`,
    templateData: {
      firstName: firstNameOf(player.full_name),
      clubName: comp.club_name ?? comp.name,
      nextWeekLabel,
      deadline: formatDeadline(deadline),
      playersRemaining: remaining,
      magicLink: magicLinkFor(player.magic_token),
      usedTeams,
    },
  })
}
