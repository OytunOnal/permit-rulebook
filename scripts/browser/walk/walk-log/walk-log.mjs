// @level infrastructure
/**
 * The two messages a local run always logs about the traffic counter, and
 * nothing else. Both name the beacon endpoint AND the reason, so a different
 * failure about the same host is not swallowed with them.
 */
const LOCAL_BEACON_NOISE = [
  /blocked by CORS policy[\s\S]*cloudflareinsights\.com|cloudflareinsights\.com[\s\S]*blocked by CORS policy/,
  /Failed to load resource: net::ERR_FAILED \(https:\/\/cloudflareinsights\.com\//,
];

/**
 * Whether `error` is one of the two messages a local run always logs about
 * the traffic counter, which the walk's log leaves out.
 *
 * Cloudflare's beacon endpoint answers `Access-Control-Allow-Origin:
 * http://127.0.0.1`, without the port a local static server has to use, so
 * every local run logs a preflight refusal and the load failure that
 * follows it — for a request that is fine in production (2026-09-08).
 * Exactly those two messages are dropped, not every line that mentions the
 * host: a script error thrown BY the beacon, or any other complaint naming
 * it, still fails the run (Spec review, 2026-09-08).
 *
 * The counter is not silenced either. `tests/record.test.ts` asserts the
 * script was fetched and a report was actually sent, so a page that stopped
 * counting fails there.
 */
const isLocalBeaconNoise = (error) => LOCAL_BEACON_NOISE.some((rule) => rule.test(error));

/**
 * @typedef {object} WalkError
 * @property {string} address The address of the page that threw or logged it.
 * @property {string} message What it threw or logged.
 */

/** How many errors a walk keeps: a page throwing in a loop would otherwise fill a failure with thousands of lines. */
export const ERRORS_KEPT = 100;

/**
 * What one browser keeps across a whole walk, every tab and navigation of it:
 * the walk's one list of errors, each with the address of the page it came
 * from, up to `ERRORS_KEPT` and a count of the rest; and the tab on screen.
 */
export class WalkLog {
  /** @type {WalkError[]} */
  #errors = [];
  #errorsLeftOut = 0;
  #tabOnScreen = null;

  /**
   * Keeps `message`, thrown or logged by the page at `address`, while fewer
   * than `ERRORS_KEPT` are kept, and counts it otherwise; the traffic
   * counter's two local-only messages are neither (`isLocalBeaconNoise`).
   */
  recordError = (address, message) => {
    if (isLocalBeaconNoise(message)) return;
    if (this.#errors.length < ERRORS_KEPT) this.#errors.push({ address, message });
    else this.#errorsLeftOut += 1;
  };

  /** The errors of the walk it kept, in the order they came. */
  errors = () => this.#errors.map((e) => ({ ...e }));

  /** How many errors came after the walk had kept `ERRORS_KEPT`. */
  errorsLeftOut = () => this.#errorsLeftOut;

  /** Keeps `tab` as the one the browser shows. */
  showTab = (tab) => { this.#tabOnScreen = tab; };

  /** The tab the browser shows: the first one, until another is brought to the front. */
  tabOnScreen = () => {
    if (this.#tabOnScreen === null) throw new Error("the walk has no tab on screen: no tab was opened");
    return this.#tabOnScreen;
  };
}
