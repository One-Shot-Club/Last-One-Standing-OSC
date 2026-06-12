import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTenantBrandingForCompetition } from "@/lib/tenant.functions";
import { useTenantBranding } from "@/lib/tenant/branding";

/**
 * Fetch the tenant branding for a competition and apply it to the page.
 * Use on any route reached from the entry flow (details, pay, pick, welcome)
 * so the whole entry → payment → pick → admin journey shares the tenant theme.
 */
export function useCompetitionBranding(competitionId: string | null | undefined) {
  const fetchBranding = useServerFn(getTenantBrandingForCompetition);
  const { data } = useQuery({
    queryKey: ["tenant-branding", competitionId],
    queryFn: () => fetchBranding({ data: { competitionId: competitionId as string } }),
    enabled: !!competitionId,
    staleTime: 5 * 60 * 1000,
  });
  useTenantBranding(data ?? null);
}
