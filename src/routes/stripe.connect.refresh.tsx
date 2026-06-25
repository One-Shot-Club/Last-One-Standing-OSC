import { createFileRoute, Link } from "@tanstack/react-router";
import { Btn, Card, Shell } from "@/components/oneshot/ui";

export const Route = createFileRoute("/stripe/connect/refresh")({
  component: ConnectRefresh,
});

function ConnectRefresh() {
  return (
    <Shell>
      <Card className="mt-12 space-y-4 text-center">
        <h1 className="display text-2xl">Onboarding link expired</h1>
        <p className="text-sm text-muted-foreground">
          The Stripe onboarding link has expired or was reset. Ask your platform
          admin to generate a fresh link from the Payments tab.
        </p>
        <Link to="/" className="inline-block">
          <Btn variant="ghost">Back to home</Btn>
        </Link>
      </Card>
    </Shell>
  );
}
