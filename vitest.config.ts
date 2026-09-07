import { defineConfig } from "vitest/config";

/**
 * Vitest stubs CSS imports to empty by default, which would make the route
 * page's inlined token block empty in the suite while it is correct in the
 * build — a test that passes for the wrong reason, or fails for one. The page
 * imports `tokens.css?raw` (Standards review, 2026-09-07), so the suite has to
 * read it the same way the build does.
 */
export default defineConfig({
  test: {
    css: true,
  },
});
