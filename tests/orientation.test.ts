import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import { countryPages } from "../src/lib/country-page.js";
import { countryLinks } from "../src/lib/slug.js";
import { dataPage, statusAlias } from "../src/lib/data-page.js";
import { TRANSLATION_POLICY } from "../src/lib/copy/data-page.js";
import { hasUnbalancedQuotationMark, quotedSpans, routeProvenance } from "permit-rulebook-data";
import { notFoundPage } from "../src/lib/not-found.js";
import { routePages } from "../src/lib/route-page/route-page.js";
import { indexedPaths, sitemapXml } from "../src/lib/sitemap.js";
import { DATA_PATH, FEEDBACK_PATH, absolute, url } from "../src/lib/site.js";
import { frameAlone, headerIn } from "./frame-alone.js";
import type { Dataset } from "permit-rulebook-data";

/**
 * The Orientation lens (RUBRIC 1.3), which the site map's own birth demanded.
 *
 * The product reached 29 pages with every screen approved on its own and nobody
 * owning the space between them: the interview navigated by its footer, a route
 * page by a crumb, a country page by nothing, and from Germany there was no way
 * to France at all (site map, 2026-09-08). A header that differs between pages
 * is the same defect wearing a fix, so the first case here is that every page
 * ships the identical header markup.
 */

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));
const read = (path: string): string => readFileSync(path, "utf8").split("\r\n").join("\n");

/** Every page the build emits, as a name and its HTML. */
function builtPages(): { path: string; html: string }[] {
  const out: { path: string; html: string }[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const at = join(dir, name);
      if (statSync(at).isDirectory()) walk(at);
      else if (name.endsWith(".html")) out.push({ path: at.slice(dist.length).split("\\").join("/"), html: read(at) });
    }
  };
  if (existsSync(dist)) walk(dist);
  return out;
}

/** The header as it stands in the page, from `<header class="site-head">` to its close. */
const headerOf = (html: string): string => {
  const start = html.indexOf('<header class="site-head">');
  if (start < 0) return "";
  const end = html.indexOf("</header>", start);
  return html.slice(start, end + "</header>".length);
};

/**
 * The same header with the two things that legitimately differ taken off, so
 * pages compare: the current-page marks, and — since s13 put the four countries
 * under one word — the disclosure's word itself, which is the country's own
 * name on a page that belongs to one (`tests/s13-frame.test.ts`). Everything else in the
 * header must be the same bytes on every page.
 */
const unmarked = (header: string): string =>
  header.replace(/ aria-current="(page|true)"/g, "")
    .replace(/<summary class="tap-min">[^<]*<\/summary>/, '<summary class="tap-min">WORD</summary>')
    .replace(/\s+/g, " ").trim();

describe("one header, every page", () => {
  const pages = builtPages();

  it("every built page carries the header, and it is the same markup on all of them", () => {
    expect(pages.length, "nothing is built — run npm run build").toBeGreaterThan(25);
    const reference = unmarked(headerIn(frameAlone(ds)));
    for (const page of pages) {
      const header = headerOf(page.html);
      expect(header, `${page.path} has no site header`).not.toBe("");
      expect(unmarked(header), `${page.path}'s header differs from every other page's`).toBe(reference);
    }
  });

  it("the country a page belongs to is the one marked, and only that one", expectOnlyItsOwnCountryMarked);

  it("the interview and the data page mark their own word, and the 404 and the old data address nothing", () => {
    expect(headerOf(dataPage(ds).html)).toContain(`href="${url(DATA_PATH)}" aria-current="page"`);
    for (const html of [statusAlias(ds).html, notFoundPage(ds).html])
      expect(headerOf(html)).not.toContain("aria-current");
    // The interview as built: its Astro page places the frame's header itself.
    const home = `${dist}/index.html`;
    if (existsSync(home))
      expect([...headerOf(read(home)).matchAll(/href="([^"]*)" aria-current="([^"]*)"/g)].map((m) => `${m[1]} ${m[2]}`))
        .toEqual([`${url("/")} page`]);
  });

  it("from every page, the other three countries, the checker and the data page are one link away", () => {
    const wanted = [...countryLinks(ds).map((l) => url(l.path)), url("/"), url(DATA_PATH)];
    for (const page of pages) {
      const hrefs = new Set([...page.html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]!));
      for (const want of wanted)
        expect(hrefs.has(want), `${page.path} cannot reach ${want} without another page`).toBe(true);
    }
  });
});

/** Checks a country page marks its own country as the page, and a route page its country as where it sits. */
function expectOnlyItsOwnCountryMarked() {
  for (const page of countryPages(ds)) {
    const header = headerOf(page.html);
    const marks = [...header.matchAll(/aria-current="([^"]*)"/g)].map((m) => m[1]);
    expect(marks, page.path).toEqual(["page"]);
    const link = new RegExp(`href="${url(page.path)}" aria-current="page"`);
    expect(header, `${page.path} marks a country that is not its own`).toMatch(link);
  }
  for (const page of routePages(ds)) {
    const header = headerOf(page.html);
    const marks = [...header.matchAll(/aria-current="([^"]*)"/g)].map((m) => m[1]);
    // A route page sits UNDER a country; it is not that country's page.
    expect(marks, page.path).toEqual(["true"]);
    const country = ds.countries.find((c) => page.path.startsWith(`/${page.path.split("/")[1]}/`)
      && page.path.split("/")[1] === countryLinks(ds).find((l) => l.name === c.name)!.path.slice(1))!;
    expect(header, page.path).toContain(`href="${url(countryLinks(ds).find((l) => l.name === country.name)!.path)}" aria-current="true"`);
  }
}

