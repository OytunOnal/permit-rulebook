// @level infrastructure
import { layoutShiftReadingExpression } from "../layout-shifts/layout-shift-reading.mjs";

/**
 * @typedef {object} SentRequest
 * @property {string} url
 * @property {string} method
 * @property {string} type
 * @property {string} postData
 * @property {boolean} hasPostData
 */

/**
 * The page a walk is handed: one tab of headless Chrome, attached over CDP.
 *
 * @typedef {object} BrowserPage
 * @property {(url: string) => Promise<void>} goto Navigates and returns once the new document has drawn.
 * @property {(url: string) => Promise<void>} navigate Navigates and returns at once, for a read before the page's script runs.
 * @property {(expression: string) => Promise<string>} evaluate Runs an expression in the page and returns its value.
 * @property {(condition: string, what: string) => Promise<unknown>} waitUntil Reads `condition` in the page until it holds, and returns its value.
 * @property {() => Promise<void>} waitUntilAtRest Returns once nothing animates, scrolls or loads.
 * @property {() => Promise<void>} waitUntilNewDocumentDrawn After a gesture that loads a document: once a document other than the one left has drawn.
 * @property {(features: { name: string, value: string }[]) => Promise<void>} emulateMedia Sets a media feature, such as reduced motion.
 * @property {(x: number, y: number) => Promise<void>} clickAt A click at a point, returned once the page has reported its first input or another document stands.
 * @property {(selector: string) => Promise<void>} tapOn A real tap at the centre of the element, scrolled into view first, returned as `clickAt` is.
 * @property {() => Promise<void>} pressEnter Enter pressed and released, returned as `clickAt` is.
 * @property {(text: string) => Promise<void>} type Text typed into the focused field.
 * @property {() => Promise<void>} back The browser's own Back.
 * @property {() => Promise<void>} forward The browser's own Forward.
 * @property {(options?: { fullPage?: boolean }) => Promise<Buffer>} screenshot The screen as a PNG.
 * @property {() => Promise<import("../layout-shifts/layout-shift-reading.mjs").LayoutShifts>} readLayoutShifts The page's layout shifts as the one reading reads them.
 * @property {() => string[]} problems What this tab has thrown or logged as an error since its last navigation.
 * @property {() => string[]} allProblems The same, the traffic counter's local noise included.
 * @property {() => SentRequest[]} requests Every request the page made, when the browser was asked to watch.
 * @property {() => void} forgetRequests Empties that list.
 * @property {() => Promise<BrowserPage>} openTab A second tab on the same browser: the same origin's storage, a history of its own.
 * @property {() => Promise<void>} front Brings this tab to the front.
 */

/**
 * The page object a walk is handed for one tab: its waits, gestures and
 * events, and the commands that read or drive the page. Every member is its
 * own function, so a caller may take one off the page and call it alone.
 *
 * @implements {BrowserPage}
 */
export class TabPage {
  #sendToTab;
  #waits;
  #gestures;
  #events;
  #openTab;
  #shiftRegion;

  /** `parts`: the tab's `TabWaits`, `TabGestures` and `TabEvents`, what opens another tab in its browser, and the region whose shifts are marked. */
  constructor(sendToTab, parts) {
    this.#sendToTab = sendToTab;
    this.#waits = parts.waits;
    this.#gestures = parts.gestures;
    this.#events = parts.events;
    this.#openTab = parts.openTab;
    this.#shiftRegion = parts.shiftRegion;
  }

  /**
   * A second tab in the same browser — the same profile, so the same
   * origin's storage — for what one tab does to another (s37: a record
   * grown in another tab). It is not brought to the front; `front()` does.
   * What it throws and asks for is its own: `problems()` and `requests()`
   * on each tab read that tab alone.
   */
  openTab = () => this.#openTab();

  /** Makes this tab the one the browser shows. */
  front = () => this.#sendToTab("Page.bringToFront", {});

  goto = (url) => this.#waits.goto(url);
  navigate = (url) => this.#waits.navigate(url);
  waitUntil = (condition, what) => this.#waits.waitUntil(condition, what);
  waitUntilAtRest = () => this.#waits.waitUntilAtRest();
  waitUntilNewDocumentDrawn = () => this.#waits.waitUntilNewDocumentDrawn();

  evaluate = async (expression) => {
    const { result } = await this.#sendToTab("Runtime.evaluate", { expression, returnByValue: true });
    return result.value;
  };

  /** The page's layout shifts, their sources marked in the region the tab was opened with. */
  readLayoutShifts = async () => JSON.parse(await this.evaluate(layoutShiftReadingExpression(this.#shiftRegion)));

  /**
   * A media feature the reader has set — `prefers-reduced-motion: reduce` is
   * the one asked for — as `matchMedia` and the stylesheet will read it. Set
   * before `goto`, so the page's first read already sees it; a headless
   * profile has no such preference of its own to find (s30).
   */
  emulateMedia = async (features) => {
    await this.#sendToTab("Emulation.setEmulatedMedia", { features });
  };

  clickAt = (x, y) => this.#gestures.clickAt(x, y);
  tapOn = (selector) => this.#gestures.tapOn(selector);
  pressEnter = () => this.#gestures.pressEnter();

  /** Text typed into the focused field, as a keyboard commits it: the
   * field's own `input` event fires. */
  type = async (text) => {
    await this.#sendToTab("Input.insertText", { text });
  };

  /** The browser's own Back, as its toolbar takes it: the entry before
   * the current one, and the page's `popstate` if it wrote that entry. */
  back = async () => {
    const { currentIndex, entries } = await this.#sendToTab("Page.getNavigationHistory", {});
    if (currentIndex < 1) throw new Error("the browser holds no entry behind this one");
    await this.#sendToTab("Page.navigateToHistoryEntry", { entryId: entries[currentIndex - 1].id });
  };

  /** The browser's own Forward, the mirror of `back`. */
  forward = async () => {
    const { currentIndex, entries } = await this.#sendToTab("Page.getNavigationHistory", {});
    if (currentIndex >= entries.length - 1) throw new Error("the browser holds no entry ahead of this one");
    await this.#sendToTab("Page.navigateToHistoryEntry", { entryId: entries[currentIndex + 1].id });
  };

  /** The screen as a PNG, for a record a reader can look at. */
  screenshot = async ({ fullPage = false } = {}) => {
    const { data } = await this.#sendToTab("Page.captureScreenshot", { format: "png", captureBeyondViewport: fullPage });
    return Buffer.from(data, "base64");
  };

  /** Everything the page threw or logged as an error, the traffic counter's local noise aside (`TabEvents`). */
  problems = () => this.#events.problems();
  allProblems = () => this.#events.allProblems();
  requests = () => this.#events.requests();
  forgetRequests = () => this.#events.forgetRequests();
}
