import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import { countryLinks, countryPages, navCountries } from "../src/lib/country-page.js";
import { dataPage, statusAlias } from "../src/lib/data-page.js";
import { TRANSLATION_POLICY } from "../src/lib/copy.js";
import { hasUnbalancedQuotationMark, quotedSpans, routeProvenance } from "permit-rulebook-data";
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
      // Every internal page address ends in a slash now, so the file behind it
      // is that address plus `index.html`.
      const page = pages.find((p) => p.path === `${href.replace(/[/]$/, "")}/index.html`
        || p.path === `${href.replace(/[/]$/, "")}.html`);
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

  it("Escape closes it from anywhere on the page, and so does a tap outside", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const state = async () => JSON.parse(await page.evaluate(STATE)) as
          { expanded: string; navShown: boolean };
        await page.goto(server.url("/germany/"), 500);
        // Escape pressed on the document, with the focus nowhere near the menu.
        await page.evaluate('document.querySelector(".menu").click()');
        const opened = await state();
        await page.evaluate('document.querySelector("h1").focus ? document.querySelector("h1").focus() : 0');
        await page.evaluate(
          'document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))',
        );
        const afterEscape = JSON.parse(await page.evaluate(
          STATE.replace(/ [}][)]$/, ", onButton: document.activeElement === document.querySelector('.menu') })"),
        )) as { expanded: string; navShown: boolean; onButton: boolean };
        // And a tap on the page outside it.
        await page.evaluate('document.querySelector(".menu").click()');
        const reopened = await state();
        await page.evaluate('document.querySelector("main").click()');
        const afterOutside = await state();
        return { opened, afterEscape, reopened, afterOutside };
      }, { viewport: { width: 390, height: 844 }, mobile: true }) as {
        opened: { expanded: string; navShown: boolean };
        afterEscape: { expanded: string; navShown: boolean; onButton: boolean };
        reopened: { expanded: string; navShown: boolean };
        afterOutside: { expanded: string; navShown: boolean };
      };

      expect(seen.opened.expanded).toBe("true");
      expect(seen.afterEscape.expanded, "Escape from outside the menu did nothing").toBe("false");
      expect(seen.afterEscape.navShown).toBe(false);
      expect(seen.afterEscape.onButton, "Escape left the focus adrift").toBe(true);
      expect(seen.reopened.expanded).toBe("true");
      expect(seen.afterOutside.expanded, "a tap outside left the menu open").toBe("false");
      expect(seen.afterOutside.navShown).toBe(false);
    } finally {
      server.close();
    }
  }, 180000);
});

/**
 * On the live site the country headings over the per-route JSON lists were
 * clipped: the list started over the lower half of the letters, so only their
 * tops showed (human, 2026-09-08). The links carry the inline tap class, whose
 * negative vertical margin is right for a link inside a sentence and, inside a
 * grid, pulled each list up over its own heading.
 */
describe.skipIf(skipped !== null)("the data page's headings sit clear of their lists", () => {
  for (const [width, height] of [[1100, 900], [390, 844]] as const)
    it(`no country heading is overlapped at ${width} px`, async () => {
      const server = await serve(dist);
      try {
        const heads = JSON.parse(await withBrowser(async (page: BrowserPage) => {
          await page.goto(server.url("/data/"), 700);
          return page.evaluate(
            'JSON.stringify([...document.querySelectorAll(".jsonlinks")].map((nav) => {'
            + ' const label = nav.querySelector(".label");'
            + ' const link = nav.querySelector("a");'
            + ' const l = label.getBoundingClientRect();'
            + ' const a = link.getBoundingClientRect();'
            + ' return { text: label.textContent.trim(), height: Math.round(l.height),'
            + '   bottom: Math.round(l.bottom), linkTop: Math.round(a.top),'
            + '   linkHeight: Math.round(a.height) }; }))',
          );
        }, { viewport: { width, height }, mobile: width < 500 }) as string) as
          { text: string; height: number; bottom: number; linkTop: number; linkHeight: number }[];

        expect(heads.length, "no per-route JSON lists on the page").toBe(4);
        for (const head of heads) {
          // The heading has a box of its own, and the list starts below it.
          expect(head.height, `${head.text}: the heading has no height`).toBeGreaterThan(8);
          expect(head.linkTop, `${head.text}: the list starts ${head.bottom - head.linkTop} px over the heading`)
            .toBeGreaterThanOrEqual(head.bottom);
          // And the rows are still a tap target.
          expect(head.linkHeight, `${head.text}: a JSON row is ${head.linkHeight} px`).toBeGreaterThanOrEqual(44);
        }
      } finally {
        server.close();
      }
    }, 180000);
});

/** And the pages still work under their own policy, in a browser. */
describe.skipIf(skipped !== null)("nothing the site does is refused by its own policy", () => {
  it("every kind of page loads, renders and opens its menu with no CSP violation", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage & { allProblems(): string[] }) => {
        const out: Record<string, unknown> = {};
        for (const [name, path] of [
          ["interview", "/"], ["country", "/germany/"], ["data", "/data/"],
          ["route", "/germany/researcher/"], ["error", "/404.html"],
        ] as const) {
          await page.goto(server.url(path), 1500);
          out[name] = {
            menu: await page.evaluate(
              '(() => { const b = document.querySelector(".menu"); if (!b) return "no button";'
              + ' b.click(); return b.getAttribute("aria-expanded"); })()',
            ),
            refused: page.allProblems().filter((p) => /Content Security Policy|Refused to/i.test(p)),
          };
        }
        return out;
      }, { viewport: { width: 390, height: 844 }, mobile: true }) as Record<string, {
        menu: string; refused: string[];
      }>;

      for (const [name, page] of Object.entries(seen)) {
        expect(page.refused, `${name}: the policy refused something`).toEqual([]);
        // The inline menu script is hashed, so it still runs.
        expect(page.menu, `${name}: the menu did not open`).toBe("true");
      }
    } finally {
      server.close();
    }
  }, 180000);
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
