import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import {
  DESTINATION_FIELD, phraseAtStartOf, evaluate, isClosed, isScored, scopeLine, scopeWords,
  type Dataset, type Profile,
} from "permit-rulebook-data";
import { countryAddresses } from "../src/lib/country-page.js";
import { routeAddresses } from "../src/lib/slug.js";
import {
  PRODUCT_NAME, TAGLINE, answersCheckedLine, countryHeadline, dataLedeOpen, dataMetaDescription, datasetDescription,
  promise, routesCheckerAsksAbout,
} from "../src/lib/copy.js";
import { routeCounts } from "../src/lib/data-page.js";
import { socialCardFacts, socialCardHtml } from "../src/lib/social-card.js";
import { DESK, skipReason, warnNotWalked, withSite } from "./browser-walk.js";
import {
  builtPages, drawnScreens, headingsOf, plainTextOf, questionCards, walks, type ReaderPage,
} from "./reader-pages.js";

/**
 * "Checked", not "scored" (#153; #151, rulings 2–5 and 17 of #92).
 *
 * The words this suite looks for are the ones the contract declares: GLOSSARY's
 * Scope statement avoid-list, which keeps the model's words in code and on
 * `/data/`, and the scope line's two forms, which the data package gives.
 */
const SCOPE_STATEMENT_AVOID_LIST = ["scored", "this interview", "rule set"] as const;

const ds = rawDataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));
const routes = ds.countries.flatMap((c) => c.routes);
const DATA_PAGE = "/data/index.html";

/**
 * Everything on a page a reader can read: its text, the words a screen reader
 * or a search result reads from attributes, and its structured data. Not its
 * code, its styles, or the class names and ids no reader meets.
 */
function readerTextOf(html: string): string {
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((m) => m[1]!);
  const page = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ");
  const attributes = [...page.matchAll(/\s(?:aria-label|alt|title|placeholder|content|data-[\w-]+)="([^"]*)"/gi)]
    .map((m) => m[1]!);
  return plainTextOf([...ld, ...attributes, page].join("\n")).toLowerCase();
}

const avoidListWordsIn = (text: string): string[] =>
  SCOPE_STATEMENT_AVOID_LIST.filter((word) => text.includes(word));

/** Each page of the walk that carries a word on the avoid-list, and which. */
const avoidListOffences = (pages: ReaderPage[]): string[] =>
  pages.flatMap(({ where, html }) => {
    const found = avoidListWordsIn(readerTextOf(html));
    return found.length ? [`${where}: ${found.join(", ")}`] : [];
  });

/**
 * The answered form's two fixed lines. The third, "… except N conditions we
 * don't ask about", opens with the first, so these two find every answered
 * line.
 */
const ANSWERED_LINES = [
  scopeWords("every-deciding-rule-asked", { stated: 0, noted: 0 }, { reader: "answered" }),
  scopeWords("rules-quoted-nothing-asked", { stated: 0, noted: 0 }, { reader: "answered" }),
];
const answeredLinesOn = (pages: ReaderPage[]): string[] =>
  pages.flatMap(({ where, html }) => ANSWERED_LINES
    .filter((line) => readerTextOf(html).includes(line.toLowerCase()))
    .map((line) => `${where}: ${line}`));

/** The scope line on each results card, as the card prints it. */
const scopedLinesOf = (html: string): string[] =>
  [...html.matchAll(/<div class="scoped">([^<]*)</g)].map((m) => plainTextOf(m[1]!));
/** A screen without its results cards' scope lines. */
const withoutScopedLines = (html: string): string => html.replace(/<div class="scoped">[^<]*</g, "<");

const asked = routes.filter(isScored).length;

describe("the walk's own precondition", () => {
  it("finds an avoid-list word wherever a reader can read it, and nowhere a reader cannot", () => {
    expect(avoidListOffences([{ where: "text", html: "<p>Six routes scored.</p>" }])).toHaveLength(1);
    expect(avoidListOffences([{ where: "label", html: '<ul aria-label="Routes this interview asks">' }])).toHaveLength(1);
    expect(avoidListOffences([{ where: "class", html: '<div class="unscored rule-set">x</div>' }])).toEqual([]);
    expect(answeredLinesOn([{ where: "card", html: `<div class="scoped">${ANSWERED_LINES[0]}</div>` }])).toHaveLength(1);
  });
});

describe("the social card counts routes as the checker does", () => {
  const facts = socialCardFacts(ds, "2026-10-21", {
    product: PRODUCT_NAME, tagline: TAGLINE, routesLineOf: routesCheckerAsksAbout,
  });

  it("says how many routes there are and how many the checker asks about, from the dataset", () => {
    expect(facts.routesLine).toBe(routesCheckerAsksAbout(routes.length, asked));
    expect(socialCardHtml(facts, "")).toContain(routesCheckerAsksAbout(routes.length, asked));
  });

  it("carries no word on the avoid-list", () => {
    expect(avoidListOffences([{ where: "social card", html: socialCardHtml(facts, "") }])).toEqual([]);
  });
});

describe("every question card the interview draws", () => {
  it("carries no word on the avoid-list, and never says it checked against answers", () => {
    const cards = questionCards();
    expect(cards.length).toBeGreaterThan(0);
    expect(avoidListOffences(cards)).toEqual([]);
    expect(answeredLinesOn(cards)).toEqual([]);
  });
});

