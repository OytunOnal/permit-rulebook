import { defineConfig } from "astro/config";

/**
 * `site` is the one place the build learns where it will live. Every absolute
 * URL a link preview reads — the canonical, the OG url, the social card —
 * follows it, and a deploy under another name sets SITE_URL rather than editing
 * twelve templates. The default is the domain the identity mock shows in its
 * preview; GitHub Pages under a different name is a `SITE_URL=` away.
 */
export default defineConfig({
  site: process.env.SITE_URL || "https://permitrulebook.com",
  vite: {
    ssr: {
      // Bundle permit-rulebook-data so its JSON imports (dataset, schema) go
      // Vite's pipeline during the static build.
      noExternal: ["permit-rulebook-data"],
    },
  },
});
