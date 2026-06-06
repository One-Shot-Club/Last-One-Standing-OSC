import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { adminLogin } from "@/lib/oneshot.functions";
import { Btn, Card, Field, Logo, Shell } from "@/components/oneshot/ui";

export const Route = createFileRoute("/admin")({ component: Admin });

function Admin() {
  const nav = useNavigate();
  const login = useServerFn(adminLogin);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      const comp = await login({ data: { pin } });
      sessionStorage.setItem("osc_pin", pin);
      sessionStorage.setItem("osc_comp", comp.id);
      nav({ to: "/admin/panel" });
    } catch {
      setErr("Invalid PIN");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <Logo />
      <div className="mt-16">
        <h1 className="display text-4xl">Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your competition PIN.</p>
      </div>
      <Card className="mt-6 space-y-4">
        <Field
          label="PIN"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
        />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Btn disabled={!pin || loading} onClick={submit}>
          {loading ? "Checking…" : "Sign in →"}
        </Btn>
        <p className="text-center text-xs text-muted-foreground">Demo PIN: 1234</p>
      </Card>
    </Shell>
  );
}
