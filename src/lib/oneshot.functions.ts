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
      additional: Array<{ fullName: string; team: string }>;
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

    // 2. Sub-entries (no email/phone — inherit owner's contact)
    const subPlayers: Array<{ id: string; magic_token: string; full_name: string }> = [];
    if (data.additional.length > 0) {
      const { data: subs, error: subErr } = await supabaseAdmin
        .from("players")
        .insert(
          data.additional.map((a) => ({
            competition_id: data.competitionId,
            full_name: a.fullName,
            email: null,
            phone: null,
            paid: true,
            alive: true,
            offline: true,
            owner_player_id: owner.id,
          })) as never,
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
    // ensure not used before
    const { data: existing } = await supabaseAdmin
      .from("picks")
      .select("team, week")
      .eq("player_id", data.playerId);
    if (existing?.some((p) => p.team === data.team)) {
      throw new Error(`You already used ${data.team}`);
    }
    if (existing?.some((p) => p.week === data.week)) {
      throw new Error("You already picked this week");
    }
    const { data: pick, error } = await supabaseAdmin
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

    // If this is the player's first pick, fire entry confirmation email.
    if (!existing || existing.length === 0) {
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
