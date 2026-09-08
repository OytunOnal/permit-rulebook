/**
 * The path the site is served under, for anything that drives it.
 *
 * The build reads it from SITE_URL (see `astro.config.mjs`); so must the
 * harness, or it drives a site that is not there. On 2026-09-08 CI built under
 * `https://oytunonal.github.io/permit-rulebook/` and every browser check failed
 * at once: the static server mounted `dist/` at the root, so every stylesheet
 * and script 404'd and the pages measured as unstyled; and `astro dev`, which
 * serves only under its base, answered 404 at `/`, so the readiness probe never
 * saw it come up and timed out after ninety seconds.
 *
 * Returns "" at a domain root and "/permit-rulebook" under a subpath — no
 * trailing slash, so `${base}${path}` is always right.
 */
export function siteBase(siteUrl = process.env.SITE_URL) {
  if (!siteUrl) return "";
  try {
    return new URL(siteUrl).pathname.replace(/[/]+$/, "");
  } catch {
    return "";
  }
}

/** A full URL for a site path, under whatever base is in force. */
export function at(origin, base, path) {
  return `${origin}${base}${path.startsWith("/") ? path : `/${path}`}`;
}
