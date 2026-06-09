import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Btn, Card, Field, Logo, Shell } from "@/components/oneshot/ui";

type AuthSearch = { redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If already signed in, bounce out.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) nav({ to: redirect || "/admin/panel" });
    });
  }, [nav, redirect]);

  async function submitEmail() {
    setErr(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth" },
        });
        if (error) throw error;
      }
      nav({ to: redirect || "/admin/panel" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  async function googleSignIn() {
    setErr(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + (redirect || "/admin/panel"),
    });
    if (result.error) {
      setErr("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    nav({ to: redirect || "/admin/panel" });
  }

  return (
    <Shell>
      <Logo />
      <div className="mt-16">
        <h1 className="display text-4xl">Admin Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to manage your competition."
            : "Create an account — your club admin can grant you access."}
        </p>
      </div>
      <Card className="mt-6 space-y-4">
        <Btn onClick={googleSignIn}>Continue with Google</Btn>
        <div className="relative my-2 text-center text-xs text-muted-foreground">
          <span className="bg-card px-2">or</span>
        </div>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Btn disabled={!email || !password || loading} onClick={submitEmail}>
          {loading ? "…" : mode === "signin" ? "Sign in →" : "Create account →"}
        </Btn>
        <button
          type="button"
          className="text-xs text-muted-foreground underline"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have one? Sign in"}
        </button>
        <div className="pt-2 text-center text-xs text-muted-foreground">
          <a href="/admin" className="underline">Use legacy PIN sign-in</a>
        </div>
      </Card>
    </Shell>
  );
}
