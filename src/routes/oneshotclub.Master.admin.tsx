import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { clubAdminLogin } from "@/lib/club-auth.functions";
import { Btn, Card, Field, Logo, Shell } from "@/components/oneshot/ui";

const MASTER_SLUG = "oneshotclub-master";

export const Route = createFileRoute("/oneshotclub/Master/admin")({
  component: MasterAdminLogin,
});

function MasterAdminLogin() {
  const nav = useNavigate();
  const loginFn = useServerFn(clubAdminLogin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = (await loginFn({
        data: { tenantSlug: MASTER_SLUG, username: username.trim(), password },
      })) as
        | { ok: true; token: string; competitionId: string | null; tenantSlug: string }
        | { ok: false; error: string };
      if (!r.ok) {
        setErr(r.error || "Invalid credentials");
        setBusy(false);
        return;
      }
      if (!r.competitionId) {
        setErr("No competition is set up for this club yet.");
        setBusy(false);
        return;
      }
      sessionStorage.setItem("osc_comp", r.competitionId);
      sessionStorage.setItem("osc_pin", r.token);
      sessionStorage.setItem("osc_club_slug", r.tenantSlug);
      nav({ to: "/admin/panel" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
      setBusy(false);
    }
  }


  return (
    <Shell>
      <Logo />
      <div className="mt-12">
        <h1 className="display text-3xl">Master admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to manage the <span className="font-mono">Master</span> template.
        </p>
      </div>
      <form onSubmit={submit}>
        <Card className="mt-6 space-y-3">
          {err && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
              {err}
            </p>
          )}
          <Field
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Btn type="submit" disabled={busy || !username || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </Btn>
        </Card>
      </form>
    </Shell>
  );
}
