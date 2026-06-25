import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPlayerByToken } from "@/lib/oneshot.functions";
import { Btn, Card, Shell } from "@/components/oneshot/ui";

type Search = { token: string; c?: string };

export const Route = createFileRoute("/stripe/return")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: String(s.token ?? ""),
    c: s.c ? String(s.c) : undefined,
  }),
  component: StripeReturn,
});

function StripeReturn() {
  const { token, c } = Route.useSearch();
  const nav = useNavigate();
  const fetchPlayer = useServerFn(getPlayerByToken);
  const [status, setStatus] = useState<"checking" | "paid" | "pending">(
    "checking",
  );
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const res = await fetchPlayer({ data: { token } });
        if (cancelled) return;
        if (res?.player?.paid) {
          setStatus("paid");
          setTimeout(() => {
            nav({
              to: "/welcome",
              search: { token, team: "", c: c ?? "" },
            });
          }, 600);
          return;
        }
      } catch {
        // ignore; will retry
      }
      setTries((t) => t + 1);
      timer = setTimeout(poll, 2000);
    }
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // After ~30s give up polling but still let user proceed manually.
  useEffect(() => {
    if (tries > 15) setStatus("pending");
  }, [tries]);

  return (
    <Shell>
      <Card className="mt-12 space-y-4 text-center">
        {status === "checking" && (
          <>
            <h1 className="display text-2xl">Confirming your payment…</h1>
            <p className="text-sm text-muted-foreground">
              This usually takes a few seconds.
            </p>
          </>
        )}
        {status === "paid" && (
          <>
            <h1 className="display text-2xl text-primary">Payment confirmed!</h1>
            <p className="text-sm">Taking you to your welcome page…</p>
          </>
        )}
        {status === "pending" && (
          <>
            <h1 className="display text-2xl">Payment is still processing</h1>
            <p className="text-sm text-muted-foreground">
              You'll get a confirmation email as soon as it clears. You can
              also check back later using your magic link.
            </p>
            <Link to="/" className="inline-block">
              <Btn variant="ghost">Back to home</Btn>
            </Link>
          </>
        )}
      </Card>
    </Shell>
  );
}
