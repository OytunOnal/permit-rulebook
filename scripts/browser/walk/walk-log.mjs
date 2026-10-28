// @level infrastructure
import { isLocalBeaconNoise } from "../tab/tab-events.mjs";

/**
 * @typedef {object} WalkError
 * @property {string} address The address of the page that threw or logged it.
 * @property {string} message What it threw or logged.
 */

/** How many errors a walk keeps: a page throwing in a loop would otherwise fill a failure with thousands of lines. */
const ERRORS_KEPT = 100;

/**
 * What one browser keeps across a whole walk, every tab and navigation of it:
 * each error with the address of the page it came from, which a tab's own
 * `problems()` forgets at its next navigation, up to `ERRORS_KEPT` and a count
 * of the rest; and the tab on screen.
 */
export class WalkLog {
  /** @type {WalkError[]} */
  #errors = [];
  #errorsLeftOut = 0;
  #tabOnScreen = null;

  /**
   * Keeps `message`, thrown or logged by the page at `address`, while fewer
   * than `ERRORS_KEPT` are kept, and counts it otherwise; the traffic
   * counter's two local-only messages are neither (`TabEvents`).
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
