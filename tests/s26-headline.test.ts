import { describe, expect, it } from "vitest";
import {
  DESTINATION_FIELD, SITUATION_FIELD, possessiveAtStartOf, evaluate, fieldOptions, isClosed, situationsAsked,
  type Profile,
} from "permit-rulebook-data";
import { SITUATION_COUNTRY_FIELD } from "../src/lib/situations.js";
import { READ_ITS_RULES, unscoredNamedRestLine, unscoredRestLine } from "../src/lib/copy/verdict.js";
import { url } from "../src/lib/site.js";
import { saidLineOf, verdictFor } from "./verdict-cards.js";
import { WALKED_TO_A_GERMAN_ROUTE, WALKED_TO_NOTHING_OPEN, ds, fourCountry } from "./s26-walks.js";

/** The direct answers: that country at question 1, the situation at question 2. */
const direct = (situation: string, country: string): Profile =>
  ({ [DESTINATION_FIELD]: country, [SITUATION_FIELD]: situation });

/** The written state as a reader meets it: the headline, the subline as
 * text, the words of the subline that are its door, and the country whose
 * section leads. */
interface WrittenState {
  headline: string;
  subline: string;
  door?: { text: string; href: string };
  lead?: string;
}

/**
 * The written state the verdict for these answers reads, or null where it
 * reads none: its masthead is the only one whose subline is drawn in markup,
 * for the door in it. On the four-country layout the country it is about
 * leads the sections.
 */
function unscoredVerdict(answers: Profile): WrittenState | null {
  const { action, layout } = verdictFor(answers);
  const m = action.masthead;
  if (m.sublineHtml === undefined) return null;
  const door = /<a href="([^"]*)">([^<]*)<\/a>/.exec(m.sublineHtml);
  const first = layout.kind === "countries" ? ds.countries.find((c) => c.code === layout.sections[0]!.country) : undefined;
  return {
    headline: m.announced, subline: m.subline,
    ...(door ? { door: { text: door[2]!, href: door[1]! } } : {}),
    ...(first ? { lead: first.code.toLowerCase() } : {}),
  };
}

/** The subline in its two sentences: the route line, with the door, and the rest. */
const sentences = (v: WrittenState): { route: string; rest: string } => {
  const cut = v.subline.indexOf(`${READ_ITS_RULES}. `);
  if (cut < 0) return { route: "", rest: v.subline };
  const end = cut + READ_ITS_RULES.length + 1;
  return { route: v.subline.slice(0, end), rest: v.subline.slice(end + 1) };
};

/** Whether nothing is open anywhere on these answers, the way the results screen counts it. */
const zeroOpen = (answers: Profile): boolean =>
  evaluate(ds, answers).filter((r) => !isClosed(r)).every((r) => r.status === "hold");

/**
 * s26 — one reader, one hierarchy.
 *
 * A researcher with a French hosting agreement reads s19's written state on
 * the France path and "Nothing open on these answers." over a green 0 OPEN on
 * the four-country path, the sentence that explains it third, in France's
 * line, under Germany's (s21). But they named France at question 3: the
 * product knows which country their agreement is in, and the headline is
 * that country's. This file holds the headline and the order of the
 * sections; `s26-walk.test.ts` holds the results the walks end on and the
 * walks.
 */

/** Checks, over every (situation × country) pair situationsAsked marks, that
 * the four-country answers read the direct path's headline and route line,
 * the rest sentence differing only by the country's name. */
function expectFourCountryReadsTheDirectHeadlineAtEveryPair(): void {
  const asked = situationsAsked(ds);
  const pairs: string[] = [];
  for (const s of fieldOptions(ds, SITUATION_FIELD)) {
    for (const c of fieldOptions(ds, SITUATION_COUNTRY_FIELD)) {
      const four = unscoredVerdict(fourCountry(s.value, c.value));
      const one = unscoredVerdict(direct(s.value, c.value));
      const takenByScoredRoutes = s.is_fallback || s.is_unknown || asked.get(c.value)!.has(s.value);
      if (takenByScoredRoutes) {
        // A situation the country's scored routes take: no written state either way.
        expect(four, `${s.value}:${c.value}`).toBeNull();
        expect(one, `${s.value}:${c.value}`).toBeNull();
        continue;
      }
      pairs.push(`${s.value}:${c.value}`);
      expect(four, `${s.value}:${c.value}`).not.toBeNull();
      expect(one, `${s.value}:${c.value}`).not.toBeNull();
      // One function, one copy: the same headline, the same door.
      expect(four!.headline).toBe(one!.headline);
      expect(four!.door).toEqual(one!.door);
      const country = ds.countries.find((x) => x.code.toLowerCase() === c.value)!;
      const f = sentences(four!);
      const d = sentences(one!);
      expect(f.route).toBe(d.route);
      // "The routes below need …" on the direct path; "France's routes below need …" on this one.
      expect(f.rest).toBe(d.rest.replace(/^The\b/, possessiveAtStartOf(country.code)));
      expect(f.rest).not.toBe(d.rest);
      // The four-country verdict names the country whose section leads; the direct path has no list to lead.
      expect(four!.lead).toBe(c.value);
      expect(one!.lead).toBeUndefined();
    }
  }
  // Which is one pair on the whole dataset today.
  expect(pairs).toEqual(["research:fr"]);
}

