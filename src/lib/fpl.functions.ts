// Admin-callable server functions for FPL fixture / results sync.
import { createServerFn } from '@tanstack/react-start'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { verifyAdmin } from '@/lib/admin-auth.server'
import {
  importGameweekFixtures,
  syncGameweekResults,
} from '@/lib/fpl/fpl-sync.server'

async function getGameweek(competitionId: string, weekNumber: number) {
  const { data } = await supabaseAdmin
    .from('gameweeks')
    .select('id, fpl_event, week_number, results_locked')
    .eq('competition_id', competitionId)
    .eq('week_number', weekNumber)
    .maybeSingle()
  return data
}

export const importGameweekFromFPL = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string; weekNumber: number; fplEvent?: number }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    const gw = await getGameweek(data.competitionId, data.weekNumber)
    if (!gw) throw new Error(`GW${data.weekNumber} not found — create it first`)
    if (gw.results_locked) throw new Error('Gameweek is locked')

    const fplEvent = data.fplEvent ?? gw.fpl_event ?? data.weekNumber
    const out = await importGameweekFixtures({
      competitionId: data.competitionId,
      gameweekId: gw.id as string,
      fplEvent,
    })
    return { ok: true, imported: out.imported, firstKickoff: out.firstKickoff, fplEvent }
  })

export const syncGameweekFromFPL = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string; weekNumber: number }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    const gw = await getGameweek(data.competitionId, data.weekNumber)
    if (!gw) throw new Error(`GW${data.weekNumber} not found`)
    const fplEvent = gw.fpl_event ?? data.weekNumber
    const out = await syncGameweekResults({
      gameweekId: gw.id as string,
      fplEvent,
    })
    return { ok: true, ...out, fplEvent }
  })

export const getFPLStatus = createServerFn({ method: 'POST' })
  .inputValidator((d: { competitionId: string; pin: string; weekNumber: number }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin)
    const gw = await getGameweek(data.competitionId, data.weekNumber)
    if (!gw) return { hasFixtures: false, fplEvent: null, lastSyncedAt: null, finished: 0, total: 0 }
    const { data: rows } = await supabaseAdmin
      .from('results')
      .select('finished, fpl_fixture_id')
      .eq('gameweek_id', gw.id as string)
    const total = rows?.length ?? 0
    const finished = (rows ?? []).filter((r) => r.finished).length
    const hasFplFixtures = (rows ?? []).some((r) => r.fpl_fixture_id != null)
    const { data: gwFull } = await supabaseAdmin
      .from('gameweeks').select('last_synced_at, fpl_event').eq('id', gw.id as string).maybeSingle()
    return {
      hasFixtures: hasFplFixtures,
      fplEvent: gwFull?.fpl_event ?? null,
      lastSyncedAt: gwFull?.last_synced_at ?? null,
      finished,
      total,
    }
  })
