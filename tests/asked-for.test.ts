import { describe, expect, it } from "vitest";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { fieldOptions, type Dataset, type Profile } from "permit-rulebook-data";
import { glossSection, type Glossary } from "../src/lib/gloss.js";
import { DESK, PHONE, type BrowserPage } from "../scripts/browser/browser.mjs";
import {
  QLABEL, answer, middleBandOf, skipReason, topBandOf, waitUntilPastTheBeat, walkTo, warnNotWalked, withSite,
} from "./browser-walk.js";
import { shiftScoreSince } from "./layout-shifts.js";

/**
 * #139 — a question that only some of the reader's open routes read says
 * which: the *asked-for line* (GLOSSARY.md; spec #133, decisions 7 and 11).
 *
 * Walked from a cold start over the built page, answer by answer, until the
 * question under test is on the screen. Each case asserts that question's
 * card is drawn before it reads the line, and reads the line's marks — the
 * route ids it names, the countries it counts and how many — never its words.
 * The routes each walk expects were read off the engine's own reckoning on
 * the real dataset when the walk was chosen, and are written here as facts.
 */
const ds = rawDataset as unknown as Dataset;

const skipped = skipReason();
if (skipped) warnNotWalked("THE ASKED-FOR LINE", skipped);

/**
 * An Indian passport, a degree not yet recognised in Germany, a German job
 * offer: the Opportunity Card stays open beside the work routes, so the
 * interview reaches its questions — funds and age among them (F2).
 */
const GERMANY_JOB_OFFER: Profile = {
  destination: "de", citizenship: "IN", situation: "offer", qualification: "degree", qualification_recent: "no",
  recognition_de: "not_assessed", experience_5y: "2plus", experience_7y: "3to5", occupation_shortage: "yes",
  occupation_it: "no", salary_eur_year: middleBandOf("salary_eur_year"), german: "a1", english: "b2",
  age_band: "a30to35", de_stay6m: "no", partner_ck: "no", funds_eur_month: middleBandOf("funds_eur_month"),
};

/** The "any of these four" path with the offer in Spain: the Dutch
 * orientation year stays open, and its two questions are asked. */
const FOUR_SPAIN: Profile = {
  destination: "all", citizenship: "IN", situation: "offer", situation_country: "es", qualification: "degree",
  qualification_recent: "no", recognition_de: "recognized", experience_5y: "2plus", experience_7y: "3to5",
  occupation_shortage: "yes", occupation_it: "no", salary_eur_year: middleBandOf("salary_eur_year"),
  salary_eur_month: middleBandOf("salary_eur_month"), fr_degree: "no", fr_innovative_employer: "no",
  fr_local_contract: "no", nl_recent_grad: "no", top200_grad: "no", german: "a1", english: "b2",
  age_band: "a30to35", de_stay6m: "no", partner_ck: "no", funds_eur_month: middleBandOf("funds_eur_month"),
};

/** An IT worker with a vocational qualification and no degree, offered a
 * job in Germany: the Blue Card's IT path (#134) and the Opportunity Card
 * both read the seven-year window. */
const IT_NO_DEGREE: Profile = {
  destination: "de", citizenship: "IN", situation: "offer", qualification: "vocational", qualification_recent: "no",
  recognition_de: "not_recognised", experience_5y: "2plus", experience_7y: "3to5", occupation_shortage: "unknown",
  occupation_it: "yes", salary_eur_year: topBandOf("salary_eur_year"), german: "a1", english: "b2",
  age_band: "a30to35", de_stay6m: "no", partner_ck: "no", funds_eur_month: middleBandOf("funds_eur_month"),
};

const labelOf = (field: string): string => ds.fields.find((f) => f.id === field)!.label;
const cardNameOf = (route: string): string => ds.countries.flatMap((c) => c.routes).find((r) => r.id === route)!.name;

/** What the line on the question card marks: the routes it names, each with
 * its country, and the count per country where it counts. */
const LINE = `JSON.stringify((() => {
  const card = document.querySelector("#main .qcard");
  const line = card && card.querySelector("[data-asked-for]");
  if (!line) return null;
  return {
    named: [...line.querySelectorAll("[data-route]")].map((el) => ({
      route: el.dataset.route, country: el.dataset.country, text: el.textContent,
    })),
    counted: [...line.querySelectorAll("[data-routes]")].map((el) => ({
      country: el.dataset.country, routes: Number(el.dataset.routes),
    })),
  };
})())`;

interface Line {
  named: { route: string; country: string; text: string }[];
  counted: { country: string; routes: number }[];
}

/** The question on the screen and its line, read together. */
async function screenOf(page: BrowserPage): Promise<{ question: string; line: Line | null }> {
  return { question: await page.evaluate(QLABEL), line: JSON.parse(await page.evaluate(LINE)) as Line | null };
}

