import { Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CtaPair } from "@/components/CtaButtons";
import type { CaseStudy } from "@/lib/case-studies";

export function CaseStudyPage({
  study,
  asSection = false,
}: {
  study: CaseStudy;
  asSection?: boolean;
}) {
  const Heading = asSection ? "h2" : "h1";

  return (
    <div className="container-prose py-16 md:py-24">
      <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <img
          src={study.crestSrc}
          alt={`${study.clubName} crest`}
          width={140}
          height={140}
          loading="lazy"
          className="h-28 w-28 rounded-lg object-contain md:h-36 md:w-36"
        />
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Club Fundraising Case Study
          </p>
          <Heading className="text-balance font-display text-4xl uppercase leading-[1.05] tracking-wide text-primary md:text-6xl">
            {study.headline}
          </Heading>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
            {study.subheadline}
          </p>
        </div>
      </div>

      <dl className="mt-10 grid gap-4 md:grid-cols-3">
        {study.stats.map((s) => (
          <div
            key={s.v}
            className="rounded-xl border border-border bg-card p-6 text-center"
          >
            <dt className="font-display text-4xl text-accent md:text-5xl">
              {s.k}
            </dt>
            <dd className="mt-2 text-sm uppercase tracking-widest text-muted-foreground">
              {s.v}
            </dd>
          </div>
        ))}
      </dl>

      <blockquote className="mt-10 border-l-4 border-accent bg-muted/50 p-6 md:p-8">
        <p className="font-display text-xl italic leading-snug text-primary md:text-2xl">
          "{study.pullQuote}"
        </p>
        <footer className="mt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          — {study.pullQuoteAttr}
        </footer>
      </blockquote>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h3 className="font-display text-2xl uppercase tracking-wide text-primary md:text-3xl">
            In the club's own words
          </h3>
          <Accordion type="single" collapsible defaultValue="q-0" className="mt-4">
            {study.qa.map((item, i) => (
              <AccordionItem key={item.q} value={`q-${i}`}>
                <AccordionTrigger className="font-display text-base uppercase tracking-wide text-primary">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                    "{item.a}"
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    — {item.attr}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 md:p-8">
          <h3 className="font-display text-2xl uppercase tracking-wide text-primary">
            {study.benefitsHeading}
          </h3>
          <ul className="mt-5 space-y-3">
            {study.benefits.map((b) => (
              <li key={b} className="flex gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {b}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-14 rounded-2xl bg-pitch-gradient p-8 text-primary-foreground md:p-12">
        <h3 className="font-display text-3xl uppercase tracking-wide md:text-4xl">
          {study.ctaHeadline}
        </h3>
        <p className="mt-3 max-w-2xl text-primary-foreground/85">
          Free to start — 5% on your first 100 entries, 3% after. We'll have
          your fundraiser live in 72 hours.
        </p>
        <div className="mt-6">
          <CtaPair variant="onDark" />
        </div>
      </div>
    </div>
  );
}
