// @level infrastructure
/**
 * The gestures of one browser tab, as the platform delivers them: whatever is
 * under the point or holds the focus when one lands takes it, which a
 * script's `.click()` on a chosen element cannot show (#86).
 *
 * Each returns once the page has reported it: a case reads after a gesture
 * what the page made of it, and Chrome reports a document's first input only
 * once its frame is presented (#269).
 */
export class TabGestures {
  #sendToTab;
  #waits;

  /** `waits` is the same tab's `TabWaits`. */
  constructor(sendToTab, waits) {
    this.#sendToTab = sendToTab;
    this.#waits = waits;
  }

  /** A mouse click at a point of the viewport. */
  clickAt = (x, y) => this.#waits.sendGestureUntilReported(async () => {
    for (const type of ["mousePressed", "mouseReleased"])
      await this.#sendToTab("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  });

  /** Enter pressed and released, as a keyboard does: on a focused button it is a click (#86). */
  pressEnter = () => this.#waits.sendGestureUntilReported(async () => {
    const enter = { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 };
    await this.#sendToTab("Input.dispatchKeyEvent", { type: "keyDown", text: "\r", ...enter });
    await this.#sendToTab("Input.dispatchKeyEvent", { type: "keyUp", ...enter });
  });
}
