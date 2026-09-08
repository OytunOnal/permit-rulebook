import { defineConfig } from "vitest/config";

/**
 * Vitest stubs CSS imports to empty by default, which would make the route
 * page's inlined token block empty in the suite while it is correct in the
 * build — a test that passes for the wrong reason, or fails for one. The page
 * imports `tokens.css?raw` and `identity.css?raw` (Standards review,
 * 2026-09-07), so the suite has to read them the same way the build does.
 *
 * The timeout is room for a slow machine, matching the data repo's. The
 * expensive tests here drive a real browser and already ask for 120 s or 180 s
 * of their own, which still overrides this; what the default protects is
 * everything else. Measured on this laptop, the slowest test that does NOT
 * drive a browser is `listbox.test.ts` — the highlight never disagrees with the
 * commit — at 1.0 s, a fifth of the 5 s Vitest allows. A two-vCPU runner is
 * several times slower than this machine: that is how `tests/verdict.test.ts`
 * in the data repo, 3.7 s here, ran out of five seconds and failed the build
 * (CI 2026-09-08). One number, both repos, so the next property test that grows
 * does not fail in CI first.
 */
export default defineConfig({
  test: {
    css: true,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
