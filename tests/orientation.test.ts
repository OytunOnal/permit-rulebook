import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import { countryLinks, countryPages, navCountries } from "../src/lib/country-page.js";
import { dataPage, statusAlias } from "../src/lib/data-page.js";
import { DATA_PATH, siteHeader } from "../src/lib/identity.js";
import { notFoundPage } from "../src/lib/not-found.js";
import { routePages } from "../src/lib/route-page.js";
import { indexedPaths, sitemapXml } from "../src/lib/sitemap.js";
import { absolute, url } from "../src/lib/site.js";
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

/** The same header with the current-page marks taken off, so pages compare. */
const unmarked = (header: string): string =>
  header.replace(/ aria-current="(page|true)"/g, "").replace(/\s+/g, " ").trim();

describe("one header, every page", () => {
  const pages = builtPages();

  it("every built page carries the header, and it is the same markup on all of them", () => {
    expect(pages.length, "nothing is built — run npm run build").toBeGreaterThan(25);
    const reference = unmarked(siteHeader(navCountries(ds)));
    for (const page of pages) {
      const header = headerOf(page.html);
      expect(header, `${page.path} has no site header`).not.toBe("");
      expect(unmarked(header), `${page.path}'s header differs from every other page's`).toBe(reference);
    }
  });

  it("the country a page belongs to is the one marked, and only that one", () => {
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
  });

  it("nothing is marked on the interview or the data page — they belong to no country", () => {
    for (const html of [dataPage(ds).html, statusAlias(ds).html, notFoundPage(ds).html])
      expect(headerOf(html)).not.toContain("aria-current");
    const home = `${dist}/index.html`;
    if (existsSync(home)) expect(headerOf(read(home))).not.toContain("aria-current");
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

describe("everything is reachable, and not only from a footer", () => {
  const pages = builtPages();

  /** Where a page can be reached from, by the links it actually emits. */
  const hrefsOf = (html: string): string[] =>
    [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]!).filter((h) => h.startsWith(url("/")));

  it("every route page is two clicks from the interview", () => {
    const home = pages.find((p) => p.path === "/index.html");
    expect(home, "no home page was built").toBeDefined();
    const first = new Set(hrefsOf(home!.html));
    const second = new Set<string>(first);
    for (const href of first) {
      const page = pages.find((p) => p.path === `${href === url("/") ? "" : href}/index.html`
        || p.path === `${href}.html`);
      if (page) for (const next of hrefsOf(page.html)) second.add(next);
    }
    for (const route of routePages(ds))
      expect(second.has(url(route.path)), `${route.path} is more than two clicks from the interview`).toBe(true);
  });

  it("no page is reachable only from a footer", () => {
    // Every country page and the data page are in the header, which is above
    // the fold on every screen: the footer is a second way, never the only one.
    const header = siteHeader(navCountries(ds));
    for (const link of [...countryLinks(ds).map((l) => l.path), "/", DATA_PATH])
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

/** And the folded state, measured rather than read off a media query. */
const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write([
    "",
    `  !! THE NAVIGATION WAS NOT WALKED IN A BROWSER: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
}

const STATE = 'JSON.stringify({'
  + ' expanded: document.querySelector(".menu").getAttribute("aria-expanded"),'
  + ' menuShown: getComputedStyle(document.querySelector(".menu")).display !== "none",'
  + ' navShown: getComputedStyle(document.querySelector(".nav")).display !== "none",'
  + ' focused: document.activeElement ? (document.activeElement.textContent || "").trim() : "",'
  + ' columns: getComputedStyle(document.querySelector(".nav")).gridTemplateColumns })';

describe.skipIf(skipped !== null)("the nav folds where it says it does", () => {
  for (const [width, folded] of [[960, false], [959, true]] as const)
    it(`at ${width} px the nav is ${folded ? "folded behind Menu" : "an open row"}`, async () => {
      const server = await serve(dist);
      try {
        const seen = JSON.parse(await withBrowser(async (page: BrowserPage) => {
          await page.goto(server.url("/germany/"), 400);
          return page.evaluate(STATE);
        }, { viewport: { width, height: 900 }, mobile: false }) as string) as
          { menuShown: boolean; navShown: boolean };
        expect(seen.menuShown, `the Menu button is ${seen.menuShown ? "shown" : "hidden"} at ${width}`).toBe(folded);
        expect(seen.navShown, `the row is ${seen.navShown ? "shown" : "hidden"} at ${width}`).toBe(!folded);
      } finally {
        server.close();
      }
    }, 180000);

  it("at 390 the menu opens, takes the focus, closes on Escape and on a choice", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/germany/"), 500);
        const closed = JSON.parse(await page.evaluate(STATE));
        await page.evaluate('document.querySelector(".menu").click()');
        const open = JSON.parse(await page.evaluate(STATE));
        await page.evaluate(
          'document.querySelector(".nav").dispatchEvent('
          + ' new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))',
        );
        const escaped = JSON.parse(await page.evaluate(
          STATE.replace(/ [}][)]$/, ", onButton: document.activeElement === document.querySelector('.menu') })"),
        ));
        await page.evaluate('document.querySelector(".menu").click()');
        // Choosing a country closes the menu on the way out. The navigation
        // itself is held back so the state can be read: a page that has already
        // left has no menu to report on, which is how this case first went
        // flaky (2026-09-08).
        await page.evaluate(
          'document.addEventListener("click", (e) => e.preventDefault(), { capture: true, once: true });'
          + ' document.querySelector(".nav a").click()',
        );
        const chosen = JSON.parse(await page.evaluate(STATE));
        return { closed, open, escaped, chosen };
      }, { viewport: { width: 390, height: 844 }, mobile: true }) as {
        closed: { expanded: string; navShown: boolean };
        open: { expanded: string; navShown: boolean; focused: string; columns: string };
        escaped: { expanded: string; navShown: boolean; onButton: boolean };
        chosen: { expanded: string; navShown: boolean };
      };

      expect(seen.closed.expanded).toBe("false");
      expect(seen.closed.navShown, "the row is showing before Menu was touched").toBe(false);
      expect(seen.open.expanded).toBe("true");
      expect(seen.open.navShown, "Menu opened nothing").toBe(true);
      // One column, as the mock draws it, and the focus on the first item.
      expect(seen.open.columns.split(" ").length, `columns: ${seen.open.columns}`).toBe(1);
      expect(seen.open.focused, "the focus did not move into the menu").toBe("Germany");
      // Escape closes it and gives the focus back to the control that opened it.
      expect(seen.escaped.expanded).toBe("false");
      expect(seen.escaped.navShown).toBe(false);
      expect(seen.escaped.onButton, "Escape left the focus adrift").toBe(true);
      // And choosing something closes it on the way out.
      expect(seen.chosen.expanded).toBe("false");
      expect(seen.chosen.navShown).toBe(false);
    } finally {
      server.close();
    }
  }, 180000);
});
