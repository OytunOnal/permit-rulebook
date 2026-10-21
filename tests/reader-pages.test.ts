import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { phraseOf, phraseAtStartOf, countryVocabulary, type Dataset } from "permit-rulebook-data";
import { countryAddresses } from "../src/lib/country-page.js";
import { routeAddresses } from "../src/lib/slug.js";
import { DESK, skipReason, warnNotWalked, withSite } from "./browser-walk.js";
import {
  builtPages, drawnScreens, headingsOf, questionCards, sentencesOf, walks, type ReaderPage,
} from "./reader-pages.js";

/**
 * A country's name opens a sentence with a capital (#152; #151, ruling 6).
 *
 * The phrases are the country list's: every name whose phrase inside a
 * sentence differs from its phrase at a sentence's start ("the Netherlands",
 * "The Netherlands"). No heading and no sentence on any page the reader meets
 * may open with the first.
 */

const ds = rawDataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

const LOWER_OPENINGS = countryVocabulary.countries
  .filter((c) => phraseOf(c.code) !== phraseAtStartOf(c.code))
  .map((c) => phraseOf(c.code));

/** The in-sentence phrase a text opens with, or undefined. */
const lowerOpening = (text: string): string | undefined =>
  LOWER_OPENINGS.find((p) => text.startsWith(p) && !/\p{L}/u.test(text.charAt(p.length)));

/** Every heading and sentence of the pages that opens with a country's
 * in-sentence phrase, with where it was read. */
function lowerOpened(pages: ReaderPage[]): string[] {
  return pages.flatMap(({ where, html }) =>
    [...headingsOf(html), ...sentencesOf(html)]
      .filter((text) => lowerOpening(text) !== undefined)
      .map((text) => `${where}: ${text}`));
}

/** A name that takes an article, standing in a sentence without it. */
const BARE_NAMES = countryVocabulary.countries
  .filter((c) => phraseOf(c.code) !== c.name)
  .map((c) => ({ name: c.name, bare: new RegExp(`(?<![Tt]he )\\b${c.name}\\b`, "u") }));

/** Every heading and sentence of the pages that names such a country without
 * its article. A heading's parts between " · " that are a name alone are
 * labels, and a label keeps the bare name. */
function articleDropped(pages: ReaderPage[]): string[] {
  const names = new Set(BARE_NAMES.map(({ name }) => name));
  return pages.flatMap(({ where, html }) =>
    [...headingsOf(html).flatMap((h) => h.split(" · ")), ...sentencesOf(html)]
      .filter((text) => !names.has(text) && BARE_NAMES.some(({ bare }) => bare.test(text)))
      .map((text) => `${where}: ${text}`));
}

describe("the walk's own precondition", () => {
  it("the list holds names that take an article, so the check below can fail", () => {
    expect(LOWER_OPENINGS).toContain("the Netherlands");
    expect(lowerOpening("the Netherlands: 7 routes.")).toBe("the Netherlands");
    expect(lowerOpening("The Netherlands: 7 routes.")).toBeUndefined();
    expect(articleDropped([{ where: "a page", html: "<p>Netherlands's route.</p>" }])).toHaveLength(1);
    expect(articleDropped([{ where: "a page", html: "<p>The Netherlands' route, in the Netherlands.</p>" }])).toEqual([]);
  });

  it("walks every interview a reader can give, for every destination answer", () => {
    expect(new Set(walks().map((w) => w.answers["destination"])).size).toBe(ds.countries.length + 1);
  });
});

const noBuild = existsSync(dist) ? null : "no dist/ — run npm run build first";
if (noBuild) warnNotWalked("the built pages", noBuild);

describe.skipIf(noBuild !== null)("every page the build draws", () => {
  it("draws the home page, each country page, each route page and /data/", () => {
    const where = new Set(builtPages().map((p) => p.where));
    const expected = [
      "/index.html", "/data/index.html",
      ...countryAddresses(ds).map((a) => `${a.path}/index.html`),
      ...routeAddresses(ds).map((a) => `${a.path}/index.html`),
    ];
    for (const path of expected) expect(where, path).toContain(path);
  });

  it("opens every heading and sentence led by a country's name with a capital", () => {
    expect(lowerOpened(builtPages())).toEqual([]);
  });

  it("names a country with its article wherever its name falls in a heading or a sentence", () => {
    expect(articleDropped(builtPages())).toEqual([]);
  });
});

describe("every question card the interview draws", () => {
  it("opens every heading and sentence led by a country's name with a capital", () => {
    const cards = questionCards();
    expect(cards.length).toBeGreaterThan(0);
    expect(lowerOpened(cards)).toEqual([]);
  });

  it("names a country with its article wherever its name falls in a heading or a sentence", () => {
    expect(articleDropped(questionCards())).toEqual([]);
  });
});

const notWalked = skipReason();
if (notWalked) warnNotWalked("the results and the arrival line", notWalked);

describe.skipIf(notWalked !== null)("every screen the module draws", () => {
  it("opens every heading and sentence led by a country's name with a capital, and names it with its article, on the results and the arrival line", async () => {
    const screens = await withSite(drawnScreens, DESK);
    expect(screens.every((s) => s.html.includes('id="main"')), "a screen drew no box").toBe(true);
    expect(lowerOpened(screens)).toEqual([]);
    expect(articleDropped(screens)).toEqual([]);
  }, 600000);
});
