// @level infrastructure
/**
 * The gestures of one browser tab, as the platform delivers them: whatever is
 * under the point or holds the focus when one lands takes it, which a
 * script's `.click()` on a chosen element cannot show (#86).
 *
 * Each brings its tab to the front and returns once the page has reported it,
 * the tab stands on another document, or the page has opened a tab: a case
 * reads after a gesture what the page made of it, and Chrome reports a
 * document's first input only once its frame is presented (#269), which a page
 * that opens a tab may never do (#453).
 */

/** The expression that scrolls the element `selector` finds into view and gives its centre in the viewport as JSON, or "null" when none. */
const centreScrolledIntoView = (selector) => `JSON.stringify((() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return null;
  el.scrollIntoView({ block: "center" });
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
})())`;

export class TabGestures {
  #sendToTab;
  #waits;
  #front;
  #watchForTabOpened;

  /**
   * `waits` is the same tab's `TabWaits`; `front` makes the same tab the one the
   * browser shows, and the walk's tab on screen; `watchForTabOpened` starts a
   * watch and returns whether its page has opened a tab since.
   */
  constructor(sendToTab, { waits, front, watchForTabOpened }) {
    this.#sendToTab = sendToTab;
    this.#waits = waits;
    this.#front = front;
    this.#watchForTabOpened = watchForTabOpened;
  }

  /** A mouse click at a point of the viewport. */
  clickAt = (x, y) => this.#sendFrontAndWaitUntilReportedOrLeftOrTabOpened(async () => {
    for (const type of ["mousePressed", "mouseReleased"])
      await this.#sendToTab("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  });

  /** Enter pressed and released, as a keyboard does: on a focused button it is a click (#86). */
  pressEnter = () => this.#sendFrontAndWaitUntilReportedOrLeftOrTabOpened(async () => {
    const enter = { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 };
    await this.#sendToTab("Input.dispatchKeyEvent", { type: "keyDown", text: "\r", ...enter });
    await this.#sendToTab("Input.dispatchKeyEvent", { type: "keyUp", ...enter });
  });

  /** A real tap at the centre of the element `selector` finds, scrolled into
   * view first: the platform's own input, which CLS does not count a shift after. */
  tapOn = async (selector) => {
    const { result } = await this.#sendToTab("Runtime.evaluate", { expression: centreScrolledIntoView(selector), returnByValue: true });
    const centre = JSON.parse(result.value);
    if (!centre) throw new Error(`nothing on the page matches ${selector}`);
    await this.clickAt(centre.x, centre.y);
  };

  /**
   * Reads the document the gesture leaves, sends the gesture with `send`, brings
   * this tab to the front as the walk's tab on screen, and waits until that
   * document has reported its first input, or the tab stands on another (the
   * gesture loaded one), or the page has opened a tab since.
   *
   * A gesture that opens a new tab can hide this page before it presents its
   * next frame, and Chrome then never records that first input, even once the
   * page is in front again (#453).
   */
  async #sendFrontAndWaitUntilReportedOrLeftOrTabOpened(send) {
    const left = await this.#waits.readDocumentShown();
    const hasOpenedATab = this.#watchForTabOpened();
    await send();
    await this.#front();
    await this.#waits.waitUntilFirstInputReportedOrLeftOrTabOpened(left, hasOpenedATab);
  }
}
