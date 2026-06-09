import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyTenantAccess } from "@/lib/admin-ops.functions";
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

function Dashboard() {
  const fetchAccess = useServerFn(getMyTenantAccess);
  const [email, setEmail] = useState<string | null>(null);
  const [rows, setRows] = useState<TenantRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    fetchAccess({ data: {} })
      .then((r) => setRows(r as TenantRow[]))
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [fetchAccess]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <Shell>
      <Logo />
      <div className="mt-12">
        <h1 className="display text-3xl">Your tenants</h1>
        <p className="mt-2 text-sm text-muted-foreground">Signed in as {email}</p>
      </div>
      <Card className="mt-6 space-y-3">
        {err && <p className="text-sm text-destructive">{err}</p>}
        {rows === null && !err && <p className="text-sm text-muted-foreground">Loading…</p>}
        {rows && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            You don't have admin access to any tenants yet. Ask a tenant owner to add you, or use the
            legacy <Link to="/admin" className="underline">PIN sign-in</Link>.
          </p>
        )}
        {rows?.map((r) => (
          <div key={r.tenant_id} className="rounded-md border border-border p-3">
            <div className="font-medium">{r.tenant_name}</div>
            <div className="text-xs text-muted-foreground">
              {r.tenant_slug} · {r.role}
            </div>
          </div>
        ))}
        <Btn onClick={signOut}>Sign out</Btn>
      </Card>
    </Shell>
  );
}
