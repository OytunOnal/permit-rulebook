import { expect } from "vitest";

/**
 * What a page sent, read off the wire — and the one assertion the promise
 * "answers never leave the device" is made of.
 *
 * It lived inside `record.test.ts`, whose walk clicks the first option at
 * every question and so never takes the four-country path through question 3
 * (`all` → a situation → a country). s26 walks that path with the network
 * watched, and the check it makes has to be this one — reused, not re-typed,
 * or the two drift the first time a field is added to the allow-list
 * (Security review of s26, 2026-09-17).
 */
export interface Sent { url: string; method: string; postData: string; hasPostData: boolean }

/** The two addresses outside this site that a page may talk to, and no others. */
export const BEACON_SCRIPT = "https://static.cloudflareinsights.com/beacon.min.js";
export const BEACON_ENDPOINT = "https://cloudflareinsights.com/cdn-cgi/rum";

/**
 * Every field the counter's report is allowed to carry, measured off the wire
 * on 2026-09-08. It is an allow-list on purpose: a field Cloudflare adds later
 * fails here, and a person decides whether it may be sent (Security review).
 *
 * What each is: when the page loaded and an id for that load (`startTime`,
 * `pageloadId`, `st`, `eventType`, `nt`), the address (`location`), the
 * beacon's own version (`versions`), the browser engine and its version plus
 * the OS version (`bi`), the site's public id (`siteToken`), paint and
 * navigation timings (`firstPaint`, `firstContentfulPaint`, `timingsV2`) and
 * the tab's JS heap figures (`memory`). None of it is an answer.
 */
export const BEACON_FIELDS = [
  "startTime", "pageloadId", "eventType", "nt", "location", "versions", "bi",
  "siteToken", "st", "memory", "firstPaint", "firstContentfulPaint", "timingsV2",
];

/** A value as a token of its own: "de" is inside the word "index", and a
 * hashed asset name is not a leak. */
const token = (value: string) =>
  new RegExp(`(^|[^a-z0-9])${value.toLowerCase().replace(/[^a-z0-9]/g, "[^a-z0-9]")}([^a-z0-9]|$)`);

/**
 * Every request is the counter's, on its own terms, or a same-origin GET with
 * no body, no query string and no declared answer in it.
 *
 * `declared` is every answer on the record; `routes` every route the verdict
 * named — which of them fit is the reader's business, so none may reach the
 * counter either. `where` names the walk in the failure.
 */
export function expectNothingLeft(
  sent: Sent[], { origin, where, declared, routes }: { origin: string; where: string; declared: string[]; routes: string[] },
): void {
  for (const request of sent) {
    // The counter, and only the counter.
    if (request.url.startsWith(BEACON_SCRIPT)) {
      expect(request.method, `${where}: the beacon script was fetched with ${request.method}`).toBe("GET");
      expect(request.url, `${where}: a query string on the beacon script`).toBe(BEACON_SCRIPT);
      expect(request.hasPostData, `${where}: a body was sent to the beacon script`).toBe(false);
      continue;
    }
    if (request.url.startsWith(BEACON_ENDPOINT)) {
      // The preflight and the report itself, and nothing smuggled into
      // the address.
      expect(["POST", "OPTIONS"], `${where}: ${request.method} to the beacon`).toContain(request.method);
      expect(request.url, `${where}: a query string on the beacon`).toBe(BEACON_ENDPOINT);
      if (request.method === "OPTIONS") continue;
      // What it actually sends, read off the wire.
      const raw = String(request.postData ?? "");
      expect(raw, `${where}: a report with no body`).not.toBe("");
      // Only the page's own origin and path are masked. The query string
      // is NOT: a route id there is the page's own address and allowed,
      // an answer there would be a leak (Security review, 2026-09-08).
      const body = raw.replace(/"location":"([^"?]*)([^"]*)"/g, (_m, _p, query) => `"location":"${query}"`);
      for (const answer of declared)
        expect(token(answer).test(body.toLowerCase()), `${where}: ${answer} reached the beacon`).toBe(false);
      for (const route of routes)
        expect(body.toLowerCase().includes(route.toLowerCase()), `${where}: ${route} reached the beacon`)
          .toBe(false);
      // And every field it carries is one a person has looked at.
      const fields = Object.keys(JSON.parse(raw) as Record<string, unknown>);
      for (const field of fields)
        expect(BEACON_FIELDS, `${where}: the counter sent a field nobody has reviewed: ${field}`)
          .toContain(field);
      continue;
    }
    // Same origin: no third-party host, ever.
    expect(request.url.startsWith(origin), `${where}: a request left this origin — ${request.url}`).toBe(true);
    // GET only: nothing is submitted anywhere.
    expect(request.method, `${where}: ${request.method} ${request.url}`).toBe("GET");
    expect(request.hasPostData, `${where}: a body was sent to ${request.url}`).toBe(false);
    expect(request.postData, `${where}: a body was sent to ${request.url}`).toBe("");
    // No query string: an answer smuggled into one is still an answer
    // leaving the device.
    expect(request.url.includes("?"), `${where}: a query string on ${request.url}`).toBe(false);
    // And nothing the reader declared appears in the URL as a value of
    // its own.
    for (const answer of declared)
      expect(token(answer).test(request.url.toLowerCase()), `${where}: ${answer} reached ${request.url}`).toBe(false);
  }
}
