import type { Dataset } from "permit-rulebook-data";
import { countryPages } from "../src/lib/country-page.js";
import { dataPage } from "../src/lib/data-page.js";
import { framedPageHtml, type PageInFrame } from "../src/lib/frame/framed-page.js";
import { routePage } from "../src/lib/route-page.js";
import { routeAddresses } from "../src/lib/slug.js";

/**
 * What the cases read of the frame, through its entry: the header, the footer
 * and the stylesheet are private to `src/lib/frame/`, so a case reads them off
 * a page the frame draws (#142).
 */

/** A page with nothing of its own in the frame, but for what `page` hands it: the frame alone, as a document. */
export const frameAlone = (dataset: Dataset, page: Partial<PageInFrame> = {}): string =>
  framedPageHtml(dataset, { title: "", content: "", ...page });

/** The part of `html` from `open` to the end of the first `close` after it, or "" where there is none. */
function partOf(html: string, open: string, close: string): string {
  const start = html.indexOf(open);
  return start < 0 ? "" : html.slice(start, html.indexOf(close, start) + close.length);
}

/** The site header in a page's HTML, or "" where it has none. */
export const headerIn = (html: string): string => partOf(html, '<header class="site-head">', "</header>");

/** The site footer in a page's HTML, or "" where it has none. */
export const footerIn = (html: string): string => partOf(html, '<footer class="site-foot">', "</footer>");

/** The rules of a page's first `<style>`, or "" where it has none. */
export const styleIn = (html: string): string => partOf(html, "<style>", "</style>").slice("<style>".length, -"</style>".length);

/**
 * Every rule a route page, a country page and the data page carry, each line
 * once: the one sheet those three shared until #142 gave each page its own
 * rules beside the frame's.
 */
export function stringPagesSheet(dataset: Dataset): string {
  const pages = [routePage(dataset, routeAddresses(dataset)[0]!), countryPages(dataset)[0]!, dataPage(dataset)];
  return [...new Set(pages.flatMap((page) => styleIn(page.html).split("\n")))].join("\n");
}
