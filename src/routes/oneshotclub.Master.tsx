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

export const Route = createFileRoute("/oneshotclub/Master")({
  loader: async ({ context }) => {
    try {
      await Promise.all([
        context.queryClient.ensureQueryData(tenantEntryQuery),
        context.queryClient.ensureQueryData(clubsQuery),
      ]);
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
  const { data: clubs } = useSuspenseQuery(clubsQuery);

  return (
    <>
      <TenantEntry tenant={data.tenant} competition={data.competition} />

      <Shell>
        <p className="eyebrow mt-2 mb-3">Active clubs</p>
        {clubs.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              No clubs are currently running a competition.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {clubs
              .filter((c) => c.slug !== MASTER_SLUG)
              .map((club) => (
                <Link
                  key={club.slug}
                  to="/$tenantSlug"
                  params={{ tenantSlug: club.slug }}
                  className="block"
                >
                  <Card className="flex items-center gap-4 hover:border-primary transition-colors">
                    {club.logo_url ? (
                      <img
                        src={club.logo_url}
                        alt={`${club.name} logo`}
                        className="h-12 w-12 rounded-md object-contain bg-background"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-primary/20" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {club.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Enter their Last Man Standing →
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
          </div>
        )}
      </Shell>
    </>
  );
}
