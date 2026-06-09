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
