import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Card, Logo, Shell } from "@/components/oneshot/ui";

export const Route = createFileRoute("/admin/")({ component: Admin });

function Admin() {
  const nav = useNavigate();

  // If already signed in, send to the dashboard where comps are listed.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) nav({ to: "/dashboard" });
    });
  }, [nav]);

  return (
    <Shell>
      <Logo />
      <div className="mt-16">
        <h1 className="display text-4xl">Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with your tenant admin account to manage competitions.
        </p>
      </div>
      <Card className="mt-6 space-y-3">
        <Link to="/auth">
          <Btn>Sign in →</Btn>
        </Link>
        <p className="text-xs text-muted-foreground">
          Need access? Ask your tenant owner or a platform admin to add your
          email under <span className="font-mono">/platform/admin</span>.
        </p>
      </Card>
    </Shell>
  );
}
