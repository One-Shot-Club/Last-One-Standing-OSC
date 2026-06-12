import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { MASTER_TEAMS_COMPETITION_ID } from "@/lib/master-catalog";

export interface SelectionsPlayer {
  id: string;
  full_name: string;
  alive: boolean;
}
export interface SelectionsPick {
  player_id: string;
  week: number;
  team: string;
  badge_url: string | null;
  result: string | null; // "win" | "loss" | "draw" | null (pending)
}
export interface SelectionsTrackerData {
  tenant: {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
    background_url: string | null;
    primary_color: string | null;
    accent_color: string | null;
    panel_text_color: string | null;
    meta_text_color: string | null;
  };
  competition: {
    id: string;
    name: string;
    current_week: number;
    club_name: string | null;
    club_logo_url: string | null;
  } | null;
  players: SelectionsPlayer[];
  picks: SelectionsPick[];
  maxWeek: number;
}

export const getSelectionsTracker = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }): Promise<SelectionsTrackerData> => {
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, name")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!tenant) throw new Error("Tenant not found");

    const { data: settings } = await supabaseAdmin
      .from("tenant_settings")
      .select(
        "logo_url, background_url, primary_color, accent_color, panel_text_color, meta_text_color",
      )
      .eq("tenant_id", tenant.id as string)
      .maybeSingle();
    const s = (settings ?? {}) as Record<string, string | null>;

    const { data: comp } = await supabaseAdmin
      .from("competitions")
      .select("id, name, current_week, club_name, club_logo_url")
      .eq("tenant_id", tenant.id as string)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let players: SelectionsPlayer[] = [];
    let picks: SelectionsPick[] = [];
    let maxWeek = 1;

    if (comp) {
      const { data: pl } = await supabaseAdmin
        .from("players")
        .select("id, full_name, alive, created_at")
        .eq("competition_id", comp.id as string)
        .order("alive", { ascending: false })
        .order("created_at", { ascending: true });
      players = (pl ?? []).map((p) => ({
        id: p.id as string,
        full_name: p.full_name as string,
        alive: !!p.alive,
      }));

      const { data: pk } = await supabaseAdmin
        .from("picks")
        .select("player_id, week, team, result")
        .eq("competition_id", comp.id as string);

      const { data: teams } = await supabaseAdmin
        .from("teams")
        .select("name, badge_url")
        .in("competition_id", [comp.id as string, MASTER_TEAMS_COMPETITION_ID]);
      const badgeByName = new Map<string, string | null>();
      for (const t of teams ?? []) {
        const name = t.name as string;
        const badge = (t.badge_url as string | null) ?? null;
        // Prefer the tenant's own badge if both exist
        if (!badgeByName.has(name) || badge) badgeByName.set(name, badge);
      }

      picks = (pk ?? []).map((p) => ({
        player_id: p.player_id as string,
        week: p.week as number,
        team: p.team as string,
        badge_url: badgeByName.get(p.team as string) ?? null,
        result: (p.result as string | null) ?? null,
      }));

      maxWeek = Math.max(
        (comp.current_week as number) ?? 1,
        ...picks.map((p) => p.week),
        1,
      );
    }

    return {
      tenant: {
        id: tenant.id as string,
        slug: tenant.slug as string,
        name: tenant.name as string,
        logo_url: s.logo_url ?? null,
        background_url: s.background_url ?? null,
        primary_color: s.primary_color ?? null,
        accent_color: s.accent_color ?? null,
        panel_text_color: s.panel_text_color ?? null,
        meta_text_color: s.meta_text_color ?? null,
      },
      competition: comp
        ? {
            id: comp.id as string,
            name: comp.name as string,
            current_week: (comp.current_week as number) ?? 1,
            club_name: (comp.club_name as string | null) ?? null,
            club_logo_url: (comp.club_logo_url as string | null) ?? null,
          }
        : null,
      players,
      picks,
      maxWeek,
    };
  });
