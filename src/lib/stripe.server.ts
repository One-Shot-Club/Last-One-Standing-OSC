import Stripe from "stripe";

// Lovable Stripe gateway: all api.stripe.com requests are rewritten through
// the connector-gateway, which attaches the real secret key. The values in
// STRIPE_SANDBOX_API_KEY / STRIPE_LIVE_API_KEY are gateway connection ids,
// NOT real Stripe secret keys — they will fail if used directly.

export type StripeEnv = "sandbox" | "live";

const GATEWAY_STRIPE_BASE = "https://connector-gateway.lovable.dev/stripe";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
}

export function getConnectionApiKey(env: StripeEnv): string {
  return env === "sandbox"
    ? getEnv("STRIPE_SANDBOX_API_KEY")
    : getEnv("STRIPE_LIVE_API_KEY");
}

/**
 * Build a Stripe client that proxies through Lovable's connector-gateway.
 * MUST be used for every Stripe API call — do NOT instantiate Stripe with
 * an env variable directly.
 */
export function createStripeClient(env: StripeEnv): Stripe {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");

  return new Stripe(connectionApiKey, {
    apiVersion: "2026-03-25.dahlia" as Stripe.LatestApiVersion,
    httpClient: Stripe.createFetchHttpClient((input, init) => {
      const stripeUrl = input instanceof Request ? input.url : input.toString();
      const gatewayUrl = stripeUrl.replace(
        "https://api.stripe.com",
        GATEWAY_STRIPE_BASE,
      );
      return fetch(gatewayUrl, {
        ...init,
        headers: {
          ...Object.fromEntries(
            new Headers(
              init?.headers ??
                (input instanceof Request ? input.headers : undefined),
            ).entries(),
          ),
          "X-Connection-Api-Key": connectionApiKey,
          "Lovable-API-Key": lovableApiKey,
        },
      });
    }),
  });
}

/** Resolve the Stripe environment to use. Sandbox unless live keys exist. */
export function resolveStripeEnv(): StripeEnv {
  return process.env.STRIPE_LIVE_API_KEY ? "live" : "sandbox";
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as {
      message?: string;
      code?: string;
      type?: string;
      raw?: { message?: string; code?: string; type?: string };
    };
    const msg = e.raw?.message ?? e.message;
    if (msg) return msg;
  }
  return "Stripe request failed";
}

/**
 * Verify a Stripe webhook signature without depending on the SDK's HMAC.
 * Webhook signing secrets come from PAYMENTS_SANDBOX_WEBHOOK_SECRET /
 * PAYMENTS_LIVE_WEBHOOK_SECRET (provisioned by Lovable on enable).
 */
export async function verifyStripeWebhook(
  req: Request,
  env: StripeEnv,
): Promise<Stripe.Event> {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret =
    env === "sandbox"
      ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
      : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
  if (!signature || !body) throw new Error("Missing signature or body");

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t") timestamp = v;
    if (k === "v1") v1Signatures.push(v);
  }
  if (!timestamp || v1Signatures.length === 0)
    throw new Error("Invalid signature format");

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error("Webhook timestamp too old");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const expected = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (!v1Signatures.includes(expected))
    throw new Error("Invalid webhook signature");

  return JSON.parse(body) as Stripe.Event;
}
