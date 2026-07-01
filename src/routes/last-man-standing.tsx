import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeading } from "@/components/SectionHeading";
import { submitLmsWaitlist } from "@/lib/lms-waitlist.functions";
import {
  ShieldCheck,
  Sparkles,
  Workflow,
  Users,
  Check,
  Lock,
} from "lucide-react";

const CANONICAL = "https://www.oneshotclub.ie/last-man-standing";

export const Route = createFileRoute("/last-man-standing")({
  head: () => ({
    meta: [
      { title: "Last Man Standing for Clubs — Premier League 2026/27 | OneShotClub" },
      {
        name: "description",
        content:
          "A Last Man Standing competition run properly for your club this Premier League season. Branded to your club, no spreadsheets, every member can play. Join the waitlist.",
      },
      { property: "og:title", content: "Last Man Standing for Clubs — Premier League 2026/27" },
      {
        property: "og:description",
        content:
          "A Last Man Standing your committee can actually trust. Branded to your club, run for you, every member included. Only 10 club spots — join the waitlist.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Last Man Standing club competition platform",
          provider: { "@type": "Organization", name: "OneShotClub", url: "https://www.oneshotclub.ie" },
          areaServed: "IE",
          description:
            "A done-for-you Last Man Standing competition for GAA, soccer and community clubs. Branded to your club, run end-to-end, every member included.",
        }),
      },
    ],
  }),
  component: LmsLandingPage,
});

const waitlistSchema = z.object({
  clubName: z.string().trim().min(2, "Club name required").max(120),
  contactName: z.string().trim().min(2, "Your name required").max(80),
  email: z.string().trim().email("Valid email required").max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  county: z.string().trim().max(60).optional().or(z.literal("")),
  estimatedMembers: z.string().trim().max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")),
});

const pillars = [
  {
    icon: Sparkles,
    title: "Your club, your competition",
    desc: "Your crest, your colours, your name on every screen. Members are entering your club's competition — not handing money to some generic website they've never heard of.",
  },
  {
    icon: Workflow,
    title: "No admin headache",
    desc: "Gameweeks roll over on their own. Eliminations happen automatically. Entries and payments are handled in the app. No spreadsheets, no WhatsApp arguments about who picked who.",
  },
  {
    icon: Users,
    title: "Every member can play",
    desc: "Works for the lads online and the ones who aren't. An admin can put picks in for any member who'd rather text them or have a word after training. Nobody gets shut out.",
  },
];

const steps = [
  { n: "01", title: "We get your club set up", desc: "Branded and ready to go before the season starts. You don't lift a finger." },
  { n: "02", title: "Share the link", desc: "One link out to the members — WhatsApp, email, the club Facebook page. Whatever you already use." },
  { n: "03", title: "Members pick each week", desc: "Quick picks on a phone. Reminders go out on their own. Admins can put a pick in for anyone who needs it." },
  { n: "04", title: "Last one standing wins", desc: "Open leaderboard the whole club can see. Winner gets told the minute it's settled." },
];

const faqs = [
  {
    q: "When does it launch?",
    a: "Pre-season, before the 2026/27 Premier League opening weekend. Waitlist clubs get first access and a proper onboarding call.",
  },
  {
    q: "How much does it cost?",
    a: "A flat fee for the club. No per-member charges, no cut of the pot. Waitlist clubs see the final number first.",
  },
  {
    q: "Can we set our own prize structure?",
    a: "Yes. Single winner, split pot, or a percentage to the club for fundraising — whatever the committee decides. We set it up to match.",
  },
  {
    q: "What about members who don't use email?",
    a: "An admin puts their pick in for them. Text, WhatsApp, a chat in the carpark — however they want to send it. They show up on the leaderboard the same as everyone else.",
  },
  {
    q: "What if the Premier League moves a fixture?",
    a: "Gameweeks update automatically when fixtures change. Nobody has to redo a spreadsheet.",
  },
  {
    q: "Is it GDPR compliant?",
    a: "Yes. Member details stay with your club. We're the tooling — not a marketing list.",
  },
];

function LmsLandingPage() {
  return (
    <>
      <LmsHero />
      <LmsPillars />
      <LmsHowItWorks />
      <LmsProofStrip />
      <LmsWaitlistSection />
      <LmsFaq />
      <LmsFooterCta />
    </>
  );
}

function LmsHero() {
  return (
    <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
      <div className="container-prose relative grid min-h-[60vh] items-center py-16 md:py-24">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            <Lock className="h-3 w-3" /> PREMIER LEAGUE 2026/27&nbsp;
          </p>
          <h1 className="text-balance font-display text-5xl uppercase leading-[0.95] tracking-wide md:text-7xl">
            A Last Man Standing your club will actually <span className="text-accent">trust</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/85 md:text-xl">
            Branded to your club. Run for you. Every member can play — whether they're glued to their phone or never check email. Your club, our heavy lifting.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#waitlist"
              className="rounded-md bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110"
            >
              REGISTER YOUR INTEREST →
            </a>
            <a
              href="#how-it-works"
              className="rounded-md border border-primary-foreground/30 px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition hover:bg-primary-foreground/10"
            >
              See how it works
            </a>
          </div>
          <p className="mt-6 text-sm text-primary-foreground/70">
            <span className="font-semibold text-accent">2 clubs already in</span> — Laois and Wexford. 8 spots left.
          </p>
        </div>
      </div>
    </section>
  );
}

