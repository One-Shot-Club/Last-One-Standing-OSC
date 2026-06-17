import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  getCompetition,
  setPaymentLink,
  submitPick,
} from "@/lib/oneshot.functions";
import { createAccountWithEntries } from "@/lib/accounts.functions";
import { Btn, Card, Eyebrow, Field, Shell } from "@/components/oneshot/ui";
import { ClubHeader } from "@/components/oneshot/ClubHeader";
import { useCompetitionBranding } from "@/lib/tenant/use-competition-branding";

type Search = { c: string; n: string; e: string; p: string; t: string; o?: string; ns?: string };

export const Route = createFileRoute("/pay")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    c: String(s.c ?? ""),
    n: String(s.n ?? ""),
    e: String(s.e ?? ""),
    p: String(s.p ?? ""),
    t: String(s.t ?? ""),
    o: s.o ? String(s.o) : undefined,
    ns: s.ns ? String(s.ns) : undefined,
  }),

  beforeLoad: ({ search }) => {
    if (!search.c || !search.t) {
      throw redirect({ to: "/" });
    }
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
  const { c, n, e, p, t, o, ns } = Route.useSearch();
  const nav = useNavigate();
  const qc = useQueryClient();
  const fetchComp = useServerFn(getCompetition);
  const { data: comp } = useQuery({
    queryKey: ["comp", c],
    queryFn: () => fetchComp({ data: { id: c } }),
    enabled: !!c,
  });
  const { logoUrl: tenantLogo, bgUrl } = useCompetitionBranding(c);
  const createAccount = useServerFn(createAccountWithEntries);
  const pick = useServerFn(submitPick);

  const [paidClicked, setPaidClicked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupKind, setSetupKind] = useState<Kind | null>(null);

  const extraNames = useMemo(
    () => (ns ? ns.split("|") : []).map((s) => s.trim()),
    [ns],
  );
  const entryNames = useMemo(() => {
    const list = [n || "Entry 1"];
    extraNames.forEach((nm, i) => list.push(nm || `Entry ${i + 2}`));
    return list;
  }, [n, extraNames]);

  const fee = Number(comp?.entry_fee ?? 10);
  const total = fee * entryNames.length;

  const links: Record<Kind, string | null> = {
    stripe: comp?.stripe_link ?? null,
    revolut: comp?.revolut_link ?? null,
    payment: comp?.payment_link ?? null,
  };

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await createAccount({
        data: {
          competitionId: c,
          buyerName: n,
          email: e,
          phone: p,
          offline: o === "1",
          entries: entryNames.map((displayName) => ({ displayName })),
        },
      });

      // GW1 pick belongs to the primary (first) entry only.
      const primary = res.entries[0];
      if (primary?.playerId) {
        await pick({
          data: {
            playerId: primary.playerId,
            competitionId: c,
            week: comp?.current_week ?? 1,
            team: t,
          },
        });
      }
      const tokens = res.entries.map((x) => x.magicToken).join(",");
      const names = res.entries.map((x) => x.displayName).join("|");
      nav({
        to: "/welcome",
        search: {
          token: primary.magicToken,
          team: t,
          c,
          tokens,
          names,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell bgUrl={bgUrl ?? undefined} bgBlur={6}>
      <ClubHeader clubName={comp?.club_name ?? "Last Man Standing"} logoUrl={tenantLogo ?? comp?.club_logo_url} />

      <div className="mt-8">
        <Eyebrow>Step 3 of 3</Eyebrow>
        <h1 className="display mt-2 text-3xl">Pay your entries</h1>
      </div>

      <Card className="mt-4 space-y-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          {entryNames.length === 1 ? "Entry" : `${entryNames.length} entries`}
        </div>
        <ul className="divide-y divide-[color:var(--border)]">
          {entryNames.map((name, i) => (
            <li key={i} className="flex items-center justify-between py-2 text-sm">
              <span>
                {name}
                {i === 0 && (
                  <span className="ml-2 text-[10px] uppercase tracking-widest text-primary">
                    GW1: {t}
                  </span>
                )}
                {i > 0 && (
                  <span className="ml-2 text-[10px] text-muted-foreground">
                    pick after payment
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">€{fee}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-3">
          <span className="text-sm font-semibold">Total</span>
          <span className="display text-2xl text-primary">€{total}</span>
        </div>
      </Card>

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
          {loading ? "Saving…" : `I've Paid — Continue →`}
        </Btn>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Tap a payment option, complete the payment, then return and continue.
        </p>
      </div>
    </Shell>
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
