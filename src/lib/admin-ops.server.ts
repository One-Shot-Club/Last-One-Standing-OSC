import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PaymentMethod =
  | "online_stripe"
  | "online_revolut"
  | "online_other"
  | "cash"
  | "bank_transfer"
  | "manual_other";

export async function logAction(
  tenantId: string,
  action: string,
  actorLabel: string,
  targetType: string | null,
  targetId: string | null,
  payload: Record<string, unknown>,
) {
  await supabaseAdmin.from("admin_actions").insert({
    tenant_id: tenantId,
    actor_label: actorLabel,
    action,
    target_type: targetType,
    target_id: targetId,
    payload,
  } as never);
}

export async function assertTenantOwner(userId: string, tenantId: string) {
  const { data: isPlatform } = await supabaseAdmin
    .from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (isPlatform) return;
  const { data: ok } = await supabaseAdmin.rpc("has_tenant_access", {
    _user_id: userId, _tenant_id: tenantId, _min_role: "tenant_owner",
  });
  if (ok !== true) throw new Error("Forbidden: tenant owner required");
}

export async function assertTenantAdminAccess(userId: string, tenantId: string) {
  const { data: isPlatform } = await supabaseAdmin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (isPlatform) return;
  const { data: ok } = await supabaseAdmin.rpc("has_tenant_access", {
    _user_id: userId,
    _tenant_id: tenantId,
    _min_role: "tenant_operator",
  });
  if (ok !== true) throw new Error("Forbidden: tenant admin access required");
}

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) throw error;
  const target = (list?.users ?? []).find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  return target?.id ?? null;
}

export async function linkAuthUserToTenant(
  tenantId: string,
  email: string,
  role: "tenant_owner" | "tenant_admin" = "tenant_owner",
) {
  const userId = await findAuthUserIdByEmail(email);
  if (!userId) return { linked: false as const, userId: null };
  const { error } = await supabaseAdmin.from("tenant_members").upsert(
    { tenant_id: tenantId, user_id: userId, role },
    { onConflict: "tenant_id,user_id" },
  );
  if (error) throw error;
  return { linked: true as const, userId };
}