/** The card is the question's, and it carries a line. */
function expectTheCardWithALine<T extends { question: string; line: Line | null }>(seen: T, field: string): asserts seen is T & { line: Line } {
  expect(seen.question, `${field}'s card is not on the screen`).toBe(labelOf(field));
  expect(seen.line, `${field}'s card carries no asked-for line`).not.toBeNull();
}

const namedRoutes = (line: Line) => line.named.map((n) => [n.route, n.country]);

/** The asked-for line's box against its card's: inside it or not, how many
 * lines it wraps to, and whether each option stays on the card. */
const LINE_GEOMETRY = `JSON.stringify((() => {
  const card = document.querySelector("#main .qcard").getBoundingClientRect();
  const el = document.querySelector("#main .qcard [data-asked-for]");
  if (!el) return null;
  const line = el.getBoundingClientRect();
  const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
  const inside = (b) => b.left >= card.left && b.right <= card.right && b.top >= card.top && b.bottom <= card.bottom;
  return {
    lineInside: inside(line),
    lineOverflows: el.scrollWidth > el.clientWidth,
    lines: Math.round(line.height / lineHeight),
    options: [...document.querySelectorAll("#main .qcard .opt")].map((o) => inside(o.getBoundingClientRect())),
    pageOverflows: document.documentElement.scrollWidth > window.innerWidth,
  };
})())`;

interface LineGeometry { lineInside: boolean; lineOverflows: boolean; lines: number; options: boolean[]; pageOverflows: boolean }

