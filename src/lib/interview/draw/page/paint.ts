// @level presentation
/**
 * The painting primitives: a box is written only where its markup differs,
 * and a screen's listeners are hung once on the nodes that carry them.
 */

/**
 * Empty copies of the boxes, to parse a candidate in. What a fragment
 * serialises to depends on what it was parsed inside — the ledger's rows are
 * parsed inside a `<dl>` — and both sides then read as the browser writes
 * them: our escaping and Chrome's do not spell `'` the same way.
 */
const spares = new Map<Element, Element>();

/**
 * Writes markup into a box, unless it is already there, and says whether it
 * wrote. The build paints the first question through the same renderer, so
 * on a fresh visit every string is the one already on the page, and writing
 * it anyway would replace live nodes with identical ones (s10).
 */
export function draw(el: Element, html: string): boolean {
  let spare = spares.get(el);
  if (!spare) spares.set(el, spare = el.cloneNode(false) as Element);
  spare.innerHTML = html;
  if (el.innerHTML === spare.innerHTML) return false;
  el.innerHTML = html;
  return true;
}

/**
 * The boxes whose nodes carry this module's listeners: the ones the build
 * drew need wiring without a repaint, and a render that draws the same screen
 * again must not hang a second set. Anything that writes a painted box some
 * other way takes the box out first, with `unwire`.
 */
const wired = new Set<Element>();

/** Draws, and hangs this screen's listeners on what is now in the box. */
export function paint(el: Element, html: string, wire: () => void): void {
  if (draw(el, html)) wired.delete(el);
  if (wired.has(el)) return;
  wired.add(el);
  wire();
}

/** Forgets that a box's nodes carry listeners, before it is written some other way. */
export function unwire(el: Element): void {
  wired.delete(el);
}

/** Writes a line of text with nothing to wire, unless it is already there. */
export function say(el: Node, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

/**
 * Says something once, in the screen's own live region, after the render: a
 * region that arrives with its text already in place is not announced by
 * every screen reader.
 */
export function announce(text: string): void {
  const region = document.getElementById("cstatus");
  if (region) region.textContent = text;
}
