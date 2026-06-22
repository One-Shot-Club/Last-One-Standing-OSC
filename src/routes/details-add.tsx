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
  const [selfManaged, setSelfManaged] = useState(false);
  const [entrantEmail, setEntrantEmail] = useState("");
  const [entrantPhone, setEntrantPhone] = useState("");

  const nameValid = entrantName.trim().length > 1;
  // If "selects for own picks" is checked, require at least an email so we
  // can actually send them their magic link.
  const contactValid = !selfManaged || entrantEmail.trim().length > 3;
  const valid = nameValid && contactValid;

  function saveEntry() {
    addToCart(c, {
      fullName: entrantName.trim(),
      team: t,
      email: selfManaged ? entrantEmail.trim() || null : null,
      phone: selfManaged ? entrantPhone.trim() || null : null,
      selfManaged,
    });
  }

  function saveAndPay() {
    saveEntry();
    nav({ to: "/pay", search: { c, n, e, p, t, ...(o ? { o } : {}), ...(tenantSlug ? { s: tenantSlug } : {}) } });
  }

  function saveAndAddAnother() {
    saveEntry();
    nav({
      to: "/$tenantSlug",
      params: { tenantSlug: tenantSlug || "oneshotclub" },
      search: { add: "1", n, e, p, ...(o ? { o } : {}) },
    });
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

        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-3">
          <input
            type="checkbox"
            checked={selfManaged}
            onChange={(ev) => setSelfManaged(ev.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[color:var(--primary)]"
          />
          <span className="text-xs leading-snug">
            <span className="block font-semibold text-foreground">
              I want this entrant to manage their own picks going forward
            </span>
            <span className="text-muted-foreground">
              Ticking this box will send their weekly pick reminders and magic link
              to their own email/phone (optional)

            </span>
          </span>
        </label>

        {selfManaged && (
          <div className="space-y-3">
            <Field
              label="Entrant email"
              type="email"
              placeholder="friend@example.com"
              value={entrantEmail}
              onChange={(ev) => setEntrantEmail(ev.target.value)}
            />
            <Field
              label="Entrant mobile (optional)"
              placeholder="087 123 4567"
              value={entrantPhone}
              onChange={(ev) => setEntrantPhone(ev.target.value)}
            />
          </div>
        )}

        {!selfManaged && (
          <p className="text-[11px] text-muted-foreground">
            All notifications for this entry go to{" "}
            <span className="text-foreground">{e || "you"}</span>.
          </p>
        )}
      </Card>

      <div className="mt-6 space-y-3">
        <Btn variant="ghost" disabled={!valid} onClick={saveAndAddAnother}>
          + Add another entry
        </Btn>
        <Btn disabled={!valid} onClick={saveAndPay}>
          Continue to payment →
        </Btn>
        <Btn
          variant="ghost"
          onClick={() => nav({ to: "/pay", search: { c, n, e, p, t, ...(o ? { o } : {}), ...(tenantSlug ? { s: tenantSlug } : {}) } })}
        >
          Cancel
        </Btn>
      </div>
    </Shell>
  );
}
