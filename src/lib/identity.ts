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

/**
 * The site header: the identity and the navigation, on every page from here.
 *
 * The site map born on 2026-09-08 found the space between the screens owned by
 * nobody: 29 pages, each navigating its own way — the interview by its footer,
 * the route page by a crumb, the country page by nothing — and no move from
 * one country to another at all. The header is the fix, and it is one string
 * because the Orientation lens reads a header that differs between pages as a
 * finding.
 *
 * There are no crumbs anywhere any more (human, revision 3 of the mock): the
 * wordmark and the marked country say where you are, and the h1 names the page.
 */

/** Where a page stands in the navigation, so the header can mark it. */
export interface HeaderPlace {
  /** The country whose section this page belongs to, by path. */
  countryPath?: string;
  /** `page` on the country page itself, `true` on a route page under it. */
  current?: "page" | "true";
}

/** The four countries, plus the two places every page can reach. */
export interface NavLink {
  path: string;
  label: string;
  /** The interview: bordered, because it is the one thing to DO here. */
  action?: boolean;
}

export function siteHeader(countries: NavLink[], place: HeaderPlace = {}): string {
  const item = (link: NavLink): string => {
    const marked = place.countryPath && link.path === place.countryPath && place.current
      ? ` aria-current="${place.current}"`
      : "";
    return `<a class="tap-min${link.action ? " check" : ""}" href="${escAttr(url(link.path))}"${
      marked}>${esc(link.label)}</a>`;
  };
  const links = [
    ...countries.map(item),
    '<span class="sep" aria-hidden="true"></span>',
    item({ path: "/", label: "Checker", action: true }),
    item({ path: DATA_PATH, label: "The data" }),
  ].join("");
  return `<header class="site-head">
      <a class="wordmark tap-min" href="${escAttr(url("/"))}">${seal()}${esc(PRODUCT_NAME)}</a>
      <button class="menu tap-min" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav class="nav" id="site-nav" aria-label="Site">${links}</nav>
    </header>`;
}

/** The on-site data page — the header's destination and the footer's. */
export const DATA_PATH = "/data";

/**
 * The menu, in the one behaviour the mock walks: toggle, focus the first item
 * on opening, Escape closes it and gives the focus back, and choosing
 * something closes it. Shipped as a string because four of the five pages are
 * built as strings; the interview inlines the same one.
 */
export const MENU_SCRIPT = `
  (() => {
    const button = document.querySelector(".menu");
    const nav = button && document.getElementById(button.getAttribute("aria-controls"));
    if (!button || !nav) return;
    const set = (open) => {
      button.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("open", open);
      if (open) { const first = nav.querySelector("a"); if (first) first.focus(); }
    };
    button.addEventListener("click", () => set(button.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("keydown", (e) => { if (e.key === "Escape") { set(false); button.focus(); } });
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
  })();
`;
