import { createFileRoute } from "@tanstack/react-router";
import {
  resolveStripeEnv,
  verifyStripeWebhook,
  type StripeEnv,
} from "@/lib/stripe.server";

/**
 * Stripe webhook for both built-in payments and Connect events.
 * Path is fixed by Lovable's webhook registration.
 *
 *   account.updated          — sync tenant connect status
 *   checkout.session.completed → mark entry paid + send confirmation
 *   charge.refunded          → mark entry unpaid + log refund
 */
export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const rawEnv = url.searchParams.get("env");
        const env: StripeEnv =
          rawEnv === "live" || rawEnv === "sandbox"
            ? rawEnv
            : resolveStripeEnv();

        let event;
        try {
          event = await verifyStripeWebhook(request, env);
        } catch (err) {
          console.error("[stripe webhook] verification failed:", err);
          return new Response("Invalid signature", { status: 400 });
        }

        try {
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          switch (event.type) {
            case "account.updated": {
              const acct = event.data.object as {
                id: string;
                charges_enabled?: boolean;
                payouts_enabled?: boolean;
                requirements?: { disabled_reason?: string | null };
              };
              const charges = !!acct.charges_enabled;
              const payouts = !!acct.payouts_enabled;
              const status = charges
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
                .eq("stripe_account_id", acct.id);
              break;
            }

            case "checkout.session.completed": {
              const session = event.data.object as {
                id: string;
                payment_intent?: string | null;
                metadata?: Record<string, string> | null;
                amount_total?: number | null;
              };
              const meta = session.metadata ?? {};
              const ownerPlayerId = meta.owner_player_id;
              const competitionId = meta.competition_id;
              const week = Number(meta.week ?? "0");
              if (!ownerPlayerId || !competitionId) break;

              const paidAt = new Date().toISOString();
              // Owner + sub-entries share owner_player_id linkage.
              const { data: ownedPlayers } = await supabaseAdmin
                .from("players")
                .select("id")
                .or(`id.eq.${ownerPlayerId},owner_player_id.eq.${ownerPlayerId}`)
                .eq("competition_id", competitionId);
              const playerIds = (ownedPlayers ?? []).map((p) => p.id as string);

              if (playerIds.length > 0) {
                await supabaseAdmin
                  .from("players")
                  .update({ paid: true } as never)
                  .in("id", playerIds);
                await supabaseAdmin
                  .from("competition_entries")
                  .update({
                    paid: true,
                    paid_at: paidAt,
                    paid_method: "stripe",
                    stripe_checkout_session_id: session.id,
                    stripe_payment_intent_id: session.payment_intent ?? null,
                  } as never)
                  .in("player_id", playerIds);
              }

              await supabaseAdmin.from("payments").insert({
                competition_id: competitionId,
                player_id: ownerPlayerId,
                amount: (session.amount_total ?? 0) / 100,
                currency: "EUR",
                method: "online_stripe",
                stripe_checkout_session_id: session.id,
                stripe_payment_intent_id: session.payment_intent ?? null,
                note: `Stripe checkout — ${playerIds.length} entries`,
              } as never);

              try {
                const { sendEntryConfirmation } = await import(
                  "@/lib/email/triggers.server"
                );
                await sendEntryConfirmation(ownerPlayerId, week || 1);
              } catch (e) {
                console.error("[stripe webhook] confirmation email failed:", e);
              }
              break;
            }

            case "charge.refunded": {
              const charge = event.data.object as {
                payment_intent?: string | null;
                amount_refunded?: number | null;
              };
              if (!charge.payment_intent) break;
              await supabaseAdmin
                .from("payments")
                .update({
                  refunded_at: new Date().toISOString(),
                  refund_amount_cents: charge.amount_refunded ?? null,
                } as never)
                .eq("stripe_payment_intent_id", charge.payment_intent);
              break;
            }

            default:
              // Acknowledge unhandled events with 200.
              break;
          }
        } catch (err) {
          console.error("[stripe webhook] handler error:", err);
          // Still return 200 so Stripe doesn't retry indefinitely on a logic bug.
        }

        return Response.json({ received: true });
      },
    },
  },
});
