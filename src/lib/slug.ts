import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "club"
  );
}

export async function generateUniqueTenantSlug(name: string): Promise<string> {
  const base = slugifyName(name);
  let slug = base;
  let suffix = 1;
  while (true) {
    const { data } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

export async function generateUniqueCompetitionSlug(
  tenantId: string,
  name: string,
): Promise<string> {
  const base = slugifyName(name);
  let slug = base;
  let suffix = 1;
  while (true) {
    const { data } = await supabaseAdmin
      .from("competitions")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}
