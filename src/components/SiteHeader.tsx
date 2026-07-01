import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type NavItem = {
  to: "/" | "/signup" | "/case-studies" | "/last-man-standing";
  label: string;
  hash?: string;
};

const nav: readonly NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/", label: "What We Build", hash: "services" },
  { to: "/last-man-standing", label: "Last Man Standing" },
  { to: "/case-studies", label: "Case Studies" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const closeMobile = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="container-prose flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="OneShotClub logo"
            className="h-10 w-10 object-contain"
          />
          <span className="font-display text-2xl tracking-wider text-primary">
            One<span className="text-accent">Shot</span>Club
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((n) => (
            <Link
              key={`${n.to}-${n.label}`}
              to={n.to}
              hash={n.hash}
              className="text-sm font-medium uppercase tracking-wide text-foreground/80 transition hover:text-primary"
              activeProps={n.hash ? undefined : { className: "text-primary" }}
              activeOptions={{ exact: n.to === "/" && !n.hash }}
            >
              {n.label}
            </Link>
          ))}
          {signedIn && (
            <Link
              to="/dashboard"
              className="rounded-md border border-primary/30 px-4 py-2 text-center text-sm font-semibold uppercase tracking-wide text-primary transition hover:bg-primary/5"
            >
              Dashboard
            </Link>
          )}
          {!signedIn && (
            <Link
              to="/login"
              className="text-sm font-medium uppercase tracking-wide text-foreground/80 transition hover:text-primary"
            >
              Login
            </Link>
          )}
          {!signedIn && (
            <Link
              to="/signup"
              className="rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold uppercase tracking-wide text-primary-foreground transition hover:bg-secondary"
            >
              Let&apos;s get set up
            </Link>
          )}
        </nav>

        <button
          type="button"
          className="md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="container-prose flex flex-col py-4">
            {nav.map((n) => (
              <Link
                key={`${n.to}-${n.label}`}
                to={n.to}
                hash={n.hash}
                onClick={closeMobile}
                className="py-2 text-sm font-medium uppercase tracking-wide text-foreground/80"
                activeProps={n.hash ? undefined : { className: "text-primary" }}
                activeOptions={{ exact: n.to === "/" && !n.hash }}
              >
                {n.label}
              </Link>
            ))}
            {signedIn && (
              <Link
                to="/dashboard"
                onClick={closeMobile}
                className="py-2 text-sm font-semibold uppercase tracking-wide text-primary"
              >
                Dashboard
              </Link>
            )}
            {!signedIn && (
              <>
                <Link
                  to="/login"
                  onClick={closeMobile}
                  className="py-2 text-sm font-medium uppercase tracking-wide text-foreground/80"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={closeMobile}
                  className="mt-2 rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold uppercase tracking-wide text-primary-foreground"
                >
                  Let&apos;s get set up
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
