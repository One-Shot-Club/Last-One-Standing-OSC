import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getCompetition, joinCompetition } from "@/lib/oneshot.functions";
import { Btn, Card, Eyebrow, Logo, Shell } from "@/components/oneshot/ui";

type Search = { c: string; n: string; e: string; p: string };

export const Route = createFileRoute("/pay")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    c: String(s.c ?? ""),
    n: String(s.n ?? ""),
    e: String(s.e ?? ""),
    p: String(s.p ?? ""),
  }),
  component: Pay,
});

function Pay() {
  const { c, n, e, p } = Route.useSearch();
  const nav = useNavigate();
  const fetchComp = useServerFn(getCompetition);
  const { data: comp } = useQuery({
    queryKey: ["comp", c],
    queryFn: () => fetchComp({ data: { id: c } }),
  });
  const join = useServerFn(joinCompetition);
  const [loading, setLoading] = useState(false);
  const [stripeClicked, setStripeClicked] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      const player = await join({
        data: { competitionId: c, fullName: n, email: e, phone: p },
      });
      nav({ to: "/pick", search: { token: player.magic_token } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <Logo />
      <div className="mt-10">
        <Eyebrow>Step 2 of 3</Eyebrow>
        <h1 className="display mt-2 text-4xl">Pay your entry</h1>
      </div>
      <Card className="mt-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Competition</div>
        <div className="display mt-1 text-2xl">{comp?.name}</div>
        <div className="mt-4 flex items-center justify-between border-t border-[color:var(--border)] pt-4">
          <span className="text-sm text-muted-foreground">Entry fee</span>
          <span className="display text-2xl text-primary">€{comp?.entry_fee}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Prize pool</span>
          <span className="text-sm">€{comp?.prize_pool}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Player</span>
          <span className="text-sm">{n}</span>
        </div>
      </Card>

      <div className="mt-6 space-y-3">
        <a
          href={comp?.stripe_link ?? "#"}
          target="_blank"
          rel="noreferrer"
          onClick={() => setStripeClicked(true)}
        >
          <Btn>Pay €{comp?.entry_fee ?? 0} with Stripe →</Btn>
        </a>
        <Btn variant="ghost" disabled={!stripeClicked || loading} onClick={confirm}>
          {loading ? "Saving…" : "I've Paid — Make My Pick →"}
        </Btn>
        <p className="text-center text-xs text-muted-foreground">
          Tap Stripe first, then return and confirm.
        </p>
      </div>
    </Shell>
  );
}
