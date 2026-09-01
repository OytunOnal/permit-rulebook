import { defineConfig } from "astro/config";

export default defineConfig({
  vite: {
    ssr: {
      // Bundle visa-rules so its JSON imports (dataset, schema) go through
      // Vite's pipeline during the static build.
      noExternal: ["visa-rules"],
    },
  },
});
