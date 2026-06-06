import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Card, Logo, Shell } from "@/components/oneshot/ui";

type Search = { token: string; team: string; c: string };

export const Route = createFileRoute("/confirmed")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: String(s.token ?? ""),
    team: String(s.team ?? ""),
    c: String(s.c ?? ""),
  }),
  component: Confirmed,
});

function Confirmed() {
  const { team, c } = Route.useSearch();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/?c=${c}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Shell>
      <Logo />
      <div className="mt-16 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary text-primary">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="display mt-6 text-5xl">You're in!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You picked <span className="text-primary font-semibold">{team}</span>.
          Good luck.
        </p>
      </div>

      <Card className="mt-10 text-center">
        <p className="text-sm text-muted-foreground">
          Spread the word and grow the pot.
        </p>
        <div className="mt-3">
          <Btn variant="ghost" onClick={share}>
            {copied ? "Link copied ✓" : "Copy share link"}
          </Btn>
        </div>
      </Card>

      <div className="mt-6">
        <Link to="/">
          <Btn variant="ghost">Back home</Btn>
        </Link>
      </div>
    </Shell>
  );
}
