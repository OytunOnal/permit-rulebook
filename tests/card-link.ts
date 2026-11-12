/**
 * A card's link out — its foot link, or a Learn link in its "find out
 * yourself" box — as it lays out on the running page: the read the reader-pages
 * walk runs in the page on every such link, and the two judgements made of it.
 * The ↗ after the label is the link's ::after, generated content no DOM read
 * reaches; the read measures it through an anchor laid on it.
 */

/** A card's link out as it lays out: its card's heading, its label, how many
 * lines its text takes, its box's width, its text's width, the width of a lone
 * ↗ in its font, whether the link held on one line fits the box it sits in,
 * and where its ↗ lays out from the end of its text's last line
 * (right of it, and down from that line's top), or null where its ↗ lays out
 * nowhere. */
export interface CardLink {
  card: string;
  label: string;
  lines: number;
  width: number;
  textWidth: number;
  loneArrowWidth: number;
  fitsItsLine: boolean;
  arrowFromLastWord: { right: number; down: number } | null;
}

/** Reads, in the page, the width of a text set on one line in a link's font
 * and letter spacing, laid out apart from any link. */
const DETACHED_WIDTH = `((link, text) => {
  const style = getComputedStyle(link);
  const probe = document.createElement("span");
  probe.textContent = text;
  probe.style.cssText = "position:absolute;white-space:nowrap";
  probe.style.font = style.font;
  probe.style.letterSpacing = style.letterSpacing;
  document.body.append(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
})`;

/** Reads, in the page, the width a link has to lay out in: the content width
 * of the box it sits in, to the fraction of a pixel layout works in
 * (clientWidth rounds it to a whole pixel). */
const ROOM = `((link) => {
  const box = link.parentElement;
  const style = getComputedStyle(box);
  const edges = ["borderLeftWidth", "borderRightWidth", "paddingLeft", "paddingRight"]
    .reduce((sum, edge) => sum + parseFloat(style[edge]), 0);
  return box.getBoundingClientRect().width - edges;
})`;

/** Reads, in the page, the width a link lays out at on one line: the link
 * itself, its label and its ↗ as the stylesheet draws them, held on one line
 * for the read, then given its own style attribute back. */
const ONE_LINE_WIDTH = `((link) => {
  const own = link.getAttribute("style");
  link.style.whiteSpace = "nowrap";
  const width = link.getBoundingClientRect().width;
  if (own === null) link.removeAttribute("style"); else link.setAttribute("style", own);
  return width;
})`;

/** Less than one layout unit (1/64 px): what a width read back as a float may
 * be off by. */
const LAYOUT_ROUNDING_PX = 0.01;

/** Reads, in the page, the box a link's ↗ lays out in, or null: the read names
 * the link's ::after an anchor, lays an empty box over it by anchor
 * positioning, measures that box, and takes both away. */
const ARROW_BOX = `((link) => {
  const style = document.createElement("style");
  style.textContent = ".reading-arrow::after{anchor-name:--reading-arrow}"
    + ".arrow-probe{position:absolute;position-anchor:--reading-arrow;top:anchor(top);left:anchor(left);"
    + "width:anchor-size(width);height:anchor-size(height)}";
  const probe = document.createElement("div");
  probe.className = "arrow-probe";
  document.head.append(style);
  document.body.append(probe);
  link.classList.add("reading-arrow");
  const box = probe.getBoundingClientRect();
  link.classList.remove("reading-arrow");
  probe.remove();
  style.remove();
  return box.width === 0 && box.height === 0 ? null : box;
})`;

/** Reads, in the page, a link it is handed as a CardLink: a function
 * expression, for the walk's own read to call on each link. */
export const CARD_LINK = `((link) => {
  const text = document.createRange();
  text.selectNodeContents(link);
  const lines = [...text.getClientRects()];
  const last = lines[lines.length - 1];
  const arrow = ${ARROW_BOX}(link);
  const heading = link.closest("article")?.querySelector("h3");
  return {
    card: heading ? heading.textContent.trim() : "",
    label: link.textContent.trim(),
    lines: new Set(lines.map((r) => Math.round(r.top))).size,
    width: link.getBoundingClientRect().width,
    textWidth: text.getBoundingClientRect().width,
    loneArrowWidth: ${DETACHED_WIDTH}(link, "\\u2197"),
    fitsItsLine: ${ONE_LINE_WIDTH}(link) <= ${ROOM}(link) + ${LAYOUT_ROUNDING_PX},
    arrowFromLastWord: arrow && last ? { right: arrow.left - last.right, down: arrow.top - last.top } : null,
  };
})`;

/** Whether a link's ↗ lays out on its last word's line, right after that
 * word: within a pixel of the end of its text's last line, each way. */
export const isArrowOnLastWordLine = ({ arrowFromLastWord: arrow }: CardLink): boolean =>
  arrow !== null && Math.abs(arrow.right) < 1 && Math.abs(arrow.down) < 1;

/** Whether a one-line link's box is its text's width and a lone ↗'s, with no
 * space between them, within half a pixel. */
export const isAsWideAsTextAndArrow = (link: CardLink): boolean =>
  Math.abs(link.width - (link.textWidth + link.loneArrowWidth)) < 0.5;
