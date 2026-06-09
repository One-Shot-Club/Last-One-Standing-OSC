import { createFileRoute, useParams, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { resolveTenantBySlug } from "@/lib/tenant.functions";
import { useTenantBranding } from "@/lib/tenant/branding";
import { Card, Logo, Shell } from "@/components/oneshot/ui";

const tenantQuery = (slug: string) =>
  queryOptions({
    queryKey: ["tenant", slug],
    queryFn: () => resolveTenantBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/$tenantSlug/")({
  loader: async ({ params, context }) => {
    try {
      await context.queryClient.ensureQueryData(tenantQuery(params.tenantSlug));
    } catch {
      throw notFound();
    }
  },
  head: ({ params }) => ({
    meta: [
      { title: `${params.tenantSlug} · Last One Standing` },
      {
        name: "description",
        content: `Join the Last One Standing competition for ${params.tenantSlug}.`,
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
  const { tenantSlug } = useParams({ from: "/$tenantSlug/" });
  const { data } = useSuspenseQuery(tenantQuery(tenantSlug));
  useTenantBranding(data.tenant);

  return (
    <Shell>
      <div className="flex items-center gap-3">
        {data.tenant.logo_url ? (
          <img
            src={data.tenant.logo_url}
            alt={data.tenant.name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <Logo />
        )}
        <div>
          <div className="display text-xl">{data.tenant.name}</div>
          <div className="text-xs text-muted-foreground">/{data.tenant.slug}</div>
        </div>
      </div>

      <div className="mt-10">
        <h1 className="display text-4xl">Last One Standing</h1>
        {data.tenant.intro_copy && (
          <p className="mt-3 text-sm text-muted-foreground">{data.tenant.intro_copy}</p>
        )}
      </div>

      <h2 className="mt-8 display text-lg">Competitions</h2>
      <Card className="mt-3 space-y-2">
        {data.competitions.length === 0 && (
          <p className="text-sm text-muted-foreground">No live competitions right now.</p>
        )}
        {data.competitions.map((c) => (
          <div key={c.id} className="rounded-md border border-border p-3">
            <div className="font-medium">{c.name}</div>
            {c.slug && (
              <a
                href={`/${data.tenant.slug}/${c.slug}/join`}
                className="text-xs underline text-primary"
              >
                Join →
              </a>
            )}
          </div>
        ))}
      </Card>

      {(data.tenant.contact_email || data.tenant.contact_phone) && (
        <Card className="mt-4">
          <div className="text-xs text-muted-foreground">Contact</div>
          {data.tenant.contact_email && (
            <a href={`mailto:${data.tenant.contact_email}`} className="block text-sm underline">
              {data.tenant.contact_email}
            </a>
          )}
          {data.tenant.contact_phone && (
            <div className="text-sm">{data.tenant.contact_phone}</div>
          )}
        </Card>
      )}
    </Shell>
  );
}
