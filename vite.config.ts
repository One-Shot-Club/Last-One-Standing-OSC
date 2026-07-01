import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => ({
  server: {
    port: 3000,
  },
  plugins: [
    // tanstackStart MUST come before viteReact
    tanstackStart({
      server: { entry: "server" },
      // .functions.ts files use createServerFn, which code-splits server handlers
      // away from the client bundle automatically. Excluding them from client-side
      // import-protection avoids false positives on top-level .server.* imports
      // that live inside handler bodies and never reach the client.
      importProtection: {
        ignoreImporters: ["**/*.functions.ts"],
      },
    }),
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
    // The Vercel preset switches dev to vercel-dev emulation (needs Vercel OIDC tokens).
    // Keep Nitro for production builds only; TanStack Start handles local dev SSR.
    ...(command === "build" ? [nitro({ preset: "vercel" })] : []),
  ],
}));
