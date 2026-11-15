import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { countryPages } from "../src/lib/country-page.js";
import { dataPage } from "../src/lib/data-page.js";
import { feedbackPage } from "../src/lib/feedback-page.js";
import { WIDE_FROM_PX } from "../src/lib/first-paint.js";
import { routePage } from "../src/lib/route-page/route-page.js";
import { routeAddresses } from "../src/lib/slug.js";
import { frameAlone } from "./frame-alone.js";

/**
 * The site's one narrow/wide breakpoint is written once (#388, ruling 5 on
 * #323): a stylesheet names the narrow or the wide side, and the build writes
 * the first paint's width in its place, in the site's build and in the suite
 * alike. So the cases read what the reader gets, never the source sheets
 * (ruling 14 on #382): every width query a page carries turns at the first
 * paint's width, and no name is left for the browser to ignore.
 */

const root = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const read = (p: string) => readFileSync(root(p), "utf8");

/**
 * The masthead's own breakpoints, `max-width: 959px` and `max-width: 480px` in
 * `identity.css`, each by the first width past it: other breakpoints than the
 * site's narrow/wide one (#388), so the cases let them stand.
 */
const MASTHEAD_TURNS = [960, 481];

/** Which side of a width a query reads, and the first width of the wide side. */
interface WidthQuery { side: "narrow" | "wide"; turnsAt: number }

/** The prelude of every `@media` rule in `css`, as written. */
const mediaPreludesIn = (css: string): string[] =>
  [...css.matchAll(/@media\s*([^{]*)\{/g)].map((m) => m[1]!.trim());

/**
 * Every width a media prelude reads, in either form a sheet reaches the
 * browser in: the source's `(max-width: 760px)` and the minifier's
 * `(width<=760px)`. Throws on a width it cannot read, so no form slips past.
 */
function widthQueriesIn(prelude: string): WidthQuery[] {
  const queries: WidthQuery[] = [];
  for (const m of prelude.matchAll(/\((min|max)-width\s*:\s*(\d+)px\)/g))
    queries.push(m[1] === "max" ? { side: "narrow", turnsAt: Number(m[2]) + 1 } : { side: "wide", turnsAt: Number(m[2]) });
  for (const m of prelude.matchAll(/\(width\s*(<=|<|>=|>)\s*(\d+)px\)/g)) {
    const px = Number(m[2]);
    queries.push(m[1]!.startsWith("<")
      ? { side: "narrow", turnsAt: m[1] === "<=" ? px + 1 : px }
      : { side: "wide", turnsAt: m[1] === ">=" ? px : px + 1 });
  }
  const widths = (prelude.match(/width/g) ?? []).length;
  if (queries.length !== widths) throw new Error(`a width the case cannot read: @media ${prelude}`);
  return queries;
}

/**
 * What a page's stylesheets say about its breakpoint: the names left in its
 * media queries, the sides it turns at the first paint's width, and every
 * width it turns at that is neither that width nor the masthead's own.
 */
function breakpointOf(css: string): { namesLeft: string[]; sidesAtFirstPaint: string[]; strayTurns: string[] } {
  const preludes = mediaPreludesIn(css);
  const queries = preludes.flatMap((prelude) => widthQueriesIn(prelude).map((query) => ({ prelude, ...query })));
  return {
    namesLeft: preludes.filter((prelude) => prelude.includes("(--")),
    sidesAtFirstPaint: [...new Set(queries.filter((q) => q.turnsAt === WIDE_FROM_PX).map((q) => q.side))].sort(),
    strayTurns: queries
      .filter((q) => q.turnsAt !== WIDE_FROM_PX && !MASTHEAD_TURNS.includes(q.turnsAt))
      .map((q) => `@media ${q.prelude}`),
  };
}

/** Every built page under `dist/`, by its path from the root. */
function builtPages(dir = "dist", out: string[] = []): string[] {
  for (const name of readdirSync(root(dir))) {
    const path = `${dir}/${name}`;
    if (statSync(root(path)).isDirectory()) builtPages(path, out);
    else if (name.endsWith(".html")) out.push(path);
  }
  return out;
}

/** A built page's stylesheets as the browser receives them: the inline ones and the ones it links. */
function builtSheetsOf(page: string): string {
  const html = read(page);
  const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]!);
  const linked = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)]
    .map((m) => read(`dist/${m[1]!.replace(/^.*\/_astro\//, "_astro/")}`));
  return [...inline, ...linked].join("\n");
}

const ds = dataset as unknown as Dataset;

// The title these cases sit under; every block below repeats it, so each case keeps its id.
const WRITTEN_ONCE = "the breakpoint is written once";

describe(WRITTEN_ONCE, () => {
  it("every built page's narrow/wide queries carry the first paint's width, with no name left", () => {
    const pages = builtPages();
    const routes = ds.countries.flatMap((country) => country.routes).length;
    expect(pages.length, "precondition: every page is built, the site's, one per route and one per country")
      .toBeGreaterThan(routes + ds.countries.length);
    for (const page of pages) {
      const breakpoint = breakpointOf(builtSheetsOf(page));
      expect(breakpoint.namesLeft, `${page}: a breakpoint name the build left`).toEqual([]);
      expect(breakpoint.sidesAtFirstPaint, `${page} turns narrow and wide at the first paint's width`)
        .toEqual(["narrow", "wide"]);
      expect(breakpoint.strayTurns, `${page}: a width query off the first paint's width`).toEqual([]);
    }
  });
});

describe(WRITTEN_ONCE, () => {
  it("the pages the suite builds get the same width in place of the names", () => {
    // The suite reads the sheets through its own pipeline, not the build's, so
    // each page that inlines a sheet with a breakpoint is drawn here: the frame's
    // own and the route, country, data and feedback pages' rules.
    const pages = {
      frame: frameAlone(ds),
      route: routePage(ds, routeAddresses(ds)[0]!).html,
      country: countryPages(ds)[0]!.html,
      data: dataPage(ds).html,
      feedback: feedbackPage(ds).html,
    };
    for (const [page, html] of Object.entries(pages)) {
      const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]!).join("\n");
      const breakpoint = breakpointOf(css);
      expect(breakpoint.namesLeft, `the ${page} page: a breakpoint name the suite left`).toEqual([]);
      expect(breakpoint.sidesAtFirstPaint, `the ${page} page turns narrow and wide at the first paint's width`)
        .toEqual(["narrow", "wide"]);
      expect(breakpoint.strayTurns, `the ${page} page: a width query off the first paint's width`).toEqual([]);
    }
  });
});
