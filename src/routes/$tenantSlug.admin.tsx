import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { clubAdminLogin } from "@/lib/club-auth.functions";
import { Btn, Card, Field, Logo, Shell } from "@/components/oneshot/ui";

export const Route = createFileRoute("/$tenantSlug/admin")({
  component: ClubAdminLogin,
});

function ClubAdminLogin() {
  const { tenantSlug } = useParams({ from: "/$tenantSlug/admin" });
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
        data: { tenantSlug, username: username.trim(), password },
      })) as { token: string; competitionId: string | null; tenantSlug: string };
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
        <h1 className="display text-3xl">Club admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to manage <span className="font-mono">/{tenantSlug}</span> entries.
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
