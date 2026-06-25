import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEntryConfirmation } from "@/lib/email/triggers.server";
import { verifyAdmin } from "@/lib/admin-auth.server";

export const setPaymentLink = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      competitionId: string;
      pin: string;
      kind: "stripe" | "revolut" | "payment";
      url: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin);
    const update: {
      stripe_link?: string;
      revolut_link?: string;
      payment_link?: string;
    } =
      data.kind === "stripe"
        ? { stripe_link: data.url }
        : data.kind === "revolut"
          ? { revolut_link: data.url }
          : { payment_link: data.url };
    const { error } = await supabaseAdmin
      .from("competitions")
      .update(update)
      .eq("id", data.competitionId);
    if (error) throw error;
    return { ok: true };
  });

export const setCompetitionPaymentSettings = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      competitionId: string;
      pin: string;
      entryFee: number;
      stripeLink: string | null;
      revolutLink: string | null;
      paymentLink: string | null;
      stripeEnabled: boolean;
      revolutEnabled: boolean;
      paymentEnabled: boolean;
    }) => d,
  )
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin);
    const fee = Number.isFinite(data.entryFee) && data.entryFee >= 0 ? data.entryFee : 0;
    const update = {
      entry_fee: fee,
      stripe_link: data.stripeLink?.trim() || null,
      revolut_link: data.revolutLink?.trim() || null,
      payment_link: data.paymentLink?.trim() || null,
      stripe_enabled: data.stripeEnabled,
      revolut_enabled: data.revolutEnabled,
      payment_enabled: data.paymentEnabled,
    };
    const { error } = await supabaseAdmin
      .from("competitions")
      .update(update as never)
      .eq("id", data.competitionId);
    if (error) throw error;
    return { ok: true };
  });

export const getDemoCompetition = createServerFn({ method: "GET" }).handler(
  async () => {
    const { data, error } = await supabaseAdmin
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
);

export const getCompetition = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { data: comp, error } = await supabaseAdmin
      .from("competitions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return comp;
  });

export const joinCompetition = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      competitionId: string;
      fullName: string;
      email: string;
      phone: string;
      offline?: boolean;
    }) => d,
  )
  .handler(async ({ data }) => {
    const isOffline = !!data.offline;
    const email = data.email?.trim() ? data.email.trim() : null;
    if (!isOffline && !email) throw new Error("Email is required");
    const { data: player, error } = await supabaseAdmin
      .from("players")
      .insert({
        competition_id: data.competitionId,
        full_name: data.fullName,
        email,
        phone: data.phone || null,
        paid: true,
        alive: true,
        offline: isOffline,
      } as never)
      .select("*")
      .single();
    if (error) throw error;
    return player;
  });

// Multi-entry purchase: create the owner + any additional sub-entries
// (grouped under owner_player_id), and write each entry's GW pick in one call.
export const joinCompetitionWithEntries = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      competitionId: string;
      week: number;
      owner: {
        fullName: string;
        email: string;
        phone: string;
        team: string;
        offline?: boolean;
      };
      additional: Array<{
        fullName: string;
        team: string;
        email?: string | null;
        phone?: string | null;
        selfManaged?: boolean;
      }>;
    }) => d,
  )
  .handler(async ({ data }) => {
    const isOffline = !!data.owner.offline;
    const email = data.owner.email?.trim() ? data.owner.email.trim() : null;
    if (!isOffline && !email) throw new Error("Email is required");

    // 1. Owner
    const { data: owner, error: ownerErr } = await supabaseAdmin
      .from("players")
      .insert({
        competition_id: data.competitionId,
        full_name: data.owner.fullName,
        email,
        phone: data.owner.phone || null,
        paid: true,
        alive: true,
        offline: isOffline,
      } as never)
      .select("*")
      .single();
    if (ownerErr) throw ownerErr;

    // 2. Sub-entries. If `selfManaged` is set and an email was provided we
    // store the entrant's own contact and mark them online so notifications
    // are addressed to them directly; otherwise they inherit the owner's
    // contact (email/phone null, offline=true).
    const subPlayers: Array<{ id: string; magic_token: string; full_name: string }> = [];
    if (data.additional.length > 0) {
      const { data: subs, error: subErr } = await supabaseAdmin
        .from("players")
        .insert(
          data.additional.map((a) => {
            const subEmail = a.selfManaged && a.email?.trim() ? a.email.trim() : null;
            const subPhone = a.selfManaged && a.phone?.trim() ? a.phone.trim() : null;
            return {
              competition_id: data.competitionId,
              full_name: a.fullName,
              email: subEmail,
              phone: subPhone,
              paid: true,
              alive: true,
              offline: !subEmail,
              owner_player_id: owner.id,
            };
          }) as never,
        )
        .select("id, magic_token, full_name");
      if (subErr) throw subErr;
      subPlayers.push(...(subs ?? []));
    }

    // 3. Picks for owner + sub-entries.
    const picksRows = [
      {
        player_id: owner.id,
        competition_id: data.competitionId,
        week: data.week,
        team: data.owner.team,
      },
      ...data.additional.map((a, i) => ({
        player_id: subPlayers[i].id,
        competition_id: data.competitionId,
        week: data.week,
        team: a.team,
      })),
    ];
    const { error: pickErr } = await supabaseAdmin
      .from("picks")
      .insert(picksRows as never);
    if (pickErr) throw pickErr;

    // 4. Single confirmation email to owner listing every entry.
    try {
      await sendEntryConfirmation(owner.id, data.week);
    } catch (e) {
      console.error("[email] multi-entry confirmation failed", e);
    }

    return { ownerToken: owner.magic_token, ownerId: owner.id };
  });

