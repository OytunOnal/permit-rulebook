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

/** The script that reads, in the page, the first link `selector` finds as a
 * PrintedLink, or null where it finds none. */
export const printedLinkScript = (selector: string): string => `JSON.stringify((() => {
  const link = document.querySelector(${JSON.stringify(selector)});
  if (!link) return null;
  const printed = " (" + link.getAttribute("href") + ")";
  const words = document.createRange();
  words.selectNodeContents(link);
  const lines = [...words.getClientRects()];
  const last = lines[lines.length - 1];
  return {
    widthPastWords: ${ONE_LINE_WIDTH}(link) - ${DETACHED_WIDTH}(link, link.textContent),
    addressWidth: ${DETACHED_WIDTH}(link, printed, "::after"),
    addressStart: {
      left: last.right, top: last.top, height: last.height,
      width: ${DETACHED_WIDTH}(link, printed.slice(0, ${ADDRESS_START_LENGTH}), "::after"),
    },
  };
})())`;
