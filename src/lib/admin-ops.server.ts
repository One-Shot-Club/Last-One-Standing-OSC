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
