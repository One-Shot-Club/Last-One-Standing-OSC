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
          Your club&apos;s payout details have been submitted to Stripe. Verification
          usually completes in a few minutes — once approved, members can pay by card
          on your competition pages.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/onboarding" search={{ complete: "1" }}>
            <Btn>Continue setup →</Btn>
          </Link>
          <Link to="/dashboard">
            <Btn variant="ghost">Go to dashboard</Btn>
          </Link>
        </div>
      </Card>
    </Shell>
  );
}
