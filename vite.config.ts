import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
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
    nitro({ preset: "vercel" }),
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
  ],
});
