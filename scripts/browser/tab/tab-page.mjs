// @level infrastructure
/**
 * The page object a walk is handed for one tab: its waits, gestures and
 * events, and the commands that read or drive the page. Every member is its
 * own function, so a caller may take one off the page and call it alone.
 */
export class TabPage {
  #sendToTab;
  #waits;
  #gestures;
  #events;
  #openTab;

  /** `parts`: the tab's `TabWaits`, `TabGestures` and `TabEvents`, and what opens another tab in its browser. */
  constructor(sendToTab, parts) {
    this.#sendToTab = sendToTab;
    this.#waits = parts.waits;
    this.#gestures = parts.gestures;
    this.#events = parts.events;
    this.#openTab = parts.openTab;
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
