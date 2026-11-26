/**
 * A card's link out — its foot link, its link to its route's authority's
 * route page, or a Learn link in its "find out yourself" box — as it lays out
 * on the running page: the read the reader-pages walk runs in the page on
 * every such link, and the two judgements made of it. The ↗ after the label is
 * the link's ::after, generated content no DOM read reaches; the read measures
 * it through an anchor laid on it.
 */

/** A card's link out as it lays out: its card's heading, its label, how many
 * lines its text takes, its box's width, its text's width, the width of its
 * ::after's ↗ laid out alone in its font (with the space the ::after puts
 * before it, if any), whether the link held on one line fits the box it sits
 * in, and where its ↗ lays out from the end of its text's last line (right of
 * it, and down from that line's top), or null where its ↗ lays out nowhere. */
export interface CardLink {
  card: string;
  label: string;
  lines: number;
  width: number;
  textWidth: number;
  arrowWidth: number;
  fitsItsLine: boolean;
  arrowFromLastWord: { right: number; down: number } | null;
}

/** Reads, in the page, the width of a text set on one line in a link's font
 * and letter spacing, or in its ::after's where the third argument names that
 * ("::after"), laid out apart from any link. Its spaces are kept as written:
 * a space that opens it follows the link's words where it is drawn. */
function readDetachedWidth(link: Element, text: string, pseudo?: string): number {
  const style = getComputedStyle(link, pseudo ?? null);
  const probe = document.createElement("span");
  probe.textContent = text;
  probe.style.cssText = "position:absolute;white-space:pre";
  probe.style.font = style.font;
  probe.style.letterSpacing = style.letterSpacing;
  document.body.append(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}

/** That read as a function expression, for a probe to call on a link. */
export const DETACHED_WIDTH = `(${readDetachedWidth})`;

/** Reads, in the page, the text a link's ::after draws: its ↗, with whatever
 * the stylesheet puts before it, or "" where it draws none. */
function readArrowText(link: Element): string {
  const content = getComputedStyle(link, "::after").content;
  return content.startsWith('"') ? JSON.parse(content) as string : "";
}

/** Reads, in the page, the width a link has to lay out in: the content width
 * of the box it sits in, to the fraction of a pixel layout works in
 * (clientWidth rounds it to a whole pixel). */
function readRoom(link: Element): number {
  const box = link.parentElement!;
  const style = getComputedStyle(box);
  const edges = (["borderLeftWidth", "borderRightWidth", "paddingLeft", "paddingRight"] as const)
    .reduce((sum, edge) => sum + parseFloat(style[edge]), 0);
  return box.getBoundingClientRect().width - edges;
}

/** Reads, in the page, the width a link lays out at on one line: the link
 * itself, its label and its ↗ as the stylesheet draws them, held on one line
 * for the read, then given its own style attribute back. */
function readOneLineWidth(link: HTMLElement): number {
  const own = link.getAttribute("style");
  link.style.whiteSpace = "nowrap";
  const width = link.getBoundingClientRect().width;
  if (own === null) link.removeAttribute("style"); else link.setAttribute("style", own);
  return width;
}

/** That read as a function expression, for a probe to call on a link. */
export const ONE_LINE_WIDTH = `(${readOneLineWidth})`;

/** Less than one layout unit (1/64 px): what a width read back as a float may
 * be off by. */
const LAYOUT_ROUNDING_PX = 0.01;

/** Reads, in the page, the box a link's ↗ lays out in, or null: the read names
 * the link's ::after an anchor, lays an empty box over it by anchor
 * positioning, measures that box, and takes both away. */
function readArrowBox(link: Element): DOMRect | null {
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
}

/** The reads a card link's read calls, handed in so it closes over nothing, and what a width may be off by. */
interface CardLinkReads {
  arrowBox: typeof readArrowBox;
  detachedWidth: typeof readDetachedWidth;
  arrowText: typeof readArrowText;
  oneLineWidth: typeof readOneLineWidth;
  room: typeof readRoom;
  roundingPx: number;
}

/** Reads, in the page, `link` as a CardLink, with the reads it calls handed in. */
function readCardLink(reads: CardLinkReads, link: HTMLElement): CardLink {
  const text = document.createRange();
  text.selectNodeContents(link);
  const lines = [...text.getClientRects()];
  const last = lines[lines.length - 1];
  const arrow = reads.arrowBox(link);
  const heading = link.closest("article")?.querySelector("h3");
  return {
    card: heading ? (heading.textContent ?? "").trim() : "",
    label: (link.textContent ?? "").trim(),
    lines: new Set(lines.map((r) => Math.round(r.top))).size,
    width: link.getBoundingClientRect().width,
    textWidth: text.getBoundingClientRect().width,
    arrowWidth: reads.detachedWidth(link, reads.arrowText(link)),
    fitsItsLine: reads.oneLineWidth(link) <= reads.room(link) + reads.roundingPx,
    arrowFromLastWord: arrow && last ? { right: arrow.left - last.right, down: arrow.top - last.top } : null,
  };
}

/** Reads, in the page, a link it is handed as a CardLink: a function
 * expression, for the walk's own read to call on each link. */
export const CARD_LINK = `(${readCardLink}).bind(null, { arrowBox: ${readArrowBox}, detachedWidth: ${readDetachedWidth}, `
  + `arrowText: ${readArrowText}, oneLineWidth: ${readOneLineWidth}, room: ${readRoom}, roundingPx: ${LAYOUT_ROUNDING_PX} })`;

/** Whether a link's ↗ lays out on its last word's line, right after that
 * word: within a pixel of the end of its text's last line, each way. */
export const isArrowOnLastWordLine = ({ arrowFromLastWord: arrow }: CardLink): boolean =>
  arrow !== null && Math.abs(arrow.right) < 1 && Math.abs(arrow.down) < 1;

/** Whether a one-line link's box is its text's width and its ::after's ↗
 * laid out alone, with nothing more between them, within half a pixel. */
export const isAsWideAsTextAndArrow = (link: CardLink): boolean =>
  Math.abs(link.width - (link.textWidth + link.arrowWidth)) < 0.5;