/**
 * Stripe Checkout flow: creates the same player + sub-entry + pick rows as
 * joinCompetitionWithEntries BUT inserts them as `paid: false`, then opens
 * a Stripe Checkout session with a destination charge routed to the club's
 * connected account and the platform application fee applied.
 *
 * On `checkout.session.completed` the webhook flips paid → true and sends
 * the confirmation email. We do NOT send confirmation here.
 */
export const startStripeCheckoutForEntries = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      competitionId: string;
      week: number;
      origin: string;
      owner: {
        fullName: string;
        email: string;
        phone: string;
        team: string;
      };
      additional: Array<{
        fullName: string;
        team: string;
        email?: string | null;
        phone?: string | null;
        selfManaged?: boolean;
      }>;
    }) => d,
  )
  .handler(async ({ data }) => {
    const email = data.owner.email?.trim();
    if (!email) throw new Error("Email is required for card payment");

    // Load competition + tenant to compute fees and resolve the connected
    // account.
    const { data: comp, error: cErr } = await supabaseAdmin
      .from("competitions")
      .select(
        "id, tenant_id, entry_fee, application_fee_flat_cents, application_fee_percent_bps, fee_payer",
      )
      .eq("id", data.competitionId)
      .maybeSingle();
    if (cErr || !comp) throw new Error("Competition not found");
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("stripe_account_id, stripe_charges_enabled, name")
      .eq("id", comp.tenant_id as string)
      .maybeSingle();
    if (!tenant?.stripe_account_id || !tenant.stripe_charges_enabled) {
      throw new Error(
        "This club hasn't completed Stripe onboarding yet — please use another payment method.",
      );
    }

    const entries = 1 + data.additional.length;
    const feeEuros = Number(comp.entry_fee ?? 0);
    const perEntryCents = Math.round(feeEuros * 100);
    const subtotalCents = perEntryCents * entries;
    const flat = Number(comp.application_fee_flat_cents ?? 0);
    const bps = Number(comp.application_fee_percent_bps ?? 0);
    const appFeeCents =
      flat * entries + Math.round((subtotalCents * bps) / 10000);
    // Rough Stripe-fee passthrough estimate when fee_payer = 'player'.
    // 1.5% + 25c EEA cards (approx). Adjust later if needed.
    const stripeFeeEstimate =
      comp.fee_payer === "player"
        ? Math.round(subtotalCents * 0.015) + 25 * entries
        : 0;
    const unitAmount = perEntryCents + Math.round(stripeFeeEstimate / entries);

    // 1) Insert owner + sub-entries as UNPAID.
    const { data: owner, error: ownerErr } = await supabaseAdmin
      .from("players")
      .insert({
        competition_id: data.competitionId,
        full_name: data.owner.fullName,
        email,
        phone: data.owner.phone || null,
        paid: false,
        alive: true,
        offline: false,
      } as never)
      .select("*")
      .single();
    if (ownerErr) throw ownerErr;

    const subPlayers: Array<{ id: string; magic_token: string }> = [];
    if (data.additional.length > 0) {
      const { data: subs, error: subErr } = await supabaseAdmin
        .from("players")
        .insert(
          data.additional.map((a) => {
            const subEmail = a.selfManaged && a.email?.trim() ? a.email.trim() : null;
            const subPhone = a.selfManaged && a.phone?.trim() ? a.phone.trim() : null;
            return {
              competition_id: data.competitionId,
              full_name: a.fullName,
              email: subEmail,
              phone: subPhone,
              paid: false,
              alive: true,
              offline: !subEmail,
              owner_player_id: owner.id,
            };
          }) as never,
        )
        .select("id, magic_token");
      if (subErr) throw subErr;
      subPlayers.push(...((subs as Array<{ id: string; magic_token: string }>) ?? []));
    }

    // 2) Pre-insert picks for all entries.
    const picksRows = [
      {
        player_id: owner.id,
        competition_id: data.competitionId,
        week: data.week,
        team: data.owner.team,
      },
      ...data.additional.map((a, i) => ({
        player_id: subPlayers[i].id,
        competition_id: data.competitionId,
        week: data.week,
        team: a.team,
      })),
    ];
    await supabaseAdmin.from("picks").insert(picksRows as never);

    // 3) Create Stripe Checkout session as a destination charge.
    const { createStripeClient, resolveStripeEnv, getStripeErrorMessage } =
      await import("@/lib/stripe.server");
    const stripe = createStripeClient(resolveStripeEnv());
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        line_items: [
          {
            quantity: entries,
            price_data: {
              currency: "eur",
              unit_amount: unitAmount,
              product_data: {
                name: `${tenant.name ?? "Last Man Standing"} — entry`,
                description: `${entries} entry${entries > 1 ? "ies" : ""} · GW${data.week}`,
              },
            },
          },
        ],
        payment_intent_data: {
          application_fee_amount: appFeeCents > 0 ? appFeeCents : undefined,
          transfer_data: { destination: tenant.stripe_account_id! },
          description: `${tenant.name ?? "LMS"} entry × ${entries}`,
          metadata: {
            owner_player_id: owner.id,
            competition_id: data.competitionId,
            week: String(data.week),
          },
        },
        success_url: `${data.origin}/stripe/return?token=${owner.magic_token}&c=${data.competitionId}`,
        cancel_url: `${data.origin}/pay?c=${data.competitionId}&n=${encodeURIComponent(data.owner.fullName)}&e=${encodeURIComponent(email)}&p=${encodeURIComponent(data.owner.phone ?? "")}&t=${encodeURIComponent(data.owner.team)}`,
        metadata: {
          owner_player_id: owner.id,
          competition_id: data.competitionId,
          week: String(data.week),
          tenant_id: comp.tenant_id as string,
        },
      });
      return { checkoutUrl: session.url, ownerToken: owner.magic_token };
    } catch (err) {
      // Roll back the unpaid inserts so the user can retry cleanly.
      await supabaseAdmin
        .from("players")
        .delete()
        .in("id", [owner.id, ...subPlayers.map((s) => s.id)]);
      throw new Error(getStripeErrorMessage(err));
    }
  });




