import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getTenantEntryContext, resolveTenantBySlug } from "@/lib/tenant.functions";
import { TenantClubLanding } from "@/components/oneshot/TenantClubLanding";
import {
  MasterTenantLanding,
  clubsQuery,
} from "@/components/oneshot/MasterTenantLanding";

const MASTER_ALIASES = new Set(["oneshotclub", "Master"]);
const resolveSlug = (slug: string) =>
  MASTER_ALIASES.has(slug) ? "oneshotclub-master" : slug;

const tenantLandingQuery = (slug: string) =>
  queryOptions({
    queryKey: ["tenant-landing", resolveSlug(slug)],
    queryFn: () => resolveTenantBySlug({ data: { slug: resolveSlug(slug) } }),
  });

const masterEntryQuery = (slug: string) =>
  queryOptions({
    queryKey: ["tenant-entry", resolveSlug(slug)],
    queryFn: () => getTenantEntryContext({ data: { slug: resolveSlug(slug) } }),
  });

export const Route = createFileRoute("/$tenantSlug/")({
  loader: async ({ params, context }) => {
    if (MASTER_ALIASES.has(params.tenantSlug)) {
      await context.queryClient.ensureQueryData(masterEntryQuery(params.tenantSlug));
      await context.queryClient.ensureQueryData(clubsQuery);
      return { mode: "master" as const };
    }

    try {
      const data = await context.queryClient.ensureQueryData(
        tenantLandingQuery(params.tenantSlug),
      );
      if (data.competitions.length === 1) {
        const only = data.competitions[0]!;
        throw redirect({
          to: "/$tenantSlug/$compSlug",
          params: {
            tenantSlug: params.tenantSlug,
            compSlug: only.slug,
          },
        });
      }
      return { mode: "club" as const, ...data };
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
      throw notFound();
    }
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.tenantSlug} · OneShotClub` },
      {
        name: "description",
        content: `Enter a Last One Standing competition for ${params.tenantSlug}.`,
      },
    ],
  }),
  component: TenantClubPage,
  notFoundComponent: () => (
    <div className="container-prose py-16">
      <p className="text-sm text-destructive">Club not found.</p>
    </div>
  ),
});

function TenantClubPage() {
  const { tenantSlug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  if (loaderData.mode === "master") {
    return <MasterClubPage tenantSlug={tenantSlug} />;
  }
  return <ClubLandingPage tenantSlug={tenantSlug} />;
}

function MasterClubPage({ tenantSlug }: { tenantSlug: string }) {
  const { data } = useSuspenseQuery(masterEntryQuery(tenantSlug));
  return <MasterTenantLanding tenant={data.tenant} />;
}

function ClubLandingPage({ tenantSlug }: { tenantSlug: string }) {
  const { data } = useSuspenseQuery(tenantLandingQuery(tenantSlug));
  return (
    <TenantClubLanding
      tenant={data.tenant}
      competitions={data.competitions}
      tenantSlug={tenantSlug}
    />
  );
}
