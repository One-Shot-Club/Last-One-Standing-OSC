import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { adminLogin } from "@/lib/oneshot.functions";
import { Btn, Card, Field, Logo, Shell } from "@/components/oneshot/ui";

export const Route = createFileRoute("/admin/")({ component: Admin });

function Admin() {
  const nav = useNavigate();
  const login = useServerFn(adminLogin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      const comp = await login({ data: { username, password } });
      // The admin_pin column stores the same shared secret as the password,
      // so downstream verifyAdmin(...) calls keep working unchanged.
      sessionStorage.setItem("osc_pin", password);
      sessionStorage.setItem("osc_comp", comp.id);
      nav({ to: "/admin/panel" });
    } catch {
      setErr("Invalid username or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <Logo />
      <div className="mt-16">
        <h1 className="display text-4xl">Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in with your admin credentials.</p>
      </div>
      <Card className="mt-6 space-y-4">
        <Field
          label="Username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Btn disabled={!username || !password || loading} onClick={submit}>
          {loading ? "Checking…" : "Sign in →"}
        </Btn>
      </Card>
    </Shell>
  );
}
