import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyAdmin } from "@/lib/admin-auth.server";
import { logAction } from "@/lib/admin-ops.server";

export interface EntryInput {
  displayName: string;
}

export interface CreatedEntry {
  entryId: string;
  playerId: string;
  magicToken: string;
  displayName: string;
}

async function findOrCreateAccount(opts: {
  tenantId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
}): Promise<string> {
  if (opts.email) {
    const { data: existing } = await supabaseAdmin
      .from("entrants")
      .select("id")
      .eq("tenant_id", opts.tenantId)
      .ilike("email", opts.email)
      .maybeSingle();
    if (existing) {
      // Update phone if previously missing
      if (opts.phone) {
        await supabaseAdmin
          .from("entrants")
          .update({ phone: opts.phone } as never)
          .eq("id", existing.id);
      }
      return existing.id as string;
    }
  }
  const { data: created, error } = await supabaseAdmin
    .from("entrants")
    .insert({
      tenant_id: opts.tenantId,
      full_name: opts.fullName,
      email: opts.email,
      phone: opts.phone,
      source: "online",
    } as never)
    .select("id")
    .single();
  if (error) throw error;
  return created.id as string;
}

async function createEntryRow(opts: {
  tenantId: string;
  competitionId: string;
  accountId: string;
  displayName: string;
  paid: boolean;
  offline?: boolean;
  email: string | null;
  phone: string | null;
}): Promise<CreatedEntry> {
  // Insert the player row first so we have its auto-generated magic_token,
  // then mirror that token onto the competition_entries row.
  const { data: player, error: pErr } = await supabaseAdmin
    .from("players")
    .insert({
      competition_id: opts.competitionId,
      full_name: opts.displayName,
      email: opts.email,
      phone: opts.phone,
      paid: opts.paid,
      alive: true,
      offline: !!opts.offline,
    } as never)
    .select("id, magic_token")
    .single();
  if (pErr) throw pErr;

  const { data: entry, error: eErr } = await supabaseAdmin
    .from("competition_entries")
    .insert({
      tenant_id: opts.tenantId,
      competition_id: opts.competitionId,
      entrant_id: opts.accountId,
      player_id: player.id,
      paid: opts.paid,
      alive: true,
      magic_token: player.magic_token,
      display_name: opts.displayName,
    } as never)
    .select("id")
    .single();
  if (eErr) throw eErr;

  return {
    entryId: entry.id as string,
    playerId: player.id as string,
    magicToken: player.magic_token as string,
    displayName: opts.displayName,
  };
}

/**
 * Create one account (entrant) + N entries in one shot.
 * Returns the created entry list. The first entry is treated as the
 * "primary" entry (uses the buyer's own name + handles the homepage GW1 pick).
 *
 * NOTE: paid=true here matches the existing flow where the user has
 * already self-confirmed payment in /pay. Switch to false once Stripe
 * webhooks drive payment confirmation server-side.
 */
export const createAccountWithEntries = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      competitionId: string;
      buyerName: string;
      email: string;
      phone: string;
      offline?: boolean;
      entries: EntryInput[]; // length 1..6
    }) => d,
  )
  .handler(async ({ data }) => {
    const isOffline = !!data.offline;
    const email = data.email.trim() || null;
    if (!isOffline && !email) throw new Error("Email is required");
    if (!data.entries.length || data.entries.length > 6) {
      throw new Error("Choose between 1 and 6 entries");
    }

    const { data: comp } = await supabaseAdmin
      .from("competitions")
      .select("id, tenant_id")
      .eq("id", data.competitionId)
      .maybeSingle();
    if (!comp) throw new Error("Competition not found");

    const accountId = await findOrCreateAccount({
      tenantId: comp.tenant_id as string,
      fullName: data.buyerName.trim() || "Player",
      email,
      phone: data.phone.trim() || null,
    });

    const created: CreatedEntry[] = [];
    for (let i = 0; i < data.entries.length; i++) {
      const raw = (data.entries[i].displayName ?? "").trim();
      const fallback = i === 0
        ? data.buyerName.trim() || "Entry 1"
        : `Entry ${i + 1}`;
      const displayName = raw || fallback;
      const entry = await createEntryRow({
        tenantId: comp.tenant_id as string,
        competitionId: data.competitionId,
        accountId,
        displayName,
        paid: true,
        offline: isOffline && i === 0,
        // Only the primary entry gets the account email on the player row,
        // so per-player triggers don't double-send.
        email: i === 0 ? email : null,
        phone: i === 0 ? data.phone.trim() || null : null,
      });
      created.push(entry);
    }

    return { accountId, entries: created };
  });

