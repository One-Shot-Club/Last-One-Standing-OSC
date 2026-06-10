import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getTenantActivation,
  updateTenant,
  upsertCompetition,
  setPaymentLinks,
  launchTenant,
} from "@/lib/platform-admin.functions";
import { seedGameweek } from "@/lib/gameweeks.functions";
import {
  setTenantAdminCredentials,
  getTenantAdminCredentialsInfo,
} from "@/lib/club-auth.functions";
import { Btn, Field } from "@/components/oneshot/ui";

type Activation = {
  tenant: { id: string; slug: string; name: string; status: string };
  settings: {
    logo_url: string | null;
    primary_color: string | null;
    accent_color: string | null;
    intro_copy: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    whatsapp_link: string | null;
  } | null;
  competition: {
    id: string;
    name: string;
    entry_fee: number;
    prize_pool: number;
    club_name: string | null;
    club_logo_url: string | null;
    stripe_link: string | null;
    revolut_link: string | null;
    payment_link: string | null;
    whatsapp_link: string | null;
  } | null;
  gameweek1: { id: string; week_number: number; fixtures: number } | null;
};

const STEPS = ["Brand", "Competition", "Fixtures", "Payments", "Club admin", "Go live"] as const;


export function ActivateTenantWizard({
  tenantId,
  onClose,
  onSaved,
}: {
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const loadFn = useServerFn(getTenantActivation);
  const saveBrandFn = useServerFn(updateTenant);
  const upsertCompFn = useServerFn(upsertCompetition);
  const seedFn = useServerFn(seedGameweek);
  const payFn = useServerFn(setPaymentLinks);
  const launchFn = useServerFn(launchTenant);
  const setCredFn = useServerFn(setTenantAdminCredentials);
  const getCredFn = useServerFn(getTenantAdminCredentialsInfo);

  const [a, setA] = useState<Activation | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [credInfo, setCredInfo] = useState<{ exists: boolean; username: string | null }>({
    exists: false,
    username: null,
  });
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");


  // Step 1 — brand
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primary, setPrimary] = useState("");
  const [accent, setAccent] = useState("");
  const [intro, setIntro] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  // Step 2 — competition
  const [compName, setCompName] = useState("");
  const [entryFee, setEntryFee] = useState("10");
  const [prize, setPrize] = useState("");
  const [clubName, setClubName] = useState("");
  const [clubLogo, setClubLogo] = useState("");

  // Step 4 — payments
  const [stripe, setStripe] = useState("");
  const [revolut, setRevolut] = useState("");
  const [bank, setBank] = useState("");

  async function refresh() {
    const r = (await loadFn({ data: { tenantId } })) as Activation;
    setA(r);
    setName(r.tenant.name);
    setSlug(r.tenant.slug);
    setLogoUrl(r.settings?.logo_url ?? "");
    setPrimary(r.settings?.primary_color ?? "");
    setAccent(r.settings?.accent_color ?? "");
    setIntro(r.settings?.intro_copy ?? "");
    setContactEmail(r.settings?.contact_email ?? "");
    setContactPhone(r.settings?.contact_phone ?? "");
    setWhatsapp(r.settings?.whatsapp_link ?? "");
    setCompName(r.competition?.name ?? `${r.tenant.name} Last One Standing`);
    setEntryFee(String(r.competition?.entry_fee ?? 10));
    setPrize(r.competition?.prize_pool ? String(r.competition.prize_pool) : "");
    setClubName(r.competition?.club_name ?? r.tenant.name);
    setClubLogo(r.competition?.club_logo_url ?? r.settings?.logo_url ?? "");
    setStripe(r.competition?.stripe_link ?? "");
    setRevolut(r.competition?.revolut_link ?? "");
    setBank(r.competition?.payment_link ?? "");
  }

  useEffect(() => {
    loadFn({ data: { tenantId } })
      .then((r) => {
        const res = r as Activation;
        setA(res);
        setName(res.tenant.name);
        setSlug(res.tenant.slug);
        setLogoUrl(res.settings?.logo_url ?? "");
        setPrimary(res.settings?.primary_color ?? "");
        setAccent(res.settings?.accent_color ?? "");
        setIntro(res.settings?.intro_copy ?? "");
        setContactEmail(res.settings?.contact_email ?? "");
        setContactPhone(res.settings?.contact_phone ?? "");
        setWhatsapp(res.settings?.whatsapp_link ?? "");
        setCompName(res.competition?.name ?? `${res.tenant.name} Last One Standing`);
        setEntryFee(String(res.competition?.entry_fee ?? 10));
        setPrize(res.competition?.prize_pool ? String(res.competition.prize_pool) : "");
        setClubName(res.competition?.club_name ?? res.tenant.name);
        setClubLogo(res.competition?.club_logo_url ?? res.settings?.logo_url ?? "");
        setStripe(res.competition?.stripe_link ?? "");
        setRevolut(res.competition?.revolut_link ?? "");
        setBank(res.competition?.payment_link ?? "");
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
    getCredFn({ data: { tenantId } })
      .then((r) => {
        const info = r as { exists: boolean; username: string | null };
        setCredInfo({ exists: info.exists, username: info.username });
        if (info.exists && info.username) setAdminUsername(info.username);
      })
      .catch(() => {});
  }, [tenantId, loadFn, getCredFn]);


  const checklist = useMemo(() => {
    const hasBrand = !!(a?.settings?.primary_color || a?.settings?.logo_url || a?.settings?.intro_copy);
    const hasComp = !!a?.competition;
    const hasGw1 = !!a?.gameweek1 && a.gameweek1.fixtures > 0;
    const hasPay = !!(
      a?.competition?.stripe_link ||
      a?.competition?.revolut_link ||
      a?.competition?.payment_link
    );
    return { hasBrand, hasComp, hasGw1, hasPay, live: a?.tenant.status === "active" };
  }, [a]);

  async function next() {
    setErr(null);
    setBusy(true);
    try {
      if (step === 0) {
        await saveBrandFn({
          data: {
            tenantId,
            name,
            slug,
            settings: {
              logo_url: logoUrl || null,
              primary_color: primary || null,
              accent_color: accent || null,
              intro_copy: intro || null,
              contact_email: contactEmail || null,
              contact_phone: contactPhone || null,
              whatsapp_link: whatsapp || null,
            },
          },
        });
      } else if (step === 1) {
        await upsertCompFn({
          data: {
            tenantId,
            name: compName,
            entryFee: Number(entryFee) || 0,
            prizePool: prize ? Number(prize) : 0,
            clubName: clubName || null,
            clubLogoUrl: clubLogo || null,
          },
        });
      } else if (step === 3) {
        if (!stripe && !revolut && !bank) {
          throw new Error("Add at least one payment link");
        }
        if (!a?.competition?.id) throw new Error("Save competition first");
        await payFn({
          data: {
            competitionId: a.competition.id,
            stripeLink: stripe || null,
            revolutLink: revolut || null,
            paymentLink: bank || null,
          },
        });
      } else if (step === 4) {
        // Club admin credentials. Skip if unchanged and credentials already exist.
        if (adminUsername.trim() || adminPassword) {
          if (!adminUsername.trim()) throw new Error("Username required");
          if (!adminPassword || adminPassword.length < 6)
            throw new Error("Password must be at least 6 characters");
          await setCredFn({
            data: { tenantId, username: adminUsername.trim(), password: adminPassword },
          });
          setAdminPassword("");
          const info = (await getCredFn({ data: { tenantId } })) as {
            exists: boolean;
            username: string | null;
          };
          setCredInfo({ exists: info.exists, username: info.username });
        } else if (!credInfo.exists) {
          throw new Error("Set a club admin username and password");
        }
      }

      await refresh();
      setStep((s) => Math.min(STEPS.length - 1, s + 1));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSeed() {
    setErr(null);
    setBusy(true);
    try {
      if (!a?.competition?.id) throw new Error("Save competition first");
      await seedFn({ data: { competitionId: a.competition.id, pin: "", weekNumber: 1 } });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleLaunch() {
    setErr(null);
    setBusy(true);
    try {
      await launchFn({ data: { tenantId } });
      await refresh();
      setDone(true);
      onSaved();
      if (typeof window !== "undefined" && a?.tenant.slug) {
        window.open(`/${a.tenant.slug}`, "_blank");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Launch failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-xl rounded-xl border border-border bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="display text-lg">
              {done ? "Tenant is live" : `Activate · ${a?.tenant.name ?? "…"}`}
            </h3>
            <p className="text-xs text-muted-foreground">
              {done
                ? `/${a?.tenant.slug} is now active`
                : `Step ${step + 1} of ${STEPS.length} — ${STEPS[step]}`}
            </p>
          </div>
          <button className="text-sm text-muted-foreground" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Progress */}
        <div className="mb-4 flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {err && (
          <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
            {err}
          </p>
        )}

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && !done && step === 0 && (
          <div className="space-y-3">
            <Field label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
            <Field label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            <Field
              label="Logo URL"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…/logo.png"
            />
            {logoUrl && (
              <img
                src={logoUrl}
                alt=""
                className="h-16 w-16 rounded-md border border-border object-contain"
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Primary colour"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                placeholder="#1a1a2e"
              />
              <Field
                label="Accent colour"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                placeholder="#e94560"
              />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
                Intro copy
              </span>
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--input)] px-4 py-2 text-foreground focus:border-primary focus:outline-none"
              />
            </label>
            <Field
              label="Contact email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <Field
              label="Contact phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
            <Field
              label="WhatsApp link"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
        )}

        {!loading && !done && step === 1 && (
          <div className="space-y-3">
            <Field
              label="Competition name"
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Entry fee (€)"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
              />
              <Field
                label="Prize pool (€, optional)"
                value={prize}
                onChange={(e) => setPrize(e.target.value)}
              />
            </div>
            <Field
              label="Club name"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
            />
            <Field
              label="Club logo URL"
              value={clubLogo}
              onChange={(e) => setClubLogo(e.target.value)}
            />
          </div>
        )}

        {!loading && !done && step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Seed Gameweek 1 fixtures so players can pick a team.
            </p>
            {a?.gameweek1 && a.gameweek1.fixtures > 0 ? (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
                ✓ Gameweek 1 ready — {a.gameweek1.fixtures} fixtures loaded.
              </div>
            ) : (
              <Btn onClick={handleSeed} disabled={busy || !a?.competition}>
                {busy ? "Seeding…" : "Seed Gameweek 1"}
              </Btn>
            )}
            {!a?.competition && (
              <p className="text-xs text-destructive">
                Save the competition (step 2) first.
              </p>
            )}
          </div>
        )}

        {!loading && !done && step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add at least one way for players to pay the entry fee.
            </p>
            <Field
              label="Stripe payment link"
              value={stripe}
              onChange={(e) => setStripe(e.target.value)}
              placeholder="https://buy.stripe.com/…"
            />
            <Field
              label="Revolut link"
              value={revolut}
              onChange={(e) => setRevolut(e.target.value)}
              placeholder="https://revolut.me/…"
            />
            <Field
              label="Bank transfer / other"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="IBAN or instructions URL"
            />
          </div>
        )}

        {!loading && !done && step === 4 && (
          <div className="space-y-3">
            <div className="rounded-md border border-border p-3 text-sm">
              <Row ok={checklist.hasBrand} label="Branding saved" />
              <Row ok={checklist.hasComp} label="Competition created" />
              <Row ok={checklist.hasGw1} label="Gameweek 1 seeded" />
              <Row ok={checklist.hasPay} label="Payment link added" />
              <Row ok={checklist.live} label="Tenant status: active" />
            </div>
            <p className="text-xs text-muted-foreground">
              Public URL: <code>/{a?.tenant.slug}</code>
            </p>
            <Btn
              onClick={handleLaunch}
              disabled={
                busy ||
                !checklist.hasComp ||
                !checklist.hasGw1 ||
                !checklist.hasPay
              }
            >
              {busy ? "Launching…" : checklist.live ? "Re-confirm live" : "Launch"}
            </Btn>
          </div>
        )}

        {done && (
          <div className="space-y-3">
            <p className="text-sm">
              {a?.tenant.name} is live. Share <code>/{a?.tenant.slug}</code> with players.
            </p>
            <Btn onClick={onClose}>Done</Btn>
          </div>
        )}

        {!loading && !done && (
          <div className="mt-5 flex items-center justify-between gap-2">
            <Btn
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || busy}
            >
              Back
            </Btn>
            {step < STEPS.length - 1 && (
              <Btn onClick={next} disabled={busy}>
                {busy ? "Saving…" : step === 2 ? "Next" : "Save & next"}
              </Btn>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className={ok ? "text-emerald-500" : "text-muted-foreground"}>
        {ok ? "✓" : "○"}
      </span>
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
