import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyAdmin } from "@/lib/admin-auth.server";
import {
  createStripeClient,
  getStripeErrorMessage,
  resolveStripeEnv,
} from "@/lib/stripe.server";

type ConnectStatus =
  | "not_started"
  | "pending"
  | "active"
  | "restricted";

type TenantRow = {
  id: string;
  name: string;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_onboarding_status: ConnectStatus;
};

async function loadTenantForComp(competitionId: string): Promise<TenantRow> {
  const { data: comp, error } = await supabaseAdmin
    .from("competitions")
    .select("tenant_id")
    .eq("id", competitionId)
    .maybeSingle();
  if (error || !comp) throw new Error("Competition not found");
  const { data: tenant, error: tErr } = await supabaseAdmin
    .from("tenants")
    .select(
      "id, name, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_onboarding_status",
    )
    .eq("id", comp.tenant_id as string)
    .maybeSingle();
  if (tErr || !tenant) throw new Error("Tenant not found");
  return tenant as unknown as TenantRow;
}

/**
 * Create (or reuse) a Stripe Express connected account for a tenant and
 * return a Stripe-hosted onboarding URL valid for ~7 days. The club admin
 * uses this URL to enter their personal/bank details — the platform never
 * sees them.
 */
export const createConnectOnboardingLink = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { competitionId: string; pin: string; returnOrigin: string }) => d,
  )
  .handler(async ({ data }) => {
    const ctx = await verifyAdmin(data.competitionId, data.pin);
    const tenant = await loadTenantForComp(data.competitionId);
    const stripe = createStripeClient(resolveStripeEnv());

    try {
      let accountId = tenant.stripe_account_id;
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "IE",
          email: undefined,
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
        return_url: `${data.returnOrigin}/stripe/connect/return?t=${tenant.id}`,
        type: "account_onboarding",
      });

      return {
        url: link.url,
        expiresAt: link.expires_at,
        accountId,
        actor: ctx.actorLabel,
      };
    } catch (err) {
      throw new Error(getStripeErrorMessage(err));
    }
  });

/**
 * Pull the latest capability flags from Stripe and persist them on the
 * tenant. Called after the club returns from onboarding and from the
 * Payments tab "Refresh" button.
 */
export const refreshConnectStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { competitionId: string; pin: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin);
    const tenant = await loadTenantForComp(data.competitionId);
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

/**
 * Read-only status for the admin Payments tab. Does not call Stripe.
 */
export const getConnectStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { competitionId: string; pin: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin);
    const tenant = await loadTenantForComp(data.competitionId);
    return {
      accountId: tenant.stripe_account_id,
      status: tenant.stripe_onboarding_status,
      chargesEnabled: tenant.stripe_charges_enabled,
      payoutsEnabled: tenant.stripe_payouts_enabled,
    };
  });

/**
 * Update per-club fee configuration: application fee, fee payer, refund
 * policy default, and cash-enabled toggle.
 */
export const setCompetitionFeeConfig = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      competitionId: string;
      pin: string;
      applicationFeeFlatCents: number;
      applicationFeePercentBps: number;
      feePayer: "club" | "player";
      refundPolicyDefault: "refund_app_fee" | "keep_app_fee" | "ask_each_time";
      cashEnabled: boolean;
    }) => d,
  )
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin);
    const flat = Math.max(0, Math.round(data.applicationFeeFlatCents));
    const bps = Math.min(10000, Math.max(0, Math.round(data.applicationFeePercentBps)));
    const { error } = await supabaseAdmin
      .from("competitions")
      .update({
        application_fee_flat_cents: flat,
        application_fee_percent_bps: bps,
        fee_payer: data.feePayer,
        refund_policy_default: data.refundPolicyDefault,
        cash_enabled: data.cashEnabled,
      } as never)
      .eq("id", data.competitionId);
    if (error) throw error;
    return { ok: true };
  });

/**
 * Refund a paid entry. `refundAppFee=true` returns the platform's cut to
 * the club as well; false keeps it. Per-refund choice as agreed.
 */
export const refundEntry = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      competitionId: string;
      pin: string;
      entryId: string;
      refundAppFee: boolean;
    }) => d,
  )
  .handler(async ({ data }) => {
    const ctx = await verifyAdmin(data.competitionId, data.pin);
    const { data: entry, error } = await supabaseAdmin
      .from("competition_entries")
      .select("id, stripe_payment_intent_id, paid_method, player_id")
      .eq("id", data.entryId)
      .maybeSingle();
    if (error || !entry) throw new Error("Entry not found");

    const stripe = createStripeClient(resolveStripeEnv());
    let refundId: string | null = null;
    if (entry.stripe_payment_intent_id) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: entry.stripe_payment_intent_id,
          refund_application_fee: data.refundAppFee,
          reverse_transfer: true,
        });
        refundId = refund.id;
      } catch (err) {
        throw new Error(getStripeErrorMessage(err));
      }
    }

    await supabaseAdmin
      .from("competition_entries")
      .update({ paid: false } as never)
      .eq("id", entry.id);
    if (entry.player_id) {
      await supabaseAdmin
        .from("players")
        .update({ paid: false } as never)
        .eq("id", entry.player_id as string);
    }

    await supabaseAdmin.from("admin_actions").insert({
      tenant_id: ctx.tenant_id,
      action: "entry.refunded",
      actor_label: ctx.actorLabel,
      target_type: "competition_entry",
      target_id: entry.id,
      payload: {
        refund_id: refundId,
        refund_app_fee: data.refundAppFee,
        method: entry.paid_method,
      },
    } as never);

    return { ok: true, refundId };
  });
