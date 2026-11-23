// @level infrastructure
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** @typedef {import("../../tab/open-tab.mjs").AnsweredRequests} AnsweredRequests */

/** The counter's script, as every page loads it: `TRAFFIC_COUNTER_SCRIPT` in `src/lib/site.ts`, which a script cannot import; a test holds the two equal. */
export const TRAFFIC_COUNTER_SCRIPT = "https://static.cloudflareinsights.com/beacon.min.js";

/** Where the counter sends its reports: `TRAFFIC_COUNTER_REPORTS` in `src/lib/site.ts`; a test holds the two equal. */
export const TRAFFIC_COUNTER_REPORTS = "https://cloudflareinsights.com/cdn-cgi/rum";

/** The committed copy of Cloudflare's script; `README.md` beside it says where it came from and when. */
export const TRAFFIC_COUNTER_COPY = fileURLToPath(new URL("../../../../tests/traffic-counter/beacon.min.js", import.meta.url));

/**
 * What answers the counter's script, by the value of a walk's
 * `trafficCounter` (`Walk` in `walk-site.mjs` explains the option).
 */
const SCRIPT_FOR = {
  stub: () => Buffer.alloc(0),
  "cloudflare's copy": () => readFileSync(TRAFFIC_COUNTER_COPY),
};

/** @typedef {keyof typeof SCRIPT_FOR} TrafficCounter */

/** The counter's script answered with `script`; any origin may run it, as Cloudflare's own answer allows. */
const answerWithScript = (script) => ({
  status: 200,
  headers: [["Content-Type", "text/javascript"], ["Access-Control-Allow-Origin", "*"]],
  body: script,
});

/**
 * A report, or its preflight, answered with nothing, allowed for the page
 * that sent it: Cloudflare's own answer names the origin without its port,
 * which a page served on a local port is refused by. A report with no origin
 * to allow stops, naming it: an answer allowing any origin cannot carry
 * credentials.
 */
function answerTheReport({ url, method, headers }) {
  const origin = headers.Origin ?? headers.origin;
  if (!origin) throw new Error(`the traffic counter's ${method} ${url} names no Origin to allow`);
  return {
    status: 204,
    headers: [
      ["Access-Control-Allow-Origin", origin],
      ["Access-Control-Allow-Credentials", "true"],
      ["Access-Control-Allow-Headers", "content-type"],
      ["Access-Control-Allow-Methods", "POST, OPTIONS"],
    ],
    body: Buffer.alloc(0),
  };
}

/**
 * The answers a walk gives the traffic counter, so no walk loads it from
 * Cloudflare: its script as `trafficCounter` asks, read from disk for
 * Cloudflare's copy, and its reports with an empty reply. Any other request
 * gets none. A `trafficCounter` that is not one of the option's values
 * throws, naming it.
 *
 * @param {TrafficCounter} [trafficCounter]
 * @returns {Pick<AnsweredRequests, "responseTo">}
 */
export function readTrafficCounterAnswers(trafficCounter = "stub") {
  if (!Object.hasOwn(SCRIPT_FOR, trafficCounter)) {
    const values = Object.keys(SCRIPT_FOR).map((value) => JSON.stringify(value)).join(" or ");
    throw new Error(`a walk's trafficCounter is ${values}, not ${JSON.stringify(trafficCounter)}`);
  }
  const script = SCRIPT_FOR[trafficCounter]();
  return {
    responseTo: (request) => {
      if (request.url.startsWith(TRAFFIC_COUNTER_SCRIPT)) return answerWithScript(script);
      if (request.url.startsWith(TRAFFIC_COUNTER_REPORTS)) return answerTheReport(request);
      return null;
    },
  };
}
