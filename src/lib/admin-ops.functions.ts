import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Verify admin PIN against the competition and return tenant_id.
async function verifyAdmin(competitionId: string, pin: string) {
  const { data: comp } = await supabaseAdmin
    .from("competitions")
    .select("id, tenant_id")
    .eq("id", competitionId)
    .eq("admin_pin", pin)
    .maybeSingle();
  if (!comp) throw new Error("Unauthorized");
  return comp as { id: string; tenant_id: string };
}

async function logAction(
  tenantId: string,
  action: string,
  actorLabel: string,
  targetType: string | null,
  targetId: string | null,
  payload: Record<string, unknown>,
) {
  await supabaseAdmin.from("admin_actions").insert({
    tenant_id: tenantId,
    actor_label: actorLabel,
    action,
    target_type: targetType,
    target_id: targetId,
    payload,
  } as never);
}

type PaymentMethod =
  | "online_stripe"
  | "online_revolut"
  | "online_other"
  | "cash"
  | "bank_transfer"
  | "manual_other";

// --- Add a manual entrant (admin-entered, offline source) ---
export const addManualEntrant = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      competitionId: string;
      pin: string;
      fullName: string;
      email?: string | null;
      phone?: string | null;
      paid: boolean;
      paymentMethod?: PaymentMethod | null;
      paymentAmount?: number | null;
      paymentNote?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    const comp = await verifyAdmin(data.competitionId, data.pin);

    // Insert into players (existing flow) — trigger syncs entrants + competition_entries.
    const { data: player, error } = await supabaseAdmin
      .from("players")
      .insert({
        competition_id: data.competitionId,
        full_name: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        paid: data.paid,
        alive: true,
      } as never)
      .select("*")
      .single();
    if (error) throw error;

    // Resolve the synced competition_entry to attach a payment row.
    const { data: entry } = await supabaseAdmin
      .from("competition_entries")
      .select("id")
      .eq("player_id", player.id)
      .maybeSingle();

    if (data.paid && entry && data.paymentMethod) {
      await supabaseAdmin.from("payments").insert({
        tenant_id: comp.tenant_id,
        competition_id: data.competitionId,
        entry_id: entry.id,
        method: data.paymentMethod,
        amount: data.paymentAmount ?? 0,
        currency: "EUR",
        note: data.paymentNote ?? null,
      } as never);
    }

    await logAction(
      comp.tenant_id,
      "entrant.add_manual",
      "admin",
      "player",
      player.id,
      {
        full_name: data.fullName,
        email: data.email ?? null,
        paid: data.paid,
        method: data.paymentMethod ?? null,
        amount: data.paymentAmount ?? null,
      },
    );

    return { ok: true, playerId: player.id, entryId: entry?.id ?? null };
  });

// --- List entries with payment summary ---
export const listEntries = createServerFn({ method: "POST" })
  .inputValidator((d: { competitionId: string; pin: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin);

    const { data: entries } = await supabaseAdmin
      .from("competition_entries")
      .select("id, paid, alive, player_id, entrant_id, created_at")
      .eq("competition_id", data.competitionId)
      .order("created_at", { ascending: true });

    const entrantIds = (entries ?? []).map((e) => e.entrant_id);
    const { data: entrants } = entrantIds.length
      ? await supabaseAdmin
          .from("entrants")
          .select("id, full_name, email, phone, source")
          .in("id", entrantIds)
      : { data: [] as Array<{ id: string; full_name: string; email: string | null; phone: string | null; source: string }> };

    const entryIds = (entries ?? []).map((e) => e.id);
    const { data: payments } = entryIds.length
      ? await supabaseAdmin
          .from("payments")
          .select("id, entry_id, method, amount, currency, note, created_at")
          .in("entry_id", entryIds)
          .order("created_at", { ascending: false })
      : { data: [] as Array<{ id: string; entry_id: string; method: string; amount: number; currency: string; note: string | null; created_at: string }> };

    const entrantMap = new Map((entrants ?? []).map((e) => [e.id, e]));
    const paymentsByEntry = new Map<string, typeof payments>();
    for (const p of payments ?? []) {
      const arr = paymentsByEntry.get(p.entry_id) ?? [];
      arr.push(p);
      paymentsByEntry.set(p.entry_id, arr);
    }

    return (entries ?? []).map((e) => ({
      id: e.id,
      playerId: e.player_id,
      paid: e.paid,
      alive: e.alive,
      createdAt: e.created_at,
      entrant: entrantMap.get(e.entrant_id) ?? null,
      payments: paymentsByEntry.get(e.id) ?? [],
    }));
  });

// --- Record a payment against an existing entry ---
export const recordPayment = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      competitionId: string;
      pin: string;
      entryId: string;
      method: PaymentMethod;
      amount: number;
      note?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    const comp = await verifyAdmin(data.competitionId, data.pin);

    const { data: entry } = await supabaseAdmin
      .from("competition_entries")
      .select("id, player_id, tenant_id")
      .eq("id", data.entryId)
      .maybeSingle();
    if (!entry || entry.tenant_id !== comp.tenant_id) {
      throw new Error("Entry not found");
    }

    const { error: payErr } = await supabaseAdmin.from("payments").insert({
      tenant_id: comp.tenant_id,
      competition_id: data.competitionId,
      entry_id: data.entryId,
      method: data.method,
      amount: data.amount,
      currency: "EUR",
      note: data.note ?? null,
    } as never);
    if (payErr) throw payErr;

    // Mark paid via players (trigger syncs back to entry).
    if (entry.player_id) {
      await supabaseAdmin
        .from("players")
        .update({ paid: true })
        .eq("id", entry.player_id);
    } else {
      await supabaseAdmin
        .from("competition_entries")
        .update({ paid: true })
        .eq("id", data.entryId);
    }

    await logAction(comp.tenant_id, "payment.record", "admin", "entry", data.entryId, {
      method: data.method,
      amount: data.amount,
      note: data.note ?? null,
    });

    return { ok: true };
  });

// --- Toggle paid status (unpay / mark paid without a payment record) ---
export const setEntryPaid = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { competitionId: string; pin: string; entryId: string; paid: boolean }) =>
      d,
  )
  .handler(async ({ data }) => {
    const comp = await verifyAdmin(data.competitionId, data.pin);

    const { data: entry } = await supabaseAdmin
      .from("competition_entries")
      .select("id, player_id, tenant_id")
      .eq("id", data.entryId)
      .maybeSingle();
    if (!entry || entry.tenant_id !== comp.tenant_id) {
      throw new Error("Entry not found");
    }

    if (entry.player_id) {
      await supabaseAdmin
        .from("players")
        .update({ paid: data.paid })
        .eq("id", entry.player_id);
    } else {
      await supabaseAdmin
        .from("competition_entries")
        .update({ paid: data.paid })
        .eq("id", data.entryId);
    }

    await logAction(
      comp.tenant_id,
      data.paid ? "entry.mark_paid" : "entry.mark_unpaid",
      "admin",
      "entry",
      data.entryId,
      {},
    );
    return { ok: true };
  });

// --- Read recent admin actions for audit tab ---
export const listAdminActions = createServerFn({ method: "POST" })
  .inputValidator((d: { competitionId: string; pin: string; limit?: number }) => d)
  .handler(async ({ data }) => {
    const comp = await verifyAdmin(data.competitionId, data.pin);
    const { data: rows } = await supabaseAdmin
      .from("admin_actions")
      .select("id, action, actor_label, target_type, target_id, payload, created_at")
      .eq("tenant_id", comp.tenant_id)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    return rows ?? [];
  });