describe("s26 — the named country gets the four-country headline", () => {
  it("over every (situation × country) pair situationsAsked marks, the four-country answers read the direct path's headline and route line; the rest sentence differs only by the country's name", () => {
    expectFourCountryReadsTheDirectHeadlineAtEveryPair();
  });

  it("the two rest sentences are one sentence, but for the name", () => {
    expect(unscoredRestLine("a job offer or an intra-corporate transfer"))
      .toBe("The routes below need a job offer or an intra-corporate transfer.");
    expect(unscoredNamedRestLine(possessiveAtStartOf("FR"), "a job offer or an intra-corporate transfer"))
      .toBe("France's routes below need a job offer or an intra-corporate transfer.");
    // The data package's possessive at a sentence's start, the article's capital and the apostrophe included.
    expect(unscoredNamedRestLine(possessiveAtStartOf("NL"), "x")).toBe("The Netherlands' routes below need x.");
  });

  it("the France researcher, both ways: the same words, the door to the quoted route", () => {
    const four = unscoredVerdict(fourCountry("research", "fr"))!;
    expect(four.headline).toBe("No route we check in France takes a research hosting agreement.");
    expect(four.subline).toBe(
      "France's route for a research hosting agreement — Talent — researcher (chercheur) — is quoted here but not checked: "
      + "read its rules. France's routes below need a job offer or an intra-corporate transfer.",
    );
    expect(four.door).toEqual({ text: READ_ITS_RULES, href: url("/france/talent-researcher") });
    expect(four.lead).toBe("fr");
    // The direct path, as s19 left it.
    expect(unscoredVerdict(direct("research", "fr"))!.subline).toMatch(/ The routes below need /);
  });

  it("is keyed by the named country only where the destination is all four: no country named, or a country that takes the situation, leaves the verdicts as they were", () => {
    expect(unscoredVerdict({ [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: "research" })).toBeNull();
    expect(unscoredVerdict(fourCountry("research", "de"))).toBeNull();
    expect(unscoredVerdict(fourCountry("offer", "fr"))).toBeNull();
    expect(unscoredVerdict(fourCountry("none", "fr"))).toBeNull();
    // A stray country answer under a one-country destination is not a key: the direct path never asks it.
    expect(unscoredVerdict({ ...direct("research", "es"), [SITUATION_COUNTRY_FIELD]: "fr" })).toBeNull();
  });
});

/** The country sections the verdict draws, in order. */
const sectionsOf = (answers: Profile) => {
  const { layout } = verdictFor(answers);
  if (layout.kind !== "countries") throw new Error("the four-country verdict draws no country sections");
  return layout.sections;
};
/** The order the result draws, by country code. */
const order = (answers: Profile): string[] => sectionsOf(answers).map((s) => s.country);
/** The country the verdict leads with, where its headline names one. */
const leadOf = (answers: Profile): string | undefined => unscoredVerdict(answers)?.lead;

/** Checks the named country leads, alone and open, with s21's line, on this walk to nothing open. */
function expectNamedCountryLeadsWhenNothingIsOpen(walk: Profile): void {
  expect(zeroOpen(walk)).toBe(true);
  expect(leadOf(walk)).toBe("fr");
  expect(order(walk)).toEqual(["FR", "DE", "ES", "NL"]);
  // The one predicate: the named country leads, and it is the only one that does.
  const first = sectionsOf(walk)[0]!;
  expect(ds.countries.map((c) => c.code === first.country)).toEqual([false, true, false, false]);
  expect(first.open).toBe(true);
  // Its line keeps s21's sentence and link.
  expect(saidLineOf(verdictFor(walk), first)!.text).toBe(
    "No route we check in France takes a research hosting agreement — Talent — researcher (chercheur) is quoted, not checked.",
  );
}

describe("s26 — the named country's section leads", () => {
  const walk = WALKED_TO_NOTHING_OPEN;
  const opened = WALKED_TO_A_GERMAN_ROUTE;
  /** An offer in Germany, nothing met: zero open, but Germany's routes take an offer. */
  const readerWithJobOffer: Profile = { [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: "offer", [SITUATION_COUNTRY_FIELD]: "de", citizenship: "TR", qualification: "none" };
  /** An explorer: no offer, transfer or agreement, so no country named. */
  const explorer: Profile = { [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: "none", citizenship: "TR", qualification: "none" };

  it("first, before the others in dataset order, when nothing is open anywhere", () => {
    expectNamedCountryLeadsWhenNothingIsOpen(walk);
  });

  it("first with something open anywhere and with no written state too; dataset order with no country named", () => {
    // Ruling 1 on #362: the answer at question 3 alone leads. The headline is
    // the open one and no written state is drawn, yet France leads, open.
    expect(zeroOpen(opened)).toBe(false);
    expect(unscoredVerdict(opened)).toBeNull();
    expect(order(opened)).toEqual(["FR", "DE", "ES", "NL"]);
    expect(sectionsOf(opened)[0]!.open).toBe(true);
    // Zero open, no written state for Germany: Germany, named, leads.
    expect(zeroOpen(readerWithJobOffer)).toBe(true);
    expect(unscoredVerdict(readerWithJobOffer)).toBeNull();
    expect(order(readerWithJobOffer)).toEqual(["DE", "FR", "ES", "NL"]);
    expect(sectionsOf(readerWithJobOffer)[0]!.open).toBe(true);
    // The explorer: nothing named, the dataset's order.
    expect(zeroOpen(explorer)).toBe(true);
    expect(leadOf(explorer)).toBeUndefined();
    expect(order(explorer)).toEqual(["DE", "FR", "ES", "NL"]);
    // The order is stable: with France leading, nothing else moves.
    expect(order(walk).slice(1)).toEqual(ds.countries.map((c) => c.code).filter((c) => c !== "FR"));
  });
});
