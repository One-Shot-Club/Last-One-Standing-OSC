import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/$tenantSlug/", params: { tenantSlug: "killeshin" } });
  },
});
