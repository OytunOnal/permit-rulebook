// @level infrastructure
/**
 * The gestures of one browser tab, as the platform delivers them: whatever is
 * under the point or holds the focus when one lands takes it, which a
 * script's `.click()` on a chosen element cannot show (#86).
 */
export class TabGestures {
  #sendToTab;

  constructor(sendToTab) {
    this.#sendToTab = sendToTab;
  }

  /** A mouse click at a point of the viewport. */
  clickAt = async (x, y) => {
    for (const type of ["mousePressed", "mouseReleased"])
      await this.#sendToTab("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  };

  /** Enter pressed and released, as a keyboard does: on a focused button it is a click (#86). */
  pressEnter = async () => {
    const enter = { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 };
    await this.#sendToTab("Input.dispatchKeyEvent", { type: "keyDown", text: "\r", ...enter });
    await this.#sendToTab("Input.dispatchKeyEvent", { type: "keyUp", ...enter });
  };
}
