import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getCompetition } from "@/lib/oneshot.functions";
import { Btn, Card, Shell } from "@/components/oneshot/ui";
import { ClubHeader } from "@/components/oneshot/ClubHeader";
import { useCompetitionBranding } from "@/lib/tenant/use-competition-branding";

type Search = {
  token: string;
  team: string;
  c: string;
  tokens?: string;
  names?: string;
};

export const Route = createFileRoute("/welcome")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: String(s.token ?? ""),
    team: String(s.team ?? ""),
    c: String(s.c ?? ""),
    tokens: s.tokens ? String(s.tokens) : undefined,
    names: s.names ? String(s.names) : undefined,
  }),
  component: Welcome,
});

function Welcome() {
  const { team, c, token, tokens, names } = Route.useSearch();
  const fetchComp = useServerFn(getCompetition);
  const { data: comp } = useQuery({
    queryKey: ["comp", c],
    queryFn: () => fetchComp({ data: { id: c } }),
    enabled: !!c,
  });
  const { logoUrl: tenantLogo, bgUrl } = useCompetitionBranding(c);

  const allTokens = tokens ? tokens.split(",") : [token];
  const allNames = names ? names.split("|") : ["Your entry"];

  return (
    <Shell bgUrl={bgUrl ?? undefined} bgBlur={6}>
      <ClubHeader clubName={comp?.club_name ?? "Last Man Standing"} logoUrl={tenantLogo ?? comp?.club_logo_url} />

      <div className="mt-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary text-primary">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="display mt-6 text-4xl">You're in!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks for entering. Your first entry has{" "}
          <span className="text-primary font-semibold">{team}</span> locked in for Gameweek 1.
        </p>
      </div>

      {allTokens.length > 1 && (
        <Card className="mt-8 space-y-3">
          <p className="eyebrow">Your other entries</p>
          <p className="text-xs text-muted-foreground">
            Each entry has its own magic link. Open it to make that entry's GW1 pick.
            We've also emailed these to you.
          </p>
          <ul className="space-y-2">
            {allTokens.slice(1).map((tk, i) => (
              <li key={tk} className="flex items-center justify-between gap-2 rounded-md border border-[color:var(--border)] p-3">
                <span className="text-sm font-semibold">{allNames[i + 1] ?? `Entry ${i + 2}`}</span>
                <a
                  href={`/pick?token=${encodeURIComponent(tk)}`}
                  className="rounded-md border border-primary px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary"
                >
                  Pick →
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {comp?.whatsapp_link && (
        <Card className="mt-8 text-center">
          <p className="eyebrow">Stay in the loop</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Join the WhatsApp community for weekly reminders, banter, and pick deadlines.
          </p>
          <a href={comp.whatsapp_link} target="_blank" rel="noreferrer" className="mt-4 block">
            <Btn>Join the WhatsApp Community →</Btn>
          </a>
        </Card>
      )}

      <div className="mt-6">
        <Link to="/">
          <Btn variant="ghost">Back home</Btn>
        </Link>
      </div>
    </Shell>
  );
}
