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

export const getTenantForEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await assertPlatformAdmin(userId);

    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, name, status")
      .eq("id", data.tenantId)
      .single();
    if (tErr) throw tErr;

    const { data: settings } = await supabaseAdmin
      .from("tenant_settings")
      .select(
        "logo_url, background_url, primary_color, accent_color, intro_copy, contact_email, contact_phone, whatsapp_link",
      )
      .eq("tenant_id", data.tenantId)
      .maybeSingle();

    return {
      tenant,
      settings: settings ?? {
        logo_url: null,
        background_url: null,
        primary_color: null,
        accent_color: null,
        intro_copy: null,
        contact_email: null,
        contact_phone: null,
        whatsapp_link: null,
      },
    };
  });

export const updateTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      tenantId: string;
      name: string;
      slug: string;
      settings: {
        logo_url?: string | null;
        background_url?: string | null;
        primary_color?: string | null;
        accent_color?: string | null;
        intro_copy?: string | null;
        contact_email?: string | null;
        contact_phone?: string | null;
        whatsapp_link?: string | null;
      };
    }) => {
      if (!d.tenantId) throw new Error("tenantId required");
      if (!d.name?.trim()) throw new Error("Name required");
      if (!d.slug || !/^[a-z0-9-]+$/.test(d.slug)) {
        throw new Error("Slug must be lowercase letters, numbers, and dashes only");
      }
      return d;
    },
  )
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await assertPlatformAdmin(userId);

    // Slug uniqueness when changed
    const { data: existing } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, name")
      .eq("id", data.tenantId)
      .single();
    if (!existing) throw new Error("Tenant not found");

    if (existing.slug !== data.slug) {
      const { data: clash } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("slug", data.slug)
        .neq("id", data.tenantId)
        .maybeSingle();
      if (clash) throw new Error("Slug already in use");
    }

    const { error: tErr } = await supabaseAdmin
      .from("tenants")
      .update({ name: data.name.trim(), slug: data.slug })
      .eq("id", data.tenantId);
    if (tErr) throw tErr;

    const s = data.settings;
    const settingsRow = {
      tenant_id: data.tenantId,
      logo_url: s.logo_url ?? null,
      background_url: s.background_url ?? null,
      primary_color: s.primary_color ?? null,
      accent_color: s.accent_color ?? null,
      intro_copy: s.intro_copy ?? null,
      contact_email: s.contact_email ?? null,
      contact_phone: s.contact_phone ?? null,
      whatsapp_link: s.whatsapp_link ?? null,
    };
    const { error: sErr } = await supabaseAdmin
      .from("tenant_settings")
      .upsert(settingsRow, { onConflict: "tenant_id" });

    if (sErr) throw sErr;

    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: data.tenantId,
      actor_id: userId,
      op: "update",
      table_name: "tenants",
      row_id: data.tenantId,
      diff: {
        before: { name: existing.name, slug: existing.slug },
        after: { name: data.name, slug: data.slug, settings: s },
      },
    });

    return { ok: true };
  });

// ---------- Activation wizard ----------

export const getTenantActivation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await assertPlatformAdmin(userId);

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, name, status")
      .eq("id", data.tenantId)
      .single();

    const { data: settings } = await supabaseAdmin
      .from("tenant_settings")
      .select(
        "logo_url, background_url, primary_color, accent_color, intro_copy, contact_email, contact_phone, whatsapp_link",
      )
      .eq("tenant_id", data.tenantId)
      .maybeSingle();

    const { data: competition } = await supabaseAdmin
      .from("competitions")
      .select(
        "id, name, entry_fee, prize_pool, club_name, club_logo_url, stripe_link, revolut_link, payment_link, whatsapp_link",
      )
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let gameweek1: { id: string; week_number: number; fixtures: number } | null = null;
    if (competition) {
      const { data: gw } = await supabaseAdmin
        .from("gameweeks")
        .select("id, week_number")
        .eq("competition_id", competition.id)
        .eq("week_number", 1)
        .maybeSingle();
      if (gw) {
        const { count } = await supabaseAdmin
          .from("results")
          .select("id", { count: "exact", head: true })
          .eq("gameweek_id", gw.id);
        gameweek1 = { id: gw.id, week_number: 1, fixtures: count ?? 0 };
      }
    }

    return {
      tenant,
      settings: settings ?? null,
      competition: competition ?? null,
      gameweek1,
    };
  });

export const upsertCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      tenantId: string;
      name: string;
      entryFee: number;
      prizePool?: number | null;
      clubName?: string | null;
      clubLogoUrl?: string | null;
    }) => {
      if (!d.tenantId) throw new Error("tenantId required");
      if (!d.name?.trim()) throw new Error("Competition name required");
      if (!(d.entryFee >= 0)) throw new Error("Entry fee must be >= 0");
      return d;
    },
  )
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await assertPlatformAdmin(userId);

    const { data: existing } = await supabaseAdmin
      .from("competitions")
      .select("id")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const row = {
      tenant_id: data.tenantId,
      name: data.name.trim(),
      entry_fee: data.entryFee,
      prize_pool: data.prizePool ?? 0,
      club_name: data.clubName ?? null,
      club_logo_url: data.clubLogoUrl ?? null,
    };

    if (existing) {
      const { error } = await supabaseAdmin
        .from("competitions")
        .update(row)
        .eq("id", existing.id);
      if (error) throw error;
      return { id: existing.id, created: false };
    }
    const { data: created, error } = await supabaseAdmin
      .from("competitions")
      .insert({ ...row, current_week: 1 })
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id, created: true };
  });

export const setPaymentLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      competitionId: string;
      stripeLink?: string | null;
      revolutLink?: string | null;
      paymentLink?: string | null;
    }) => {
      if (!d.competitionId) throw new Error("competitionId required");
      return d;
    },
  )
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await assertPlatformAdmin(userId);
    const { error } = await supabaseAdmin
      .from("competitions")
      .update({
        stripe_link: data.stripeLink || null,
        revolut_link: data.revolutLink || null,
        payment_link: data.paymentLink || null,
      })
      .eq("id", data.competitionId);
    if (error) throw error;
    return { ok: true };
  });

export const launchTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await assertPlatformAdmin(userId);

    const { data: comp } = await supabaseAdmin
      .from("competitions")
      .select("id, stripe_link, revolut_link, payment_link")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!comp) throw new Error("Create a competition before launching");
    const hasPay = !!(comp.stripe_link || comp.revolut_link || comp.payment_link);
    if (!hasPay) throw new Error("Add at least one payment link before launching");

    const { data: gw } = await supabaseAdmin
      .from("gameweeks")
      .select("id")
      .eq("competition_id", comp.id)
      .eq("week_number", 1)
      .maybeSingle();
    if (!gw) throw new Error("Seed Gameweek 1 before launching");

    const { error } = await supabaseAdmin
      .from("tenants")
      .update({ status: "active" })
      .eq("id", data.tenantId);
    if (error) throw error;

    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: data.tenantId,
      actor_id: userId,
      op: "update",
      table_name: "tenants",
      row_id: data.tenantId,
      diff: { launched: true },
    });

    return { ok: true };
  });
