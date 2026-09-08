import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import { DISCLAIMER } from "../src/lib/copy.js";
import { countryLinks, footerFacts, navCountries } from "../src/lib/country-page.js";
import { DATA_PATH, siteFooter } from "../src/lib/identity.js";
import { routePages } from "../src/lib/route-page.js";
import { dataPage } from "../src/lib/data-page.js";
import { NEW_NEED_URL, REPO_DATA, SPONSOR_URL, TRACKER_URL, lastWatchRun, url } from "../src/lib/site.js";
import type { Dataset } from "permit-rulebook-data";

/**
 * One footer under every page.
 *
 * Each page had grown its own — the interview three links and a health line, a
 * route page a disclaimer and a different health line, the country page three
 * ends, the 404 a sentence — so the way out of the product depended on which
 * page you were standing on, and the site map found no page linking another
 * country at all (2026-09-08). The header answers "where am I"; this answers
 * "where else, and who says so".
 */

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));
const read = (path: string): string => readFileSync(path, "utf8").split("\r\n").join("\n");

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

const footerOf = (html: string): string => {
  const start = html.indexOf('<footer class="site-foot">');
  if (start < 0) return "";
  return html.slice(start, html.indexOf("</footer>", start) + "</footer>".length);
};

/**
 * What a reader sees, with the markup taken out. The data line holds its
 * unbreakable tokens in their own elements, so its sentences live across tags
 * and only the rendered text can be asserted whole.
 */
const readerSees = (html: string): string =>
  html.replace(/<[^>]*>/g, "").split(/\s+/).join(" ").split(String.fromCharCode(160)).join(" ").trim();

/** The footer with the two things that legitimately differ taken out. */
const shared = (footer: string): string =>
  footer
    .replace(/ aria-current="(page|true)"/g, "")
    .replace(/<li><a class="tap-min" href="[^"]*">This route as JSON<\/a><\/li>/, "")
    // "Check yours" is pre-scoped where a country is known, so its href is the
    // page's business, not the footer's.
    .replace(/<li class="act"><a class="tap-min" href="[^"]*">/, '<li class="act"><a href="CHECK">')
    .replace(/\s+/g, " ")
    .trim();

describe("one footer, every page", () => {
  const pages = builtPages();

  it("every built page carries it, and it is the same block on all of them", () => {
    expect(pages.length, "nothing is built — run npm run build").toBeGreaterThan(25);
    const reference = shared(siteFooter(navCountries(ds), footerFacts(ds)));
    for (const page of pages) {
      const footer = footerOf(page.html);
      expect(footer, `${page.path} has no site footer`).not.toBe("");
      expect(shared(footer), `${page.path}'s footer differs from every other page's`).toBe(reference);
    }
  });

  it("the two things that may differ, and nothing else", () => {
    // The current country is marked as the header marks it.
    for (const page of pages.filter((p) => /^\/[a-z-]+\/index\.html$/.test(p.path))) {
      const footer = footerOf(page.html);
      if (!countryLinks(ds).some((l) => page.path === `${l.path}/index.html`)) continue;
      expect(footer, page.path).toContain('aria-current="page"');
    }
    for (const route of routePages(ds)) {
      const footer = footerOf(route.html);
      expect(footer, route.path).toContain('aria-current="true"');
      // And the route's own JSON, which no other page may claim.
      expect(footer, route.path).toContain("This route as JSON");
      expect(footer, route.path).toContain(`href="${url(`${route.path}.json`)}"`);
    }
    for (const page of pages.filter((p) => !/^\/[a-z-]+\/[a-z0-9-]+\/index\.html$/.test(p.path)))
      expect(footerOf(page.html), `${page.path} offers a route's JSON`).not.toContain("This route as JSON");
  });

  it("the disclaimer is said once per page, in the words copy.ts holds", () => {
    for (const page of pages) {
      const text = page.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
      const said = text.split(DISCLAIMER).length - 1;
      expect(said, `${page.path} says the disclaimer ${said} times`).toBe(1);
    }
  });

  it("every link resolves inside the site, or names an allowed host", () => {
    const inside = new Set([
      ...countryLinks(ds).map((l) => url(l.path)),
      url("/"), url(DATA_PATH), ...routePages(ds).map((r) => url(`${r.path}.json`)),
    ]);
    const ALLOWED = [REPO_DATA, TRACKER_URL, NEW_NEED_URL, SPONSOR_URL,
      "https://github.com/OytunOnal/permit-rulebook-data/blob/master/data/LICENSE"];
    for (const page of builtPages()) {
      const footer = footerOf(page.html);
      for (const href of [...footer.matchAll(/href="([^"]*)"/g)].map((m) => m[1]!)) {
        if (href.startsWith("http")) {
          expect(ALLOWED.some((a) => href.startsWith(a)), `${page.path}: ${href}`).toBe(true);
          continue;
        }
        // Internal: either a page we build, or the pre-scoped checker.
        const bare = href.split("?")[0]!;
        expect(inside.has(href) || inside.has(bare), `${page.path}: ${href} goes nowhere`).toBe(true);
      }
    }
  });

  it("every outbound link says it leaves, and cannot reach back", () => {
    const footer = siteFooter(navCountries(ds), footerFacts(ds));
    for (const tag of [...footer.matchAll(/<a [^>]*href="https?:[^"]*"[^>]*>/g)].map((m) => m[0])) {
      expect(tag, tag).toContain('target="_blank"');
      expect(tag, tag).toContain('rel="noopener"');
      expect(tag, tag).toContain('class="out');
    }
  });

  it("the data line states the span the values were read over, from the dataset", () => {
    const facts = footerFacts(ds);
    const footer = siteFooter(navCountries(ds), facts);
    expect(footer).toContain(`values read between <b><time datetime="${facts.read.oldest}">`);
    // "Re-read daily" is a claim, so the day it last happened is printed with
    // it, from the watch's own state (devils-advocate, 2026-09-08).
    expect(readerSees(footer)).toContain(`re-read daily (last run ${facts.lastRun})`);
    expect(facts.lastRun, "the watch has never recorded a run").toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
    expect(facts.lastRun).toBe(lastWatchRun());
    expect(footer).toContain(`dataset ${facts.datasetVersion}`);
    // The oldest is really the oldest, and the two ends are different days.
    expect(facts.read.oldest < facts.read.newest, `${facts.read.oldest}..${facts.read.newest}`).toBe(true);
    // The schema version belongs to the data page now, not to every page.
    expect(footer).not.toContain(ds.schema_version);
    expect(footer).toContain(`\u00a9 ${facts.year} Oytun Onal`);
  });
});

/** And how it lays out, measured at the widths the critique named. */
const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
}

