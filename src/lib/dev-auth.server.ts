import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  DEV_PREVIEW_COMP_ID,
  DEV_PREVIEW_COMP_SLUG,
  DEV_PREVIEW_TENANT_ID,
  DEV_PREVIEW_USER_ID,
  DEV_PREVIEW_COOKIE,
  DEV_TEST,
} from "@/lib/dev-test.constants";
import { seedGameweekInternal } from "@/lib/gameweeks.functions";

export function isDevEnvironment(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function isDevPreviewMode(): boolean {
  if (!isDevEnvironment()) return false;
  try {
    const cookie = getRequest()?.headers.get("cookie") ?? "";
    return cookie.includes(`${DEV_PREVIEW_COOKIE}=1`);
  } catch {
    return false;
  }
}

export function devPreviewUserId(): string {
  return DEV_PREVIEW_USER_ID;
}

export function getDevPreviewTenantAccess() {
  return [
    {
      tenant_id: DEV_PREVIEW_TENANT_ID,
      tenant_slug: DEV_TEST.clubSlug,
      tenant_name: DEV_TEST.clubName,
      role: "tenant_owner",
    },
  ];
}

export function getDevPreviewCompetitions() {
  return [
    {
      id: DEV_PREVIEW_COMP_ID,
      name: `${DEV_TEST.clubName} Last Man Standing`,
      slug: DEV_PREVIEW_COMP_SLUG,
      tenant_id: DEV_PREVIEW_TENANT_ID,
      tenant_slug: DEV_TEST.clubSlug,
      tenant_name: DEV_TEST.clubName,
      entry_fee: 5,
      entry_count: 12,
      status: "needs_stripe" as const,
      public_path: `/${DEV_TEST.clubSlug}/${DEV_PREVIEW_COMP_SLUG}`,
    },
  ];
}

export function getDevPreviewDashboardStats() {
  return { competitions: 1, entries: 12, tenants: 1 };
}

export function getDevPreviewOnboardingStatus() {
  return {
    tenantId: DEV_PREVIEW_TENANT_ID,
    tenantName: DEV_TEST.clubName,
    tenantSlug: DEV_TEST.clubSlug,
    accountId: null,
    status: "not_started" as const,
    chargesEnabled: false,
    payoutsEnabled: false,
    needsOnboarding: true,
  };
}

export async function seedDevTestAccount(): Promise<{
  mode: "seeded" | "preview";
  email: string;
  password: string;
  accessToken?: string;
  refreshToken?: string;
  message?: string;
}> {
  if (!isDevEnvironment()) {
    throw new Error("Dev test accounts can only be created in development");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      mode: "preview",
      email: DEV_TEST.email,
      password: DEV_TEST.password,
      message:
        "SUPABASE_SERVICE_ROLE_KEY is not set locally — using preview mode (mock dashboard data, no real database).",
    };
  }

  let userId: string;
  const { data: created, error: createErr } =
    await supabaseAdmin.auth.admin.createUser({
      email: DEV_TEST.email,
      password: DEV_TEST.password,
      email_confirm: true,
      user_metadata: {
        full_name: DEV_TEST.adminName,
        club_name: DEV_TEST.clubName,
      },
    });

  if (createErr || !created.user) {
    const { data: list, error: listErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw listErr;
    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === DEV_TEST.email.toLowerCase(),
    );
    if (!existing) throw createErr ?? new Error("Could not create dev user");
    userId = existing.id;
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: DEV_TEST.password,
      email_confirm: true,
    });
  } else {
    userId = created.user.id;
  }

  let tenantId: string;
  const { data: existingTenant } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("slug", DEV_TEST.clubSlug)
    .maybeSingle();

  if (existingTenant?.id) {
    tenantId = existingTenant.id as string;
    await supabaseAdmin
      .from("tenants")
      .update({ name: DEV_TEST.clubName, status: "active" })
      .eq("id", tenantId);
  } else {
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .insert({
        slug: DEV_TEST.clubSlug,
        name: DEV_TEST.clubName,
        status: "active",
      })
      .select("id")
      .single();
    if (tErr || !tenant) throw tErr ?? new Error("Could not create dev tenant");
    tenantId = tenant.id as string;

    await supabaseAdmin.from("tenant_settings").insert({
      tenant_id: tenantId,
      contact_email: DEV_TEST.email,
      intro_copy: JSON.stringify({ source: "dev-seed" }),
    });
  }

  await supabaseAdmin.from("tenant_members").upsert(
    { tenant_id: tenantId, user_id: userId, role: "tenant_owner" },
    { onConflict: "tenant_id,user_id" },
  );

  const { data: existingComp } = await supabaseAdmin
    .from("competitions")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!existingComp) {
    const { data: comp, error: cErr } = await supabaseAdmin
      .from("competitions")
      .insert({
        tenant_id: tenantId,
        slug: DEV_PREVIEW_COMP_SLUG,
        name: `${DEV_TEST.clubName} Last Man Standing`,
        entry_fee: 5,
        prize_pool: 200,
        current_week: 1,
        club_name: DEV_TEST.clubName,
        application_fee_percent_bps: 500,
        fee_payer: "club",
        cash_enabled: true,
        payment_enabled: true,
      } as never)
      .select("id")
      .single();
    if (cErr) throw cErr;
    await seedGameweekInternal(comp!.id as string, 1);
  }

  const { data: sessionData, error: signInErr } =
    await supabaseAdmin.auth.signInWithPassword({
      email: DEV_TEST.email,
      password: DEV_TEST.password,
    });
  if (signInErr || !sessionData.session) {
    throw signInErr ?? new Error("Dev account created but sign-in failed");
  }

  return {
    mode: "seeded",
    email: DEV_TEST.email,
    password: DEV_TEST.password,
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
  };
}
