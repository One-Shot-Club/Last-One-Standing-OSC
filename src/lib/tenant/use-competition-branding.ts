import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTenantBrandingForCompetition } from "@/lib/tenant.functions";
import { useTenantBranding } from "@/lib/tenant/branding";

/**
 * Fetch the tenant branding for a competition, apply colour tokens to the
 * page, and return the tenant logo + background URLs so callers can wire
 * them into <Shell> and <ClubHeader>. Use anywhere in the entry → pay →
 * pick → welcome → admin flow so the whole journey shares one identity.
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
  return {
    logoUrl: data?.logo_url ?? null,
    bgUrl: data?.background_url ?? null,
  };
}
