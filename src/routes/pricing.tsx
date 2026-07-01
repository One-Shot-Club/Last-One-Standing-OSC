import { createFileRoute } from "@tanstack/react-router";
import { CtaPair } from "@/components/CtaButtons";
import { SectionHeading } from "@/components/SectionHeading";
import { Check } from "lucide-react";

const CANONICAL = "https://www.oneshotclub.ie/pricing";

const tiers = [
  { val: "€0", lbl: "To get started" },
  { val: "Aligned", lbl: "We win when you win" },
  { val: "Simple", lbl: "Fee per entry only" },
  { val: "72hrs", lbl: "From go-ahead to live" },
];

const included = [
  "Branded competition page with your crest and colours",
  "Online payments — card, Apple Pay, and manual entry for offline members",
  "Entries, confirmations and leaderboard handled in one place",
  "One contact at OneShotClub from setup through to payout",
  "No subscription, no setup fee, no lock-in",
];

const faqs = [
  {
    q: "When do we pay?",
    a: "Nothing upfront. The platform fee comes out of each entry automatically when someone pays online — so you only pay when you're raising money.",
  },
  {
    q: "What about Stripe's fee?",
    a: "Stripe charges their own card processing fee on top. We'll walk you through the exact numbers before anything goes live so there are no surprises.",
  },
  {
    q: "Is there a minimum number of entries?",
    a: "No. Whether you have 20 members or 200, the same model applies. Smaller clubs aren't penalised.",
  },
  {
    q: "What if we need help mid-competition?",
    a: "You have a direct contact at OneShotClub — not a ticket queue. WhatsApp, email, or a call. We're set up for the way volunteer committees actually work.",
  },
];

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — OneShotClub" },
      {
        name: "description",
        content:
          "Free to start. No setup fee, no subscription. We only make money when your club raises money.",
      },
      { property: "og:title", content: "Pricing — OneShotClub" },
      {
        property: "og:description",
        content:
          "Free to start. We only make money when you do — a small fee per entry, nothing upfront.",
      },
      { property: "og:url", content: CANONICAL },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <>
      <section className="bg-primary text-primary-foreground">
        <div className="container-prose py-12 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Pricing
          </p>
          <h1 className="text-balance font-display text-4xl uppercase tracking-wide md:text-5xl">
            Free to start.{" "}
            <span className="text-accent">We only make money when you do.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-primary-foreground/85">
            No setup fee. No subscription. We take a small percentage of what
            your competition raises — so we're only ever incentivised to help
            you raise as much as possible.
          </p>
        </div>
      </section>

      <section className="container-prose py-16 md:py-20">
        <div className="grid items-start gap-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="font-display text-3xl uppercase tracking-wide text-primary md:text-4xl">
              Simple, aligned pricing
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Your club keeps the vast majority of every entry. We only take a
              small share when money comes in — no invoices, no chasing, no
              treasurer headache.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              We'll walk you through the exact numbers before anything goes live.
              Stripe's payment processing fee is separate and transparent.
            </p>
            <div className="mt-8">
              <CtaPair />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {tiers.map(({ val, lbl }) => (
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

      <section className="bg-muted/60 py-16 md:py-24">
        <div className="container-prose">
          <SectionHeading
            eyebrow="What's included"
            title="Everything you need to run a proper fundraiser"
            center
          >
            One flat relationship — not a pile of add-ons.
          </SectionHeading>
          <ul className="mx-auto mt-10 max-w-2xl space-y-4">
            {included.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground md:text-base">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-prose py-16 md:py-24">
        <SectionHeading eyebrow="FAQ" title="Common questions" center />
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-border rounded-xl border border-border bg-card">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg uppercase tracking-wide text-primary">
                {q}
                <span className="text-accent transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {a}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="container-prose pb-20 pt-4">
        <div className="rounded-2xl bg-pitch-gradient p-8 text-center text-primary-foreground md:p-12">
          <h2 className="font-display text-3xl uppercase tracking-wide md:text-4xl">
            Ready to see if it stacks up for your club?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Sign up free. We'll have a proper conversation, and only go ahead if
            it genuinely works for your committee.
          </p>
          <div className="mt-6 flex justify-center">
            <CtaPair variant="onDark" align="center" />
          </div>
        </div>
      </section>
    </>
  );
}