const LAYOUT = 'JSON.stringify((() => {'
  + ' const foot = document.querySelector(".site-foot");'
  + ' const cols = [...foot.querySelectorAll(".col")].map((c) => Math.round(c.getBoundingClientRect().left));'
  + ' const links = [...foot.querySelectorAll("a")].map((a) => ({'
  + '   text: a.textContent.trim(), height: Math.round(a.getBoundingClientRect().height),'
  + '   underline: getComputedStyle(a).textDecorationLine }));'
  + ' const lines = [...foot.querySelectorAll(".line > span")].map((s) => Math.round(s.getBoundingClientRect().height));'
  + ' return { rows: new Set(cols).size, cols, links, lines }; })())';

describe.skipIf(skipped !== null)("the footer lays out where it says it does", () => {
  // The mock's own steps: three columns, two below 760, one below 480. Measured
  // per page, because a count that depends on how wide the page happens to be
  // is not a design (Spec review, 2026-09-08).
  for (const [width, columns] of [[1100, 3], [761, 3], [760, 2], [600, 2], [481, 2], [390, 1]] as const)
    it(`${columns} column${columns === 1 ? "" : "s"} at ${width} px`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => {
          const at: Record<string, unknown> = {};
          // The same block on every page, so the count is measured on each.
          for (const [name, path] of [
            ["route", "/germany/eu-blue-card-general/"], ["interview", "/"],
            ["country", "/germany/"], ["data", "/data/"],
          ] as const) {
            await page.goto(server.url(path), 500);
            at[name] = JSON.parse(await page.evaluate(LAYOUT));
          }
          return at;
        }, { viewport: { width, height: 900 }, mobile: width < 500 }) as Record<string, {
          rows: number; cols: number[];
          links: { text: string; height: number; underline: string }[];
          lines: number[];
        }>;

        for (const [name, page] of Object.entries(seen))
          expect(page.rows, `${name} at ${width}: columns at ${page.cols.join(", ")}`).toBe(columns);
        // Every link is a tap target, and looks like a link before it is touched.
        for (const link of seen.route!.links) {
          expect(link.height, `"${link.text}" is ${link.height} px at ${width}`).toBeGreaterThanOrEqual(44);
          // Every column link looks like a link at rest. The one exception is
          // the action, which is a bordered button and says so that way.
          if (link.text === "Check yours" || link.text.endsWith("Permit Rulebook")) continue;
          expect(link.underline, `"${link.text}" has no resting underline`).toContain("underline");
        }
      } finally {
        server.close();
      }
    }, 180000);

  it("at 390 nothing that cannot break is wider than its column", async () => {
    const server = await serve(dist);
    try {
      const seen = JSON.parse(await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/germany/eu-blue-card-general/"), 500);
        // The runner's fonts are wider than this machine's, and a family wider
        // still is only a matter of time: measure the widened case.
        await page.evaluate(
          '(() => { const s = document.createElement("style");'
          + ' s.textContent = ":root{--font-serif:serif;--font-sans:sans-serif;--font-mono:monospace}"'
          + ' + "body{letter-spacing:0.11em}";'
          + ' document.head.appendChild(s); return 1; })()',
        );
        await new Promise((r) => setTimeout(r, 250));
        return page.evaluate(
          // An inline element that wraps sits on more than one line: its
          // fragments start at more than one top edge. (A count of fragments
          // would not do, since a token holding a `time` child has one per
          // child on a single line.)
          'JSON.stringify({ column: Math.round(document.querySelector(".site-foot .line")'
          + '.getBoundingClientRect().width),'
          + ' lines: [...document.querySelectorAll(".site-foot .line > span")]'
          + '  .map((el) => ({ text: el.textContent.trim().slice(0, 30),'
          + '    width: Math.round(el.getBoundingClientRect().width) })),'
          + ' held: [...document.querySelectorAll(".site-foot .line *")]'
          + '  .filter((el) => getComputedStyle(el).whiteSpace === "nowrap")'
          + '  .map((el) => ({ text: el.textContent.trim(),'
          + '    width: Math.round(el.getBoundingClientRect().width),'
          + '    lines: new Set([...el.getClientRects()]'
          + '      .map((r) => Math.round(r.top))).size })) })',
        );
      }, { viewport: { width: 390, height: 844 }, mobile: true }) as string) as {
        column: number; lines: { text: string; width: number }[];
        held: { text: string; width: number; lines: number }[];
      };

      // Each of the two lines fits its column: a line that cannot break inside
      // itself is exactly how the page came to scroll sideways in CI.
      expect(seen.lines.length, "the data line is missing").toBe(2);
      for (const line of seen.lines)
        expect(line.width, `"${line.text}..." is ${line.width} px in a ${seen.column} px column`)
          .toBeLessThanOrEqual(seen.column);
      expect(seen.held.length, "the lines hold no token whole").toBeGreaterThan(5);
      for (const token of seen.held) {
        // The design rule: nothing may be nowrap wider than the column it sits
        // in, or the column cannot hold it and the page scrolls sideways.
        expect(token.width, `"${token.text}" is ${token.width} px in a ${seen.column} px column`)
          .toBeLessThanOrEqual(seen.column);
        expect(token.lines, `"${token.text}" wrapped inside itself`).toBeLessThanOrEqual(1);
      }
      // The tokens a reader must never see split.
      const texts = seen.held.map((t) => t.text);
      expect(texts.some((t) => t.includes("Oytun Onal")), texts.join(" | ")).toBe(true);
      expect(texts.some((t) => t.startsWith("(last run ")), texts.join(" | ")).toBe(true);
      expect(texts.filter((t) => /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(t)).length,
        `read dates held whole: ${texts.join(" | ")}`).toBeGreaterThanOrEqual(2);
    } finally {
      server.close();
    }
  }, 180000);
});

/**
 * The site said the corner date "moves on its own". It does not: it is the
 * newest reading in the dataset, and only a person writes one. What moves by
 * itself is the watch's own run, so that is what is printed — and it is read
 * from the watch's state rather than described (devils-advocate, 2026-09-08).
 */
describe("what the site says about the daily check is what the watch recorded", () => {
  it("the data page prints the watch's own last-run day", () => {
    const html = dataPage(ds).html;
    const run = lastWatchRun();
    expect(run, "the watch state carries no last_run").toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
    expect(html).toContain(`last run <b><time datetime="${run}">${run}</time></b>`);
    // And it no longer claims a mechanism that does not exist.
    expect(html).not.toContain("moves on its own");
    expect(html).not.toContain("asks this site to rebuild");
    // It says who changes a value instead.
    expect(html).toContain("change when a person changes them");
  });

  it("the same day, in the footer, on every page", () => {
    const run = lastWatchRun();
    for (const page of builtPages())
      expect(readerSees(footerOf(page.html)), `${page.path}`)
        .toContain(`re-read daily (last run ${run})`);
  });
});
