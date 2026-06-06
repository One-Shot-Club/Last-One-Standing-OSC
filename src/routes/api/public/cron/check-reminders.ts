// Polled every minute by pg_cron. Handles:
//  - 24h pick reminders
//  - 1h pick reminders
//  - auto-processing gameweek results 70 minutes after last_match_ends_at
//
// Auth: requires apikey header == Supabase anon publishable key (cheap shared secret).
import { createFileRoute } from '@tanstack/react-router'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import {
  sendReminder,
} from '@/lib/email/triggers.server'
import { processGameweekResultsInternal } from '@/lib/results-engine.server'

const REMINDER_24H_WINDOW_MIN = 15 // minutes before/after target
const REMINDER_1H_WINDOW_MIN = 15
const AUTO_LOCK_DELAY_MIN = 70

export const Route = createFileRoute('/api/public/cron/check-reminders')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        const provided = request.headers.get('apikey') || request.headers.get('x-api-key')
        if (!expected || !provided || provided !== expected) {
          return new Response('Unauthorized', { status: 401 })
        }

        const now = Date.now()
        const reminders: Array<{ kind: '24h' | '1h'; player_id: string; gameweek_id: string }> = []
        let processedGameweeks = 0

        // --- 1. Find upcoming gameweeks in the reminder windows
        const startWindow = new Date(now + 45 * 60_000).toISOString()       // 45 min away
        const endWindow = new Date(now + (24 * 60 + 30) * 60_000).toISOString() // 24h30 away
        const { data: gws } = await supabaseAdmin
          .from('gameweeks')
          .select('*')
          .gte('deadline_at', startWindow)
          .lte('deadline_at', endWindow)

        for (const gw of gws ?? []) {
          const deadlineMs = new Date(gw.deadline_at).getTime()
          const minsToDeadline = (deadlineMs - now) / 60_000

          let kind: '24h' | '1h' | null = null
          if (Math.abs(minsToDeadline - 24 * 60) <= REMINDER_24H_WINDOW_MIN) kind = '24h'
          else if (Math.abs(minsToDeadline - 60) <= REMINDER_1H_WINDOW_MIN) kind = '1h'
          if (!kind) continue

          // Alive players in this competition without a pick this week and without a reminder of this kind sent
          const { data: alive } = await supabaseAdmin
            .from('players').select('id, email')
            .eq('competition_id', gw.competition_id).eq('alive', true)

          if (!alive?.length) continue
          const playerIds = alive.map((p) => p.id)

          const { data: picksThisWeek } = await supabaseAdmin
            .from('picks').select('player_id')
            .eq('competition_id', gw.competition_id).eq('week', gw.week_number)
            .in('player_id', playerIds)
          const pickedIds = new Set((picksThisWeek ?? []).map((p) => p.player_id))

          const { data: sent } = await supabaseAdmin
            .from('reminders_sent').select('player_id')
            .eq('gameweek_id', gw.id).eq('kind', kind)
            .in('player_id', playerIds)
          const sentIds = new Set((sent ?? []).map((s) => s.player_id))

          for (const p of alive) {
            if (pickedIds.has(p.id)) continue
            if (sentIds.has(p.id)) continue
            // Best-effort reservation to avoid duplicate sends across concurrent runs
            const { error: insErr } = await supabaseAdmin
              .from('reminders_sent').insert({ player_id: p.id, gameweek_id: gw.id, kind })
            if (insErr) continue // unique violation = another worker got it
            await sendReminder(kind, { playerId: p.id, gameweek: gw as any })
            reminders.push({ kind, player_id: p.id, gameweek_id: gw.id })
          }
        }

        // --- 2. Auto-process gameweeks whose last_match_ends_at + 70min has passed
        const cutoff = new Date(now - AUTO_LOCK_DELAY_MIN * 60_000).toISOString()
        const { data: dueGws } = await supabaseAdmin
          .from('gameweeks').select('*')
          .eq('results_locked', false)
          .lte('last_match_ends_at', cutoff)

        for (const gw of dueGws ?? []) {
          try {
            await processGameweekResultsInternal(gw.competition_id, gw.id)
            processedGameweeks++
          } catch (e) {
            console.error('[cron] processGameweekResults failed', { gw: gw.id, e })
          }
        }

        return Response.json({
          remindersEnqueued: reminders.length,
          processedGameweeks,
          ts: new Date(now).toISOString(),
        })
      },
    },
  },
})
