import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { warnNotWalked } from "./browser-walk.js";
import { builtPages, builtSheetsOf, root } from "./built-sheets.js";
import { PRIYA_EXPLORING_ALL } from "./personas.js";
import { blocksIn, everyDrawnRouteIn, verdictFor } from "./verdict-cards.js";

/**
 * A link about the route itself, the door to its page here and its link to
 * its authority's route page, is drawn in one look, written once, in the sheet
 * the results screen and every page built as a string load (#401, ruling 7):
 * the door and the authority's link both take it, and no screen's own sheet
 * draws it again. Read from the sheets each built page carries, as the
 * browser receives them.
 */

const ds = dataset as unknown as Dataset;

/** The class every link about the route wears for its look. */
const ROUTE_LINK_CLASS = "route-link";

/** The class the link to a route's authority's route page alone wears. */
const AUTHORITY_LINK = "authority-route-page";

/** Each rule a stylesheet writes on a selector naming `cls`: its declarations,
 * spaces taken out and in order, so a minified sheet, which may reorder them,
 * and a written one read alike. A comment is no rule, and is taken out first. */
const rulesNaming = (css: string, cls: string): string[] =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}@;]+)\{([^{}]*)\}/g)]
    .filter((rule) => new RegExp(`\\.${cls}(?![\\w-])`).test(rule[1]!))
    .map((rule) => rule[2]!.replace(/\s+/g, "").split(";").filter(Boolean).sort().join(";"));

/** A stylesheet with each escaped character (`\2197`) as the character it
 * stands for, so a minified sheet, which writes it out, and a written one
 * read alike. */
const withEscapesRead = (css: string): string =>
  css.replace(/\\([0-9a-fA-F]{1,6}) ?/g, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));

/** The site's own pages, beside one per route and one per country. */
const SITE_PAGES = ["dist/index.html", "dist/404.html", "dist/data/index.html", "dist/feedback/index.html"];

/** Every built page, once the case has checked that the site's own pages
 * are among them and that there are more than one per route and one per
 * country. */
function everyBuiltPage(): string[] {
  const pages = builtPages();
  const routes = ds.countries.flatMap((country) => country.routes).length;
  expect(pages, "precondition: the site's own pages are built").toEqual(expect.arrayContaining(SITE_PAGES));
  expect(pages.length, "precondition: every page is read, the site's, one per route and one per country")
    .toBeGreaterThan(routes + ds.countries.length);
  return pages;
}

const noBuild = existsSync(root("dist")) ? null : "no dist/ — run npm run build first";
if (noBuild) warnNotWalked("the built sheets of the route link's look", noBuild);

// The title these cases sit under; every block below repeats it, so each case keeps its id.
const WRITTEN_ONCE = "a link about the route has one look, written once";

describe.skipIf(noBuild !== null)(WRITTEN_ONCE, () => {
  it("every built page, the results page and each route page among them, draws the look exactly once, the same on each", () => {
    const pages = everyBuiltPage();
    const looks = new Map<string, string[]>();
    for (const page of pages) looks.set(page, rulesNaming(builtSheetsOf(page), ROUTE_LINK_CLASS));
    const offenders = [...looks].filter(([, rules]) => rules.length !== 1).map(([page, rules]) => `${page}: ${rules.length}`);
    expect(offenders, "a page that draws the look other than once").toEqual([]);
    const drawn = new Set([...looks.values()].flat());
    expect(drawn.size, `the look is drawn more than one way: ${[...drawn].join(" | ")}`).toBe(1);
  });

  it("every built page, each route page among them, draws the link to an authority's route page only as the results page does, with no rule of its own for it", () => {
    const pages = everyBuiltPage();
    const rulesOf = (page: string) => rulesNaming(withEscapesRead(builtSheetsOf(page)), AUTHORITY_LINK).join(" | ");
    const shared = rulesOf("dist/index.html");
    expect(shared, "precondition: the results page's sheet draws the link").not.toBe("");
    const offenders = pages.filter((page) => rulesOf(page) !== shared);
    expect(offenders).toEqual([]);
  });

  it("no built page draws the door's look on the door itself", () => {
    const pages = everyBuiltPage();
    const offenders = pages.filter((page) => /\.scoped\s+\.door/.test(builtSheetsOf(page)));
    expect(offenders).toEqual([]);
  });
});

describe(WRITTEN_ONCE, () => {
  it("the door and the link to the authority's route page both wear the look", () => {
    const withDoor = everyDrawnRouteIn(verdictFor(PRIYA_EXPLORING_ALL)).map((drawn) => drawn.html)
      .filter((html) => blocksIn(html, "scoped") !== "");
    expect(withDoor.length, "precondition: the reader is shown routes with a door").toBeGreaterThan(0);
    for (const html of withDoor) {
      const door = /<a class="([^"]*)" href="[^"]*">/.exec(blocksIn(html, "scoped"));
      const authority = /<a class="([^"]*\bauthority-route-page\b[^"]*)"/.exec(html);
      expect(door?.[1]?.split(" "), "the door").toContain(ROUTE_LINK_CLASS);
      expect(authority?.[1]?.split(" "), "the link to the authority's route page").toContain(ROUTE_LINK_CLASS);
    }
  });
});
