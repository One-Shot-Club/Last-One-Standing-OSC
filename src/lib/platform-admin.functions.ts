import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertPlatformAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Forbidden: platform admin only");
}

// Bootstrap: promote current user to platform admin if the table is empty.
export const claimPlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, never>) => d)
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    const { count } = await supabaseAdmin
      .from("platform_admins")
      .select("user_id", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      // already claimed — only succeed if this user is already an admin
      const { data: me } = await supabaseAdmin
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      return { claimed: false, isPlatformAdmin: !!me };
    }
    const { error } = await supabaseAdmin
      .from("platform_admins")
      .insert({ user_id: userId });
    if (error) throw error;
    return { claimed: true, isPlatformAdmin: true };
  });

export const amIPlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, never>) => d)
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    const { data } = await supabaseAdmin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    const { count } = await supabaseAdmin
      .from("platform_admins")
      .select("user_id", { count: "exact", head: true });
    return { isPlatformAdmin: !!data, totalAdmins: count ?? 0 };
  });

export const getPlatformOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, never>) => d)
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    await assertPlatformAdmin(userId);

    const [tenants, competitions, entries, members] = await Promise.all([
      supabaseAdmin.from("tenants").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("competitions").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("competition_entries").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("tenant_members").select("user_id", { count: "exact", head: true }),
    ]);

    return {
      tenants: tenants.count ?? 0,
      competitions: competitions.count ?? 0,
      entries: entries.count ?? 0,
      members: members.count ?? 0,
    };
  });

export const listTenantsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, never>) => d)
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    await assertPlatformAdmin(userId);

    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, name, status, created_at")
      .order("created_at", { ascending: false });

    const rows = await Promise.all(
      (tenants ?? []).map(async (t) => {
        const [comp, ent, mem] = await Promise.all([
          supabaseAdmin
            .from("competitions")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", t.id),
          supabaseAdmin
            .from("competition_entries")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", t.id),
          supabaseAdmin
            .from("tenant_members")
            .select("user_id", { count: "exact", head: true })
            .eq("tenant_id", t.id),
        ]);
        return {
          ...t,
          competitions: comp.count ?? 0,
          entries: ent.count ?? 0,
          members: mem.count ?? 0,
        };
      }),
    );
    return rows;
  });

export const createTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; name: string; contactEmail?: string }) => {
    if (!d.slug || !/^[a-z0-9-]+$/.test(d.slug)) {
      throw new Error("Slug must be lowercase letters, numbers, and dashes only");
    }
    if (!d.name?.trim()) throw new Error("Name required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await assertPlatformAdmin(userId);

    const { data: tenant, error } = await supabaseAdmin
      .from("tenants")
      .insert({ slug: data.slug, name: data.name, status: "active" })
      .select("id, slug, name")
      .single();
    if (error) throw error;

    const { error: sErr } = await supabaseAdmin
      .from("tenant_settings")
      .insert({
        tenant_id: tenant.id,
        contact_email: data.contactEmail ?? null,
      });
    if (sErr) throw sErr;

    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: tenant.id,
      actor_id: userId,
      op: "create",
      table_name: "tenants",
      row_id: tenant.id,
      diff: { created: { slug: data.slug, name: data.name } },
    });
    return tenant;
  });

export const setTenantStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; status: "active" | "paused" | "archived" }) => d)
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await assertPlatformAdmin(userId);
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ status: data.status })
      .eq("id", data.tenantId);
    if (error) throw error;
    return { ok: true };
  });

export const addPlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string }) => {
    if (!d.email?.includes("@")) throw new Error("Valid email required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await assertPlatformAdmin(userId);

    // Look up user by email via auth admin API
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw listErr;
    const target = list.users.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
    );
    if (!target) throw new Error("No registered user with that email. Ask them to sign up first.");

    const { error } = await supabaseAdmin
      .from("platform_admins")
      .upsert({ user_id: target.id }, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true, userId: target.id };
  });

export const listPlatformAdmins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, never>) => d)
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    await assertPlatformAdmin(userId);

    const { data: admins } = await supabaseAdmin
      .from("platform_admins")
      .select("user_id, created_at");
    if (!admins || admins.length === 0) return [];

    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const byId = new Map((list?.users ?? []).map((u) => [u.id, u.email ?? "—"]));
    return admins.map((a) => ({
      user_id: a.user_id as string,
      email: byId.get(a.user_id as string) ?? "(unknown)",
      created_at: a.created_at as string,
    }));
  });