export const getPlayerByToken = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { data: player, error } = await supabaseAdmin
      .from("players")
      .select("*")
      .eq("magic_token", data.token)
      .maybeSingle();
    if (error) throw error;
    if (!player) return null;
    const { data: comp } = await supabaseAdmin
      .from("competitions")
      .select("*")
      .eq("id", player.competition_id)
      .maybeSingle();
    const { data: picks } = await supabaseAdmin
      .from("picks")
      .select("*")
      .eq("player_id", player.id)
      .order("week", { ascending: true });
    return { player, competition: comp, picks: picks ?? [] };
  });

export const submitPick = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { playerId: string; competitionId: string; week: number; team: string }) =>
      d,
  )
  .handler(async ({ data }) => {
    // Pull existing picks + the gameweek deadline so we can:
    //  - block re-using a team across weeks
    //  - allow CHANGING this week's pick before the deadline (magic-link returns)
    //  - block changes after the deadline has passed
    const { data: existing } = await supabaseAdmin
      .from("picks")
      .select("id, team, week")
      .eq("player_id", data.playerId);

    // Team-reuse check (ignore this week's existing row — they may be swapping it)
    if (
      existing?.some((p) => p.team === data.team && p.week !== data.week)
    ) {
      throw new Error(`You already used ${data.team}`);
    }

    // Deadline gate for the target week
    const { data: gw } = await supabaseAdmin
      .from("gameweeks")
      .select("deadline_at")
      .eq("competition_id", data.competitionId)
      .eq("week_number", data.week)
      .maybeSingle();
    const deadlineMs = gw?.deadline_at ? new Date(gw.deadline_at).getTime() : null;
    if (deadlineMs && deadlineMs <= Date.now()) {
      throw new Error("Deadline has passed — picks are locked.");
    }

    const thisWeek = existing?.find((p) => p.week === data.week);
    let pick: { id: string; player_id: string; competition_id: string; week: number; team: string } | null = null;
    let isFirstPick = !existing || existing.length === 0;

    if (thisWeek) {
      // Update existing pick (before deadline only — guarded above)
      const { data: updated, error } = await supabaseAdmin
        .from("picks")
        .update({ team: data.team })
        .eq("id", thisWeek.id)
        .select("*")
        .single();
      if (error) throw error;
      pick = updated;
      isFirstPick = false;
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("picks")
        .insert({
          player_id: data.playerId,
          competition_id: data.competitionId,
          week: data.week,
          team: data.team,
        } as never)
        .select("*")
        .single();
      if (error) throw error;
      pick = inserted;
    }

    // First pick fires confirmation email (single-entry flow).
    if (isFirstPick) {
      try {
        await sendEntryConfirmation(data.playerId, data.week);
      } catch (e) {
        console.error("[email] entry-confirmation failed", e);
      }
    }
    return pick;
  });

