import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapDevTestAccount } from "@/lib/dev-auth.functions";
import { DEV_PREVIEW_COOKIE, DEV_TEST } from "@/lib/dev-test.constants";

export const Route = createFileRoute("/dev/login")({
  component: DevLoginPage,
});

function enableDevPreviewCookie() {
  document.cookie = `${DEV_PREVIEW_COOKIE}=1; path=/; max-age=86400; SameSite=Lax`;
  localStorage.setItem(DEV_PREVIEW_COOKIE, "1");
}

function DevLoginPage() {
  const nav = useNavigate();
  const bootstrap = useServerFn(bootstrapDevTestAccount);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      nav({ to: "/login" });
    }
  }, [nav]);

  if (!import.meta.env.DEV) return null;

  async function enterPreviewDashboard() {
    enableDevPreviewCookie();
    nav({ to: "/dashboard" });
  }

  async function createAndSignIn() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const result = await bootstrap({ data: {} });
      if (result.mode === "preview") {
        setMsg(result.message ?? "Using preview mode.");
        enableDevPreviewCookie();
        nav({ to: "/dashboard" });
        return;
      }
      if (result.accessToken && result.refreshToken) {
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
        });
        if (sessionErr) throw sessionErr;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: result.email,
          password: result.password,
        });
        if (error) {
          throw new Error(
            `${error.message} — stop the dev server (Ctrl+C), run npm run dev again, then retry.`,
          );
        }
      }
      localStorage.removeItem(DEV_PREVIEW_COOKIE);
      document.cookie = `${DEV_PREVIEW_COOKIE}=; path=/; max-age=0`;
      nav({ to: "/dashboard" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Dev login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-prose py-16 md:py-24">
      <div className="mx-auto max-w-lg rounded-xl border border-amber-300 bg-amber-50 p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-800">
          Development only
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-wide text-primary">
          Test dashboard access
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Local signup often fails without a Supabase service role key. Use one
          of the options below to get into the dashboard on{" "}
          <code className="text-xs">localhost</code>.
        </p>

        <div className="mt-6 rounded-lg border border-border bg-card p-4 font-mono text-sm">
          <p>
            <span className="text-muted-foreground">Email:</span> {DEV_TEST.email}
          </p>
          <p className="mt-1">
            <span className="text-muted-foreground">Password:</span>{" "}
            {DEV_TEST.password}
          </p>
          <p className="mt-1">
            <span className="text-muted-foreground">Club URL:</span> /{DEV_TEST.clubSlug}
          </p>
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            Client Supabase:{" "}
            <span className="text-foreground">
              {import.meta.env.VITE_SUPABASE_URL ?? "(not set)"}
            </span>
          </p>
        </div>

        {msg && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-100/80 p-3 text-sm text-amber-950">
            {msg}
          </p>
        )}
        {err && (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {err}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={createAndSignIn}
            className="rounded-md bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition hover:bg-secondary disabled:opacity-60"
          >
            {busy ? "Setting up…" : "Create test account & open dashboard"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={enterPreviewDashboard}
            className="rounded-md border border-border bg-background px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary transition hover:bg-muted/40"
          >
            Preview dashboard (mock data, no database)
          </button>
          <Link
            to="/login"
            className="text-center text-sm text-muted-foreground underline"
          >
            Back to normal login
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          After updating <code className="text-[11px]">.env</code>, stop the dev
          server (<code className="text-[11px]">Ctrl+C</code>) and run{" "}
          <code className="text-[11px]">npm run dev</code> again. The Client
          Supabase URL above must show{" "}
          <code className="text-[11px]">hxyaqongcakmmzbyfpey.supabase.co</code>.
        </p>
      </div>
    </div>
  );
}
