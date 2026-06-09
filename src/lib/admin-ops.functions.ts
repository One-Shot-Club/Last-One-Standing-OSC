import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

// Resolve current user from the request bearer token, if present.
// Returns null when no token / invalid token (does NOT throw).
async function getOptionalUserId(): Promise<string | null> {
  try {
    const req = getRequest();
    const authHeader = req?.headers?.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await sb.auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return data.claims.sub as string;
  } catch {
    return null;
  }
}

// Verify admin access against a competition.
// Accepts EITHER a valid Supabase Auth session with tenant_admin+ access,
// OR the legacy shared admin PIN. Returns competition + tenant_id + actor.
async function verifyAdmin(competitionId: string, pin: string) {
  const { data: comp } = await supabaseAdmin
    .from("competitions")
    .select("id, tenant_id, admin_pin")
    .eq("id", competitionId)
    .maybeSingle();
  if (!comp) throw new Error("Unauthorized");

  // 1) Prefer Supabase Auth session
  const userId = await getOptionalUserId();
  if (userId) {
    const { data: ok } = await supabaseAdmin.rpc("has_tenant_access", {
      _user_id: userId,
      _tenant_id: comp.tenant_id as string,
      _min_role: "tenant_admin",
    });
    if (ok === true) {
      return {
        id: comp.id as string,
        tenant_id: comp.tenant_id as string,
        actorId: userId,
        actorLabel: `auth:${userId}`,
      };
    }
  }

  // 2) Legacy shared PIN fallback
  if (pin && pin === (comp.admin_pin as string | null)) {
    return {
      id: comp.id as string,
      tenant_id: comp.tenant_id as string,
      actorId: null as string | null,
      actorLabel: "pin",
    };
  }

  throw new Error("Unauthorized");
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

// --- Eliminate / reinstate a player (admin override) ---
export const setPlayerAlive = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { competitionId: string; pin: string; playerId: string; alive: boolean; reason?: string | null }) => d,
  )
  .handler(async ({ data }) => {
    const comp = await verifyAdmin(data.competitionId, data.pin);

    const { data: player } = await supabaseAdmin
      .from("players")
      .select("id, competition_id, alive, full_name")
      .eq("id", data.playerId)
      .maybeSingle();
    if (!player || player.competition_id !== data.competitionId) {
      throw new Error("Player not found");
    }

    const { error } = await supabaseAdmin
      .from("players")
      .update({ alive: data.alive })
      .eq("id", data.playerId);
    if (error) throw error;

    await logAction(
      comp.tenant_id,
      data.alive ? "player.reinstate" : "player.eliminate",
      "admin",
      "player",
      data.playerId,
      { full_name: player.full_name, previous: player.alive, reason: data.reason ?? null },
    );
    return { ok: true };
  });

// --- Override / set a pick on behalf of a player (admin) ---
export const overridePick = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      competitionId: string;
      pin: string;
      playerId: string;
      week: number;
      team: string;
      reason?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    const comp = await verifyAdmin(data.competitionId, data.pin);

    const { data: player } = await supabaseAdmin
      .from("players")
      .select("id, competition_id, full_name")
      .eq("id", data.playerId)
      .maybeSingle();
    if (!player || player.competition_id !== data.competitionId) {
      throw new Error("Player not found");
    }

    // Capture previous pick for audit
    const { data: prior } = await supabaseAdmin
      .from("picks")
      .select("id, team, result")
      .eq("player_id", data.playerId)
      .eq("week", data.week)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("picks")
      .upsert(
        {
          player_id: data.playerId,
          competition_id: data.competitionId,
          week: data.week,
          team: data.team,
        } as never,
        { onConflict: "player_id,week" },
      );
    if (error) throw error;

    await logAction(
      comp.tenant_id,
      prior ? "pick.override" : "pick.create",
      "admin",
      "player",
      data.playerId,
      {
        full_name: player.full_name,
        week: data.week,
        team: data.team,
        previous_team: prior?.team ?? null,
        previous_result: prior?.result ?? null,
        reason: data.reason ?? null,
      },
    );
    return { ok: true };
  });

// --- Delete a pick (admin) ---
export const deletePick = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { competitionId: string; pin: string; playerId: string; week: number; reason?: string | null }) => d,
  )
  .handler(async ({ data }) => {
    const comp = await verifyAdmin(data.competitionId, data.pin);

    const { data: prior } = await supabaseAdmin
      .from("picks")
      .select("id, team")
      .eq("player_id", data.playerId)
      .eq("week", data.week)
      .maybeSingle();
    if (!prior) return { ok: true };

    const { error } = await supabaseAdmin.from("picks").delete().eq("id", prior.id);
    if (error) throw error;

    await logAction(comp.tenant_id, "pick.delete", "admin", "player", data.playerId, {
      week: data.week,
      previous_team: prior.team,
      reason: data.reason ?? null,
    });
    return { ok: true };
  });

