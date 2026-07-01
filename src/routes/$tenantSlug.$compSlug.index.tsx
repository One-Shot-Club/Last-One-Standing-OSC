import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getTenantEntryContext } from "@/lib/tenant.functions";
import { Logo, Shell } from "@/components/oneshot/ui";
import { TenantEntry } from "@/components/oneshot/TenantEntry";
import {
  MasterTenantLanding,
  clubsQuery,
} from "@/components/oneshot/MasterTenantLanding";

const MASTER_ALIASES = new Set(["oneshotclub", "Master"]);
const resolveSlug = (slug: string) =>
  MASTER_ALIASES.has(slug) ? "oneshotclub-master" : slug;

const tenantEntryQuery = (tenantSlug: string, compSlug: string) =>
  queryOptions({
    queryKey: ["tenant-entry", resolveSlug(tenantSlug), compSlug],
    queryFn: () =>
      getTenantEntryContext({
        data: { slug: resolveSlug(tenantSlug), competitionSlug: compSlug },
      }),
  });

type LandingSearch = {
  add?: string;
  n?: string;
  e?: string;
  p?: string;
  o?: string;
};

export const Route = createFileRoute("/$tenantSlug/$compSlug/")({
  validateSearch: (s: Record<string, unknown>): LandingSearch => ({
    add: s.add ? String(s.add) : undefined,
    n: s.n ? String(s.n) : undefined,
    e: s.e ? String(s.e) : undefined,
    p: s.p ? String(s.p) : undefined,
    o: s.o ? String(s.o) : undefined,
  }),
  loader: async ({ params, context }) => {
    try {
      await context.queryClient.ensureQueryData(
        tenantEntryQuery(params.tenantSlug, params.compSlug),
      );
      if (MASTER_ALIASES.has(params.tenantSlug)) {
        await context.queryClient.ensureQueryData(clubsQuery);
      }
    } catch {
      throw notFound();
    }
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.tenantSlug} · ${params.compSlug}` },
      {
        name: "description",
        content: `Enter the Last One Standing competition for ${params.tenantSlug}.`,
      },
    ],
  }),
  component: CompetitionEntryPage,
  errorComponent: () => (
    <Shell>
      <Logo />
      <p className="mt-12 text-sm text-destructive">Competition not found.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <Logo />
      <p className="mt-12 text-sm text-destructive">Competition not found.</p>
    </Shell>
  ),
});

function CompetitionEntryPage() {
  const { tenantSlug, compSlug } = Route.useParams();
  const search = Route.useSearch();
  const { data } = useSuspenseQuery(tenantEntryQuery(tenantSlug, compSlug));
  const addMode =
    search.add === "1" && search.n
      ? { n: search.n, e: search.e ?? "", p: search.p ?? "", o: search.o }
      : null;

  if (MASTER_ALIASES.has(tenantSlug) && !addMode) {
    return <MasterTenantLanding tenant={data.tenant} />;
  }

  return (
    <TenantEntry
      tenant={data.tenant}
      competition={data.competition}
      gameweek={data.gameweek}
      fixtures={data.fixtures}
      tenantSlug={tenantSlug}
      addMode={addMode}
    />
  );
}