const noBuild = existsSync(dist) ? null : "no dist/ — run npm run build first";
if (noBuild) warnNotWalked("the built pages", noBuild);

describe.skipIf(noBuild !== null)("every page the build draws", () => {
  const pages = () => builtPages();
  const page = (where: string) => pages().find((p) => p.where === where)!;

  it("carries no word on the avoid-list, on every page but /data/", () => {
    expect(avoidListOffences(pages().filter((p) => p.where !== DATA_PAGE))).toEqual([]);
  });

  it("/data/ keeps its terms: its lede, its Routes row, its meta description and its JSON-LD", () => {
    const html = page(DATA_PAGE).html;
    const places = {
      lede: html.match(/<p class="lede">([\s\S]*?)<\/p>/)?.[1],
      routes: html.match(/<dt>Routes<\/dt><dd>([\s\S]*?)<\/dd>/)?.[1],
      meta: html.match(/<meta name="description" content="([^"]*)"/)?.[1],
      ld: html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1],
    };
    for (const [place, text] of Object.entries(places)) {
      expect(text, place).toBeDefined();
      expect(avoidListWordsIn(readerTextOf(text!)), place).not.toEqual([]);
    }
    // Unchanged: each place reads what /data/'s own words compose from the
    // dataset's counts, in the model's terms, which #151 leaves as they were.
    const { scored, quotedOnly, total } = routeCounts(ds);
    const countries = ds.countries.length;
    expect(plainTextOf(places.lede!)).toContain(dataLedeOpen(scored, quotedOnly, countries));
    expect(plainTextOf(places.meta!)).toBe(dataMetaDescription(scored, quotedOnly, countries));
    expect((JSON.parse(places.ld!) as { description: string }).description)
      .toBe(datasetDescription(total, scored, quotedOnly, countries));
    expect(plainTextOf(places.routes!)).toMatch(new RegExp(`^${scored} scored, ${quotedOnly} quoted\\b`));
  });

  it("says the checked-against-your-answers form on no page: country and route pages carry the asks form", () => {
    expect(answeredLinesOn(pages())).toEqual([]);
    for (const { country, path } of countryAddresses(ds)) {
      const text = readerTextOf(page(`${path}/index.html`).html);
      for (const route of country.routes)
        expect(text, `${path}: ${route.id}`).toContain(scopeLine(route, { reader: "not-answered" }).toLowerCase());
    }
    for (const { route, path } of routeAddresses(ds))
      expect(readerTextOf(page(`${path}/index.html`).html), path)
        .toContain(scopeLine(route, { reader: "not-answered" }).toLowerCase());
  });

  it("heads each country page with its routes and how many the checker asks about, from the dataset", () => {
    for (const { country, path } of countryAddresses(ds)) {
      const headline = countryHeadline(
        phraseAtStartOf(country.code), country.routes.length, country.routes.filter(isScored).length);
      expect(headingsOf(page(`${path}/index.html`).html).some((h) => h.startsWith(headline)), path).toBe(true);
    }
  });

  it("describes the home page with the same count", () => {
    const text = readerTextOf(page("/index.html").html);
    expect(text).toContain(promise({ total: routes.length, scored: asked }).toLowerCase());
  });
});

const notWalked = skipReason();
if (notWalked) warnNotWalked("the results and the arrival line", notWalked);

/** How many routes a reader's results show: the destination's, less the ones
 * their passport is shut out of. */
function resultCount(answers: Profile): number {
  const destination = answers[DESTINATION_FIELD]!;
  return evaluate(ds, answers)
    .filter((r) => destination === "all" || r.country === destination.toUpperCase())
    .filter((r) => !isClosed(r)).length;
}

/** The masthead's count sentence, as a pattern that captures its two numbers. */
const countSentence = (): RegExp => new RegExp(answersCheckedLine(1001, 1002)
  .replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("1001", "(\\d+)").replace("1002", "(\\d+)"));

describe.skipIf(notWalked !== null)("every screen the module draws", () => {
  it("carries no avoid-list word; only a results card says checked against your answers; the masthead counts routes from the dataset", async () => {
    const screens = await withSite(drawnScreens, DESK);
    expect(avoidListOffences(screens)).toEqual([]);

    // A results card says the answered form; nothing else on any screen does.
    let cards = 0;
    for (const screen of screens)
      for (const line of scopedLinesOf(screen.html)) {
        cards++;
        expect(ANSWERED_LINES.some((answered) => line.startsWith(answered)), `${screen.where}: ${line}`).toBe(true);
      }
    expect(cards, "no results card drew a scope line").toBeGreaterThan(0);
    expect(answeredLinesOn(screens.map((s) => ({ where: s.where, html: withoutScopedLines(s.html) })))).toEqual([]);

    const results = new Map(walks().map((w) => [`results for ${JSON.stringify(w.answers)}`, w]));
    let counted = 0;
    for (const screen of screens.filter((s) => results.has(s.where))) {
      const walk = results.get(screen.where)!;
      const count = plainTextOf(screen.html).match(countSentence());
      if (!count) continue;
      counted++;
      expect([Number(count[1]), Number(count[2])], screen.where)
        .toEqual([walk.order.length, resultCount(walk.answers)]);
    }
    expect(counted, "no masthead counted the routes").toBeGreaterThan(0);
  }, 600000);
});
