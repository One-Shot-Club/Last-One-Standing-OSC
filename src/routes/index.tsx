import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Check, ShieldCheck, Clock, Workflow, Heart } from "lucide-react";
import { CASTLETOWN, ST_JOSEPHS, PLATFORM_STATS } from "@/lib/case-studies";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const WHATSAPP_URL =
  "https://wa.me/353899714543?text=" +
  encodeURIComponent(
    "Hi, I'd like to find out more about OneShotClub fundraisers for my club.",
  );

const CANONICAL = "https://www.oneshotclub.ie/";

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/")(({
  head: () => ({
    meta: [
      {
        title:
          "OneShotClub — Done-for-You Club Fundraisers for Irish Sports Clubs",
      },
      {
        name: "description",
        content:
          "Done-for-you fundraisers for Irish sports clubs. We build the app, handle entries and payments, and hand it to your committee ready to launch. Free to start. Live in 72 hours.",
      },
      {
        property: "og:title",
        content:
          "OneShotClub — Done-for-You Club Fundraisers for Irish Sports Clubs",
      },
      {
        property: "og:description",
        content:
          "We build the fundraiser app, set it up for your club, and handle entries, payments and draws. Less admin, more raised.",
      },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "OneShotClub",
          url: CANONICAL,
          description:
            "Done-for-you fundraising competitions for Irish sports clubs. Last Man Standing, prediction apps and golf classics.",
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            availableLanguage: "English",
          },
        }),
      },
    ],
  }),
  component: HomePage,
}));

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const steps = [
  {
    n: "01",
    title: "Sign up free — tell us what your club needs",
    desc: "No card, no commitment. We'll give you honest advice on what'll raise the most and confirm we're a fit — or tell you if we're not.",
  },
  {
    n: "02",
    title: "We build it and hand it over",
    desc: "Branded for your club. Tested. Launch comms written. 72 hours from go-ahead to live.",
  },
  {
    n: "03",
    title: "Share it. Money lands in your account.",
    desc: "Members enter on their phone in under a minute. Money goes directly to your club — we take our percentage automatically, you keep the rest.",
  },
];

const partnerPoints = [
  "A proper planning chat before anything goes live",
  "Honest advice on prize, price and how long to run it",
  "Launch comms, member emails and social copy you can lift and use",
  "Someone on the phone the week the fundraiser is live",
  "A wash-up call after — what worked, what to do next time",
];

const whyPoints = [
  {
    icon: Clock,
    title: "Hours given back",
    desc: "The app does the spreadsheet work, the WhatsApp chasing and the midnight maths.",
  },
  {
    icon: ShieldCheck,
    title: "Transparent and compliant",
    desc: "Every entry, payment and draw is logged. Treasurer can export it for the AGM.",
  },
  {
    icon: Heart,
    title: "Your members stay yours",
    desc: "You own the supporter list. We're the tooling, not the front of house.",
  },
  {
    icon: Workflow,
    title: "Automation that actually does something",
    desc: "Entry emails go out automatically. The leaderboard updates itself. Winners are notified the second results are posted.",
  },
];

