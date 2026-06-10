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
          Platform admins sign in here. Club admins should use the per-club
          login at <span className="font-mono">/[your-club]/admin</span>.
        </p>
      </div>
      <Card className="mt-6 space-y-3">
        <Link to="/auth">
          <Btn>Platform sign in →</Btn>
        </Link>
      </Card>
    </Shell>
  );
}

