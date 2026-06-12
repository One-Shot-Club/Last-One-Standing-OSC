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
import { uploadTenantAsset } from "@/lib/uploads.functions";
import { Btn, Field } from "@/components/oneshot/ui";
import { BrandPreview } from "./BrandPreview";


type Activation = {
  tenant: { id: string; slug: string; name: string; status: string };
  settings: {
    logo_url: string | null;
    background_url: string | null;
    primary_color: string | null;
    accent_color: string | null;
    panel_text_color: string | null;
    meta_text_color: string | null;
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
  const uploadFn = useServerFn(uploadTenantAsset);


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
  const [backgroundUrl, setBackgroundUrl] = useState("");

  const [primary, setPrimary] = useState("");
  const [accent, setAccent] = useState("");
  const [panelText, setPanelText] = useState("");
  const [metaText, setMetaText] = useState("");
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
    setBackgroundUrl(r.settings?.background_url ?? "");

    setBackgroundUrl(r.settings?.background_url ?? "");
    setPrimary(r.settings?.primary_color ?? "");
    setAccent(r.settings?.accent_color ?? "");
    setPanelText(r.settings?.panel_text_color ?? "");
    setMetaText(r.settings?.meta_text_color ?? "");
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
        setBackgroundUrl(res.settings?.background_url ?? "");

        setBackgroundUrl(res.settings?.background_url ?? "");
        setPrimary(res.settings?.primary_color ?? "");
        setAccent(res.settings?.accent_color ?? "");
        setPanelText(res.settings?.panel_text_color ?? "");
        setMetaText(res.settings?.meta_text_color ?? "");
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
              background_url: backgroundUrl || null,
              primary_color: primary || null,
              accent_color: accent || null,
              panel_text_color: panelText || null,
              meta_text_color: metaText || null,
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
        className={`my-8 w-full ${step === 0 ? "max-w-5xl" : "max-w-xl"} rounded-xl border border-border bg-background p-5 shadow-xl`}
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
          <div className="grid gap-6 md:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              <Field label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
              <Field label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Images
                </p>
                <AssetUpload
                  label="Club logo (header)"
                  hint="Shown at the top of the entry page and in emails."
                  value={logoUrl}
                  onChange={setLogoUrl}
                  kind="logo"
                  tenantId={tenantId}
                  uploadFn={uploadFn}
                  preview="contain"
                />
                <AssetUpload
                  label="Background image"
                  hint="Lightly blurred behind the entry page. Use a high-resolution photo."
                  value={backgroundUrl}
                  onChange={setBackgroundUrl}
                  kind="background"
                  tenantId={tenantId}
                  uploadFn={uploadFn}
                  preview="cover"
                />
                <AssetUpload
                  label="Competition / card logo"
                  hint="Used inside the entry card and selection screens. Defaults to the header logo if blank."
                  value={clubLogo}
                  onChange={setClubLogo}
                  kind="logo"
                  tenantId={tenantId}
                  uploadFn={uploadFn}
                  preview="contain"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Colours
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <ColorPicker
                    label="Primary (page bg)"
                    value={primary}
                    onChange={setPrimary}
                    placeholder="#0e3a25"
                  />
                  <ColorPicker
                    label="Accent (CTA · eyebrow)"
                    value={accent}
                    onChange={setAccent}
                    placeholder="#c9a84c"
                  />
                  <ColorPicker
                    label="On-primary text"
                    value={panelText}
                    onChange={setPanelText}
                    placeholder="#f8f3e3"
                  />
                  <ColorPicker
                    label="Muted / meta text"
                    value={metaText}
                    onChange={setMetaText}
                    placeholder="#cdbf9a"
                  />
                </div>
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

            <BrandPreview
              clubName={clubName || name || a?.tenant.name || "Your club"}
              primary={primary}
              accent={accent}
              panelText={panelText}
              metaText={metaText}
              logoUrl={logoUrl}
              backgroundUrl={backgroundUrl}
              cardLogoUrl={clubLogo}
              intro={intro}
              entryFee={entryFee}
              prizePool={prize}
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
            <p className="text-sm text-muted-foreground">
              Create the single Club Admin login. Share these credentials with the
              club member who'll manage entries and payments.
            </p>
            {credInfo.exists && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs">
                ✓ Credentials set for username <code>{credInfo.username}</code>.
                Leave blank to keep, or enter new values to reset.
              </div>
            )}
            <Field
              label="Username"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              placeholder="club-admin"
              autoComplete="off"
            />
            <Field
              label={credInfo.exists ? "New password (optional)" : "Password"}
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="min 6 characters"
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              Login URL: <code>/{a?.tenant.slug}/admin</code>
            </p>
          </div>
        )}

        {!loading && !done && step === 5 && (
          <div className="space-y-3">
            <div className="rounded-md border border-border p-3 text-sm">
              <Row ok={checklist.hasBrand} label="Branding saved" />
              <Row ok={checklist.hasComp} label="Competition created" />
              <Row ok={checklist.hasGw1} label="Gameweek 1 seeded" />
              <Row ok={checklist.hasPay} label="Payment link added" />
              <Row ok={credInfo.exists} label="Club admin credentials set" />
              <Row ok={checklist.live} label="Tenant status: active" />
            </div>
            <p className="text-xs text-muted-foreground">
              Public URL: <code>/{a?.tenant.slug}</code> · Admin URL:{" "}
              <code>/{a?.tenant.slug}/admin</code>
            </p>
            <Btn
              onClick={handleLaunch}
              disabled={
                busy ||
                !checklist.hasComp ||
                !checklist.hasGw1 ||
                !checklist.hasPay ||
                !credInfo.exists
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

type UploadFn = (args: {
  data: {
    tenantId: string;
    kind: "logo" | "background";
    filename: string;
    contentType: string;
    dataBase64: string;
  };
}) => Promise<{ path: string; url: string }>;

function AssetUpload({
  label,
  hint,
  value,
  onChange,
  kind,
  tenantId,
  uploadFn,
  preview,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
  kind: "logo" | "background";
  tenantId: string;
  uploadFn: UploadFn;
  preview: "contain" | "cover";
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(
          null,
          Array.from(bytes.subarray(i, i + chunk)) as number[],
        );
      }
      const dataBase64 = btoa(binary);
      const res = await uploadFn({
        data: {
          tenantId,
          kind,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          dataBase64,
        },
      });
      onChange(res.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
        <label className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-card">
          {busy ? "Uploading…" : value ? "Replace" : "Upload"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      {value && (
        <div
          className={
            preview === "cover"
              ? "h-24 w-full overflow-hidden rounded-md border border-border bg-muted"
              : "flex items-center"
          }
        >
          <img
            src={value}
            alt=""
            className={
              preview === "cover"
                ? "h-full w-full object-cover"
                : "h-16 w-16 rounded-md border border-border object-contain"
            }
          />
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="…or paste a URL"
        className="mt-2 h-9 w-full rounded-md border border-border bg-[color:var(--input)] px-2 text-xs text-foreground"
      />
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
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

function ColorPicker({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isHex ? value : placeholder && /^#[0-9a-fA-F]{6}$/.test(placeholder) ? placeholder : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-[color:var(--border)] bg-[color:var(--input)]"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 min-w-0 flex-1 rounded-md border border-[color:var(--border)] bg-[color:var(--input)] px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>
    </label>
  );
}
