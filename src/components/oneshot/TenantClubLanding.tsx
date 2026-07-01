import { Link } from "@tanstack/react-router";
import { Card, Logo, Shell } from "@/components/oneshot/ui";
import { ClubHeader } from "@/components/oneshot/ClubHeader";
import { useTenantBranding } from "@/lib/tenant/branding";
import type { TenantBranding, TenantCompetition } from "@/lib/tenant.functions";

export function TenantClubLanding({
  tenant,
  competitions,
  tenantSlug,
}: {
  tenant: TenantBranding;
  competitions: TenantCompetition[];
  tenantSlug: string;
}) {
  useTenantBranding(tenant);

  return (
    <Shell bgUrl={tenant.background_url ?? undefined} bgBlur={6}>
      <div className="mt-2">
        <ClubHeader clubName={tenant.name} logoUrl={tenant.logo_url ?? undefined} />
      </div>

      <Card className="mt-8 text-center">
        <p className="eyebrow">Choose a competition</p>
        <h1 className="display mt-2 text-3xl text-primary leading-tight">
          {tenant.name}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {tenant.intro_copy ??
            "Pick a competition below to enter. No account needed — just choose your team and pay."}
        </p>
      </Card>

      <div className="mt-8 space-y-3">
        {competitions.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              No competitions are open for entry right now. Check back soon or
              contact the club directly.
            </p>
          </Card>
        ) : (
          competitions.map((comp) => (
            <Link
              key={comp.id}
              to="/$tenantSlug/$compSlug"
              params={{ tenantSlug, compSlug: comp.slug }}
              className="block"
            >
              <Card className="transition hover:border-primary">
                <p className="font-semibold text-foreground">{comp.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  €{comp.entry_fee} entry · Enter now →
                </p>
              </Card>
            </Link>
          ))
        )}
      </div>

      <div className="mt-10 flex justify-center">
        <Logo />
      </div>
    </Shell>
  );
}
