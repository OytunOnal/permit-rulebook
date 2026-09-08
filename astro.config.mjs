import { defineConfig } from "astro/config";

/**
 * `site` is the one place the build learns where it will live. Every absolute
 * URL a link preview reads — the canonical, the OG url, the social card —
 * follows it, and a deploy under another name sets SITE_URL rather than editing
 * twelve templates. The default is the domain the identity mock shows in its
 * preview; GitHub Pages under a different name is a `SITE_URL=` away.
 */
const SITE_URL = process.env.SITE_URL || "https://permitrulebook.com";

/**
 * Where the site sits under that origin. GitHub Pages serves a project
 * repository at a subpath — `https://oytunonal.github.io/permit-rulebook/` —
 * and every root-absolute link the site emits would land outside it. The base
 * is read off SITE_URL rather than configured twice, so one variable moves the
 * whole site (2026-09-08).
 */
const BASE = new URL(SITE_URL).pathname;

export default defineConfig({
  site: SITE_URL,
  base: BASE,
  vite: {
    ssr: {
      // Bundle permit-rulebook-data so its JSON imports (dataset, schema) go
      // Vite's pipeline during the static build.
      noExternal: ["permit-rulebook-data"],
    },
  },
});
