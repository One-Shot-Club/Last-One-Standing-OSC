import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MessageCircle,
  Phone,
  UserPlus,
} from "lucide-react";
import {
  registerClubSignup,
  submitClubSignupLead,
  type ClubSignupPayload,
} from "@/lib/club-auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const WHATSAPP_NUMBER = "353899714543";

const IRISH_COUNTIES = [
  "Antrim",
  "Armagh",
  "Carlow",
  "Cavan",
  "Clare",
  "Cork",
  "Derry",
  "Donegal",
  "Down",
  "Dublin",
  "Fermanagh",
  "Galway",
  "Kerry",
  "Kildare",
  "Kilkenny",
  "Laois",
  "Leitrim",
  "Limerick",
  "Longford",
  "Louth",
  "Mayo",
  "Meath",
  "Monaghan",
  "Offaly",
  "Roscommon",
  "Sligo",
  "Tipperary",
  "Tyrone",
  "Waterford",
  "Westmeath",
  "Wexford",
  "Wicklow",
] as const;

const CLUB_TYPES = ["GAA", "Soccer", "Rugby", "Other"] as const;

const COMPETITION_INTERESTS = [
  "Last Man Standing",
  "Prediction competition",
  "Golf classic",
  "Not sure yet",
] as const;

const STEPS = ["Your club", "Your details", "Get started"] as const;

type FormState = ClubSignupPayload & { password: string; confirmPassword: string };

