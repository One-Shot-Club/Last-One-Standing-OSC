import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getCompetition,
  joinCompetitionWithEntries,
  setPaymentLink,
} from "@/lib/oneshot.functions";
import { Btn, Card, Eyebrow, Field, Shell } from "@/components/oneshot/ui";
import { ClubHeader } from "@/components/oneshot/ClubHeader";
import { useCompetitionBranding } from "@/lib/tenant/use-competition-branding";
import { clearCart, readCart, removeFromCart, type CartEntry } from "@/lib/entry-cart";

type Search = { c: string; n: string; e: string; p: string; t: string; o?: string; s?: string };

export const Route = createFileRoute("/pay")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    c: String(s.c ?? ""),
    n: String(s.n ?? ""),
    e: String(s.e ?? ""),
    p: String(s.p ?? ""),
    t: String(s.t ?? ""),
    o: s.o ? String(s.o) : undefined,
    s: s.s ? String(s.s) : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (!search.c || !search.t) throw redirect({ to: "/" });
  },
  component: Pay,
});


type Kind = "stripe" | "revolut" | "payment";

const LABELS: Record<Kind, string> = {
  stripe: "Pay with Stripe",
  revolut: "Pay with Revolut",
  payment: "Payment Link",
};

function Pay() {
  const { c, n, e, p, t, o } = Route.useSearch();
  const nav = useNavigate();
  const qc = useQueryClient();
  const fetchComp = useServerFn(getCompetition);
  const { data: comp } = useQuery({
    queryKey: ["comp", c],
    queryFn: () => fetchComp({ data: { id: c } }),
    enabled: !!c,
  });
  const { logoUrl: tenantLogo, bgUrl } = useCompetitionBranding(c);
  const join = useServerFn(joinCompetitionWithEntries);

  const [cart, setCart] = useState<CartEntry[]>([]);
  useEffect(() => setCart(readCart(c)), [c]);

  const [paidClicked, setPaidClicked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupKind, setSetupKind] = useState<Kind | null>(null);

  const links: Record<Kind, string | null> = {
    stripe: comp?.stripe_link ?? null,
    revolut: comp?.revolut_link ?? null,
    payment: comp?.payment_link ?? null,
  };

  const fee = Number(comp?.entry_fee ?? 10);
  const totalEntries = 1 + cart.length;
  const total = fee * totalEntries;

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      const { ownerToken } = await join({
        data: {
          competitionId: c,
          week: comp?.current_week ?? 1,
          owner: { fullName: n, email: e, phone: p, team: t, offline: o === "1" },
          additional: cart,
        },
      });
      clearCart(c);
      nav({ to: "/welcome", search: { token: ownerToken, team: t, c } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function addAnother() {
    // Hop back to the tenant landing in "additional entry" mode, carrying
    // owner contact along so we can return here after the next pick+name.
    // We don't know the slug from /pay so we use root `/` which redirects to
    // the master tenant; if the user came from a sub-tenant they'll need to
    // re-pick there. Realistically this flow is one tenant per checkout.
    nav({
      to: "/$tenantSlug",
      params: { tenantSlug: "oneshotclub" },
      search: { add: "1", n, e, p, ...(o ? { o } : {}) },
    });
  }

  function removeEntry(idx: number) {
    removeFromCart(c, idx);
    setCart(readCart(c));
  }

  return (
    <Shell bgUrl={bgUrl ?? undefined} bgBlur={6}>
      <ClubHeader clubName={comp?.club_name ?? "Last Man Standing"} logoUrl={tenantLogo ?? comp?.club_logo_url} />

      <div className="mt-8">
        <Eyebrow>Step 3 of 3</Eyebrow>
        <h1 className="display mt-2 text-3xl">Review &amp; pay</h1>
      </div>

      <Card className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Account owner</span>
          <span className="text-sm">{n}</span>
        </div>

        <div className="border-t border-[color:var(--border)] pt-3 space-y-2">
          <p className="eyebrow">Entries</p>
          <EntryRow name={n} team={t} owner />
          {cart.map((entry, i) => (
            <EntryRow
              key={i}
              name={entry.fullName}
              team={entry.team}
              onRemove={() => removeEntry(i)}
            />
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-3">
          <span className="text-sm text-muted-foreground">
            {totalEntries} × €{fee}
          </span>
          <span className="display text-2xl text-primary">€{total}</span>
        </div>
      </Card>

      <div className="mt-4">
        <Btn variant="ghost" onClick={addAnother}>
          + Add another entry (for me or someone else)
        </Btn>
      </div>

      <div className="mt-6 space-y-3">
        {(Object.keys(LABELS) as Kind[]).map((k) => (
          <PayOption
            key={k}
            kind={k}
            url={links[k]}
            onPaid={() => setPaidClicked(true)}
            onSetup={() => setSetupKind(setupKind === k ? null : k)}
            isSetupOpen={setupKind === k}
            competitionId={c}
            onSaved={() => {
              setSetupKind(null);
              qc.invalidateQueries({ queryKey: ["comp", c] });
            }}
          />
        ))}
      </div>

      <div className="mt-6">
        <Btn variant="ghost" disabled={!paidClicked || loading} onClick={confirm}>
          {loading
            ? "Saving…"
            : totalEntries === 1
              ? "Just one entry — I've paid →"
              : `I've paid for ${totalEntries} entries →`}
        </Btn>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Tap a payment option, complete the payment, then return and continue.
        </p>
      </div>
    </Shell>
  );
}

function EntryRow({
  name,
  team,
  owner,
  onRemove,
}: {
  name: string;
  team: string;
  owner?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          {name}
          {owner && (
            <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              account owner
            </span>
          )}
        </div>
        <div className="text-xs text-primary">{team}</div>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-[11px] uppercase tracking-wider text-destructive hover:underline"
        >
          Remove
        </button>
      )}
    </div>
  );
}

function PayOption({
  kind,
  url,
  onPaid,
  onSetup,
  isSetupOpen,
  competitionId,
  onSaved,
}: {
  kind: Kind;
  url: string | null;
  onPaid: () => void;
  onSetup: () => void;
  isSetupOpen: boolean;
  competitionId: string;
  onSaved: () => void;
}) {
  const label = LABELS[kind];
  return (
    <div>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" onClick={onPaid}>
          <Btn>{label} →</Btn>
        </a>
      ) : (
        <Btn variant="ghost" onClick={onSetup}>
          {label} — set up
        </Btn>
      )}
      {!url && isSetupOpen && (
        <SetupPanel kind={kind} competitionId={competitionId} onSaved={onSaved} />
      )}
    </div>
  );
}

function SetupPanel({
  kind,
  competitionId,
  onSaved,
}: {
  kind: Kind;
  competitionId: string;
  onSaved: () => void;
}) {
  const save = useServerFn(setPaymentLink);
  const [pin, setPin] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      await save({ data: { competitionId, pin, kind, url } });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-2 space-y-3">
      <p className="text-xs text-muted-foreground">
        Admin: paste your {LABELS[kind]} URL and the admin PIN to save it for this competition.
      </p>
      <Field label="Payment URL" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
      <Field label="Admin PIN" type="password" placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value)} />
      <Btn disabled={!pin || !url || busy} onClick={submit}>
        {busy ? "Saving…" : "Save link"}
      </Btn>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </Card>
  );
}
