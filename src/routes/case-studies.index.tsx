import { createFileRoute, Link } from "@tanstack/react-router";
import { CtaPair } from "@/components/CtaButtons";
import { SectionHeading } from "@/components/SectionHeading";
import { ALL_CASE_STUDIES } from "@/lib/case-studies";

const CANONICAL = "https://www.oneshotclub.ie/case-studies";

export const Route = createFileRoute("/case-studies/")({
  head: () => ({
    meta: [
      { title: "Case Studies - OneShotClub" },
      {
        name: "description",
        content:
          "What clubs running predictor and Big Prize fundraisers with OneShotClub are seeing — strong returns on a small setup cost.",
      },
      { property: "og:title", content: "Case Studies - OneShotClub" },
      {
        property: "og:description",
        content: "What Irish clubs are seeing from OneShotClub fundraisers.",
      },
      { property: "og:url", content: CANONICAL },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: CaseStudiesIndexPage,
});

function CaseStudiesIndexPage() {
  return (
    <>
      <section className="bg-primary text-primary-foreground">
        <div className="container-prose py-12 md:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Case Studies
          </p>
          <h1 className="text-balance font-display text-4xl uppercase tracking-wide md:text-5xl">
            Real Irish clubs. <span className="text-accent">Real results.</span>
          </h1>
        </div>
      </section>

      <section className="bg-muted/60 py-10 md:py-14">
        <div className="container-prose space-y-6">
          {ALL_CASE_STUDIES.map((cs) => (
            <div
              key={cs.key}
              className="grid items-start gap-6 rounded-2xl border border-border bg-card p-6 md:grid-cols-[1fr_auto] md:p-8"
            >
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  {cs.indexLabel}
                </p>
                <h2 className="text-balance font-display text-3xl uppercase tracking-wide text-primary md:text-4xl">
                  {cs.headline}
                </h2>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
                  {cs.indexSummary}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <Link
                    to="/case-studies/$slug"
                    params={{ slug: cs.slug }}
                    className="inline-flex rounded-md bg-accent px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-accent-foreground hover:brightness-110"
                  >
                    Read the full case study →
                  </Link>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {cs.indexStatsLine}
                  </span>
                </div>
              </div>
              <img
                src={cs.crestSrc}
                alt={`${cs.clubName} crest`}
                width={120}
                height={120}
                loading="lazy"
                className="hidden h-24 w-24 rounded-lg object-contain md:block lg:h-28 lg:w-28"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-background py-14 md:py-20">
        <div className="container-prose">
          <SectionHeading
            eyebrow="The numbers so far"
            title="Real ROI for real clubs"
            center
          >
            Indicative figures from the first clubs running OneShotClub
            fundraisers.
          </SectionHeading>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="font-display text-4xl text-accent">5-10x</div>
              <h3 className="mt-2 font-display text-lg uppercase tracking-wide text-primary">
                Return on setup
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Typical net return on the cost of getting a season-long
                predictor live.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="font-display text-4xl text-accent">90%</div>
              <h3 className="mt-2 font-display text-lg uppercase tracking-wide text-primary">
                Less admin
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Compared with running the same competition on spreadsheets,
                WhatsApp and bank transfers.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="font-display text-4xl text-accent">Weeks</div>
              <h3 className="mt-2 font-display text-lg uppercase tracking-wide text-primary">
                Idea to live
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                From first chat to a fundraiser your members can enter. Not
                months of planning.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-prose pb-20 pt-10">
        <div className="rounded-2xl bg-pitch-gradient p-8 text-center text-primary-foreground md:p-12">
          <h2 className="font-display text-3xl uppercase tracking-wide md:text-4xl">
            Want to be the next case study?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            A quick chat is the fastest way to see what a OneShotClub
            fundraiser could do for your club.
          </p>
          <div className="mt-6 flex justify-center">
            <CtaPair variant="onDark" align="center" />
          </div>
        </div>
      </section>
    </>
  );
}