/** Set every entry under an account to paid=true. Used by Stripe-link confirm flow. */
export const markAccountPaid = createServerFn({ method: "POST" })
  .inputValidator((d: { accountId: string; competitionId: string }) => d)
  .handler(async ({ data }) => {
    const { data: entries } = await supabaseAdmin
      .from("competition_entries")
      .select("id, player_id")
      .eq("entrant_id", data.accountId)
      .eq("competition_id", data.competitionId);
    const ids = (entries ?? []).map((e) => e.id);
    const playerIds = (entries ?? []).map((e) => e.player_id).filter(Boolean) as string[];
    if (ids.length) {
      await supabaseAdmin
        .from("competition_entries")
        .update({ paid: true } as never)
        .in("id", ids);
    }
    if (playerIds.length) {
      await supabaseAdmin
        .from("players")
        .update({ paid: true } as never)
        .in("id", playerIds);
    }
    return { ok: true, count: ids.length };
  });

/**
 * Admin "Add entry manually". Matches an account by (tenant + email), or
 * creates one, then adds a single entry under it.
 */
export const addManualEntry = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      competitionId: string;
      pin: string;
      email: string | null;
      phone: string | null;
      displayName: string;
      buyerName?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    const comp = await verifyAdmin(data.competitionId, data.pin);
    const accountId = await findOrCreateAccount({
      tenantId: comp.tenant_id,
      fullName: (data.buyerName || data.displayName || "Player").trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
    });
    const entry = await createEntryRow({
      tenantId: comp.tenant_id,
      competitionId: data.competitionId,
      accountId,
      displayName: (data.displayName || "Entry").trim(),
      paid: false,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
    });
    await logAction(
      comp.tenant_id,
      "entry.add_manual_v2",
      "admin",
      "entry",
      entry.entryId,
      {
        account_id: accountId,
        display_name: entry.displayName,
        email: data.email ?? null,
      },
    );
    return { accountId, ...entry };
  });

/** Admin listing grouped by account for the new Entries tab. */
export const listAccountsWithEntries = createServerFn({ method: "POST" })
  .inputValidator((d: { competitionId: string; pin: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin);
    const { data: entries } = await supabaseAdmin
      .from("competition_entries")
      .select("id, entrant_id, player_id, paid, alive, display_name, magic_token, created_at")
      .eq("competition_id", data.competitionId)
      .order("created_at", { ascending: true });

    const entrantIds = Array.from(
      new Set((entries ?? []).map((e) => e.entrant_id as string)),
    );
    const { data: entrants } = entrantIds.length
      ? await supabaseAdmin
          .from("entrants")
          .select("id, full_name, email, phone")
          .in("id", entrantIds)
      : { data: [] as Array<{ id: string; full_name: string; email: string | null; phone: string | null }> };
    const entrantMap = new Map((entrants ?? []).map((e) => [e.id, e]));

    return (entries ?? []).map((e) => ({
      entryId: e.id as string,
      accountId: e.entrant_id as string,
      playerId: e.player_id as string | null,
      paid: !!e.paid,
      alive: !!e.alive,
      displayName: (e.display_name as string) ?? "Entry",
      magicToken: (e.magic_token as string) ?? null,
      createdAt: e.created_at as string,
      account: entrantMap.get(e.entrant_id as string) ?? null,
    }));
  });