const competitions = [
  {
    name: "Last One Standing",
    desc: "Pick one team per week. Get it wrong and you're out. Last member standing wins the pot. No spreadsheets, no WhatsApp chains, no midnight maths.",
    status: "Coming soon" as const,
    statusNote: "Premier League 2026–27 · 10 club spots",
    to: "/last-man-standing",
    cta: "Join the waitlist →",
  },
  {
    name: "Prediction competitions",
    desc: "World Cup, All-Ireland, any tournament. Members pick results, score points, chase the leaderboard. One panel runs the lot.",
    status: "Available now" as const,
    statusNote: null,
    to: "/contact",
    cta: "Talk to us →",
  },
  {
    name: "Golf classic",
    desc: "Stableford or stroke play, handicap-adjusted. Online entry and payment, results posted on the day, leaderboard shared automatically.",
    status: "Available now" as const,
    statusNote: null,
    to: "/contact",
    cta: "Talk to us →",
  },
  {
    name: "Bring your own idea",
    desc: "Got a competition that doesn't fit one of these? Tell us. If it makes sense for your members we'll figure out how to build it.",
    status: null,
    statusNote: null,
    to: "/contact",
    cta: "Tell us about it →",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function HomePage() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-primary">
        <img
          src="/hero-pitch.jpg"
          alt="Packed stands at an Irish stadium on match day"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/85 to-primary/30" />
        <div className="container-prose relative grid min-h-[64vh] items-center py-16 md:py-20">
          <div className="max-w-3xl text-primary-foreground">
            <h1 className="text-balance font-display text-6xl uppercase leading-[0.95] tracking-wide md:text-8xl">
              Club Fundraising — Without the Hard Work
            </h1>
            <p className="mt-4 font-display text-xl uppercase tracking-wide text-accent md:text-2xl">
              Fundraising tools built for Irish clubs.
            </p>
            <p className="mt-6 max-w-xl text-lg font-semibold text-primary-foreground/85 md:text-xl">
              We sit down with your committee, work out what'll actually raise
              money for your club, then build and run it for you. A partner on
              the end of the phone — not just another platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110"
              >
                Sign up your club — it's free
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/40 px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition hover:bg-primary-foreground/10"
              >
                <MessageCircle className="h-4 w-4" />
                Chat on WhatsApp
              </a>
            </div>
            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-6 border-t border-primary-foreground/15 pt-6">
              {[
                ["Free to start", "No setup fee"],
                ["72hrs", "From sign-up to live"],
                ["5% then 3%", "Platform fee, nothing else"],
              ].map(([k, v]) => (
                <div key={v}>
                  <dt className="font-display text-3xl text-accent md:text-4xl">
                    {k}
                  </dt>
                  <dd className="mt-1 text-xs uppercase tracking-widest text-primary-foreground/70">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── LMS STRIP ────────────────────────────────────────────────── */}
      <section className="border-y border-accent/20 bg-primary py-4 text-primary-foreground">
        <div className="container-prose flex flex-col items-center justify-between gap-3 md:flex-row md:gap-6">
          <p className="text-center text-sm font-semibold uppercase tracking-wider md:text-left">
            <span className="text-accent">New for 2026/27 ·</span> Last One
            Standing for GAA &amp; soccer clubs · 10 spots available
          </p>
          <Link
            to="/last-man-standing"
            className="rounded-md bg-accent px-5 py-2 text-xs font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110"
          >
            Join the waitlist →
          </Link>
        </div>
      </section>

      {/* ── THE PROBLEM ───────────────────────────────────────────────── */}
      <section className="container-prose py-12 md:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            The problem we fix
          </p>
          <h2 className="text-balance font-display text-4xl uppercase tracking-wide text-accent md:text-5xl">
            Every committee knows the drill.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Endless WhatsApps. Ticket books in the boot. One volunteer doing
            maths at midnight, another chasing the same fiver for the third
            time. Club fundraising shouldn't cost your committee their evenings.
          </p>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="bg-muted/60 py-16 md:py-24">
        <div className="container-prose">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              How it works
            </p>
            <h2 className="font-display text-4xl uppercase tracking-wide text-accent md:text-5xl">
              Three steps. No spreadsheets.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Pick the competition. We build it. Your club runs it. Sign-ups go
              up because the entry experience doesn't look like a Google Form.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.n}
                className="rounded-xl border border-border bg-card p-7"
              >
                <div className="font-display text-sm uppercase tracking-[0.2em] text-accent">
                  Step {s.n}
                </div>
                <h3 className="mt-2 font-display text-2xl uppercase tracking-wide text-accent">
                  {s.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARTNER ──────────────────────────────────────────────────── */}
      <section className="bg-primary text-primary-foreground">
        <div className="container-prose py-16 md:py-20">
          <div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                A partner, not a platform
              </p>
              <h2 className="text-balance font-display text-4xl uppercase leading-tight tracking-wide md:text-5xl">
                We sit on your side of the table.
              </h2>
              <p className="mt-5 max-w-xl text-lg text-primary-foreground/85">
                You get a real person who knows club fundraising — what works,
                what flops, what prize fund hits, what entry price your members
                will actually pay.
              </p>
              <p className="mt-4 max-w-xl text-primary-foreground/80">
                Every club is different. We treat it that way. Pick our brains
                as often as you need — the advice is part of the service.
              </p>
            </div>
            <ul className="grid gap-3">
              {partnerPoints.map((line) => (
                <li
                  key={line}
                  className="flex gap-3 rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-4"
                >
                  <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <span className="text-sm text-primary-foreground/90 md:text-base">
                    {line}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── PROOF ────────────────────────────────────────────────────── */}
      <section className="bg-accent/5 py-16 md:py-24">
        <div className="container-prose">
          <div className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Real Irish clubs. Real results.
          </div>
          <h2 className="text-center font-display text-4xl uppercase tracking-wide text-accent md:text-5xl">
            Early days. Exceptional numbers.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            We're not going to pretend we've been doing this for years.{" "}
            {PLATFORM_STATS.totalCompetitions} competitions in. Nearly{" "}
            {PLATFORM_STATS.totalRaised} raised combined. Under{" "}
            {PLATFORM_STATS.averageTurnaround} per competition. Every club dealt
            with one person throughout.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[CASTLETOWN, ST_JOSEPHS].map((cs) => (
              <article
                key={cs.key}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="bg-primary px-6 py-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                    {cs.clubType} · {cs.county}
                  </p>
                  <h3 className="mt-1 font-display text-2xl uppercase tracking-wide text-primary-foreground">
                    {cs.clubName}
                  </h3>
                  <p className="text-sm text-primary-foreground/50">
                    {cs.competitionType}
                  </p>
                </div>
                <div className="p-6">
                  <dl className="grid grid-cols-3 gap-4 border-b border-border pb-5 mb-5">
                    {cs.stats.map((s) => (
                      <div key={s.v} className="text-center">
                        <dt className="font-display text-3xl text-accent">
                          {s.k}
                        </dt>
                        <dd className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                          {s.v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <blockquote className="border-l-4 border-accent pl-4">
                    <p className="text-sm italic leading-relaxed text-muted-foreground">
                      "{cs.pullQuote}"
                    </p>
                    <footer className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      — {cs.pullQuoteAttr}
                    </footer>
                  </blockquote>
                  <Link
                    to="/case-studies/$slug"
                    params={{ slug: cs.slug }}
                    className="mt-5 inline-flex text-sm font-semibold uppercase tracking-wider text-accent hover:brightness-90"
                  >
                    Read the full case study →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPETITIONS ─────────────────────────────────────────────── */}
      <section id="services" className="bg-muted/60 py-16 md:py-24">
        <div className="container-prose">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              What we build
            </p>
            <h2 className="font-display text-4xl uppercase tracking-wide text-accent md:text-5xl">
              Competitions that actually raise money.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Three formats. All done for you. More on the way.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {competitions.map((c) => (
              <article
                key={c.name}
                className="group relative flex flex-col rounded-xl border border-border bg-card p-6 transition hover:border-accent hover:shadow-lg"
              >
                {c.status && (
                  <span
                    className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      c.status === "Coming soon"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {c.status}
                  </span>
                )}
                <h3 className="font-display text-2xl uppercase tracking-wide text-accent">
                  {c.name}
                </h3>
                {c.statusNote && (
                  <p className="mt-1 text-xs font-medium text-amber-700">
                    {c.statusNote}
                  </p>
                )}
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {c.desc}
                </p>
                <Link
                  to={c.to as never}
                  className="mt-5 inline-flex w-fit text-sm font-semibold uppercase tracking-wider text-accent hover:brightness-90"
                >
                  {c.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <section className="container-prose py-16 md:py-20">
        <div className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Pricing
            </p>
            <h2 className="font-display text-4xl uppercase tracking-wide text-accent md:text-5xl">
              Free to start.{" "}
              <span className="text-foreground">We make money when you make money.</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              No setup fee. No subscription. We take a small percentage of what
              your competition raises — so we're only ever incentivised to help
              you raise as much as possible.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              5% on your first 100 entries, then 3% after that. Stripe's own
              payment processing fee is separate — we'll walk you through the
              exact numbers before anything goes live.
            </p>
            <Link
              to="/pricing"
              className="mt-6 inline-flex text-sm font-semibold uppercase tracking-wider text-accent hover:brightness-90"
            >
              See full pricing →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { val: "€0", lbl: "To get started" },
              { val: "5%", lbl: "Entries 1–100" },
              { val: "3%", lbl: "Entries 101+" },
              { val: "72hrs", lbl: "From go-ahead to live" },
            ].map(({ val, lbl }) => (
              <div
                key={lbl}
                className="rounded-xl border border-border bg-card p-6 text-center"
              >
                <div className="font-display text-4xl text-accent">{val}</div>
                <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                  {lbl}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY ──────────────────────────────────────────────────────── */}
      <section className="bg-muted/60 py-16 md:py-24">
        <div className="container-prose">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Why OneShotClub
            </p>
            <h2 className="font-display text-4xl uppercase tracking-wide text-accent md:text-5xl">
              Built for the way Irish clubs actually work.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {whyPoints.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-accent">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl uppercase tracking-wide text-accent">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="container-prose py-12 md:py-16">
        <div className="relative overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground md:p-12">
          <div className="relative z-10 grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="text-balance font-display text-4xl uppercase leading-tight tracking-wide md:text-6xl">
                Your club deserves a fundraiser worth talking about.
              </h2>
              <p className="mt-4 max-w-xl text-lg text-primary-foreground/85">
                Sign up free. We'll have a proper conversation, and only go
                ahead if it genuinely stacks up for your club.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110"
              >
                Sign up your club — it's free
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/40 px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition hover:bg-primary-foreground/10"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp us first
              </a>
              <p className="text-xs text-primary-foreground/40">
                Free to start · 5% on first 100 entries · 3% after
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
