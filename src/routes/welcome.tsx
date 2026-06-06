import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getCompetition } from "@/lib/oneshot.functions";
import { Btn, Card, Shell } from "@/components/oneshot/ui";
import { ClubHeader } from "@/components/oneshot/ClubHeader";

type Search = { token: string; team: string; c: string };

export const Route = createFileRoute("/welcome")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: String(s.token ?? ""),
    team: String(s.team ?? ""),
    c: String(s.c ?? ""),
  }),
  component: Welcome,
});

function Welcome() {
  const { team, c } = Route.useSearch();
  const fetchComp = useServerFn(getCompetition);
  const { data: comp } = useQuery({
    queryKey: ["comp", c],
    queryFn: () => fetchComp({ data: { id: c } }),
  });

  return (
    <Shell>
      <ClubHeader clubName={comp?.club_name ?? "Killeshin GAA"} logoUrl={comp?.club_logo_url} />

      <div className="mt-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary text-primary">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="display mt-6 text-4xl">You're in!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks for entering. You've locked in{" "}
          <span className="text-primary font-semibold">{team}</span> for Gameweek 1.
        </p>
      </div>

      {comp?.whatsapp_link && (
        <Card className="mt-10 text-center">
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
