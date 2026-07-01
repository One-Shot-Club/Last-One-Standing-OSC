import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CaseStudyPage } from "@/components/CaseStudyPage";
import { getCaseStudy } from "@/lib/case-studies";

export const Route = createFileRoute("/case-studies/$slug")({
  loader: ({ params }) => {
    const study = getCaseStudy(params.slug);
    if (!study) throw notFound();
    return { study };
  },
  head: ({ loaderData }) => {
    const study = loaderData?.study;
    if (!study) return {};
    return {
      meta: [
        { title: study.seoTitle },
        { name: "description", content: study.seoDescription },
        { property: "og:title", content: study.seoTitle },
        { property: "og:description", content: study.seoDescription },
        { property: "og:url", content: study.canonicalUrl },
      ],
      links: [{ rel: "canonical", href: study.canonicalUrl }],
    };
  },
  component: CaseStudyDetailPage,
  notFoundComponent: CaseStudyNotFound,
});

function CaseStudyDetailPage() {
  const { study } = Route.useLoaderData();
  return <CaseStudyPage study={study} />;
}

function CaseStudyNotFound() {
  return (
    <div className="container-prose py-24 text-center">
      <h1 className="font-display text-4xl uppercase tracking-wide text-primary">
        Case study not found
      </h1>
      <p className="mt-4 text-muted-foreground">
        That case study doesn't exist yet.
      </p>
      <Link
        to="/case-studies"
        className="mt-6 inline-flex text-sm font-semibold uppercase tracking-wider text-accent hover:brightness-90"
      >
        ← Back to case studies
      </Link>
    </div>
  );
}
