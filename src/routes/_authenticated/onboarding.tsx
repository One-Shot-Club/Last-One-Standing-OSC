import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  createClubConnectOnboardingLink,
  getClubOnboardingStatus,
  refreshClubConnectStatus,
} from "@/lib/club-onboarding.functions";
import { Btn, Card, Logo, Shell } from "@/components/oneshot/ui";

type OnboardingSearch = { complete?: string; t?: string };

export const Route = createFileRoute("/_authenticated/onboarding")({
  validateSearch: (s: Record<string, unknown>): OnboardingSearch => ({
    complete: s.complete ? String(s.complete) : undefined,
    t: s.t ? String(s.t) : undefined,
  }),
  head: () => ({
    meta: [{ title: "Connect payments — OneShotClub" }],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const nav = useNavigate();
  const { complete, t: tenantIdFromUrl } = useSearch({ from: "/_authenticated/onboarding" });
  const statusFn = useServerFn(getClubOnboardingStatus);
  const refreshFn = useServerFn(refreshClubConnectStatus);
  const connectFn = useServerFn(createClubConnectOnboardingLink);

  const [tenantName, setTenantName] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("loading");
  const [chargesEnabled, setChargesEnabled] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (complete === "1") {
          await refreshFn({ data: { tenantId: tenantIdFromUrl } });
        }
        const s = await statusFn({ data: { tenantId: tenantIdFromUrl } });
        if (cancelled) return;
        setTenantName(s.tenantName);
        setStatus(s.status);
        setChargesEnabled(s.chargesEnabled);
        if (s.status === "active" && s.chargesEnabled) {
          nav({ to: "/dashboard" });
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Failed to load onboarding status");
          setStatus("error");
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [complete, tenantIdFromUrl, statusFn, refreshFn, nav]);

  async function handleConnect() {
    setBusy(true);
    setErr(null);
    try {
      const { url } = await connectFn({
        data: {
          tenantId: tenantIdFromUrl,
          returnOrigin: window.location.origin,
        },
      });
      window.location.href = url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start Stripe onboarding");
      setBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <Shell>
        <Logo />
        <p className="mt-12 text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <Logo />
      <div className="mt-12 max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          Step 2 of 2
        </p>
        <h1 className="display mt-3 text-3xl">Connect your club&apos;s payments</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {tenantName
            ? `Set up Stripe for ${tenantName}. Entry fees go directly to your club account — OneShotClub never holds your money.`
            : "Set up Stripe so members can pay online. Entry fees go directly to your club account."}
        </p>
      </div>

      <Card className="mt-8 max-w-xl space-y-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-accent" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Stripe Connect Express</p>
            <p className="mt-1">
              You&apos;ll enter bank details on Stripe&apos;s secure site. We only
              take our small platform fee automatically on each entry — 5% on your
              first 100, then 3%.
            </p>
          </div>
        </div>

        {status === "active" || chargesEnabled ? (
          <p className="text-sm text-emerald-700">
            Payments are connected. Head to your dashboard to create a competition.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Status:{" "}
            <span className="font-medium capitalize text-foreground">{status}</span>
          </p>
        )}

        {err && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
            {err}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          {!chargesEnabled && (
            <Btn disabled={busy} onClick={handleConnect}>
              {busy ? "Opening Stripe…" : "Connect Stripe account →"}
            </Btn>
          )}
          <Link to="/dashboard">
            <Btn variant="ghost">
              {chargesEnabled ? "Go to dashboard →" : "Skip for now"}
            </Btn>
          </Link>
        </div>
      </Card>
    </Shell>
  );
}
