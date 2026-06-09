import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEntryConfirmation } from "@/lib/email/triggers.server";

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
    const { data: comp } = await supabaseAdmin
      .from("competitions")
      .select("id")
      .eq("id", data.competitionId)
      .eq("admin_pin", data.pin)
      .maybeSingle();
    if (!comp) throw new Error("Invalid admin PIN");
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
    }) => d,
  )
  .handler(async ({ data }) => {
    const { data: player, error } = await supabaseAdmin
      .from("players")
      .insert({
        competition_id: data.competitionId,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        paid: true,
        alive: true,
      })
      .select("*")
      .single();
    if (error) throw error;
    return player;
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
      })
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
// Single hardcoded admin credential. Change here in code to rotate.
// Keep `competitions.admin_pin` in sync with ADMIN_PASSWORD so downstream
// verifyAdmin(...) checks (which compare against admin_pin) keep working.
const ADMIN_USERNAME = "Demo@Demo.ie";
const ADMIN_PASSWORD = "123!@£POL";

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; password: string }) => d)
  .handler(async ({ data }) => {
    const u = (data.username ?? "").trim().toLowerCase();
    const p = data.password ?? "";
    if (u !== ADMIN_USERNAME.toLowerCase() || p !== ADMIN_PASSWORD) {
      throw new Error("Invalid credentials");
    }
    const { data: comp } = await supabaseAdmin
      .from("competitions")
      .select("*")
      .eq("admin_pin", ADMIN_PASSWORD)
      .maybeSingle();
    if (!comp) throw new Error("No competition configured");
    return comp;
  });

export const adminGetData = createServerFn({ method: "POST" })
  .inputValidator((d: { competitionId: string; pin: string }) => d)
  .handler(async ({ data }) => {
    const { data: comp } = await supabaseAdmin
      .from("competitions")
      .select("*")
      .eq("id", data.competitionId)
      .eq("admin_pin", data.pin)
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
    const { data: comp } = await supabaseAdmin
      .from("competitions")
      .select("id")
      .eq("id", data.competitionId)
      .eq("admin_pin", data.pin)
      .maybeSingle();
    if (!comp) throw new Error("Unauthorized");
    await supabaseAdmin.from("picks").update({ result: data.result }).eq("id", data.pickId);
    return { ok: true };
  });

export const lockWeek = createServerFn({ method: "POST" })
  .inputValidator((d: { competitionId: string; pin: string; week: number }) => d)
  .handler(async ({ data }) => {
    const { data: comp } = await supabaseAdmin
      .from("competitions")
      .select("id, current_week")
      .eq("id", data.competitionId)
      .eq("admin_pin", data.pin)
      .maybeSingle();
    if (!comp) throw new Error("Unauthorized");

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
