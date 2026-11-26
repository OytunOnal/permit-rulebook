import { DETACHED_WIDTH, ONE_LINE_WIDTH } from "./card-link.js";
import type { TextBox } from "./screenshot-ink.js";

/**
 * A link's address as paper prints it: the link's ::after under print media,
 * after its words. It is generated content no DOM read reaches, so the read
 * measures the room it takes past the words, and hands back the box its first
 * characters print in, for a screenshot's ink there.
 */

/** How many characters of the printed address the ink is read over: its
 * space, its bracket and "https:", enough glyphs to hold solid ink. */
const ADDRESS_START_LENGTH = 8;

/** A link as paper prints it: the width past its words, the link held on one
 * line; the width its address takes laid out alone in its ::after's font,
 * written as paper writes it, " (" address ")"; and the box just past its
 * words' last line where that address's first characters print. */
export interface PrintedLink {
  widthPastWords: number;
  addressWidth: number;
  addressStart: TextBox;
}

/** The reads `readPrintedLinkInPage` is handed in the page. */
interface PrintedLinkReaders {
  readOneLineWidth: (link: Element) => number;
  readDetachedWidth: (link: Element, text: string, pseudo?: string) => number;
  addressStartLength: number;
}

/** In the page: the first link `selector` finds as a PrintedLink, or null where it finds none. */
function readPrintedLinkInPage(selector: string, { readOneLineWidth, readDetachedWidth, addressStartLength }: PrintedLinkReaders): PrintedLink | null {
  const link = document.querySelector(selector);
  if (!link) return null;
  const printed = " (" + link.getAttribute("href") + ")";
  const words = document.createRange();
  words.selectNodeContents(link);
  const lines = [...words.getClientRects()];
  const last = lines[lines.length - 1]!;
  return {
    widthPastWords: readOneLineWidth(link) - readDetachedWidth(link, link.textContent!),
    addressWidth: readDetachedWidth(link, printed, "::after"),
    addressStart: {
      left: last.right, top: last.top, height: last.height,
      width: readDetachedWidth(link, printed.slice(0, addressStartLength), "::after"),
    },
  };
}

/** The script that reads, in the page, the first link `selector` finds as a
 * PrintedLink, or null where it finds none. */
export const printedLinkScript = (selector: string): string => `JSON.stringify((${readPrintedLinkInPage})(${JSON.stringify(selector)}, {
  readOneLineWidth: ${ONE_LINE_WIDTH}, readDetachedWidth: ${DETACHED_WIDTH}, addressStartLength: ${ADDRESS_START_LENGTH} }))`;
