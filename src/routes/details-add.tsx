import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getCompetition } from "@/lib/oneshot.functions";
import { Btn, Card, Eyebrow, Field, Shell } from "@/components/oneshot/ui";
import { ClubHeader } from "@/components/oneshot/ClubHeader";
import { useCompetitionBranding } from "@/lib/tenant/use-competition-branding";
import { addToCart, readCart } from "@/lib/entry-cart";

// Owner contact (n, e, p, o) is carried in the URL so we can hand it back to /pay.
type Search = {
  c: string;
  t: string;
  n: string;
  e: string;
  p: string;
  o?: string;
  s?: string;
};

export const Route = createFileRoute("/details-add")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    c: String(s.c ?? ""),
    t: String(s.t ?? ""),
    n: String(s.n ?? ""),
    e: String(s.e ?? ""),
    p: String(s.p ?? ""),
    o: s.o ? String(s.o) : undefined,
    s: s.s ? String(s.s) : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (!search.c || !search.t || !search.n) throw redirect({ to: "/" });
  },
  component: DetailsAdd,
});


function DetailsAdd() {
  const { c, t, n, e, p, o, s: tenantSlug } = Route.useSearch();
  const nav = useNavigate();
  const fetchComp = useServerFn(getCompetition);
  const { data: comp } = useQuery({
    queryKey: ["comp", c],
    queryFn: () => fetchComp({ data: { id: c } }),
    enabled: !!c,
  });
  const { logoUrl, bgUrl } = useCompetitionBranding(c);

  // Suggest "<Owner> 2" / "3" if owner is making multiple picks for themselves.
  const existingCart = readCart(c);
  const suggestion = `${n.trim().split(/\s+/)[0]} ${existingCart.length + 2}`;
  const [entrantName, setEntrantName] = useState("");

  const valid = entrantName.trim().length > 1;

  function save() {
    addToCart(c, { fullName: entrantName.trim(), team: t });
    nav({ to: "/pay", search: { c, n, e, p, t, ...(o ? { o } : {}), ...(tenantSlug ? { s: tenantSlug } : {}) } });
  }


  return (
    <Shell bgUrl={bgUrl ?? undefined} bgBlur={6}>
      <ClubHeader clubName={comp?.club_name ?? "Last Man Standing"} logoUrl={logoUrl ?? comp?.club_logo_url} />

      <div className="mt-8">
        <Eyebrow>Additional entry</Eyebrow>
        <h1 className="display mt-2 text-3xl">Who's this entry for?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Picked <span className="text-primary font-semibold">{t}</span>. Add a
          name so we can track and message this entry. Use the entrant's real
          name, or your own with a number (e.g. <span className="text-primary">{suggestion}</span>)
          if it's another go for you.
        </p>
      </div>

      <Card className="mt-4 space-y-4">
        <Field
          label="Entrant name"
          placeholder={suggestion}
          value={entrantName}
          onChange={(ev) => setEntrantName(ev.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">
          All notifications for this entry go to <span className="text-foreground">{e || "you"}</span>.
        </p>
      </Card>

      <div className="mt-6 space-y-3">
        <Btn disabled={!valid} onClick={save}>
          Add this entry →
        </Btn>
        <Btn variant="ghost" onClick={() => nav({ to: "/pay", search: { c, n, e, p, t, ...(o ? { o } : {}), ...(tenantSlug ? { s: tenantSlug } : {}) } })}>
          Cancel
        </Btn>
      </div>
    </Shell>
  );
}
