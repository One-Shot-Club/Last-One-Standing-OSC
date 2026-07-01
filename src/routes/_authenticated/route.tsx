import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { DEV_PREVIEW_COOKIE, DEV_TEST } from "@/lib/dev-test.constants";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (
      import.meta.env.DEV &&
      typeof localStorage !== "undefined" &&
      localStorage.getItem(DEV_PREVIEW_COOKIE) === "1"
    ) {
      return {
        user: {
          id: "dev-preview",
          email: DEV_TEST.email,
        },
      };
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