describe.skipIf(skipped !== null)("a question says which routes ask it: the asked-for line (#139)", () => {
  for (const field of ["funds_eur_month", "age_band"])
    it(`on a Germany-offer walk, ${field} names the Opportunity Card in Germany`, async () => {
      const seen = await withSite(async (site) => {
        const { page } = site;
        await walkTo(site, GERMANY_JOB_OFFER, field);
        return { ...(await screenOf(page)), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expectTheCardWithALine(seen, field);
      expect(namedRoutes(seen.line)).toEqual([["de-chancenkarte", "DE"]]);
      expect(seen.line.counted).toEqual([]);
    }, 120_000);

  it("the passport question, which every open route reads, carries no line", async () => {
    const seen = await withSite(async (site) => {
      const { page } = site;
      await walkTo(site, GERMANY_JOB_OFFER, "citizenship");
      const passport = await screenOf(page);
      // The question after it, which only some of the open routes read.
      await answer(page, "citizenship", GERMANY_JOB_OFFER.citizenship!);
      return { passport, next: await screenOf(page), problems: page.problems() };
    }, DESK);
    expect(seen.problems).toEqual([]);
    expect(seen.passport.question, "the passport question is not on the screen").toBe(labelOf("citizenship"));
    expect(seen.passport.line).toBeNull();
    // A line on the next card, so the passport's has no line of its own
    // making, not because the page draws none.
    expectTheCardWithALine(seen.next, "recognition_de");
  }, 120_000);

  it("on the any-of-four path with the offer in Spain, each Dutch question names its Dutch route", async () => {
    const seen = await withSite(async (site) => {
      const { page } = site;
      await walkTo(site, FOUR_SPAIN, "nl_recent_grad");
      const graduate = await screenOf(page);
      await answer(page, "nl_recent_grad", FOUR_SPAIN.nl_recent_grad!);
      const designated = await screenOf(page);
      return { graduate, designated, problems: page.problems() };
    }, DESK);
    expect(seen.problems).toEqual([]);
    expectTheCardWithALine(seen.graduate, "nl_recent_grad");
    expect(namedRoutes(seen.graduate.line)).toEqual([["nl-orientation-year", "NL"]]);
    expectTheCardWithALine(seen.designated, "top200_grad");
    expect(namedRoutes(seen.designated.line)).toEqual([["nl-orientation-year", "NL"]]);
  }, 120_000);

  it("a question asked for more than two routes counts them per country", async () => {
    const seen = await withSite(async (site) => {
      const { page } = site;
      await walkTo(site, FOUR_SPAIN, "situation");
      return { ...(await screenOf(page)), problems: page.problems() };
    }, DESK);
    expect(seen.problems).toEqual([]);
    expectTheCardWithALine(seen, "situation");
    // 21 of the 23 open routes read the situation; the Opportunity Card
    // and the orientation year do not.
    expect(seen.line.counted).toEqual([
      { country: "DE", routes: 7 }, { country: "FR", routes: 5 },
      { country: "ES", routes: 4 }, { country: "NL", routes: 5 },
    ]);
    expect(seen.line.named).toEqual([]);
  }, 120_000);

  it("a route name in the line reads as its card names it, through the screen's one-time § expansion", async () => {
    const seen = await withSite(async (site) => {
      const { page } = site;
      await walkTo(site, GERMANY_JOB_OFFER, "funds_eur_month");
      return { ...(await screenOf(page)), problems: page.problems() };
    }, DESK);
    expect(seen.problems).toEqual([]);
    expectTheCardWithALine(seen, "funds_eur_month");
    expect(namedRoutes(seen.line)).toEqual([["de-chancenkarte", "DE"]]);
    // Each name the line marks reads as its card's name through the screen's
    // one memory of what it has explained, spent in the line's order.
    const memory: Glossary = new Set();
    for (const { route, text } of seen.line.named)
      expect(text, route).toBe(glossSection(cardNameOf(route), memory));
    // This one cites no act, so the expansion leaves it as the card prints it
    // (amendment 6: the sign itself carries no explainer).
    expect(seen.line.named.map((n) => n.text)).toEqual([cardNameOf("de-chancenkarte")]);
  }, 120_000);

  it("reopened with the pencil, a question's line names the routes it is asked for without its own answer", async () => {
    const seen = await withSite(async (site) => {
      const { page } = site;
      await walkTo(site, GERMANY_JOB_OFFER, "funds_eur_month");
      const at = JSON.parse(await page.evaluate(`JSON.stringify((() => {
        const row = document.querySelector('#decl-list [data-field="experience_5y"]');
        if (!row) return null;
        row.scrollIntoView({ block: "center" });
        const box = row.getBoundingClientRect();
        return { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) };
      })())`)) as { x: number; y: number } | null;
      if (!at) throw new Error("no experience_5y row in the declared panel");
      await page.clickAt(at.x, at.y);
      await page.waitUntilAtRest();
      return { ...(await screenOf(page)), problems: page.problems() };
    }, DESK);
    expect(seen.problems).toEqual([]);
    expectTheCardWithALine(seen, "experience_5y");
    // With its own answer the question decides nothing more and would name
    // no route; without it, the experienced worker and the Opportunity Card.
    expect(namedRoutes(seen.line)).toEqual([["de-experienced-worker", "DE"], ["de-chancenkarte", "DE"]]);
  }, 120_000);

  it("on Germany, the seven-year question names the Blue Card and the Opportunity Card for an IT reader with no degree", async () => {
    const seen = await withSite(async (site) => {
      const { page } = site;
      await walkTo(site, IT_NO_DEGREE, "experience_7y");
      return { ...(await screenOf(page)), problems: page.problems() };
    }, DESK);
    expect(seen.problems).toEqual([]);
    expectTheCardWithALine(seen, "experience_7y");
    expect(namedRoutes(seen.line)).toEqual([["de-blue-card-shortage", "DE"], ["de-chancenkarte", "DE"]]);
  }, 120_000);

  it("at 390 px the line wraps inside the card, every option stays on the card, and nothing shifts", async () => {
    const seen = await withSite(async (site) => {
      const { page } = site;
      await walkTo(site, IT_NO_DEGREE, "experience_5y");
      // The shifts from now on: the walk's own scripted answers shifted the page before, and are not the card's.
      const since = Number(await page.evaluate("performance.now()"));
      // The answer that draws the seven-year card, by a real tap.
      await waitUntilPastTheBeat(page);
      await page.tapOn(`#main .qcard .opt[data-value='${IT_NO_DEGREE.experience_5y}']`);
      await page.waitUntilAtRest();
      const geometry = JSON.parse(await page.evaluate(LINE_GEOMETRY)) as LineGeometry | null;
      return {
        ...(await screenOf(page)), geometry, cls: await shiftScoreSince(page, since), problems: page.problems(),
      };
    }, PHONE);
    expect(seen.problems).toEqual([]);
    expectTheCardWithALine(seen, "experience_7y");
    expect(namedRoutes(seen.line)).toEqual([["de-blue-card-shortage", "DE"], ["de-chancenkarte", "DE"]]);
    const g = seen.geometry!;
    expect(g, "the line has no box").not.toBeNull();
    process.stdout.write(`  asked-for line at 390 px: ${g.lines} lines, CLS ${seen.cls}\n`);
    expect(g.lines, "the two-route line did not wrap at 390 px").toBeGreaterThan(1);
    expect(g.lineInside, "the line reaches out of the card").toBe(true);
    expect(g.lineOverflows, "the line's text overflows its box").toBe(false);
    expect(g.options.length, "the card does not draw the question's options").toBe(fieldOptions(ds, "experience_7y").length);
    expect(g.options.every(Boolean), "an option is off the card").toBe(true);
    expect(g.pageOverflows, "the page scrolls sideways").toBe(false);
    expect(seen.cls).toBe(0);
  }, 120_000);
});
