// @level presentation
import { COUNTRIES, FEEDBACK, MENU, MENU_CLOSE, PRODUCT_NAME } from "../../copy/frame.js";
import { seal } from "../../identity.js";
import { esc, escAttr } from "../../reason.js";
import { DATA_PATH, FEEDBACK_PATH, url } from "../../site.js";

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
  /**
   * The page's own address, where the row itself holds it — the interview,
   * `/data/` and `/feedback/` each mark their own word the way a country page
   * marks its country. A country's path
   * never goes here: that one lives inside the disclosure and is marked by
   * `countryPath` (s13).
   */
  here?: string;
}

/** The four countries, plus the two places every page can reach. */
export interface NavLink {
  path: string;
  label: string;
  /** The interview: bordered, because it is the one thing to DO here. */
  action?: boolean;
}

/** The `aria-current` a header link carries on this page, or nothing. */
function currentMarkOf(link: NavLink, place: HeaderPlace): string {
  const isThisCountry = Boolean(place.countryPath) && link.path === place.countryPath;
  if (isThisCountry && place.current) return ` aria-current="${escAttr(place.current)}"`;
  if (place.here && link.path === place.here) return ' aria-current="page"';
  return "";
}

export function siteHeader(countries: NavLink[], place: HeaderPlace = {}): string {
  const item = (link: NavLink): string =>
    `<a class="tap-min${link.action ? " check" : ""}" href="${escAttr(url(link.path))}"${
      currentMarkOf(link, place)}>${esc(link.label)}</a>`;
  /**
   * The four countries under one word (the human's second amendment,
   * 2026-09-16). The row held seven items and now holds four, and on a page
   * that belongs to a country the word is that country's own name — so the
   * header still says where you are, which is what the crumbs were removed in
   * favour of.
   *
   * A `<details>`, so it opens with no script and the keyboard reaches it. The
   * phone menu shows the same four rows under the heading inside it, which is
   * why the heading is markup rather than a second nav: one set of links, and
   * no country name written anywhere twice.
   */
  const here = countries.find((c) => c.path === place.countryPath);
  const disclosure = `<details class="countries"><summary class="tap-min">${
    esc(here ? here.label : COUNTRIES)}</summary><div class="list"><span class="group">${
    esc(COUNTRIES)}</span>${countries.map(item).join("")}</div></details>`;
  const links = [
    disclosure,
    '<span class="sep" aria-hidden="true"></span>',
    // One name for it, the human's own: the header says "Check yours" and so
    // does the footer; the page's own button says which country (footer
    // critique, 2026-09-08).
    item({ path: "/", label: "Check yours", action: true }),
    item({ path: DATA_PATH, label: "The data" }),
    // The word a reader meets the moment any page opens on a desktop, and one
    // tap behind Menu on a phone (s13).
    item({ path: FEEDBACK_PATH, label: FEEDBACK }),
  ].join("");
  // The button's two words ride on it as attributes: the script that swaps
  // them reads the button and never a word of its own (s27).
  return `<header class="site-head">
      <a class="wordmark tap-min" href="${escAttr(url("/"))}">${seal()}${esc(PRODUCT_NAME)}</a>
      <button class="menu tap-min" type="button" aria-expanded="false" aria-controls="site-nav" data-word-closed="${
    escAttr(MENU)}" data-word-open="${escAttr(MENU_CLOSE)}">${esc(MENU)}</button>
      <nav class="nav" id="site-nav" aria-label="Site">${links}</nav>
    </header>`;
}
