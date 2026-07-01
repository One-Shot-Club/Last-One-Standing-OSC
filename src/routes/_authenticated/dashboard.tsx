import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getClubDashboardStats,
  getMyTenantAccess,
  listMyAdminCompetitions,
} from "@/lib/admin-ops.functions";
import { getClubOnboardingStatus } from "@/lib/club-onboarding.functions";
import { amIPlatformAdmin } from "@/lib/platform-admin.functions";

import { Btn, Card, Logo, Shell } from "@/components/oneshot/ui";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type TenantRow = {
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  role: string;
};
type CompRow = {
  id: string;
  name: string;
  slug: string;
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  entry_fee: number;
  entry_count: number;
  status: "live" | "needs_stripe" | "needs_payments" | "pending";
  public_path: string;
};

const STATUS_LABELS: Record<CompRow["status"], string> = {
  live: "Live",
  needs_stripe: "Needs Stripe",
  needs_payments: "Needs payment setup",
  pending: "Pending",
};

const STATUS_STYLES: Record<CompRow["status"], string> = {
  live: "bg-emerald-100 text-emerald-800",
  needs_stripe: "bg-amber-100 text-amber-800",
  needs_payments: "bg-amber-100 text-amber-800",
  pending: "bg-slate-100 text-slate-700",
};
type DashboardStats = {
  competitions: number;
  entries: number;
  tenants: number;
};

function Dashboard() {
  const nav = useNavigate();
  const fetchAccess = useServerFn(getMyTenantAccess);
  const fetchComps = useServerFn(listMyAdminCompetitions);
  const fetchStats = useServerFn(getClubDashboardStats);
  const fetchOnboarding = useServerFn(getClubOnboardingStatus);
  const checkPlatform = useServerFn(amIPlatformAdmin);
  const [email, setEmail] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantRow[] | null>(null);
  const [comps, setComps] = useState<CompRow[] | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [needsStripe, setNeedsStripe] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    Promise.all([
      fetchAccess({ data: {} }),
      fetchComps({ data: {} }),
      fetchStats({ data: {} }),
      fetchOnboarding({ data: {} }).catch(() => ({ needsOnboarding: false })),
      checkPlatform({ data: {} }).catch(() => ({ isPlatformAdmin: false })),
    ])
      .then(([t, c, s, onboarding, p]) => {
        setTenants(t as TenantRow[]);
        setComps(c as CompRow[]);
        setStats(s as DashboardStats);
        setNeedsStripe(
          (onboarding as { needsOnboarding?: boolean }).needsOnboarding ?? false,
        );
        setIsPlatformAdmin((p as { isPlatformAdmin: boolean }).isPlatformAdmin);
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [fetchAccess, fetchComps, fetchStats, fetchOnboarding, checkPlatform]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyPublicLink(c: CompRow) {
    if (!c.public_path) return;
    const url = `${window.location.origin}${c.public_path}`;
    navigator.clipboard.writeText(url);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function openPanel(c: CompRow) {
    sessionStorage.setItem("osc_comp", c.id);
    sessionStorage.setItem("osc_pin", "");
    nav({ to: "/admin/panel" });
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const primaryTenant = tenants?.[0];
  const hasClubs = (tenants?.length ?? 0) > 0;

  return (
    <Shell>
      <Logo />
      <div className="mt-12 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-3xl">
            {primaryTenant ? primaryTenant.tenant_name : "Club dashboard"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Signed in as {email}</p>
        </div>
        {hasClubs && (
          <Link to="/dashboard/competitions/new">
            <Btn>Create competition →</Btn>
          </Link>
        )}
      </div>

      {err && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {err}
        </p>
      )}

      {needsStripe && (
        <Card className="mt-6 border-accent/40 bg-accent/5">
          <p className="text-sm font-medium">Connect Stripe to take online payments</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Entry fees go directly to your club account. Free to start — 5% on
            first 100 entries, 3% after.
          </p>
          <Link to="/onboarding" className="mt-3 inline-block">
            <Btn variant="ghost">Connect Stripe →</Btn>
          </Link>
        </Card>
      )}

      {stats && (
        <Card className="mt-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Competitions" value={stats.competitions} />
            <Stat label="Entries this month" value={stats.entries} />
            <Stat label="Clubs" value={stats.tenants} />
          </div>
        </Card>
      )}

      <h2 className="mt-8 display text-lg">Your competitions</h2>
      <Card className="mt-3 space-y-2">
        {comps === null && !err && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {comps && comps.length === 0 && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {hasClubs
                ? "No competitions yet. Create your first one — it only takes a minute."
                : "No club access yet. Complete signup or ask your platform contact for access."}
            </p>
            {hasClubs ? (
              <Link
                to="/dashboard/competitions/new"
                className="inline-flex text-sm font-semibold uppercase tracking-wider text-accent hover:brightness-90"
              >
                Create your first competition →
              </Link>
            ) : (
              <Link
                to="/signup"
                className="inline-flex text-sm font-semibold uppercase tracking-wider text-accent hover:brightness-90"
              >
                Sign up your club →
              </Link>
            )}
          </div>
        )}
        {comps?.map((c) => (
          <div key={c.id} className="rounded-md border border-border">
            <button
              type="button"
              onClick={() => openPanel(c)}
              className="block w-full p-3 text-left hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{c.name}</div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[c.status]}`}
                >
                  {STATUS_LABELS[c.status]}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {c.tenant_name} ({c.tenant_slug}) · €{c.entry_fee} entry ·{" "}
                {c.entry_count} entered
              </div>
            </button>
            <div className="flex flex-wrap gap-3 border-t border-border px-3 py-2">
              {c.public_path && (
                <>
                  <Link
                    to="/$tenantSlug/$compSlug"
                    params={{ tenantSlug: c.tenant_slug, compSlug: c.slug }}
                    target="_blank"
                    className="text-xs font-semibold uppercase tracking-wider text-accent hover:brightness-90"
                  >
                    View entry page →
                  </Link>
                  <button
                    type="button"
                    onClick={() => copyPublicLink(c)}
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary"
                  >
                    {copiedId === c.id ? "Link copied!" : "Copy share link"}
                  </button>
                </>
              )}
              {c.status === "needs_stripe" && (
                <Link
                  to="/onboarding"
                  className="text-xs font-semibold uppercase tracking-wider text-accent hover:brightness-90"
                >
                  Connect Stripe →
                </Link>
              )}
            </div>
          </div>
        ))}
      </Card>

      <h2 className="mt-8 display text-lg">Your clubs</h2>
      <Card className="mt-3 space-y-2">
        {tenants?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No club access yet. Complete signup or ask your platform contact for access.
          </p>
        )}
        {tenants?.map((r) => (
          <div key={r.tenant_id} className="rounded-md border border-border p-3">
            <div className="font-medium">{r.tenant_name}</div>
            <div className="text-xs text-muted-foreground">
              {r.tenant_slug} · {r.role}
            </div>
          </div>
        ))}
      </Card>

      <div className="mt-6 space-y-3">
        <Btn onClick={signOut}>Sign out</Btn>
        {isPlatformAdmin && (
          <div className="text-center">
            <Link to="/platform/admin" className="text-xs underline">
              Platform admin →
            </Link>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="display text-2xl">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
