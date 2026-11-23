// @level infrastructure
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** @typedef {import("../../tab/open-tab.mjs").AnsweredRequests} AnsweredRequests */

/** The counter's script, as every page loads it: `ANALYTICS_SCRIPT` in `src/lib/site.ts`, which a script cannot import. */
export const TRAFFIC_COUNTER_SCRIPT = "https://static.cloudflareinsights.com/beacon.min.js";

/** Where the counter sends its reports: `ANALYTICS_BEACON` in `src/lib/site.ts`. */
const TRAFFIC_COUNTER_REPORTS = "https://cloudflareinsights.com/cdn-cgi/rum";

/** The committed copy of Cloudflare's script; `README.md` beside it says where it came from and when. */
export const TRAFFIC_COUNTER_COPY = fileURLToPath(new URL("../../../../tests/traffic-counter/beacon.min.js", import.meta.url));

/** What a walk's `trafficCounter` may ask for: an empty script, or the copy of Cloudflare's. */
const TRAFFIC_COUNTERS = ["stub", "cloudflare's copy"];

/** The counter's script answered with `script`; any origin may run it, as Cloudflare's own answer allows. */
const scriptResponse = (script) => ({
  status: 200,
  headers: [["Content-Type", "text/javascript"], ["Access-Control-Allow-Origin", "*"]],
  body: script,
});

/**
 * A report, or its preflight, answered with nothing, allowed for the page
 * that sent it: Cloudflare's own answer names the origin without its port,
 * which a page served on a local port is refused by.
 */
const reportResponse = ({ headers }) => ({
  status: 204,
  headers: [
    ["Access-Control-Allow-Origin", headers.Origin ?? headers.origin ?? "*"],
    ["Access-Control-Allow-Credentials", "true"],
    ["Access-Control-Allow-Headers", "content-type"],
    ["Access-Control-Allow-Methods", "POST, OPTIONS"],
  ],
  body: Buffer.alloc(0),
});

/**
 * The requests a walk answers for the traffic counter, so no walk loads it
 * from Cloudflare: its script, with an empty one for `"stub"` and the
 * committed copy of Cloudflare's for `"cloudflare's copy"`; and its reports
 * with an empty reply. Anything else as `trafficCounter` throws, naming it.
 *
 * @param {"stub" | "cloudflare's copy"} trafficCounter
 * @returns {AnsweredRequests}
 */
export function answersForTheTrafficCounter(trafficCounter) {
  if (!TRAFFIC_COUNTERS.includes(trafficCounter))
    throw new Error(`a walk's trafficCounter is "stub" or "cloudflare's copy", not ${JSON.stringify(trafficCounter)}`);
  const script = trafficCounter === "stub" ? Buffer.alloc(0) : readFileSync(TRAFFIC_COUNTER_COPY);
  return {
    urlPatterns: [`${TRAFFIC_COUNTER_SCRIPT}*`, `${TRAFFIC_COUNTER_REPORTS}*`],
    responseTo: (request) => (request.url.startsWith(TRAFFIC_COUNTER_SCRIPT) ? scriptResponse(script) : reportResponse(request)),
  };
}
