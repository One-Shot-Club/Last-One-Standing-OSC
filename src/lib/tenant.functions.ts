import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

export type TenantBranding = {
  id: string;
  slug: string;
  name: string;
  status: string;
  logo_url: string | null;
  background_url: string | null;

  primary_color: string | null;
  accent_color: string | null;
  panel_text_color: string | null;
  meta_text_color: string | null;
  intro_copy: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp_link: string | null;
  sponsor_assets: Json;
};

export type TenantCompetition = {
  id: string;
  name: string;
};

export type TenantPublicData = {
  tenant: TenantBranding;
  competitions: TenantCompetition[];
};

export const resolveTenantBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }): Promise<TenantPublicData> => {
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, name, status")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw error;
    if (!tenant) throw new Error("Tenant not found");

    const { data: settings } = await supabaseAdmin
      .from("tenant_settings")
      .select(
        "logo_url, background_url, primary_color, accent_color, panel_text_color, meta_text_color, intro_copy, contact_email, contact_phone, whatsapp_link, sponsor_assets",
      )
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    const { data: comps } = await supabaseAdmin
      .from("competitions")
      .select("id, name")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    return {
      tenant: {
        id: tenant.id as string,
        slug: tenant.slug as string,
        name: tenant.name as string,
        status: tenant.status as string,
        logo_url: (settings?.logo_url as string | null) ?? null,
        background_url: (settings?.background_url as string | null) ?? null,
        primary_color: (settings?.primary_color as string | null) ?? null,
        accent_color: (settings?.accent_color as string | null) ?? null,
        panel_text_color: ((settings as Record<string, unknown> | null)?.panel_text_color as string | null) ?? null,
        meta_text_color: ((settings as Record<string, unknown> | null)?.meta_text_color as string | null) ?? null,
        intro_copy: (settings?.intro_copy as string | null) ?? null,
        contact_email: (settings?.contact_email as string | null) ?? null,
        contact_phone: (settings?.contact_phone as string | null) ?? null,
        whatsapp_link: (settings?.whatsapp_link as string | null) ?? null,
        sponsor_assets: (settings?.sponsor_assets as Json) ?? ([] as Json),
      },
      competitions: (comps ?? []).map((c) => ({
        id: c.id as string,
        name: c.name as string,
      })),
    };
  });

export type TenantEntryContext = {
  tenant: TenantBranding;
  competition: {
    id: string;
    name: string;
    entry_fee: number | string | null;
    prize_pool: number | string | null;
    club_name: string | null;
    club_logo_url: string | null;
  } | null;
};

export const getTenantEntryContext = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }): Promise<TenantEntryContext> => {
    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, name, status")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw error;
    if (!tenant) throw new Error("Tenant not found");

    const { data: settings } = await supabaseAdmin
      .from("tenant_settings")
      .select(
        "logo_url, background_url, primary_color, accent_color, panel_text_color, meta_text_color, intro_copy, contact_email, contact_phone, whatsapp_link, sponsor_assets",
      )
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    const { data: comp } = await supabaseAdmin
      .from("competitions")
      .select("id, name, entry_fee, prize_pool, club_name, club_logo_url")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return {
      tenant: {
        id: tenant.id as string,
        slug: tenant.slug as string,
        name: tenant.name as string,
        status: tenant.status as string,
        logo_url: (settings?.logo_url as string | null) ?? null,
        background_url: (settings?.background_url as string | null) ?? null,
        primary_color: (settings?.primary_color as string | null) ?? null,
        accent_color: (settings?.accent_color as string | null) ?? null,
        panel_text_color: ((settings as Record<string, unknown> | null)?.panel_text_color as string | null) ?? null,
        meta_text_color: ((settings as Record<string, unknown> | null)?.meta_text_color as string | null) ?? null,
        intro_copy: (settings?.intro_copy as string | null) ?? null,
        contact_email: (settings?.contact_email as string | null) ?? null,
        contact_phone: (settings?.contact_phone as string | null) ?? null,
        whatsapp_link: (settings?.whatsapp_link as string | null) ?? null,
        sponsor_assets: (settings?.sponsor_assets as Json) ?? ([] as Json),
      },
      competition: comp
        ? {
            id: comp.id as string,
            name: comp.name as string,
            entry_fee: (comp.entry_fee as number | string | null) ?? null,
            prize_pool: (comp.prize_pool as number | string | null) ?? null,
            club_name: (comp.club_name as string | null) ?? null,
            club_logo_url: (comp.club_logo_url as string | null) ?? null,
          }
        : null,
    };
  });

export type ClubListing = {
  slug: string;
  name: string;
  logo_url: string | null;
};

export const listPublicClubs = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClubListing[]> => {
    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, name")
      .eq("status", "active")
      .neq("slug", "oneshotclub-master")
      .order("name", { ascending: true });
    if (!tenants?.length) return [];
    const { data: settings } = await supabaseAdmin
      .from("tenant_settings")
      .select("tenant_id, logo_url")
      .in("tenant_id", tenants.map((t) => t.id as string));
    const logoMap = new Map(
      (settings ?? []).map((s) => [s.tenant_id as string, (s.logo_url as string | null) ?? null]),
    );
    return tenants.map((t) => ({
      slug: t.slug as string,
      name: t.name as string,
      logo_url: logoMap.get(t.id as string) ?? null,
    }));
  },
);

export type TenantBrandingLite = {
  primary_color: string | null;
  accent_color: string | null;
  panel_text_color: string | null;
  meta_text_color: string | null;
};

/** Branding colours for a competition's tenant — used to theme admin screens. */
export const getTenantBrandingForCompetition = createServerFn({ method: "GET" })
  .inputValidator((d: { competitionId: string }) => d)
  .handler(async ({ data }): Promise<TenantBrandingLite> => {
    const { data: comp } = await supabaseAdmin
      .from("competitions")
      .select("tenant_id")
      .eq("id", data.competitionId)
      .maybeSingle();
    if (!comp?.tenant_id) {
      return { primary_color: null, accent_color: null, panel_text_color: null, meta_text_color: null };
    }
    const { data: s } = await supabaseAdmin
      .from("tenant_settings")
      .select("primary_color, accent_color, panel_text_color, meta_text_color")
      .eq("tenant_id", comp.tenant_id as string)
      .maybeSingle();
    const r = (s ?? {}) as Record<string, string | null>;
    return {
      primary_color: r.primary_color ?? null,
      accent_color: r.accent_color ?? null,
      panel_text_color: r.panel_text_color ?? null,
      meta_text_color: r.meta_text_color ?? null,
    };
  });



