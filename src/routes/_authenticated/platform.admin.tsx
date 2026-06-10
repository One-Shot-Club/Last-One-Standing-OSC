import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  amIPlatformAdmin,
  claimPlatformAdmin,
  createTenant,
  getPlatformOverview,
  listTenantsAdmin,
  setTenantStatus,
  addPlatformAdmin,
  listPlatformAdmins,
} from "@/lib/platform-admin.functions";
import { Btn, Card, Field, Logo, Shell } from "@/components/oneshot/ui";
import { EditTenantPanel } from "@/components/platform/EditTenantPanel";
import { ActivateTenantWizard } from "@/components/platform/ActivateTenantWizard";


export const Route = createFileRoute("/_authenticated/platform/admin")({
  component: PlatformAdmin,
});

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  competitions: number;
  entries: number;
  members: number;
};
type AdminRow = { user_id: string; email: string; created_at: string };
type Overview = { tenants: number; competitions: number; entries: number; members: number };

function PlatformAdmin() {
  const checkMe = useServerFn(amIPlatformAdmin);
  const claim = useServerFn(claimPlatformAdmin);
  const overviewFn = useServerFn(getPlatformOverview);
  const listFn = useServerFn(listTenantsAdmin);
  const createFn = useServerFn(createTenant);
  const statusFn = useServerFn(setTenantStatus);
  const addAdminFn = useServerFn(addPlatformAdmin);
  const listAdminsFn = useServerFn(listPlatformAdmins);

  const [email, setEmail] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "needs-claim" | "ready" | "forbidden">("loading");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [activatingTenantId, setActivatingTenantId] = useState<string | null>(null);

  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");

  async function refresh() {
    const [ov, ts, ads] = await Promise.all([
      overviewFn({ data: {} }),
      listFn({ data: {} }),
      listAdminsFn({ data: {} }),
    ]);
    setOverview(ov as Overview);
    setTenants(ts as TenantRow[]);
    setAdmins(ads as AdminRow[]);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    checkMe({ data: {} })
      .then(async (r) => {
        const { isPlatformAdmin, totalAdmins } = r as {
          isPlatformAdmin: boolean;
          totalAdmins: number;
        };
        if (isPlatformAdmin) {
          setState("ready");
          await refresh();
        } else if (totalAdmins === 0) {
          setState("needs-claim");
        } else {
          setState("forbidden");
        }
      })
      .catch((e: unknown) => {
        setErr(e instanceof Error ? e.message : "Failed");
        setState("forbidden");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleClaim() {
    setErr(null);
    try {
      const r = (await claim({ data: {} })) as { claimed: boolean; isPlatformAdmin: boolean };
      if (r.isPlatformAdmin) {
        setState("ready");
        await refresh();
      } else {
        setErr("Could not claim — a platform admin already exists.");
        setState("forbidden");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Claim failed");
    }
  }

  async function handleCreate() {
    setErr(null);
    try {
      await createFn({
        data: { slug: newSlug.trim(), name: newName.trim(), contactEmail: newContact.trim() || undefined },
      });
      setNewSlug("");
      setNewName("");
      setNewContact("");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    }
  }

  async function handleStatus(id: string, status: "active" | "paused" | "archived") {
    setErr(null);
    try {
      await statusFn({ data: { tenantId: id, status } });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Status update failed");
    }
  }

  async function handleAddAdmin() {
    setErr(null);
    try {
      await addAdminFn({ data: { email: newAdminEmail.trim() } });
      setNewAdminEmail("");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Add admin failed");
    }
  }

  if (state === "loading") {
    return (
      <Shell>
        <Logo />
        <p className="mt-12 text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  if (state === "needs-claim") {
    return (
      <Shell>
        <Logo />
        <div className="mt-16">
          <h1 className="display text-3xl">Bootstrap platform admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No platform admin exists yet. Claim this role for {email}? This can only be done once.
          </p>
        </div>
        <Card className="mt-6 space-y-3">
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Btn onClick={handleClaim}>Claim platform admin</Btn>
        </Card>
      </Shell>
    );
  }

  if (state === "forbidden") {
    return (
      <Shell>
        <Logo />
        <div className="mt-16">
          <h1 className="display text-3xl">Not authorized</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {email} is not a platform admin. Ask an existing platform admin to grant access.
          </p>
          {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
          <Link to="/_authenticated/dashboard" className="mt-4 inline-block text-sm underline">
            Back to dashboard
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Logo />
      <div className="mt-10 flex items-baseline justify-between">
        <h1 className="display text-3xl">Platform Admin</h1>
        <Link to="/_authenticated/dashboard" className="text-xs underline">
          Dashboard
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Signed in as {email}</p>

      {err && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {err}
        </p>
      )}

      {overview && (
        <Card className="mt-6">
          <div className="grid grid-cols-4 gap-3 text-center">
            <Stat label="Tenants" value={overview.tenants} />
            <Stat label="Comps" value={overview.competitions} />
            <Stat label="Entries" value={overview.entries} />
            <Stat label="Members" value={overview.members} />
          </div>
        </Card>
      )}

      <h2 className="mt-8 display text-xl">Tenants</h2>
      <Card className="mt-3 space-y-2">
        {tenants.length === 0 && <p className="text-sm text-muted-foreground">No tenants yet.</p>}
        {tenants.map((t) => (
          <TenantCard
            key={t.id}
            tenant={t}
            onStatus={(s) => handleStatus(t.id, s)}
            onEdit={() => setEditingTenantId(t.id)}
            onActivate={() => setActivatingTenantId(t.id)}
          />
        ))}
      </Card>

      {editingTenantId && (
        <EditTenantPanel
          tenantId={editingTenantId}
          onClose={() => setEditingTenantId(null)}
          onSaved={refresh}
        />
      )}

      {activatingTenantId && (
        <ActivateTenantWizard
          tenantId={activatingTenantId}
          onClose={() => setActivatingTenantId(null)}
          onSaved={refresh}
        />
      )}

      <h2 className="mt-8 display text-xl">New tenant</h2>
      <Card className="mt-3 space-y-3">
        <Field
          label="Slug (lowercase, dashes)"
          value={newSlug}
          onChange={(e) => setNewSlug(e.target.value)}
          placeholder="rovers-fc"
        />
        <Field
          label="Display name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Rovers FC Last One Standing"
        />
        <Field
          label="Contact email (optional)"
          value={newContact}
          onChange={(e) => setNewContact(e.target.value)}
          placeholder="admin@rovers.ie"
        />
        <Btn disabled={!newSlug || !newName} onClick={handleCreate}>
          Create tenant
        </Btn>
      </Card>

      <h2 className="mt-8 display text-xl">Platform admins</h2>
      <Card className="mt-3 space-y-3">
        {admins.map((a) => (
          <div key={a.user_id} className="text-sm">
            {a.email}
          </div>
        ))}
        <Field
          label="Add admin by email (user must already be signed up)"
          value={newAdminEmail}
          onChange={(e) => setNewAdminEmail(e.target.value)}
          placeholder="tom@example.com"
        />
        <Btn disabled={!newAdminEmail} onClick={handleAddAdmin}>
          Grant platform admin
        </Btn>
      </Card>
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

function TenantCard({
  tenant,
  onStatus,
  onEdit,
  onActivate,
}: {
  tenant: TenantRow;
  onStatus: (s: "active" | "paused" | "archived") => void;
  onEdit: () => void;
  onActivate: () => void;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">
            {tenant.name}{" "}
            <span className="text-xs text-muted-foreground">/{tenant.slug}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {tenant.competitions} comps · {tenant.entries} entries · {tenant.status}
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <button
            className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
            onClick={onActivate}
          >
            {tenant.competitions > 0 ? "Re-run setup" : "Activate"}
          </button>
          <button className="text-xs underline" onClick={onEdit}>
            Edit branding
          </button>
          {tenant.status !== "paused" && (
            <button className="text-xs underline" onClick={() => onStatus("paused")}>
              Pause
            </button>
          )}
          {tenant.status === "paused" && (
            <button className="text-xs underline" onClick={() => onStatus("active")}>
              Resume
            </button>
          )}
          {tenant.status !== "archived" && (
            <button className="text-xs underline" onClick={() => onStatus("archived")}>
              Archive
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

