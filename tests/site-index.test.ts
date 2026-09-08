import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { countryAddresses, countryLinks, countryPage, countryPages } from "../src/lib/country-page.js";
import { PAGE_CSS, routePages } from "../src/lib/route-page.js";
import { builtPaths, indexedPaths, robotsTxt, sitemapXml } from "../src/lib/sitemap.js";
import { SITE_URL, absolute, url } from "../src/lib/site.js";
import { countryPath } from "../src/lib/slug.js";

/**
 * B2 — every route page was orphaned; the site could not be indexed or browsed.
 *
 * The isolated product critique of 2026-09-08 fetched the live host and found
 * `/sitemap.xml` 404, `/robots.txt` 404 and `/germany/` 404, and inventoried
 * every control on the home page: the masthead link, five country buttons that
 * start the interview, the declaration panel and three GitHub links. Not one
 * route page was linked from anywhere a crawler or a stranger could start. The
 * twenty-three best-built pages in the product were reachable only from each
 * other's "ALSO IN <COUNTRY>" list, or from a URL you already held.
 *
 * The four things that fix it are pinned here, one case each: the sitemap, the
 * crawl directive, the browse path (home footer -> country page -> route page),
 * and the promise that the new screen makes no verdict about anyone.
 *
 * The reach case builds its graph from what the pages emit rather than from a
 * list written in this file: a hand-written list of twenty-three paths passes
 * the day a page stops being linked.
 */

