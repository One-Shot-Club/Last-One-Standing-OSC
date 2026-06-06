import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Btn, Card, Shell } from "@/components/oneshot/ui";

type Search = { token: string };

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>): Search => ({ token: String(s.token ?? "") }),
  component: Unsub,
});

function Unsub() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<"loading" | "valid" | "already" | "invalid" | "done" | "error">("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setStatus("valid");
        else if (d.reason === "already_unsubscribed") setStatus("already");
        else setStatus("invalid");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  async function confirm() {
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }).then((r) => r.json());
      if (res.success) setStatus("done");
      else if (res.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Shell>
      <div className="mt-10">
        <h1 className="display text-3xl">Unsubscribe</h1>
        <Card className="mt-6 space-y-3">
          {status === "loading" && <p className="text-sm text-muted-foreground">Checking…</p>}
          {status === "valid" && (
            <>
              <p className="text-sm">Click confirm to stop all emails from us.</p>
              <Btn onClick={confirm}>Confirm unsubscribe</Btn>
            </>
          )}
          {status === "done" && <p className="text-sm text-success">You've been unsubscribed.</p>}
          {status === "already" && <p className="text-sm text-muted-foreground">You're already unsubscribed.</p>}
          {status === "invalid" && <p className="text-sm text-destructive">Invalid or expired link.</p>}
          {status === "error" && <p className="text-sm text-destructive">Something went wrong. Try again.</p>}
        </Card>
      </div>
    </Shell>
  );
}
