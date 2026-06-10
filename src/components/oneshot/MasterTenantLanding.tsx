import { Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Card, Logo, Shell } from "@/components/oneshot/ui";
import { listPublicClubs, type TenantBranding } from "@/lib/tenant.functions";
import { useTenantBranding } from "@/lib/tenant/branding";

const clubsQuery = queryOptions({
  queryKey: ["public-clubs"],
  queryFn: () => listPublicClubs(),
});

export { clubsQuery };

export function MasterTenantLanding({ tenant }: { tenant: TenantBranding }) {
  useTenantBranding(tenant);
  const { data: clubs } = useSuspenseQuery(clubsQuery);

  return (
    <Shell>
      <div className="flex justify-center mt-4">
        <Logo />
      </div>

      <Card className="mt-10 text-center">
        <p className="eyebrow">Welcome to</p>
        <h1 className="display mt-2 text-4xl text-primary leading-tight">
          OneShotClub
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {tenant.intro_copy ??
            "The home of Last One Standing competitions for Irish clubs."}
        </p>
      </Card>

      <div className="mt-8">
        <p className="eyebrow mb-3">Active clubs</p>
        {clubs.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              No clubs are currently running a competition.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {clubs.map((club) => (
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
                    <p className="font-semibold text-foreground">{club.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Enter their Last Man Standing →
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 text-center">
        <Link
          to="/how-it-works"
          className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          How it works
        </Link>
      </div>
    </Shell>
  );
}
