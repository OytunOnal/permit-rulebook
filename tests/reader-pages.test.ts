import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { phraseOf, phraseAtStartOf, countryVocabulary, type Dataset, type Notice } from "permit-rulebook-data";
import { countryAddresses } from "../src/lib/country-page.js";
import { routeAddresses } from "../src/lib/slug.js";
import { DESK, PHONE } from "../scripts/browser/browser.mjs";
import { skipReason, warnNotWalked, withSite } from "./browser-walk.js";
import { isArrowOnLastWordLine, isAsWideAsTextAndArrow, type CardLink } from "./card-link.js";
import {
  DEFAULT_PASSPORT, EVERY_DESTINATION, builtPages, drawnResults, drawnScreens, failuresOf, footLinksOf, headingsOf,
  learnLinksOf, noticePassports, noticesDrawnOnNone, openWithRecord, questionCards, resultsWhere, sentencesOf, unknowingWalks,
  walks, type CardLinkOnScreen, type ReaderPage,
} from "./reader-pages.js";
import { widenedFailuresOf, widenedScreens } from "./widened-screen.js";

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

  it("names each Notice no screen draws, so the phone case's precondition can fail", () => {
    const ids = (ds.notices ?? []).map((n) => n.id);
    expect(ids.length).toBeGreaterThan(1);
    expect(noticesDrawnOnNone([])).toEqual(ids);
    const first = { where: "a screen", html: "", noticeHeadings: [ds.notices![0]!.title], footLinks: [], learnLinks: [], failure: null };
    expect(noticesDrawnOnNone([first])).toEqual(ids.slice(1));
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

/** The passport whose Notice carries a foot link too long for a phone's line. */
const ALGERIAN_PASSPORT = "DZ";
/** The Notice that names `passport`, read from the dataset so its title and
 * label stay the data's. Throws where none does. */
function noticeNaming(passport: string): Notice {
  const notice = (ds.notices ?? []).find((n) => n.when.value === passport);
  if (!notice) throw new Error(`precondition: a Notice names the passport ${passport}`);
  return notice;
}

/** A card link as a failure names it: where, on which card, and how it lays out. */
const failureLineOf = (link: CardLinkOnScreen): string => {
  const arrow = link.arrowFromLastWord;
  const arrowAt = arrow === null ? "its ↗ nowhere"
    : `its ↗ ${arrow.right.toFixed(1)} px right of its last word and ${arrow.down.toFixed(1)} px down from its line`;
  const fits = link.fitsItsLine ? "its label fits its line" : "its label does not fit its line";
  return `${link.where}, "${link.label}" on "${link.card}": ${fits}, ${link.lines} line(s), ${arrowAt}, ${
    link.width.toFixed(2)} px wide for ${link.textWidth.toFixed(2)} px of text and a ${link.loneArrowWidth.toFixed(2)} px ↗`;
};

/** Whether a link lays out as the desk draws it. Where its label fits its
 * line: on one line, its ↗ right after its last word, as wide as its text and
 * a lone ↗. Where it does not, as in a wider font than this machine's: its ↗
 * on its last word's line. */
const isLaidOutForTheDesk = (link: CardLink): boolean =>
  link.fitsItsLine
    ? link.lines === 1 && isArrowOnLastWordLine(link) && isAsWideAsTextAndArrow(link)
    : isArrowOnLastWordLine(link);

/** One word longer than a phone's line, as a label holding a URL would be. */
const LONG_WORD = "Unbreakable".repeat(12);

/** Reads, in the page, how results drawing a Learn link lay out once every
 * card link's label is LONG_WORD: the page's width and scroll width, how many
 * foot and Learn links took it, and the furthest right edge among them. A
 * screen with no Learn link is left as it is and counts none. */
const WITH_LONG_LABELS = `(() => {
  for (const folded of document.querySelectorAll("#main details:not([open])")) folded.open = true;
  const foot = [...document.querySelectorAll("#main .foot > a.next")];
  const learn = [...document.querySelectorAll("#main .learn a")];
  if (learn.length === 0) return JSON.stringify({ innerWidth, scrollWidth: 0, foot: 0, learn: 0, furthestRight: 0 });
  for (const link of [...foot, ...learn]) link.textContent = ${JSON.stringify(LONG_WORD)};
  const furthestRight = Math.max(...[...foot, ...learn].map((link) => link.getBoundingClientRect().right));
  return JSON.stringify({ innerWidth, scrollWidth: document.documentElement.scrollWidth, foot: foot.length, learn: learn.length, furthestRight });
})()`;

/** How a results screen laid out with LONG_WORD for every card link's label. */
interface LongLabelsLaidOut {
  where: string;
  innerWidth: number;
  scrollWidth: number;
  foot: number;
  learn: number;
  furthestRight: number;
}

const notWalked = skipReason();
if (notWalked) warnNotWalked("the results and the arrival line", notWalked);

describe.skipIf(notWalked !== null)("every screen the module draws", () => {
  it("opens every heading and sentence led by a country's name with a capital, and names it with its article, on the results and the arrival line", async () => {
    const screens = await withSite(drawnScreens, DESK);
    expect(failuresOf(screens)).toEqual([]);
    expect(screens.every((s) => s.html.includes('id="main"')), "a screen drew no box").toBe(true);
    expect(lowerOpened(screens)).toEqual([]);
    expect(articleDropped(screens)).toEqual([]);
  }, 600000);

  it("lays out every foot link and Learn link whose label fits its line on one line at the desk, as wide as its text and a lone ↗, and every other with its ↗ on its last word's line, on the Algerian reader's results, on the results for every destination at once and on the results of a reader who does not know", async () => {
    const everyDestination = walks().filter((w) => w.answers["destination"] === EVERY_DESTINATION);
    const guarded = [...walks(ALGERIAN_PASSPORT), ...everyDestination, ...unknowingWalks()];
    const screens = await withSite((site) => drawnResults(site, guarded), DESK);
    expect(failuresOf(screens)).toEqual([]);
    expect(footLinksOf(screens, noticeNaming(ALGERIAN_PASSPORT)), "the Algerian notice's foot link is on none of the screens").not.toEqual([]);
    expect(learnLinksOf(screens), "no screen draws a Learn link").not.toEqual([]);
    const links = [...footLinksOf(screens), ...learnLinksOf(screens)];
    expect(links.filter((link) => link.fitsItsLine), "no link's label fits its line").not.toEqual([]);
    expect(links.filter((link) => !isLaidOutForTheDesk(link)).map(failureLineOf)).toEqual([]);
  }, 600000);
});

describe.skipIf(notWalked !== null)("every screen the module draws, on a phone", () => {
  it("draws every Notice, lays out every screen at the phone's width, its text as drawn and widened, and wraps the Algerian notice's foot link and a Learn link with each ↗ on its last word's line", async () => {
    const walksTaken = [...[DEFAULT_PASSPORT, ...noticePassports()].flatMap((passport) => walks(passport)), ...unknowingWalks()];
    const { screens, widened } = await withSite(async (site) => ({
      screens: await drawnScreens(site, walksTaken),
      widened: await widenedScreens(site, walksTaken),
    }), PHONE);
    // Soft, so a Notice drawn only on screens wider than the phone, which are
    // read for nothing, is named beside those screens' failures.
    expect.soft(noticesDrawnOnNone(screens), "a Notice no screen draws").toEqual([]);
    expect.soft(failuresOf(screens)).toEqual([]);
    expect(widened.length, "the wide pass drew another set of screens").toBe(screens.length);
    expect.soft(widenedFailuresOf(widened, PHONE.viewport.width)).toEqual([]);
    const algerianLinks = footLinksOf(screens, noticeNaming(ALGERIAN_PASSPORT));
    expect(algerianLinks).not.toEqual([]);
    expect.soft(algerianLinks.filter((link) => link.lines < 2 || !isArrowOnLastWordLine(link)).map(failureLineOf)).toEqual([]);
    const wrappedLearnLinks = learnLinksOf(screens).filter((link) => link.lines > 1);
    expect(wrappedLearnLinks, "no screen draws a Learn link that wraps").not.toEqual([]);
    expect.soft(wrappedLearnLinks.filter((link) => !isArrowOnLastWordLine(link)).map(failureLineOf)).toEqual([]);
  }, 900000);

  it("breaks a label of one word longer than the line within the screen, at a card's foot and in its Learn box", async () => {
    const laidOut = await withSite(async (site) => {
      const screens: LongLabelsLaidOut[] = [];
      for (const walk of unknowingWalks()) {
        await openWithRecord(site, "/", walk);
        screens.push({ where: resultsWhere(walk), ...(JSON.parse(await site.page.evaluate(WITH_LONG_LABELS)) as Omit<LongLabelsLaidOut, "where">) });
      }
      return screens;
    }, PHONE);
    const withBoth = laidOut.filter((s) => s.foot > 0 && s.learn > 0);
    expect(withBoth, "no screen draws a foot link and a Learn link").not.toEqual([]);
    const phone = PHONE.viewport.width;
    expect(withBoth.filter((s) => s.innerWidth !== phone || s.scrollWidth > phone || s.furthestRight > phone)).toEqual([]);
  }, 600000);
});
