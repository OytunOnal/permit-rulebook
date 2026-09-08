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
  /**
   * A page's address ends in a slash. GitHub Pages serves `/germany/index.html`
   * at `/germany/` and 301s `/germany` to it, so every sitemap entry was a
   * redirect while the canonical pointed at the slash-less form (2026-09-08).
   * `directory` output plus `always` makes the emitted link, the canonical, the
   * sitemap and the served path one string. Chosen over `build.format: "file"`
   * because that would rename every page to `germany.html` and change 29 public
   * addresses to fix a redirect.
   */
  trailingSlash: "always",
  vite: {
    ssr: {
      // Bundle permit-rulebook-data so its JSON imports (dataset, schema) go
      // Vite's pipeline during the static build.
      noExternal: ["permit-rulebook-data"],
    },
  },
});
