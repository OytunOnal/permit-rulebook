// @level presentation
import { PRODUCT_NAME, RULES_READ, SEAL_LETTERS } from "./copy/frame.js";
import { esc, escAttr } from "./reason.js";

/**
 * The product's identity, in markup, said once.
 *
 * The seal before the wordmark, the tilted pair in the corner and the three
 * icon links were written out four times — the route page, the country page,
 * the 404 and the interview — with the same words, the same classes and four
 * chances to drift. `identity.css` already holds the one set of rules that
 * places them (human, 2026-09-08); this holds the one set of elements those
 * rules place (Standards review, 2026-09-08).
 *
 * The interview's pair is the exception it declares: its stamp changes state as
 * the reader moves, so its markup carries the ids the interview writes into. It
 * still takes its geometry and its letters from here.
 */

/** The seal, before the wordmark or on its own. */
export function seal(): string {
  return `<span class="seal" title="${escAttr(PRODUCT_NAME)}" aria-hidden="true">${SEAL_LETTERS}</span>`;
}

/**
 * The pair: the mark, and the stamp beside it.
 *
 * Every page that shows a date shows it here, in these words. A page with
 * quotes on it stamps the day those were read; a page with none stamps the day
 * the dataset itself was last read (human amendment to decision 12,
 * 2026-09-08) — which is what the interview's question screens already did, and
 * is now the rule for the country pages and the 404 as well.
 */
export function stamps(label: string, date: string, o: { live?: boolean } = {}): string {
  const mark = `<span class="mark"${o.live ? "" : ' role="img"'} title="${escAttr(PRODUCT_NAME)}"${
    o.live ? "" : ` aria-label="${escAttr(PRODUCT_NAME)}"`}>${SEAL_LETTERS}</span>`;
  // The interview repaints its pair in place: the words and the date change
  // state as the reader moves, so that one carries the ids the interview
  // writes into, and the box itself must not move between them.
  const inside = o.live
    ? `<time id="stamp-time" datetime="${escAttr(date)}"><span id="stamp-label">${
      esc(label)}</span><br><span id="stamp-date">${esc(date)}</span></time>`
    : `<time datetime="${escAttr(date)}">${esc(label)}<br>${esc(date)}</time>`;
  return `<div class="stamps"${o.live ? ' aria-hidden="true" id="stamp"' : ""}>${
    mark}<div class="stamp">${inside}</div></div>`;
}

/** The pair a page shows when its own content is quoted from a source. */
export const rulesRead = (date: string): string => stamps(RULES_READ, date);
