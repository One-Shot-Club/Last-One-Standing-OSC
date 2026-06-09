import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

export type TenantBranding = {
  id: string;
  slug: string;
  name: string;
  status: string;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
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
        "logo_url, primary_color, accent_color, intro_copy, contact_email, contact_phone, whatsapp_link, sponsor_assets",
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
        primary_color: (settings?.primary_color as string | null) ?? null,
        accent_color: (settings?.accent_color as string | null) ?? null,
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