const EMPTY_FORM: FormState = {
  clubName: "",
  county: "",
  clubType: "",
  competitionInterest: "",
  adminName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      {
        title: "Sign Up Your Club — OneShotClub",
      },
      {
        name: "description",
        content:
          "Get your Irish sports club live on OneShotClub in under 10 minutes. Free to start — we build the fundraiser, handle entries and payments.",
      },
    ],
  }),
  component: SignupPage,
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function SignupPage() {
  const registerFn = useServerFn(registerClubSignup);
  const leadFn = useServerFn(submitClubSignupLead);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    mode: "account" | "callback" | "whatsapp";
    tenantSlug?: string;
    tenantName?: string;
  } | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validateStep(index: number): string | null {
    if (index === 0) {
      if (!form.clubName.trim()) return "Please enter your club name.";
      if (!form.county) return "Please select your county.";
      if (!form.clubType) return "Please select your club type.";
      if (!form.competitionInterest) return "Please tell us what you're interested in.";
    }
    if (index === 1) {
      if (!form.adminName.trim()) return "Please enter your name.";
      if (!form.email.includes("@")) return "Please enter a valid email.";
      if (!form.phone.trim()) return "Please enter your phone number.";
    }
    return null;
  }

  function nextStep() {
    const problem = validateStep(step);
    if (problem) {
      setErr(problem);
      return;
    }
    setErr(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setErr(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleAccountSignup() {
    if (form.password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setErr("Passwords don't match.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = (await registerFn({
        data: {
          clubName: form.clubName,
          county: form.county,
          clubType: form.clubType,
          competitionInterest: form.competitionInterest,
          adminName: form.adminName,
          email: form.email,
          phone: form.phone,
          password: form.password,
        },
      })) as { ok: true; tenantSlug: string; tenantName: string; tenantId: string };
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (signInErr) {
        const needsEmail =
          signInErr.message.toLowerCase().includes("email not confirmed") ||
          signInErr.message.toLowerCase().includes("not verified");
        setDone({
          mode: "account",
          tenantSlug: r.tenantSlug,
          tenantName: r.tenantName,
          needsLogin: true,
          needsEmailVerification: needsEmail,
        });
        return;
      }
      if (signInData.session) {
        window.location.href = "/onboarding";
        return;
      }
      setDone({
        mode: "account",
        tenantSlug: r.tenantSlug,
        tenantName: r.tenantName,
        needsEmailVerification: true,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Signup failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCallback() {
    setBusy(true);
    setErr(null);
    try {
      await leadFn({
        data: {
          clubName: form.clubName,
          county: form.county,
          clubType: form.clubType,
          competitionInterest: form.competitionInterest,
          adminName: form.adminName,
          email: form.email,
          phone: form.phone,
          signupPath: "callback",
        },
      });
      setDone({ mode: "callback" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not submit request.");
    } finally {
      setBusy(false);
    }
  }

  async function handleWhatsApp() {
    setBusy(true);
    setErr(null);
    try {
      await leadFn({
        data: {
          clubName: form.clubName,
          county: form.county,
          clubType: form.clubType,
          competitionInterest: form.competitionInterest,
          adminName: form.adminName,
          email: form.email,
          phone: form.phone,
          signupPath: "whatsapp",
        },
      });
      const text = [
        "Hi, I'd like to sign up my club for OneShotClub.",
        "",
        `Club: ${form.clubName}`,
        `County: ${form.county}`,
        `Type: ${form.clubType}`,
        `Interested in: ${form.competitionInterest}`,
        "",
        `Name: ${form.adminName}`,
        `Email: ${form.email}`,
        `Phone: ${form.phone}`,
      ].join("\n");
      window.open(
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener,noreferrer",
      );
      setDone({ mode: "whatsapp" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save your details.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <MarketingLayout>
        <SuccessScreen done={done} />
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-2xl">
        {/* Hero */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Free to start
          </p>
          <h1 className="mt-3 font-display text-4xl uppercase tracking-wide text-primary md:text-5xl">
            Get your club live in{" "}
            <span className="text-accent">under 10 minutes</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Tell us about your club. We'll build your fundraiser, set up payments,
            and hand it to your committee ready to launch.
          </p>
        </div>

        {/* Step indicator */}
        <div className="mt-10 flex items-center justify-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                  i < step
                    ? "bg-accent text-accent-foreground"
                    :                   i === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-semibold uppercase tracking-wider sm:inline",
                  i === step ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-px w-8 sm:w-12",
                    i < step ? "bg-accent" : "bg-border",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="mt-8 rounded-2xl border border-primary-foreground/10 bg-card p-6 shadow-lg md:p-8">
          {step === 0 && (
            <div className="space-y-5">
              <StepHeading
                title="About your club"
                subtitle="We'll use this to set up your branded fundraiser page."
              />
              <SignupField
                label="Club name"
                placeholder="e.g. Castletown Liam Mellows GAA"
                value={form.clubName}
                onChange={(v) => update("clubName", v)}
              />
              <SignupSelect
                label="County"
                value={form.county}
                onChange={(v) => update("county", v)}
                placeholder="Select county"
                options={IRISH_COUNTIES}
              />
              <SignupSelect
                label="Club type"
                value={form.clubType}
                onChange={(v) => update("clubType", v)}
                placeholder="Select type"
                options={CLUB_TYPES}
              />
              <SignupSelect
                label="What are you interested in?"
                value={form.competitionInterest}
                onChange={(v) => update("competitionInterest", v)}
                placeholder="Select competition"
                options={COMPETITION_INTERESTS}
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <StepHeading
                title="Your details"
                subtitle="Who should we contact about getting your club live?"
              />
              <SignupField
                label="Your name"
                placeholder="Tom Murphy"
                value={form.adminName}
                onChange={(v) => update("adminName", v)}
              />
              <SignupField
                label="Email"
                type="email"
                placeholder="tom@yourclub.ie"
                value={form.email}
                onChange={(v) => update("email", v)}
              />
              <SignupField
                label="Phone"
                type="tel"
                placeholder="087 123 4567"
                value={form.phone}
                onChange={(v) => update("phone", v)}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <StepHeading
                title="How would you like to get started?"
                subtitle="Pick whichever feels easiest — there's no wrong answer."
              />

              {/* Account signup */}
              <div className="rounded-xl border border-border bg-background/40 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-accent">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg uppercase tracking-wide text-accent">
                      Create your account
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Set a password now. We'll review your club and have you live
                      within 72 hours.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <SignupField
                        label="Password"
                        type="password"
                        placeholder="Min. 6 characters"
                        value={form.password}
                        onChange={(v) => update("password", v)}
                      />
                      <SignupField
                        label="Confirm password"
                        type="password"
                        placeholder="Repeat password"
                        value={form.confirmPassword}
                        onChange={(v) => update("confirmPassword", v)}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={handleAccountSignup}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110 disabled:opacity-50 sm:w-auto"
                    >
                      {busy ? "Creating…" : "Create account →"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative text-center text-xs uppercase tracking-widest text-muted-foreground">
                <span className="bg-card px-3">or</span>
                <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
              </div>

              {/* WhatsApp */}
              <button
                type="button"
                disabled={busy}
                onClick={handleWhatsApp}
                className="flex w-full items-center gap-4 rounded-xl border border-border bg-background/40 p-5 text-left transition hover:border-accent hover:shadow-md disabled:opacity-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg uppercase tracking-wide text-accent">
                    Chat on WhatsApp
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Opens a pre-filled message to our team. Easiest if you want to
                    talk it through first.
                  </p>
                </div>
              </button>

              {/* Callback */}
              <button
                type="button"
                disabled={busy}
                onClick={handleCallback}
                className="flex w-full items-center gap-4 rounded-xl border border-border bg-background/40 p-5 text-left transition hover:border-accent hover:shadow-md disabled:opacity-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-accent">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg uppercase tracking-wide text-accent">
                    Request a callback
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We'll call you within one working day to talk through what'll
                    work best for your club.
                  </p>
                </div>
              </button>
            </div>
          )}

          {err && (
            <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {err}
            </p>
          )}

          {/* Nav buttons (steps 0–1) */}
          {step < 2 && (
            <div className="mt-8 flex items-center justify-between gap-3">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="inline-flex items-center gap-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <Link
                  to="/"
                  className="inline-flex items-center gap-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Home
                </Link>
              )}
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center gap-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          No card required · Free to start · We only make money when you do ·
          Money goes directly to your club
        </p>
      </div>
    </MarketingLayout>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background">
      <div className="px-5 py-10 md:py-16">{children}</div>
    </div>
  );
}

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="font-display text-2xl uppercase tracking-wide text-accent">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function SignupField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-lg border border-border bg-input px-4 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </label>
  );
}

function SignupSelect<T extends string>({
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: readonly T[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full appearance-none rounded-lg border border-border bg-input px-4 text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function SuccessScreen({
  done,
}: {
  done: {
    mode: "account" | "callback" | "whatsapp";
    tenantSlug?: string;
    tenantName?: string;
    needsLogin?: boolean;
    needsEmailVerification?: boolean;
  };
}) {
  const copy = {
    account: {
      title: done.needsEmailVerification
        ? "Check your email"
        : "You're signed up!",
      body: done.needsEmailVerification
        ? `We've created a space for ${done.tenantName ?? "your club"}. Before you can log in, confirm your email address — check your inbox (and spam folder) for a link from OneShotClub, then sign in to connect Stripe and create your first competition.`
        : done.needsLogin
          ? `We've created a space for ${done.tenantName ?? "your club"}. Log in with the email and password you chose to connect Stripe and create your first competition.`
          : `We've created a space for ${done.tenantName ?? "your club"}. You're being redirected to connect payments — if that doesn't happen, use the button below.`,
      extra: done.tenantSlug
        ? `Your club URL will be oneshotclub.ie/${done.tenantSlug}`
        : null,
    },
    callback: {
      title: "We'll call you soon",
      body: "Thanks — we've got your details. Someone from OneShotClub will call you within one working day to talk through what'll work best for your club.",
      extra: null,
    },
    whatsapp: {
      title: "Chat opened on WhatsApp",
      body: "Your details are saved and WhatsApp should have opened with a pre-filled message. Send it when you're ready and we'll pick up the conversation from there.",
      extra: null,
    },
  }[done.mode];

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Check className="h-8 w-8" />
      </div>
      <h1 className="mt-6 font-display text-4xl uppercase tracking-wide text-primary">
        {copy.title}
      </h1>
      <p className="mt-4 text-muted-foreground">{copy.body}</p>
      {copy.extra && (
        <p className="mt-3 font-mono text-sm text-accent">{copy.extra}</p>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {done.mode === "account" ? (
          <>
            {!done.needsEmailVerification && (
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110"
              >
                Log in to your dashboard
              </Link>
            )}
            {!done.needsEmailVerification && (
              <Link
                to="/onboarding"
                className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary transition hover:bg-muted/40"
              >
                Connect Stripe →
              </Link>
            )}
          </>
        ) : (
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110"
          >
            Back to homepage
          </Link>
        )}
      </div>
    </div>
  );
}