const ds = dataset as unknown as Dataset;
const routes = routePages(ds);
const countries = countryPages(ds);
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/** Every href a page ships, in the order it ships them. */
const hrefsOf = (html: string): string[] =>
  [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

/** The rendered text, with the markup and the stylesheet taken away. */
const textOf = (html: string): string =>
  html.replace(/<style>[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#8599;/g, " ")
    .replace(/\s+/g, " ");

/** Every `<a>` and `<button>` a page ships, with the classes it carries. */
const controlsOf = (html: string): string[][] =>
  [...html.matchAll(/<(?:a|button)\b([^>]*)>/g)]
    .map((m) => (/class="([^"]*)"/.exec(m[1])?.[1] ?? "").split(/\s+/).filter(Boolean));

describe("B2 — the site can be crawled and browsed", () => {
  /**
   * The sitemap is generated from the dataset, so a route added tomorrow is in
   * it tomorrow. What it must never be is a list somebody keeps in step by
   * hand: `/sitemap.xml` returning 404 was the visible half of B2, and a
   * sitemap that names twenty-two of twenty-three pages is the invisible half.
   */
  it("the sitemap names every page the build emits, once each, absolute — and nothing that is not built", () => {
    const xml = sitemapXml(ds);
    const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);

    // Everything the build emits, derived: the interview, the status page, one
    // page per country, one page per route.
    const expected = [
      absolute("/"),
      absolute("/status"),
      ...ds.countries.map((c) => absolute(countryPath(c))),
      ...routes.map((p) => absolute(p.path)),
    ];
    expect(locs.length).toBe(expected.length);
    expect(new Set(locs).size, "a page is listed twice").toBe(locs.length);
    expect(new Set(locs)).toEqual(new Set(expected));
    // 25 pages before this slice, 29 after the four country pages.
    expect(locs.length).toBe(2 + ds.countries.length + routes.length);

    // Absolute, every one of them, and under this build's own origin.
    for (const loc of locs) expect(loc.startsWith(`${SITE_URL}/`), loc).toBe(true);

    // The error page is built and is deliberately not offered to a crawler.
    expect(builtPaths(ds)).toContain("/404");
    expect(indexedPaths(ds)).not.toContain("/404");
    expect(xml).not.toContain("/404");

    // Valid XML: one declaration, one namespaced urlset, every element closed,
    // and nothing inside a <loc> that would need escaping.
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
    expect((xml.match(/<url>/g) ?? []).length).toBe(locs.length);
    expect((xml.match(/<\/url>/g) ?? []).length).toBe(locs.length);
    for (const loc of locs) expect(loc, loc).not.toMatch(/[<>&"']/);
    // Every date it carries is the one date format this product prints.
    const dates = [...xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((m) => m[1]);
    expect(dates.length).toBe(locs.length);
    for (const d of dates) expect(d, d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  /**
   * `/robots.txt` 404'd on the live host. A missing file is not a refusal, but
   * it is also not an invitation, and it is the only place a sitemap can be
   * announced to a crawler that was not handed the URL.
   */
  it("robots.txt lets every crawler in and names the sitemap, absolute", () => {
    const robots = robotsTxt().split("\r\n").join("\n");
    expect(robots).toContain("User-agent: *\n");
    expect(robots).toContain("Allow: /\n");
    // Nothing is held back: a Disallow with a path is the line that would
    // silently undo this.
    expect(robots).not.toMatch(/^Disallow:\s*\S/m);
    expect(robots).toContain(`Sitemap: ${absolute("/sitemap.xml")}`);
    expect(absolute("/sitemap.xml")).toBe(`${SITE_URL}/sitemap.xml`);
  });

  /**
   * The browse path, built from what the pages actually emit rather than from
   * a list typed here. One click from the home page reaches a country page;
   * one more reaches every route page. A route that no country page links is
   * an orphan again, and this is the case that says so by name.
   */
  it("every route page is reachable from the home page within two clicks", () => {
    // Click one: what the home page's footer offers. The nav renders exactly
    // `countryLinks(dataset)`, which the case below reads off the page source.
    const firstClicks = countryLinks(ds).map((link) => url(link.path));
    expect(firstClicks.length).toBe(ds.countries.length);

    const built = new Map(countries.map((page) => [url(page.path), page.html]));
    const reached = new Set<string>();
    for (const href of firstClicks) {
      const html = built.get(href);
      expect(html, `the home page links ${href}, where the build emits no page`).toBeDefined();
      for (const link of hrefsOf(html!)) reached.add(link);
    }

    const orphans = routes.map((p) => url(p.path)).filter((href) => !reached.has(href));
    expect(orphans, "route pages no country page links — orphaned, as in B2").toEqual([]);
    // And said the other way: a country page never points at a route page that
    // is not built.
    const everyRoute = new Set(routes.map((p) => url(p.path)));
    for (const href of reached)
      if (/^[/][a-z-]+[/][a-z0-9-]+$/.test(href) && !href.endsWith(".json"))
        expect(everyRoute.has(href), `a country page links ${href}, which is not a built route page`).toBe(true);
  });

  it("the home page's footer is where the first click lives, and it renders the same four links", () => {
    const home = readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8")
      .split("\r\n").join("\n");
    const footer = home.slice(home.indexOf("<footer>"), home.indexOf("</footer>"));
    // The nav is in the footer, it is generated, and every href goes through
    // the base-path helper.
    expect(footer).toContain("countryLinks(dataset)");
    expect(footer).toContain("href={url(link.path)}");
    expect(home).toContain('import { countryLinks } from "../lib/country-page.js";');
    // What the built page actually emits, when there is one to read.
    const index = `${dist}/index.html`;
    if (existsSync(index)) {
      const html = readFileSync(index, "utf8");
      for (const link of countryLinks(ds))
        expect(html, `the built home page does not link ${link.path}`)
          .toContain(`href="${url(link.path)}"`);
    }
  });

  it("a route page's country crumb is a link now that the country page exists", () => {
    for (const page of routes) {
      const country = ds.countries.find((c) => page.path.startsWith(`${countryPath(c)}/`))!;
      expect(page.html, page.path).toContain(`href="${url(countryPath(country))}"`);
    }
  });

  /**
   * The country page is a new screen, and the one thing a new screen must not
   * quietly acquire is the results screen's vocabulary. It lists rules; it has
   * no answers behind it, so it has nothing to rule with.
   */
  it("a country page never rules on the reader, in word or in colour", () => {
    const forbidden = [
      "criteria met", "criteria are met", "within reach", "not yet", "you qualify",
      "you may qualify", "you do not qualify", "you are eligible", "you are not eligible",
      "looks open", "looks closed", "your eligibility", "you appear to meet", "short by",
      "met ·", "you are short",
    ];
    const modelling = ["modelled", "modeled", "modelling", "criterion", "criteria", "field id", "pipeline"];
    for (const page of countries) {
      const said = `${textOf(page.html)} ${page.title} ${page.description}`.toLowerCase();
      for (const word of [...forbidden, ...modelling])
        expect(said, `${page.path}: "${word}"`).not.toContain(word);
      // And no verdict colour is painted into the body.
      const body = page.html.slice(page.html.indexOf("</style>"));
      for (const hex of ["#2e5b3f", "#8a5a19", "#e4efe7", "#f4ecd8"])
        expect(body.toLowerCase(), `${page.path}: ${hex}`).not.toContain(hex);
    }
  });

  it("a country page is the crumbs, the heading, its routes with their gists, and the way on", () => {
    expect(countries.length).toBe(ds.countries.length);
    for (const address of countryAddresses(ds)) {
      const country = address.country;
      const page = countryPage(ds, address);
      const text = textOf(page.html);
      expect(page.path).toBe(countryPath(country));
      // Every one of that country's routes, by name, with its one-line gist,
      // and nobody else's.
      for (const route of country.routes) {
        expect(text, `${page.path}: ${route.id}`).toContain(route.name);
        const summary = (route.summary ?? "").split(/(?<=\.)\s/)[0] ?? "";
        if (summary && summary.length <= 110)
          expect(text, `${page.path}: ${route.id} gist`).toContain(summary);
      }
      const linked = hrefsOf(page.html).filter((h) => /^[/][a-z-]+[/][a-z0-9-]+$/.test(h));
      expect(new Set(linked).size, page.path).toBe(country.routes.length);
      // The crumbs, the heading and the way into the interview.
      expect(page.html, page.path).toContain('class="crumbs label"');
      expect(page.html, page.path).toContain(`href="${url("/")}"`);
      expect(text, page.path).toContain("Permit Rulebook makes no immigration decision");
      // The page's own stylesheet is the route page's, not a second one.
      expect(page.html, page.path).toContain(`<style>${PAGE_CSS}</style>`);
    }
  });

  it("every control on a country page carries a tap rule written in --tap-min", () => {
    for (const page of countries) {
      const controls = controlsOf(page.html);
      expect(controls.length, page.path).toBeGreaterThan(3);
      for (const classes of controls) {
        const claimed = classes.filter((c) => c === "tap" || c === "tap-min");
        expect(claimed.length, `${page.path}: <a class="${classes.join(" ")}">`).toBe(1);
      }
    }
  });

  it("no new page states a path the base-path helper would have written differently", () => {
    // At the root `url()` is the identity, so this cannot prove the base is
    // applied — `npm run check:base` builds under one and reads every page
    // back. What it does catch is the shape a helper never emits: a path with
    // no leading slash, or a doubled one, written by hand into the template.
    for (const page of countries)
      for (const href of hrefsOf(page.html)) {
        if (/^https?:/.test(href)) continue;
        expect(href, `${page.path}: ${href}`).toBe(url(href));
      }
  });
});
