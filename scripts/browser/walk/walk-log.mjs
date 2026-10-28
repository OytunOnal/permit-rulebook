// @level infrastructure
import { isLocalBeaconNoise } from "../tab/tab-events.mjs";

/**
 * @typedef {object} WalkError
 * @property {string} address The address of the page that threw or logged it.
 * @property {string} message What it threw or logged.
 */

/**
 * What one browser keeps across a whole walk, every tab and navigation of it:
 * each error with the address of the page it came from, which a tab's own
 * `problems()` forgets at its next navigation, and the tab on screen.
 */
export class WalkLog {
  /** @type {WalkError[]} */
  #errors = [];
  #tabOnScreen = null;

  /** Keeps `message`, thrown or logged by the page at `address`. */
  recordError = (address, message) => { this.#errors.push({ address, message }); };

  /** Every error of the walk in the order it came, the traffic counter's two local-only messages aside (`TabEvents`). */
  errors = () => this.#errors.filter((e) => !isLocalBeaconNoise(e.message)).map((e) => ({ ...e }));

  /** Keeps `tab` as the one the browser shows. */
  showTab = (tab) => { this.#tabOnScreen = tab; };

  /** The tab the browser shows: the first one, until another is brought to the front. */
  tabOnScreen = () => {
    if (this.#tabOnScreen === null) throw new Error("the walk has no tab on screen: no tab was opened");
    return this.#tabOnScreen;
  };
}