/** Where a page can be reached from, by the links it actually emits. */
const hrefsOf = (html: string): string[] =>
  [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]!).filter((h) => h.startsWith(url("/")));

/** Checks every route page is among the pages two clicks from the built interview. */
function expectEveryRouteTwoClicksFromInterview(pages: { path: string; html: string }[]) {
  const home = pages.find((p) => p.path === "/index.html");
  expect(home, "no home page was built").toBeDefined();
  const first = new Set(hrefsOf(home!.html));
  const second = new Set<string>(first);
  for (const href of first) {
    // Every internal page address ends in a slash now, so the file behind it
    // is that address plus `index.html`.
    const page = pages.find((p) => p.path === `${href.replace(/[/]$/, "")}/index.html`
      || p.path === `${href.replace(/[/]$/, "")}.html`);
    if (page) for (const next of hrefsOf(page.html)) second.add(next);
  }
  for (const route of routePages(ds))
    expect(second.has(url(route.path)), `${route.path} is more than two clicks from the interview`).toBe(true);
}

describe("everything is reachable, and not only from a footer", () => {
  const pages = builtPages();

  it("every route page is two clicks from the interview", () => expectEveryRouteTwoClicksFromInterview(pages));

  it("no page is reachable only from a footer", () => {
    // Every country page, the data page and the feedback page are in the
    // header, which is above the fold on every screen: the footer is a second
    // way, never the only one.
    const header = headerIn(frameAlone(ds));
    for (const link of [...countryLinks(ds).map((l) => l.path), "/", DATA_PATH, FEEDBACK_PATH])
      expect(header, `${link} is only reachable from a footer`).toContain(`href="${url(link)}"`);
  });

  it("the sitemap invites a crawler to the country pages and to the data page", () => {
    const xml = sitemapXml(ds);
    for (const link of countryLinks(ds)) expect(xml).toContain(`<loc>${absolute(link.path)}</loc>`);
    expect(xml).toContain(`<loc>${absolute(DATA_PATH)}</loc>`);
    expect(indexedPaths(ds)).toContain(DATA_PATH);
    // And not to the error page, or to the data page's old address.
    expect(xml).not.toContain(`<loc>${absolute("/404")}</loc>`);
    expect(xml).not.toContain(`<loc>${absolute("/status")}</loc>`);
  });

  it("the old data address still answers, and says where the page went", () => {
    const alias = statusAlias(ds);
    expect(alias.path).toBe("/status");
    expect(alias.html).toContain(`content="0; url=${url(DATA_PATH)}"`);
    expect(alias.html).toContain(`href="${url(DATA_PATH)}"`);
    expect(alias.html).toContain('rel="canonical"');
    const built = `${dist}/status/index.html`;
    if (existsSync(built)) expect(read(built)).toContain(url(DATA_PATH));
  });
});

/**
 * Why the proof is not in English, said on the page that answers for the data.
 *
 * A reader from India, Nigeria or Brazil meets six sentences of German statute
 * on a results card and is told nothing about why they are not translated
 * (isolated v1-gate critique, 2026-09-08, F4). The human's ruling: they never
 * will be, and the site says so — a translation would be our words standing
 * beside the authority's, and the original is the record.
 */
describe("the translation policy is stated where the data answers for itself", () => {
  it("stands beside the counter sentence on the data page, in the product's own register", () => {
    const html = dataPage(ds).html;
    expect(TRANSLATION_POLICY, "the sentence does not live in the register").toContain("never translated");
    expect(html).toContain(TRANSLATION_POLICY);
    // Beside the counter sentence, not somewhere else on the page.
    const counter = html.indexOf("A cookieless counter");
    const policy = html.indexOf(TRANSLATION_POLICY);
    expect(counter, "the counter sentence is gone").toBeGreaterThan(-1);
    expect(Math.abs(policy - counter), "the two sentences are not neighbours").toBeLessThan(600);
  });

  it("passes the prose gate as ours: nothing on the page is in quotation marks without its source", () => {
    // What a reader sees: the stylesheet and the scripts are not prose.
    const text = dataPage(ds).html
      .replace(/<style[^]*?<[/]style>/g, " ").replace(/<script[^]*?<[/]script>/g, " ")
      .replace(/<[^>]*>/g, " ").split(/\s+/).join(" ");
    const said = new Set<string>();
    for (const country of ds.countries)
      for (const route of country.routes)
        for (const p of routeProvenance(route)) said.add(p.value.quote.split(/\s+/).join(" "));
    for (const span of quotedSpans(text))
      expect([...said].some((q) => q.includes(span)), `“${span.slice(0, 80)}”`).toBe(true);
    expect(hasUnbalancedQuotationMark(text), "a quotation mark that closes nothing").toBe(false);
  });
});
