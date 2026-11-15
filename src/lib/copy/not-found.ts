// @level presentation
/**
 * The 404 page's own words (`lib/not-found.ts`).
 *
 * Every word a reader reads lives in this folder, one file per screen or
 * part (CODING_STANDARDS.md, Rules).
 */
import { ANSWERED_HERE_ONLY, PRODUCT_NAME } from "./frame.js";

/** What the page says it is, as its headline and its title say it, and the line under the headline. */
const NOT_FOUND = "This page does not exist"; // the headline's words and the title's
export const NOT_FOUND_HEADLINE = `${NOT_FOUND}.`; // the h1, before the tagline
export const NOT_FOUND_TITLE = `${NOT_FOUND} · ${PRODUCT_NAME}`; // the page's <title>
export const NOT_FOUND_LEDE = // the lede under the headline
  "Nothing is published at that address — a link may have lost a character, or a page may have been renamed since it was shared.";

/** The first door's heading, over the four countries. */
export const NOT_FOUND_COUNTRIES_HEADING = "Every country we hold rules for"; // the countries nav's heading

/**
 * The 404's second door, in one sentence that is the heading of its section.
 *
 * It was a visually hidden h2 ("Start from your own situation") over a bold
 * paragraph opening with the same words: a screen reader heard it twice, a
 * sighted reader saw it once, and neither saw the same page (P8, s27). One
 * element carries the words now, and it is the heading.
 */
export const NOT_FOUND_START = "Or start from your own situation.";

/** The line that runs on after it: where the answers stay. */
export const NOT_FOUND_START_NOTE = ANSWERED_HERE_ONLY;
