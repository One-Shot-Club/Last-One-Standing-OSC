import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertTenantOwner } from "@/lib/admin-ops.server";
import {
  getDevPreviewOnboardingStatus,
  isDevPreviewMode,
} from "@/lib/dev-auth.server";
import {
  createStripeClient,
  getStripeErrorMessage,
  resolveStripeEnv,
} from "@/lib/stripe.server";

type ConnectStatus = "not_started" | "pending" | "active" | "restricted";

type TenantStripeRow = {
  id: string;
  name: string;
  slug: string;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_onboarding_status: ConnectStatus;
};

async function loadOwnedTenant(
  userId: string,
  tenantId?: string,
): Promise<TenantStripeRow> {
  const { data: isPlatform } = await supabaseAdmin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  let query = supabaseAdmin
    .from("tenants")
    .select(
      "id, name, slug, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_onboarding_status",
    );

  if (tenantId) {
    query = query.eq("id", tenantId);
  } else if (!isPlatform) {
    const { data: membership } = await supabaseAdmin
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", userId)
      .eq("role", "tenant_owner")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!membership?.tenant_id) throw new Error("No club found for this account");
    query = query.eq("id", membership.tenant_id);
  } else {
    query = query.order("created_at", { ascending: false }).limit(1);
  }

  const { data: tenant, error } = await query.maybeSingle();
  if (error || !tenant) throw new Error("Club not found");

  if (!isPlatform) {
    await assertTenantOwner(userId, tenant.id as string);
  }

  return tenant as unknown as TenantStripeRow;
}

export const getClubOnboardingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId?: string }) => d)
  .handler(async ({ data, context }) => {
    if (isDevPreviewMode()) return getDevPreviewOnboardingStatus();
    const { userId } = context as { userId: string };
    const tenant = await loadOwnedTenant(userId, data.tenantId);
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      accountId: tenant.stripe_account_id,
      status: tenant.stripe_onboarding_status,
      chargesEnabled: tenant.stripe_charges_enabled,
      payoutsEnabled: tenant.stripe_payouts_enabled,
      needsOnboarding: tenant.stripe_onboarding_status !== "active",
    };
  });

export const createClubConnectOnboardingLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId?: string; returnOrigin: string }) => d)
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    const tenant = await loadOwnedTenant(userId, data.tenantId);
    const stripe = createStripeClient(resolveStripeEnv());

    try {
      let accountId = tenant.stripe_account_id;
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "IE",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: { name: tenant.name },
          metadata: { tenant_id: tenant.id },
        });
        accountId = account.id;
        await supabaseAdmin
          .from("tenants")
          .update({
            stripe_account_id: accountId,
            stripe_onboarding_status: "pending" as ConnectStatus,
          } as never)
          .eq("id", tenant.id);
      }

      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${data.returnOrigin}/stripe/connect/refresh?t=${tenant.id}`,
        return_url: `${data.returnOrigin}/onboarding?complete=1&t=${tenant.id}`,
        type: "account_onboarding",
      });

      return { url: link.url, accountId, tenantId: tenant.id };
    } catch (err) {
      throw new Error(getStripeErrorMessage(err));
    }
  });

export const refreshClubConnectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenantId?: string }) => d)
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    const tenant = await loadOwnedTenant(userId, data.tenantId);
    if (!tenant.stripe_account_id) {
      return {
        status: "not_started" as ConnectStatus,
        chargesEnabled: false,
        payoutsEnabled: false,
      };
    }

    const stripe = createStripeClient(resolveStripeEnv());
    try {
      const acct = await stripe.accounts.retrieve(tenant.stripe_account_id);
      const charges = acct.charges_enabled ?? false;
      const payouts = acct.payouts_enabled ?? false;
      const status: ConnectStatus = charges
        ? "active"
        : acct.requirements?.disabled_reason
          ? "restricted"
          : "pending";
      await supabaseAdmin
        .from("tenants")
        .update({
          stripe_charges_enabled: charges,
          stripe_payouts_enabled: payouts,
          stripe_onboarding_status: status,
        } as never)
        .eq("id", tenant.id);
      return { status, chargesEnabled: charges, payoutsEnabled: payouts };
    } catch (err) {
      throw new Error(getStripeErrorMessage(err));
    }
  });
