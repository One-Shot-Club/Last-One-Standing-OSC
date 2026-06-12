import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getPickContext, submitPickV2 } from "@/lib/gameweeks.functions";
import { Shell } from "@/components/oneshot/ui";
import { NextGameweekView } from "@/components/oneshot/NextGameweekView";
import { useCompetitionBranding } from "@/lib/tenant/use-competition-branding";

type Search = { token: string };

export const Route = createFileRoute("/pick")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: String(s.token ?? ""),
  }),
  component: Pick,
});

function Pick() {
  const { token } = Route.useSearch();
  const fetchCtx = useServerFn(getPickContext);
  const submit = useServerFn(submitPickV2);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pick-context", token],
    queryFn: () => fetchCtx({ data: { token } }),
    enabled: !!token,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const competitionId = (data as { competition?: { id?: string } } | undefined)?.competition?.id ?? null;
  const { logoUrl: tenantLogo, bgUrl } = useCompetitionBranding(competitionId);

  if (!token) {
    return <Shell><p className="mt-10 text-sm text-muted-foreground">Missing magic link token.</p></Shell>;
  }
  if (isLoading || !data) {
    return <Shell><p className="mt-10 text-sm text-muted-foreground">Loading…</p></Shell>;
  }

  async function handleSubmit(team: string) {
    if (!data?.gameweek) return;
    setBusy(true);
    setError(null);
    try {
      await submit({ data: { token, gameweekId: data.gameweek.id, team } });
      await qc.invalidateQueries({ queryKey: ["pick-context", token] });
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <NextGameweekView
      data={data as never}
      onSubmit={handleSubmit}
      submitting={busy}
      submitError={error}
      tenantLogoUrl={tenantLogo}
      tenantBgUrl={bgUrl}
    />
  );
}
