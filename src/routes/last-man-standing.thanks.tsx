import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Mail, Calendar, Phone, Users, ArrowLeft, MessageCircle } from "lucide-react";

const CANONICAL = "https://www.oneshotclub.ie/last-man-standing/thanks";

export const Route = createFileRoute("/last-man-standing/thanks")({
  head: () => ({
    meta: [
      { title: "You're on the LMS waitlist — OneShotClub" },
      {
        name: "description",
        content:
          "Thanks for putting your club's name down for Last Man Standing. Here's what happens next and how members who don't use email can still take part.",
      },
      { property: "og:title", content: "You're on the LMS waitlist — OneShotClub" },
      {
        property: "og:description",
        content:
          "Thanks for joining the Last Man Standing waitlist. Here's what happens next and how offline members can still take part.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: LmsThanksPage,
});

const nextSteps = [
  {
    icon: Mail,
    title: "Confirmation in your inbox",
    desc: "We've sent a quick note to the email you gave us. If it doesn't land in a few minutes, have a look in the spam folder.",
  },
  {
    icon: Calendar,
    title: "An onboarding call before pre-season",
    desc: "Closer to the 2026/27 kick-off we'll be in touch to set up a call. We'll go through your crest, colours, club name and how you want to run it.",
  },
  {
    icon: Phone,
    title: "Pricing — you'll see it first",
    desc: "Waitlist clubs get the final pricing before anyone else. Nothing to commit to until you're happy with the detail.",
  },
];

const offlineOptions = [
  {
    icon: Users,
    title: "An admin can enter picks for any member",
    desc: "A committee member logs in and puts a weekly pick in for anyone who doesn't use the app themselves. Their name shows up on the leaderboard the same as everyone else.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp, a text, or a chat after training",
    desc: "Members send their pick whatever way your club already uses. The admin pops it in. No email address, no smartphone, no problem.",
  },
  {
    icon: Check,
    title: "Paper backup, fully supported",
    desc: "If a paper sheet at the clubhouse or bar works better, the admin uploads the week's entries in one go. Everything stays fair and visible to the whole club.",
  },
];

function LmsThanksPage() {
  return (
    <>
      <ThanksHero />
      <NextStepsSection />
      <OfflineSection />
      <ExploreMoreSection />
    </>
  );
}

function ThanksHero() {
  return (
    <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
      <div className="container-prose relative grid min-h-[50vh] items-center py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Check className="h-7 w-7" />
          </div>
          <h1 className="text-balance font-display text-5xl uppercase leading-[0.95] tracking-wide md:text-7xl">
            You're on the <span className="text-accent">list</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/85 md:text-xl">
            Thanks for holding your club's spot. We're keeping it to 10 clubs for
            the first Premier League season — you're one of them.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/last-man-standing"
              className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/30 px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Last Man Standing
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110"
            >
              See the rest of OneShotClub →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function NextStepsSection() {
  return (
    <section className="container-prose py-16 md:py-24">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          What happens now
        </p>
        <h2 className="mt-3 text-balance font-display text-4xl uppercase tracking-wide text-primary md:text-5xl">
          Three things heading your way
        </h2>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {nextSteps.map(({ icon: Icon, title, desc }) => (
          <article key={title} className="rounded-xl border border-border bg-card p-7">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-accent">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="font-display text-2xl uppercase tracking-wide text-primary">
              {title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function OfflineSection() {
  return (
    <section className="bg-muted/60 py-16 md:py-24">
      <div className="container-prose">
        <div className="grid gap-10 md:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              No member left out
            </p>
            <h2 className="text-balance font-display text-4xl uppercase tracking-wide text-primary md:text-5xl">
              Works for the members who aren't online
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Every club has members who don't do email or smartphones. We built
              around that from day one — it's not a workaround, it's how the
              thing was designed.
            </p>
          </div>
          <div className="space-y-5">
            {offlineOptions.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 rounded-xl border border-border bg-card p-5">
                <div className="flex-none">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="font-display text-xl uppercase tracking-wide text-primary">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ExploreMoreSection() {
  return (
    <section className="container-prose py-12 md:py-16">
      <div className="relative overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground md:p-12">
        <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              While you wait
            </p>
            <h2 className="mt-3 text-balance font-display text-3xl uppercase leading-tight tracking-wide md:text-5xl">
              See what else we do
            </h2>
            <p className="mt-3 max-w-xl text-base text-primary-foreground/85">
              Hole-in-One, Crossbar Challenge and the rest — prize-led fundraisers
              we run with you, so your club isn't left holding the risk.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <Link
              to="/"
              hash="services"
              className="rounded-md bg-accent px-6 py-3 text-center text-sm font-bold uppercase tracking-wider text-accent-foreground transition hover:brightness-110"
            >
              See the fundraisers →
            </Link>
            <a
              href="mailto:hello@oneshotclub.ie"
              className="rounded-md border border-primary-foreground/30 px-6 py-3 text-center text-sm font-bold uppercase tracking-wider text-primary-foreground transition hover:bg-primary-foreground/10"
            >
              Or just email us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
