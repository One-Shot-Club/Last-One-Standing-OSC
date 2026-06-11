import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getTenantEntryContext } from "@/lib/tenant.functions";
import { Logo, Shell } from "@/components/oneshot/ui";
import { TenantEntry } from "@/components/oneshot/TenantEntry";
import {
  MasterTenantLanding,
  clubsQuery,
} from "@/components/oneshot/MasterTenantLanding";

const MASTER_ALIASES = new Set(["oneshotclub", "oneshotclub-master", "Master"]);
const resolveSlug = (slug: string) =>
  MASTER_ALIASES.has(slug) ? "oneshotclub-master" : slug;

const tenantEntryQuery = (slug: string) =>
  queryOptions({
    queryKey: ["tenant-entry", resolveSlug(slug)],
    queryFn: () => getTenantEntryContext({ data: { slug: resolveSlug(slug) } }),
  });

export const Route = createFileRoute("/$tenantSlug/")({
  loader: async ({ params, context }) => {
    try {
      await context.queryClient.ensureQueryData(
        tenantEntryQuery(params.tenantSlug),
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
      { title: `${params.tenantSlug} · Last One Standing` },
      {
        name: "description",
        content: `Enter the Last One Standing competition for ${params.tenantSlug}.`,
      },
    ],
  }),
  component: TenantLanding,
  errorComponent: () => (
    <Shell>
      <Logo />
      <p className="mt-12 text-sm text-destructive">Tenant not found.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <Logo />
      <p className="mt-12 text-sm text-destructive">Tenant not found.</p>
    </Shell>
  ),
});

function TenantLanding() {
  const { tenantSlug } = Route.useParams();
  const { data } = useSuspenseQuery(tenantEntryQuery(tenantSlug));
  if (MASTER_ALIASES.has(tenantSlug)) {
    return <MasterTenantLanding tenant={data.tenant} />;
  }
  return <TenantEntry tenant={data.tenant} competition={data.competition} />;
}
