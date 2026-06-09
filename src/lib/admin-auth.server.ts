import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

// Resolve current user from the request bearer token, if present.
// Returns null when no token / invalid token (does NOT throw).
export async function getOptionalUserId(): Promise<string | null> {
  try {
    const req = getRequest();
    const authHeader = req?.headers?.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await sb.auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return data.claims.sub as string;
  } catch {
    return null;
  }
}

// Verify admin access against a competition.
// Auth-only: requires a Supabase Auth session with tenant_admin+ access on
// the competition's tenant. The `pin` arg is accepted for backwards-compat
// but ignored — the legacy admin_pin column has been dropped.
export async function verifyAdmin(competitionId: string, _pin?: string) {
  const { data: comp } = await supabaseAdmin
    .from("competitions")
    .select("id, tenant_id")
    .eq("id", competitionId)
    .maybeSingle();
  if (!comp) throw new Error("Unauthorized");

  const userId = await getOptionalUserId();
  if (!userId) throw new Error("Unauthorized");

  const { data: ok } = await supabaseAdmin.rpc("has_tenant_access", {
    _user_id: userId,
    _tenant_id: comp.tenant_id as string,
    _min_role: "tenant_admin",
  });
  if (ok !== true) throw new Error("Unauthorized");

  return {
    id: comp.id as string,
    tenant_id: comp.tenant_id as string,
    actorId: userId,
    actorLabel: `auth:${userId}`,
  };
}
