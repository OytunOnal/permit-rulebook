import type { Dataset } from "permit-rulebook-data";
import { audienceNotice, stampDate } from "./route-page.js";
import { countryAddresses, countryReadDate, siteReadDate } from "./country-page.js";
import { absolute } from "./site.js";
import { routeAddresses } from "./slug.js";

/**
 * What this site offers a crawler — generated from the dataset, never listed.
 *
 * `/sitemap.xml` and `/robots.txt` both answered 404 on the live host
 * (product critique B2, 2026-09-08), on a product whose second distribution
 * channel is named in its own one-pager as "SEO long tail (micro-pages
 * generated automatically from the rules)". Twenty-three generated pages, no
 * entry point, no crawl directive, no index.
 *
 * Every path here is derived from the same dataset the pages are built from, so
 * a route added tomorrow is in the sitemap tomorrow and a sitemap naming a page
 * that is not built is not a state this file can reach. `check:base` reads the
 * built site back and proves the other direction — every internal link resolves
 * to something emitted.
 */

/** Every page the build emits, including the one no crawler should index. */
export function builtPaths(dataset: Dataset): string[] {
  return [...indexedPaths(dataset), "/404"];
}

/**
 * The pages a crawler is offered: the interview, the status page, one page per
 * country, one page per route. The error page is built and deliberately absent
 * — a sitemap is an invitation, and nobody should be invited to a 404.
 */
export function indexedPaths(dataset: Dataset): string[] {
  return sitemapEntries(dataset).map((e) => e.path);
}

export interface SitemapEntry {
  path: string;
  /** The day the content behind this page last moved, ISO, as decision 12 has
   * every date on this product printed. */
  lastmod: string;
}

export function sitemapEntries(dataset: Dataset): SitemapEntry[] {
  const notice = audienceNotice(dataset);
  const newest = siteReadDate(dataset);
  return [
    { path: "/", lastmod: newest },
    { path: "/status", lastmod: newest },
    ...countryAddresses(dataset).map(({ country, path }) => ({
      path,
      lastmod: countryReadDate(dataset, country),
    })),
    ...routeAddresses(dataset).map(({ route, path }) => ({
      path,
      lastmod: stampDate(route, notice),
    })),
  ];
}

/**
 * A URL going inside an element. A slug is lower-case letters and hyphens today
 * and `absolute()` is built from `SITE_URL`, so nothing here carries an
 * ampersand — but a sitemap that becomes invalid XML is dropped silently by
 * every crawler that reads it, and "nothing carries one today" is the reason to
 * escape rather than the reason not to (Standards review, 2026-09-08).
 */
export const escXml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/**
 * The sitemap itself. Absolute, because a sitemap that is not is ignored, and
 * through `absolute()` so a build under a subpath names its own pages rather
 * than the domain root's.
 */
export function sitemapXml(dataset: Dataset): string {
  const urls = sitemapEntries(dataset).map((e) =>
    `  <url>\n    <loc>${escXml(absolute(e.path))}</loc>\n    <lastmod>${escXml(e.lastmod)}</lastmod>\n  </url>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

/**
 * The crawl directive. Nothing here is held back — the whole product is public
 * and the point of it is to be found — so the file exists to say that plainly
 * and to hand over the sitemap, which is the only way a crawler learns about
 * twenty-nine pages it was never linked to from outside.
 *
 * At the site's own domain this lands at the origin root, where a crawler looks
 * for it. Under a project subpath on GitHub Pages it lands beside the pages
 * instead — an inherent limit of that host, not something a static build can
 * fix, and the sitemap line inside it is absolute either way.
 */
export function robotsTxt(): string {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${absolute("/sitemap.xml")}`,
    "",
  ].join("\n");
}
