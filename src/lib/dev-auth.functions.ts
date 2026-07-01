import { createServerFn } from "@tanstack/react-start";
import { DEV_TEST } from "@/lib/dev-test.constants";
import { isDevEnvironment, seedDevTestAccount } from "@/lib/dev-auth.server";

export const bootstrapDevTestAccount = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, never>) => d)
  .handler(async () => {
    if (!isDevEnvironment()) {
      throw new Error("Only available in development");
    }
    return seedDevTestAccount();
  });

export const getDevTestCredentials = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!isDevEnvironment()) {
      throw new Error("Only available in development");
    }
    return {
      email: DEV_TEST.email,
      password: DEV_TEST.password,
      clubSlug: DEV_TEST.clubSlug,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  },
);
