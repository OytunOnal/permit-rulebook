import { createHash } from "node:crypto";
import { escAttr } from "./reason.js";
import { ANALYTICS_BEACON, ANALYTICS_SCRIPT } from "./site.js";

/**
 * The content-security policy every page carries, as a meta element.
 *
 * The traffic counter is the first third-party script this site has ever run
 * (2026-09-08), and a page with no policy would let any injected script talk to
 * anywhere. This names the two hosts the product actually uses and hashes the
 * one script that is written inline, so nothing else executes.
 *
 * A meta policy cannot express `frame-ancestors` or `report-uri` — those need a
 * response header, and GitHub Pages sets none on a custom domain. What it CAN
 * express is the part that matters here: where script comes from, and where the
 * page may connect to.
 *
 * `style-src` keeps `'unsafe-inline'`: the pages inline their whole stylesheet
 * and Astro inlines its own, and hashing a stylesheet that changes with every
 * design edit buys nothing against a script-injection risk. Said out loud
 * rather than left as a gap.
 *
 * Server-side only \u2014 it hashes with `node:crypto`, and nothing in the browser
 * bundle may import it.
 */
export const sha256 = (source: string): string =>
  `'sha256-${createHash("sha256").update(source, "utf8").digest("base64")}'`;

export function contentSecurityPolicy(inlineScripts: string[] = []): string {
  // `astro dev` injects inline scripts of its own (hot reload, the toolbar),
  // which this policy blocks — and hashing a dev server's changing script would
  // be hashing nothing. The policy ships with the BUILD, and the built site is
  // where it is proven: `npm run smoke` and the CSP cases both walk `dist`
  // (2026-09-08).
  if (import.meta.env?.DEV) return "";
  const scripts = ["'self'", ANALYTICS_SCRIPT, ...inlineScripts.map(sha256)];
  const policy = [
    "default-src 'self'",
    `script-src ${scripts.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${new URL(ANALYTICS_BEACON).origin}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    // Nothing on this site submits anything anywhere.
    "form-action 'none'",
  ].join("; ");
  return `<meta http-equiv="Content-Security-Policy" content="${escAttr(policy)}">`;
}