function LmsPillars() {
  return (
    <section className="container-prose py-16 md:py-24">
      <SectionHeading
        eyebrow="Why clubs are signing up"
        title="Three things we promise"
        center
      >
        The rest is detail.
      </SectionHeading>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {pillars.map(({ icon: Icon, title, desc }) => (
          <article key={title} className="rounded-xl border border-border bg-card p-7">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-accent">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="font-display text-2xl uppercase tracking-wide text-primary">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function LmsHowItWorks() {
  return (
    <section id="how-it-works" className="bg-muted/60 py-16 md:py-24 scroll-mt-20">
      <div className="container-prose">
        <SectionHeading
          eyebrow="How it works"
          title="Four steps. Then it runs itself."
          center
        >
          We do the setup with you so it costs the club next to nothing in time and brings in as much as possible.
        </SectionHeading>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-xl border border-border bg-card p-6">
              <div className="font-display text-sm uppercase tracking-[0.2em] text-accent">Step {s.n}</div>
              <h3 className="mt-2 font-display text-xl uppercase tracking-wide text-primary">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LmsProofStrip() {
  const stats: ReadonlyArray<readonly [string, string]> = [
    ["100+", "Entries in our first live competition"],
    ["72hrs", "From sign-up to your club going live"],
    ["10", "Club spots for the 2026/27 season"],
  ];
  return (
    <section className="bg-primary py-12 text-primary-foreground md:py-16">
      <div className="container-prose">
        <dl className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {stats.map(([k, v]) => (
            <div key={v} className="text-center md:text-left">
              <dt className="font-display text-4xl text-accent md:text-5xl">{k}</dt>
              <dd className="mt-1 text-xs uppercase tracking-widest text-primary-foreground/70">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function LmsWaitlistSection() {
  return (
    <section id="waitlist" className="container-prose py-16 md:py-24 scroll-mt-20">
      <div className="grid gap-10 md:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent">Waitlist</p>
          <h2 className="text-balance font-display text-4xl uppercase tracking-wide text-primary md:text-5xl">
            Only 10 clubs. Two already in.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            We're keeping the first Premier League season to 10 clubs. That way every committee gets a proper onboarding call and a competition that works from week one.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-foreground/80">
            {[
              "First access before we open it up",
              "Branded setup call — your crest, colours and club name",
              "Waitlist clubs see pricing first",
              "No commitment — get the details and decide",
            ].map((b) => (
              <li key={b} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 flex-none text-accent" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <WaitlistForm />
      </div>
    </section>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-destructive">{msg}</p>;
}

function WaitlistForm() {
  const navigate = useNavigate();
  const submitFn = useServerFn(submitLmsWaitlist);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    const parsed = waitlistSchema.safeParse(data);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        errs[issue.path[0] as string] = issue.message;
      }
      setErrors(errs);
      setFormError("Please check the highlighted fields.");
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      await submitFn({ data: parsed.data });
      form.reset();
      navigate({ to: "/last-man-standing/thanks" });
    } catch {
      setFormError(
        "Something went wrong. Drop us a line at hello@oneshotclub.ie and we'll sort it.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-border bg-card p-6 md:p-8">
      {/* honeypot */}
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="clubName">Club name</Label>
          <Input id="clubName" name="clubName" placeholder="e.g. Naomh Pádraig GAA" />
          <FieldError msg={errors.clubName} />
        </div>
        <div>
          <Label htmlFor="contactName">Your name</Label>
          <Input id="contactName" name="contactName" />
          <FieldError msg={errors.contactName} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" />
          <FieldError msg={errors.email} />
        </div>
        <div>
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" name="phone" type="tel" />
        </div>
        <div>
          <Label htmlFor="county">County (optional)</Label>
          <Input id="county" name="county" placeholder="e.g. Wexford" />
        </div>
        <div>
          <Label htmlFor="estimatedMembers">Estimated entries (optional)</Label>
          <Input id="estimatedMembers" name="estimatedMembers" placeholder="e.g. 80" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="notes">Anything else? (optional)</Label>
          <Textarea id="notes" name="notes" rows={3} placeholder="Prize ideas, timing, questions — fire away." />
        </div>
      </div>
      {formError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
          {formError}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110 disabled:opacity-60"
      >
        {submitting ? "Sending…" : "REGISTER YOUR INTEREST →"}
      </button>
      <p className="text-xs text-muted-foreground">
        We'll only use these details to talk to your club about Last Man Standing. No mailing list, no spam.
      </p>
    </form>
  );
}

function LmsFaq() {
  return (
    <section className="bg-muted/60 py-16 md:py-24">
      <div className="container-prose">
        <SectionHeading eyebrow="FAQ" title="What committees usually ask" center />
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-border rounded-xl border border-border bg-card">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg uppercase tracking-wide text-primary">
                {q}
                <span className="text-accent transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function LmsFooterCta() {
  return (
    <section className="container-prose py-12 md:py-16">
      <div className="relative overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground md:p-12">
        <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">10 clubs only</p>
            <h2 className="mt-3 text-balance font-display text-3xl uppercase leading-tight tracking-wide md:text-5xl">
              Two in. Eight spots left.
            </h2>
            <p className="mt-3 max-w-xl text-base text-primary-foreground/85">
              The 2026/27 season is the pilot. Get your club's name down — no commitment, just first access and a proper onboarding call.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <a
              href="#waitlist"
              className="rounded-md bg-accent px-6 py-3 text-center text-sm font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110"
            >
              REGISTER YOUR INTEREST →
            </a>
            <p className="text-xs uppercase tracking-wider text-primary-foreground/60 md:text-right">
              <ShieldCheck className="mr-1 inline h-3 w-3 text-accent" />
              Branded. Run for you. Club-first.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
