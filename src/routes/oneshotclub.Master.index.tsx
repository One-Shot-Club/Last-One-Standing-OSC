import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getTenantEntryContext } from "@/lib/tenant.functions";
import { Logo, Shell } from "@/components/oneshot/ui";
import { TenantEntry } from "@/components/oneshot/TenantEntry";

const MASTER_SLUG = "oneshotclub-master";

const tenantEntryQuery = queryOptions({
  queryKey: ["tenant-entry", MASTER_SLUG],
  queryFn: () => getTenantEntryContext({ data: { slug: MASTER_SLUG } }),
});

export const Route = createFileRoute("/oneshotclub/Master/")({
  loader: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(tenantEntryQuery);
    } catch {
      throw notFound();
    }
  },
  head: () => ({
    meta: [
      { title: "Master template · OneShotClub" },
      {
        name: "description",
        content:
          "Master OneShotClub entry template — edits here flow to all active clubs.",
      },
    ],
  }),
  component: MasterPage,
  errorComponent: () => (
    <Shell>
      <Logo />
      <p className="mt-12 text-sm text-destructive">Master tenant not found.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <Logo />
      <p className="mt-12 text-sm text-destructive">Master tenant not found.</p>
    </Shell>
  ),
});

function MasterPage() {
  const { data } = useSuspenseQuery(tenantEntryQuery);

  return (
    <TenantEntry tenant={data.tenant} competition={data.competition} />
  );
}
