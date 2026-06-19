// Cron-called endpoint: every ~20min, sync live FPL results for any
// competition with an active (unprocessed) gameweek in the live window.
// Auth: Supabase anon key in `apikey` header (platform convention).
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/cron/sync-fpl-results')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get('apikey')
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response('Unauthorized', { status: 401 })
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { syncGameweekResults } = await import('@/lib/fpl/fpl-sync.server')
        const { processGameweekResultsInternal } = await import('@/lib/results-engine.server')

        const now = Date.now()
        const windowStart = new Date(now - 4 * 60 * 60 * 1000).toISOString()
        const windowEnd = new Date(now + 15 * 60 * 1000).toISOString()

        // Gameweeks with FPL linkage, not yet processed, whose first kickoff
        // is within the live window (-4h .. +15min from now).
        const { data: gws } = await supabaseAdmin
          .from('gameweeks')
          .select('id, competition_id, week_number, fpl_event, first_kickoff_at, results_locked, processed_at')
          .not('fpl_event', 'is', null)
          .is('processed_at', null)
          .gte('first_kickoff_at', windowStart)
          .lte('first_kickoff_at', windowEnd)

        const results: Array<Record<string, unknown>> = []

        for (const gw of gws ?? []) {
          try {
            const sync = await syncGameweekResults({
              gameweekId: gw.id as string,
              fplEvent: gw.fpl_event as number,
            })
            let processed: { eliminated: number; progressed: number } | null = null
            if (sync.allFinished && !gw.processed_at && !gw.results_locked) {
              processed = await processGameweekResultsInternal(
                gw.competition_id as string,
                gw.id as string,
              )
            }
            results.push({
              gameweekId: gw.id,
              week: gw.week_number,
              ...sync,
              processed,
            })
          } catch (e) {
            results.push({
              gameweekId: gw.id,
              week: gw.week_number,
              error: e instanceof Error ? e.message : String(e),
            })
          }
        }

        return Response.json({
          ok: true,
          checked: results.length,
          ranAt: new Date().toISOString(),
          results,
        })
      },
    },
  },
})
