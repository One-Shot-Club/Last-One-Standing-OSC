import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [{ title: "Club login — OneShotClub" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const { redirect } = useSearch({ from: "/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) nav({ to: redirect || "/dashboard" });
    });
  }, [nav, redirect]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      nav({ to: redirect || "/dashboard" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-prose py-16 md:py-24">
      <div className="mx-auto max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          Club login
        </p>
        <h1 className="mt-3 font-display text-4xl uppercase tracking-wide text-primary">
          Welcome back
        </h1>
        <p className="mt-3 text-muted-foreground">
          Sign in to manage your club&apos;s competitions, entries and payouts.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-lg border border-border bg-input px-4 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-lg border border-border bg-input px-4 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          {err && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
              {err}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition hover:bg-secondary disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in →"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/signup" className="font-semibold text-accent hover:brightness-90">
            Sign up your club — it&apos;s free
          </Link>
        </p>
        {import.meta.env.DEV && (
          <p className="mt-4 text-center text-sm">
            <Link
              to="/dev/login"
              className="text-muted-foreground underline hover:text-primary"
            >
              Local dev: use test credentials
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
