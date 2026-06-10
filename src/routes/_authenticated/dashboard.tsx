import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyTenantAccess, listMyAdminCompetitions } from "@/lib/admin-ops.functions";
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
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
};

function Dashboard() {
  const nav = useNavigate();
  const fetchAccess = useServerFn(getMyTenantAccess);
  const fetchComps = useServerFn(listMyAdminCompetitions);
  const checkPlatform = useServerFn(amIPlatformAdmin);
  const [email, setEmail] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantRow[] | null>(null);
  const [comps, setComps] = useState<CompRow[] | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    Promise.all([
      fetchAccess({ data: {} }),
      fetchComps({ data: {} }),
      checkPlatform({ data: {} }).catch(() => ({ isPlatformAdmin: false })),
    ])
      .then(([t, c, p]) => {
        setTenants(t as TenantRow[]);
        setComps(c as CompRow[]);
        setIsPlatformAdmin((p as { isPlatformAdmin: boolean }).isPlatformAdmin);
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [fetchAccess, fetchComps, checkPlatform]);


  function openPanel(c: CompRow) {
    sessionStorage.setItem("osc_comp", c.id);
    sessionStorage.setItem("osc_pin", ""); // auth-based, no PIN
    nav({ to: "/admin/panel" });
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <Shell>
      <Logo />
      <div className="mt-12">
        <h1 className="display text-3xl">Admin dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">Signed in as {email}</p>
      </div>

      {err && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {err}
        </p>
      )}

      <h2 className="mt-6 display text-lg">Your competitions</h2>
      <Card className="mt-3 space-y-2">
        {comps === null && !err && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {comps && comps.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No competitions yet. Tenant owners can grant you access from the platform admin page.
          </p>
        )}
        {comps?.map((c) => (
          <button
            key={c.id}
            onClick={() => openPanel(c)}
            className="block w-full rounded-md border border-border p-3 text-left hover:bg-muted/40"
          >
            <div className="font-medium">{c.name}</div>
            <div className="text-xs text-muted-foreground">
              {c.tenant_name} ({c.tenant_slug})
            </div>
          </button>
        ))}
      </Card>

      <h2 className="mt-6 display text-lg">Your tenants</h2>
      <Card className="mt-3 space-y-2">
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
            <Link to="/_authenticated/platform/admin" className="text-xs underline">
              Platform admin →
            </Link>
          </div>
        )}
      </div>

    </Shell>
  );
}
