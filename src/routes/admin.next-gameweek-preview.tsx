import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getNextGameweekPreviewContext } from "@/lib/gameweeks.functions";
import { NextGameweekView } from "@/components/oneshot/NextGameweekView";
import { Shell } from "@/components/oneshot/ui";

export const Route = createFileRoute("/admin/next-gameweek-preview")({
  component: NextGameweekPreview,
});

function NextGameweekPreview() {
  const nav = useNavigate();
  const fetchPreview = useServerFn(getNextGameweekPreviewContext);
  const [pin, setPin] = useState<string | null>(null);
  const [compId, setCompId] = useState<string | null>(null);

  useEffect(() => {
    const p = sessionStorage.getItem("osc_pin") ?? "";
    const c = sessionStorage.getItem("osc_comp");
    if (!c) nav({ to: "/admin" });
    else {
      setPin(p);
      setCompId(c);
    }
  }, [nav]);

  const { data, isLoading } = useQuery({
    queryKey: ["next-gw-preview", compId, pin],
    queryFn: () => fetchPreview({ data: { competitionId: compId!, pin: pin ?? "" } }),
    enabled: !!compId,
  });

  if (isLoading || !data) {
    return <Shell><p className="mt-10 text-sm text-muted-foreground">Loading preview…</p></Shell>;
  }
  return <NextGameweekView data={data as never} />;
}