// --- Admin ---
// Legacy username/password admin login. Removed in Phase 7: tenant admins
// now sign in via Supabase Auth at /auth and access competitions via the
// dashboard. Kept as a hard-error stub so any stale client gets a clear
// message.
export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; password: string }) => d)
  .handler(async () => {
    throw new Error(
      "The legacy admin login has been removed. Please sign in at /auth.",
    );
  });

export const adminGetData = createServerFn({ method: "POST" })
  .inputValidator((d: { competitionId: string; pin: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin);
    const { data: comp } = await supabaseAdmin
      .from("competitions")
      .select("*")
      .eq("id", data.competitionId)
      .maybeSingle();
    if (!comp) throw new Error("Unauthorized");
    const { data: players } = await supabaseAdmin
      .from("players")
      .select("*")
      .eq("competition_id", data.competitionId)
      .order("created_at", { ascending: true });
    const { data: picks } = await supabaseAdmin
      .from("picks")
      .select("*")
      .eq("competition_id", data.competitionId);
    return { competition: comp, players: players ?? [], picks: picks ?? [] };
  });

export const setPickResult = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { competitionId: string; pin: string; pickId: string; result: "W" | "L" | "D" }) => d,
  )
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin);
    await supabaseAdmin.from("picks").update({ result: data.result }).eq("id", data.pickId);
    return { ok: true };
  });

export const lockWeek = createServerFn({ method: "POST" })
  .inputValidator((d: { competitionId: string; pin: string; week: number }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin);

    // Eliminate players whose pick this week lost, or who didn't pick.
    const { data: players } = await supabaseAdmin
      .from("players")
      .select("id")
      .eq("competition_id", data.competitionId)
      .eq("alive", true);
    const { data: picks } = await supabaseAdmin
      .from("picks")
      .select("player_id, result")
      .eq("competition_id", data.competitionId)
      .eq("week", data.week);
    const pickByPlayer = new Map(picks?.map((p) => [p.player_id, p.result]) ?? []);
    const toEliminate: string[] = [];
    for (const p of players ?? []) {
      const r = pickByPlayer.get(p.id);
      if (!r || r === "L") toEliminate.push(p.id);
    }
    if (toEliminate.length) {
      await supabaseAdmin.from("players").update({ alive: false }).in("id", toEliminate);
    }
    await supabaseAdmin
      .from("competitions")
      .update({ current_week: data.week + 1 })
      .eq("id", data.competitionId);
    return { eliminated: toEliminate.length };
  });
