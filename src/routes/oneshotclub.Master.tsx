import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/oneshotclub/Master")({
  component: () => <Outlet />,
});
