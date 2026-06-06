import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDemoCompetition } from "@/lib/oneshot.functions";
import { Btn, Card, Eyebrow, Logo, Shell } from "@/components/oneshot/ui";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OneShotClub — Last Man Standing" },
      { name: "description", content: "Pick one team a week. Win and survive. Lose and you're out." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const fetchComp = useServerFn(getDemoCompetition);
  const { data: comp } = useQuery({ queryKey: ["demo-comp"], queryFn: () => fetchComp() });

  return (
    <Shell>
      <header className="flex items-center justify-between">
        <Logo />
        <Link to="/admin" className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </Link>
      </header>

      <section className="mt-10">
        <Eyebrow>Last Man Standing</Eyebrow>
        <h1 className="display mt-3 text-5xl text-foreground">
          One pick.
          <br />
          <span className="text-primary">One shot.</span>
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Pick one Premier League team each week. Win to survive. Lose and
          you're eliminated. Last person standing takes the pot.
        </p>
      </section>

      <Card className="mt-8">
        <Eyebrow>Live competition</Eyebrow>
        <h2 className="display mt-2 text-3xl">{comp?.name ?? "Loading…"}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-[color:var(--surface-elevated)] p-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Entry</div>
            <div className="display mt-1 text-2xl text-primary">€{comp?.entry_fee ?? 0}</div>
          </div>
          <div className="rounded-lg bg-[color:var(--surface-elevated)] p-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Pot</div>
            <div className="display mt-1 text-2xl text-primary">€{comp?.prize_pool ?? 0}</div>
          </div>
        </div>
      </Card>

      <div className="mt-6">
        <Link to="/join" search={{ c: comp?.id }} disabled={!comp}>
          <Btn disabled={!comp}>Join the Comp →</Btn>
        </Link>
      </div>

      <ol className="mt-10 space-y-3 text-sm text-muted-foreground">
        <li><span className="text-primary">1.</span> Pay your entry.</li>
        <li><span className="text-primary">2.</span> Pick a team each gameweek.</li>
        <li><span className="text-primary">3.</span> Can't reuse a team. Don't lose.</li>
      </ol>
    </Shell>
  );
}
