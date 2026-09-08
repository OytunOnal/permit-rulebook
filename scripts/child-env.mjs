/**
 * The environment a build or a server should run in, which is not always the
 * one we are running in.
 *
 * Under Vitest the worker exports `VITEST`, `VITEST_MODE` and friends, and Vite
 * reads them. A dev server started with them came up, said "ready", accepted
 * TCP and then reset every HTTP request; a production build started with them
 * quietly ignored `SITE_URL` and emitted a root-based site while the same
 * command from a plain shell emitted the subpath one (2026-09-08). Neither
 * child is part of the test run — one is the site, the other builds it — so
 * both get the environment the site would have.
 */
export function childEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  for (const key of Object.keys(env)) if (/^VITEST(_|$)/.test(key)) delete env[key];
  return env;
}
