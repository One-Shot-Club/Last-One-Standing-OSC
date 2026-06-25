import { createFileRoute, Link } from "@tanstack/react-router";
import { Btn, Card, Shell } from "@/components/oneshot/ui";

type Search = { t?: string };

export const Route = createFileRoute("/stripe/connect/return")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    t: s.t ? String(s.t) : undefined,
  }),
  component: ConnectReturn,
});

function ConnectReturn() {
  return (
    <Shell>
      <Card className="mt-12 space-y-4 text-center">
        <h1 className="display text-2xl text-primary">Stripe onboarding complete</h1>
        <p className="text-sm text-muted-foreground">
          Your club's payout details have been submitted to Stripe. Verification
          usually completes in a few minutes — once approved, the "Pay with card"
          option will appear on your club's pay screen.
        </p>
        <p className="text-xs text-muted-foreground">
          You can close this tab now.
        </p>
        <Link to="/" className="inline-block">
          <Btn variant="ghost">Back to home</Btn>
        </Link>
      </Card>
    </Shell>
  );
}