// --- Bulk CSV import of entrants ---
// Rows: { fullName, email, phone?, paid? }
export const importEntrants = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      competitionId: string;
      pin: string;
      rows: Array<{
        fullName: string;
        email: string;
        phone?: string | null;
        paid?: boolean;
      }>;
    }) => d,
  )
  .handler(async ({ data }) => {
    const comp = await verifyAdmin(data.competitionId, data.pin);

    let inserted = 0;
    let skipped = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      const fullName = (row.fullName ?? "").trim();
      const email = (row.email ?? "").trim().toLowerCase();
      if (!fullName || !email) {
        errors.push({ row: i + 1, reason: "missing name or email" });
        skipped++;
        continue;
      }
      // Skip duplicates within this competition by email
      const { data: existing } = await supabaseAdmin
        .from("players")
        .select("id")
        .eq("competition_id", data.competitionId)
        .ilike("email", email)
        .maybeSingle();
      if (existing) {
        skipped++;
        continue;
      }
      const { error } = await supabaseAdmin.from("players").insert({
        competition_id: data.competitionId,
        full_name: fullName,
        email,
        phone: row.phone || null,
        paid: !!row.paid,
        alive: true,
      } as never);
      if (error) {
        errors.push({ row: i + 1, reason: error.message });
        skipped++;
      } else {
        inserted++;
      }
    }

    await logAction(comp.tenant_id, "entrants.bulk_import", "admin", null, null, {
      total: data.rows.length,
      inserted,
      skipped,
      errors: errors.slice(0, 25),
    });
    return { ok: true, inserted, skipped, errors };
  });

// --- Broadcast message to all / alive / eliminated players ---
export const broadcastMessage = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      competitionId: string;
      pin: string;
      audience: "all" | "alive" | "eliminated" | "paid" | "unpaid";
      subject: string;
      body: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const comp = await verifyAdmin(data.competitionId, data.pin);
    const subject = data.subject.trim();
    const body = data.body.trim();
    if (!subject || !body) throw new Error("Subject and body required");

    let query = supabaseAdmin
      .from("players")
      .select("id, full_name, email, alive, paid, magic_token")
      .eq("competition_id", data.competitionId);

    if (data.audience === "alive") query = query.eq("alive", true);
    else if (data.audience === "eliminated") query = query.eq("alive", false);
    else if (data.audience === "paid") query = query.eq("paid", true);
    else if (data.audience === "unpaid") query = query.eq("paid", false);

    const { data: recipients, error } = await query;
    if (error) throw error;

    const { enqueueTemplatedEmail } = await import("@/lib/email/send.server");
    const broadcastId = crypto.randomUUID();
    const clubName = "Killeshin GAA";
    let queued = 0;
    for (const r of recipients ?? []) {
      if (!r.email) continue;
      const firstName = (r.full_name ?? "Player").split(/\s+/)[0];
      const res = await enqueueTemplatedEmail({
        templateName: "broadcast",
        to: r.email,
        idempotencyKey: `${broadcastId}:${r.id}`,
        templateData: {
          firstName,
          clubName,
          subject,
          bodyText: body,
          magicLink: `https://last-one-standing.oneshotclub.ie/pick?token=${r.magic_token}`,
        },
      });
      if (res.ok) queued++;
    }

    await supabaseAdmin.from("messages").insert({
      tenant_id: comp.tenant_id,
      competition_id: data.competitionId,
      audience: data.audience,
      template: "broadcast",
      subject,
      body,
      recipient_count: queued,
    } as never);

    await logAction(comp.tenant_id, "broadcast.send", "admin", null, null, {
      audience: data.audience,
      subject,
      recipient_count: queued,
      total_targeted: recipients?.length ?? 0,
    });

    return { ok: true, queued, targeted: recipients?.length ?? 0 };
  });

// --- List recent broadcast messages ---
export const listMessages = createServerFn({ method: "POST" })
  .inputValidator((d: { competitionId: string; pin: string }) => d)
  .handler(async ({ data }) => {
    const comp = await verifyAdmin(data.competitionId, data.pin);
    const { data: rows } = await supabaseAdmin
      .from("messages")
      .select("id, audience, subject, body, recipient_count, sent_at")
      .eq("tenant_id", comp.tenant_id)
      .order("sent_at", { ascending: false })
      .limit(50);
    return rows ?? [];
  });

// ----- Phase 4d: Supabase Auth tenant access -----
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyTenantAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, never>) => d)
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    const { data: isPlatform } = await supabaseAdmin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (isPlatform) {
      const { data: all } = await supabaseAdmin
        .from("tenants")
        .select("id, slug, name")
        .order("name");
      return (all ?? []).map((t) => ({
        tenant_id: t.id as string,
        tenant_slug: t.slug as string,
        tenant_name: t.name as string,
        role: "platform_super_admin" as string,
      }));
    }

    const { data: members } = await supabaseAdmin
      .from("tenant_members")
      .select("tenant_id, role, tenants(id, slug, name)")
      .eq("user_id", userId);
    return (members ?? []).map((m) => {
      const t = (m as { tenants: { id: string; slug: string; name: string } | null }).tenants;
      return {
        tenant_id: t?.id ?? (m.tenant_id as string),
        tenant_slug: t?.slug ?? "",
        tenant_name: t?.name ?? "",
        role: m.role as string,
      };
    });
  });
