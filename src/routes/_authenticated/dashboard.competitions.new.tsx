import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  createClubCompetition,
  defaultCompetitionName,
  getMyTenantAccess,
  type CompetitionType,
} from "@/lib/admin-ops.functions";
import { Btn, Card, Field, Logo, Shell } from "@/components/oneshot/ui";

export const Route = createFileRoute("/_authenticated/dashboard/competitions/new")({
  head: () => ({
    meta: [{ title: "Create competition — OneShotClub" }],
  }),
  component: CreateCompetitionWizard,
});

const TYPES: {
  type: CompetitionType;
  title: string;
  desc: string;
  example: string;
}[] = [
  {
    type: "last_man_standing",
    title: "Last Man Standing",
    desc: "Pick one team per week. Survive to win the pot.",
    example: "€5 per entry · 64 players",
  },
  {
    type: "prediction",
    title: "Prediction Competition",
    desc: "Season-long or event predictor — World Cup, league tables, and more.",
    example: "€10 per entry · unlimited entries",
  },
  {
    type: "golf_classic",
    title: "Golf Classic",
    desc: "Hole-in-one or nearest-the-pin fundraiser for your club day.",
    example: "€20 per entry · 100 players",
  },
];

function CreateCompetitionWizard() {
  const nav = useNavigate();
  const fetchAccess = useServerFn(getMyTenantAccess);
  const createFn = useServerFn(createClubCompetition);

  const [step, setStep] = useState(0);
  const [tenants, setTenants] = useState<
    { tenant_id: string; tenant_name: string; tenant_slug: string }[]
  >([]);
  const [tenantId, setTenantId] = useState("");
  const [competitionType, setCompetitionType] = useState<CompetitionType | null>(
    null,
  );
  const [name, setName] = useState("");
  const [entryFee, setEntryFee] = useState("5");
  const [prizePool, setPrizePool] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    id: string;
    name: string;
    tenantSlug: string;
    slug: string;
    publicPath: string;
    gameweekSeeded: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedTenant = tenants.find((t) => t.tenant_id === tenantId);

  useEffect(() => {
    fetchAccess({ data: {} })
      .then((rows) => {
        const list = rows as typeof tenants;
        setTenants(list);
        if (list.length === 1) setTenantId(list[0].tenant_id);
      })
      .catch((e: unknown) =>
        setErr(e instanceof Error ? e.message : "Failed to load clubs"),
      );
  }, [fetchAccess]);

  useEffect(() => {
    if (competitionType && selectedTenant && !name) {
      setName(defaultCompetitionName(competitionType, selectedTenant.tenant_name));
    }
  }, [competitionType, selectedTenant, name]);

  const feePreview = useMemo(() => {
    const fee = parseFloat(entryFee || "0");
    if (!Number.isFinite(fee) || fee <= 0) return null;
    const platform5 = fee * 0.05;
    const clubGets = fee - platform5;
    return { platform5, clubGets };
  }, [entryFee]);

  async function handlePublish() {
    if (!tenantId || !competitionType || !name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const result = await createFn({
        data: {
          tenantId,
          competitionType,
          name: name.trim(),
          entryFee: parseFloat(entryFee || "0"),
          prizePool: prizePool ? parseFloat(prizePool) : 0,
        },
      });
      setCreated({
        id: result.id,
        name: result.name,
        tenantSlug: result.tenantSlug ?? selectedTenant?.tenant_slug ?? "",
        slug: result.slug ?? "",
        publicPath: result.publicPath ?? "",
        gameweekSeeded: result.gameweekSeeded ?? false,
      });
      setStep(3);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create competition");
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    if (!created?.publicPath) return;
    const url = `${window.location.origin}${created.publicPath}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Shell>
      <Logo />
      <div className="mt-10 flex items-baseline justify-between">
        <div>
          <Link to="/dashboard" className="text-xs text-muted-foreground underline">
            ← Dashboard
          </Link>
          <h1 className="display mt-2 text-3xl">Create competition</h1>
        </div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Step {Math.min(step + 1, 3)} of 3
        </div>
      </div>

      {err && (
        <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {err}
        </p>
      )}

      {step === 0 && (
        <Card className="mt-6 space-y-4">
          {tenants.length > 1 && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Club
              </span>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="h-12 w-full rounded-lg border border-border bg-input px-4"
              >
                <option value="">Select club…</option>
                {tenants.map((t) => (
                  <option key={t.tenant_id} value={t.tenant_id}>
                    {t.tenant_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="text-sm text-muted-foreground">Choose a competition type.</p>
          <div className="grid gap-4 md:grid-cols-3">
            {TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => {
                  setCompetitionType(t.type);
                  setName(
                    selectedTenant
                      ? defaultCompetitionName(t.type, selectedTenant.tenant_name)
                      : "",
                  );
                  setStep(1);
                }}
                disabled={!tenantId && tenants.length > 1}
                className="rounded-xl border border-border bg-card p-5 text-left transition hover:border-accent disabled:opacity-50"
              >
                <h3 className="font-display text-xl uppercase tracking-wide text-primary">
                  {t.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
                <p className="mt-3 text-xs uppercase tracking-wider text-accent">
                  {t.example}
                </p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === 1 && competitionType && (
        <Card className="mt-6 space-y-4">
          <Field
            label="Competition name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rovers FC Last Man Standing"
          />
          <Field
            label="Entry fee (€)"
            type="number"
            min="0"
            step="0.01"
            value={entryFee}
            onChange={(e) => setEntryFee(e.target.value)}
          />
          {feePreview && (
            <p className="text-sm text-muted-foreground">
              At 5% platform fee: club receives ~€{feePreview.clubGets.toFixed(2)}{" "}
              per entry (before Stripe processing).
            </p>
          )}
          <Field
            label="Prize pool (€, optional)"
            type="number"
            min="0"
            step="0.01"
            value={prizePool}
            onChange={(e) => setPrizePool(e.target.value)}
            placeholder="Leave blank if TBC"
          />
          <div className="flex gap-3">
            <Btn variant="ghost" onClick={() => setStep(0)}>
              ← Back
            </Btn>
            <Btn disabled={!name.trim()} onClick={() => setStep(2)}>
              Review →
            </Btn>
          </div>
        </Card>
      )}

      {step === 2 && competitionType && (
        <Card className="mt-6 space-y-4">
          <h2 className="display text-xl">Review &amp; publish</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-muted-foreground">Club</dt>
              <dd className="font-medium">{selectedTenant?.tenant_name}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium capitalize">
                {competitionType.replaceAll("_", " ")}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{name}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border py-2">
              <dt className="text-muted-foreground">Entry fee</dt>
              <dd className="font-medium">€{entryFee || "0"}</dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">
            Your competition will be created and ready to configure in the admin
            panel. Connect Stripe first if you want online card payments.
          </p>
          <div className="flex gap-3">
            <Btn variant="ghost" onClick={() => setStep(1)}>
              ← Back
            </Btn>
            <Btn disabled={busy} onClick={handlePublish}>
              {busy ? "Creating…" : "Publish competition →"}
            </Btn>
          </div>
        </Card>
      )}

      {step === 3 && created && (
        <Card className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Check className="h-5 w-5" />
            </span>
            <div>
              <h2 className="display text-xl">{created.name} is live</h2>
              <p className="text-sm text-muted-foreground">
                Your club is active. Share the link below so members can enter.
                {created.gameweekSeeded
                  ? " Gameweek 1 fixtures are loaded and ready."
                  : ""}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 font-mono text-sm">
            {window.location.origin}
            {created.publicPath || `/${created.tenantSlug}/${created.slug}`}
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>1. Share the club link on WhatsApp or social media</li>
            <li>
              2.{" "}
              <Link to="/onboarding" className="font-semibold text-accent hover:brightness-90">
                Connect Stripe
              </Link>{" "}
              if you want online card payments
            </li>
            <li>3. Open the admin panel to manage entries and gameweeks</li>
          </ul>
          <div className="flex flex-wrap gap-3">
            <Btn onClick={copyLink}>
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "Copied!" : "Copy club link"}
            </Btn>
            <Link
              to="/$tenantSlug/$compSlug"
              params={{ tenantSlug: created.tenantSlug, compSlug: created.slug }}
              target="_blank"
            >
              <Btn variant="ghost">Preview entry page →</Btn>
            </Link>
            <Btn
              variant="ghost"
              onClick={() => {
                sessionStorage.setItem("osc_comp", created.id);
                sessionStorage.setItem("osc_pin", "");
                nav({ to: "/admin/panel" });
              }}
            >
              Open admin panel →
            </Btn>
            <Link to="/dashboard">
              <Btn variant="ghost">Back to dashboard</Btn>
            </Link>
          </div>
        </Card>
      )}
    </Shell>
  );
}
