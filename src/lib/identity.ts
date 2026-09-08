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

/** The icon links, identical in every document's head. */
export function iconLinks(): string {
  return [
    `<link rel="icon" href="${escAttr(url("/favicon.ico"))}" sizes="16x16 32x32 64x64">`,
    `<link rel="icon" href="${escAttr(url("/favicon.svg"))}" type="image/svg+xml">`,
    `<link rel="apple-touch-icon" href="${escAttr(url("/favicon-64.png"))}">`,
  ].join(String.fromCharCode(10));
}

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
      ? ` aria-current="${escAttr(place.current)}"`
      : "";
    return `<a class="tap-min${link.action ? " check" : ""}" href="${escAttr(url(link.path))}"${
      marked}>${esc(link.label)}</a>`;
  };
  const links = [
    ...countries.map(item),
    '<span class="sep" aria-hidden="true"></span>',
    // One name for it, the human's own: the header says "Check yours" and so
    // does the footer; the page's own button says which country (footer
    // critique, 2026-09-08).
    item({ path: "/", label: "Check yours", action: true }),
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
    const isOpen = () => button.getAttribute("aria-expanded") === "true";
    button.addEventListener("click", () => set(!isOpen()));
    // Escape works from anywhere while the menu is open, not only from inside
    // it: a reader who has tabbed out, or never tabbed in, still has the way
    // out every menu has (Standards review, 2026-09-08).
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !isOpen()) return;
      set(false);
      button.focus();
    });
    // And a tap anywhere outside closes it, which is what a reader expects of
    // something that opened over the page.
    document.addEventListener("click", (e) => {
      if (!isOpen()) return;
      if (nav.contains(e.target)) { if (e.target.closest("a")) set(false); return; }
      if (button.contains(e.target)) return;
      set(false);
    });
  })();
`;

/**
 * The site footer: the same block under every page.
 *
 * Each page had grown its own — the interview three links, a route page a
 * disclaimer and a health line, the country page three ends — so the way out
 * of the product depended on which page you were standing on (site map,
 * 2026-09-08). One footer, from the same source as the header.
 *
 * Its links look like links at rest: a resting underline, not the header's
 * borderless row. The isolated critique of the mock called an underline-on-
 * hover column "a list of words a mouse discovers", and a phone has no hover
 * at all.
 */
export interface FooterPlace extends HeaderPlace {
  /** The route's own JSON, on a route page only. */
  jsonPath?: string;
  /** Where "Check yours" starts, pre-scoped where a country is known. */
  checkPath?: string;
}

export interface FooterFacts {
  /** The span the values were read over, both ends. */
  read: { oldest: string; newest: string };
  datasetVersion: string;
  /** The day the watch last ran — empty where it never has. */
  lastRun: string;
  disclaimer: string;
  licenceUrl: string;
  licenceName: string;
  repository: string;
  tracker: string;
  newNeed: string;
  sponsor: string;
  owner: string;
  year: string;
}

const out = (href: string, label: string): string =>
  `<a class="out tap-min" href="${escAttr(href)}" target="_blank" rel="noopener">${esc(label)}</a>`;

/**
 * The separator between the footer's data tokens. The space before the dot is
 * non-breaking, so the dot ends the line it belongs to and the break falls
 * after it: the data line breaks at its separators before it breaks anywhere
 * else, and nothing that cannot break is ever wider than its column.
 */
const SEP = String.fromCharCode(160, 183) + " ";

export function siteFooter(
  countries: NavLink[], facts: FooterFacts, place: FooterPlace = {},
): string {
  const here = (link: NavLink): string => {
    const marked = place.countryPath && link.path === place.countryPath && place.current
      ? ` aria-current="${escAttr(place.current)}"`
      : "";
    return `<li><a class="tap-min" href="${escAttr(url(link.path))}"${marked}>${esc(link.label)}</a></li>`;
  };
  const data = [
    `<li><a class="tap-min" href="${escAttr(url(DATA_PATH))}">The data \u2014 status, versions, downloads</a></li>`,
    // Only where there is a route to serve: the other pages render the column
    // without it rather than linking a file that is not theirs.
    place.jsonPath ? `<li><a class="tap-min" href="${escAttr(url(place.jsonPath))}">This route as JSON</a></li>` : "",
    `<li>${out(facts.repository, "The repository")}</li>`,
    `<li>${out(facts.licenceUrl, `Licence \u00b7 ${facts.licenceName}`)}</li>`,
  ].filter(Boolean).join("");

  return `<footer class="site-foot">
    <p class="disclaimer">${esc(facts.disclaimer)}</p>
    <div class="cols">
      <div class="col">
        <h3>Countries</h3>
        <ul>${countries.map(here).join("")}
          <li class="act"><a class="tap-min" href="${
    escAttr(url(place.checkPath ?? "/"))}">Check yours</a></li>
        </ul>
      </div>
      <div class="col">
        <h3>The data</h3>
        <ul>${data}</ul>
      </div>
      <div class="col">
        <h3>Feedback</h3>
        <ul>
          <li>${out(facts.tracker, "Report a wrong value")}</li>
          <li>${out(facts.newNeed, "Suggest a route or a country")}</li>
          <li>${out(facts.sponsor, "Sponsor this work")}</li>
        </ul>
      </div>
    </div>
    <div class="line">
      <span><a class="mark tap-min" href="${escAttr(url("/"))}">${seal()}${esc(PRODUCT_NAME)}</a>${SEP}<span class="keep">code MIT</span>${SEP}<span class="keep">data ${
    esc(facts.licenceName)}</span>${SEP}<span class="keep">© ${esc(facts.year)} ${esc(facts.owner)}</span></span>
      <span>values read between <b><time datetime="${
    escAttr(facts.read.oldest)}">${esc(facts.read.oldest)}</time></b> and <b><time datetime="${
    escAttr(facts.read.newest)}">${esc(facts.read.newest)}</time></b>${SEP}re-read daily${facts.lastRun ? ` <span class="keep">(last run <time datetime="${
    escAttr(facts.lastRun)}">${esc(facts.lastRun)}</time>)</span>` : ""}${SEP}<span class="keep">dataset ${
    esc(facts.datasetVersion)}</span></span>
    </div>
  </footer>`;
}
