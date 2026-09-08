import { PRODUCT_NAME, SEAL_LETTERS } from "./copy.js";
import { esc, escAttr } from "./reason.js";
import { url } from "./site.js";

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
 * the reader moves, so its markup carries the ids the page writes into. It
 * still takes its geometry and its letters from here.
 */

/** A step in the trail: a link, or the page you are already on. */
export interface Crumb {
  label: string;
  /** Absent on the last crumb — you do not link to where you stand. */
  path?: string;
}

/** The icon links, identical in every document's head. */
export function iconLinks(): string {
  return [
    `<link rel="icon" href="${escAttr(url("/favicon.ico"))}" sizes="16x16 32x32 64x64">`,
    `<link rel="icon" href="${escAttr(url("/favicon.svg"))}" type="image/svg+xml">`,
    `<link rel="apple-touch-icon" href="${escAttr(url("/favicon-64.png"))}">`,
  ].join("\n");
}

/** The seal, before the wordmark or on its own. */
export function seal(): string {
  return `<span class="seal" title="${escAttr(PRODUCT_NAME)}" aria-hidden="true">${SEAL_LETTERS}</span>`;
}

/**
 * The trail, with the product's own name first. Every page that carries crumbs
 * starts at the interview, so that step is added here rather than repeated at
 * four call sites.
 */
export function crumbs(trail: Crumb[] = [], tapClass = "tap-min"): string {
  const steps = [{ label: PRODUCT_NAME, path: "/", lead: true }, ...trail.map((c) => ({ ...c, lead: false }))];
  const html = steps.map((step) => {
    const inner = `${step.lead ? seal() : ""}${esc(step.label)}`;
    return step.path
      ? `<a class="${escAttr(tapClass)}" href="${escAttr(url(step.path))}">${inner}</a>`
      : `<span>${inner}</span>`;
  }).join("");
  return `<nav class="crumbs label" aria-label="Where you are">\n        ${html}\n      </nav>`;
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
  // state as the reader moves, so that one carries the ids the page writes
  // into, and the box itself must not move between them.
  const inside = o.live
    ? `<time id="stamp-time" datetime="${escAttr(date)}"><span id="stamp-label">${
      esc(label)}</span><br><span id="stamp-date">${esc(date)}</span></time>`
    : `<time datetime="${escAttr(date)}">${esc(label)}<br>${esc(date)}</time>`;
  return `<div class="stamps"${o.live ? ' aria-hidden="true" id="stamp"' : ""}>${
    mark}<div class="stamp">${inside}</div></div>`;
}

/** The pair a page shows when its own content is quoted from a source. */
export const rulesRead = (date: string): string => stamps("Rules read", date);
