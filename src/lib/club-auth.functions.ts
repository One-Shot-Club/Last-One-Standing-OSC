import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SESSION_TTL_HOURS = 12;

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100_000;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  const b64 = (buf: ArrayBuffer | Uint8Array) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)));
  return `pbkdf2$${iterations}$${b64(salt)}$${b64(bits)}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parts = hash.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = parseInt(parts[1], 10);
  const salt = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
  const expected = parts[3];
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  const got = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return got === expected;
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Platform admin or trusted server caller sets / resets credentials for a tenant.
export const setTenantAdminCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string; username: string; password: string }) => {
    if (!d.username?.trim()) throw new Error("Username required");
    if (!d.password || d.password.length < 6)
      throw new Error("Password must be at least 6 characters");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    const { data: isPlatform } = await supabaseAdmin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!isPlatform) throw new Error("Forbidden: platform admin only");

    const password_hash = await hashPassword(data.password);
    const { error } = await supabaseAdmin
      .from("tenant_admin_credentials")
      .upsert(
        {
          tenant_id: data.tenantId,
          username: data.username.trim(),
          password_hash,
        },
        { onConflict: "tenant_id" },
      );
    if (error) throw error;
    return { ok: true };
  });

// Returns whether credentials exist (platform admin view).
export const getTenantAdminCredentialsInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    const { data: isPlatform } = await supabaseAdmin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!isPlatform) throw new Error("Forbidden");
    const { data: row } = await supabaseAdmin
      .from("tenant_admin_credentials")
      .select("username, updated_at")
      .eq("tenant_id", data.tenantId)
      .maybeSingle();
    return row
      ? { exists: true, username: row.username as string, updatedAt: row.updated_at as string }
      : { exists: false, username: null, updatedAt: null };
  });

// Club admin login by tenant slug.
export const clubAdminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { tenantSlug: string; username: string; password: string }) => d)
  .handler(async ({ data }) => {
    const invalid = { ok: false as const, error: "Invalid credentials" };

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, name, status")
      .eq("slug", data.tenantSlug)
      .maybeSingle();
    if (!tenant) return invalid;

    const { data: cred } = await supabaseAdmin
      .from("tenant_admin_credentials")
      .select("username, password_hash")
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!cred) return invalid;

    if (
      (cred.username as string).toLowerCase() !== data.username.trim().toLowerCase() ||
      !(await verifyPassword(data.password, cred.password_hash as string))
    ) {
      return invalid;
    }

    const token = newToken();
    const expires_at = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();
    await supabaseAdmin
      .from("club_admin_sessions")
      .insert({ token, tenant_id: tenant.id, expires_at });

    const { data: comp } = await supabaseAdmin
      .from("competitions")
      .select("id")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      ok: true as const,
      token,
      tenantId: tenant.id as string,
      tenantSlug: tenant.slug as string,
      tenantName: tenant.name as string,
      competitionId: comp?.id ?? null,
    };
  });


export const clubAdminLogout = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    await supabaseAdmin.from("club_admin_sessions").delete().eq("token", data.token);
    return { ok: true };
  });

// Helper used server-side to validate a club admin session token for a tenant.
// (Not exported as a server fn — imported directly from admin-auth.)
export async function validateClubSession(
  token: string,
  tenantId: string,
): Promise<boolean> {
  if (!token) return false;
  const { data: row } = await supabaseAdmin
    .from("club_admin_sessions")
    .select("tenant_id, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!row) return false;
  if (row.tenant_id !== tenantId) return false;
  if (new Date(row.expires_at as string).getTime() < Date.now()) return false;
  return true;
}
