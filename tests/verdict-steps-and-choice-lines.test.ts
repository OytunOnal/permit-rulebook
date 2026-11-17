import { describe, expect, it } from "vitest";
import type { Profile } from "permit-rulebook-data";
import type { Verdict } from "../src/lib/verdict/verdict.js";
import { DENIZ, DUTCH_OFFER_ON_FOUR, PERSONA_A, PRIYA_EXPLORING_ALL } from "./personas.js";
import { plainTextOf } from "./reader-pages.js";
import { verdictFor } from "./verdict-cards.js";

/**
 * The first screen says which steps would unlock more, and that choosing
 * between open routes is the reader's (#424; rulings 8–11 on #362), read from
 * the result's markup at the verdict's entry.
 */

/** A French offer from an innovative employer, no qualification, an
 * Algerian passport: one country, two steps (a result `measure:taps` seeds). */
const FRENCH_OFFER_TWO_STEPS: Profile = {
  destination: "fr", situation: "offer", qualification: "none", fr_innovative_employer: "yes", citizenship: "DZ",
  experience_7y: "lt3", salary_eur_year: "band_0",
};

/** A French offer from an employer the reader does not know is innovative:
 * nothing open, and no step (a result `measure:taps` seeds). */
const FRENCH_OFFER_NO_STEPS: Profile = {
  destination: "fr", situation: "offer", qualification: "none", fr_innovative_employer: "unknown", citizenship: "IN",
  experience_7y: "lt3", salary_eur_year: "unknown",
};

/** Germany with an offer and a recognised degree on the shortage list, all
 * four countries asked, the offer in Germany: two routes open there (a
 * result `measure:taps` seeds). */
const GERMAN_OFFER_ON_FOUR: Profile = {
  destination: "all", citizenship: "TR", situation: "offer", qualification: "degree",
  recognition_de: "recognized", occupation_shortage: "yes", experience_5y: "lt2", experience_7y: "3to5",
  german: "b1", english: "c1", nl_recent_grad: "no", top200_grad: "no", age_band: "a30to35",
  situation_country: "de", salary_eur_year: "unknown", funds_eur_month: "band_1",
};

/** The Steps line's markup, or null where the result draws none. */
function stepsLineOf(verdict: Verdict): string | null {
  const lines = [...verdict.body.matchAll(/<p class="steps-line">([\s\S]*?)<\/p>/g)];
  expect(lines.length, "a result draws at most one Steps line").toBeLessThanOrEqual(1);
  return lines[0]?.[1] ?? null;
}

/** Each link on a line: its words and the fragment it leads to. */
const linksOn = (line: string): { text: string; href: string }[] =>
  [...line.matchAll(/<a href="([^"]*)">([\s\S]*?)<\/a>/g)].map((m) => ({ text: plainTextOf(m[2]!), href: m[1]! }));

/** A country section's markup on the four-country result, by the country's name. */
function sectionMarkupOf(verdict: Verdict, name: string): string {
  const section = verdict.body.split(`<details class="country-sec"`).find((s) => s.includes(`<span class="cname">${name}</span>`));
  if (section === undefined) throw new Error(`no section named ${name}`);
  return section;
}

/** The words of the heading a fragment link lands on within `markup`, or
 * null where no heading there carries its id. */
function headingLandedOn(markup: string, href: string): string | null {
  expect(href.startsWith("#"), `${href} is a link within the page`).toBe(true);
  const heading = new RegExp(`<h2 [^>]*id="${href.slice(1)}"[^>]*>([\\s\\S]*?)</h2>`).exec(markup);
  return heading ? plainTextOf(heading[1]!) : null;
}

/** The Choice line's words wherever the result draws it, in order. */
const choiceLinesIn = (verdict: Verdict): string[] =>
  [...verdict.body.matchAll(/<p class="choice-line">([\s\S]*?)<\/p>/g)].map((m) => plainTextOf(m[1]!));

/** The Choice line's words, as ruling 11 on #362 writes them. */
const CHOICE_LINE = "Each of these is open on your answers. Which to apply for turns on things we don't check — "
  + "compare what each also requires.";

describe("the Steps line under the headline (rulings 9 and 10 on #362)", () => {
  it("the four-country result with steps in two countries counts each, in screen order, each a link to its section's steps", () => {
    const verdict = verdictFor(DUTCH_OFFER_ON_FOUR);
    const line = stepsLineOf(verdict);
    expect(line).not.toBeNull();
    expect(plainTextOf(line!)).toBe("Steps that would unlock more: 1 in the Netherlands · 1 in Germany");
    const links = linksOn(line!);
    expect(links.map((l) => l.text)).toEqual(["1 in the Netherlands", "1 in Germany"]);
    expect(headingLandedOn(sectionMarkupOf(verdict, "Netherlands"), links[0]!.href)).toBe("Steps that would unlock more here");
    expect(headingLandedOn(sectionMarkupOf(verdict, "Germany"), links[1]!.href)).toBe("Steps that would unlock more here");
    expect(verdict.body.indexOf(`<p class="steps-line">`), "the line stands above the Strip")
      .toBeLessThan(verdict.body.indexOf(`<div class="strip"`));
  });

  it("a one-country result with two steps draws one link, \"2 steps that would unlock more\"", () => {
    const verdict = verdictFor(PERSONA_A);
    const line = stepsLineOf(verdict);
    expect(line).not.toBeNull();
    expect(plainTextOf(line!)).toBe("2 steps that would unlock more");
    const links = linksOn(line!);
    expect(links.map((l) => l.text)).toEqual(["2 steps that would unlock more"]);
    expect(headingLandedOn(verdict.body, links[0]!.href))
      .toBe("Steps that would unlock more — each re-checked against the rules");
    expect(plainTextOf(stepsLineOf(verdictFor(FRENCH_OFFER_TWO_STEPS))!)).toBe("2 steps that would unlock more");
  });

  it("a result whose headline names its nearest step draws none", () => {
    expect(verdictFor(PRIYA_EXPLORING_ALL).action.masthead.subline).toContain("Nearest:");
    expect(stepsLineOf(verdictFor(PRIYA_EXPLORING_ALL))).toBeNull();
  });

  it("a result with no steps draws none", () => {
    expect(verdictFor(FRENCH_OFFER_NO_STEPS).body).not.toContain("unlockh");
    expect(stepsLineOf(verdictFor(FRENCH_OFFER_NO_STEPS))).toBeNull();
  });
});

describe("the Choice line above the open cards (ruling 8 on #362)", () => {
  /** The markup from the open group's heading to the end of its stack. */
  const openGroupOf = (markup: string): string => {
    const at = markup.indexOf(`<h2 class="ghead "><b>Open — criteria met</b>`);
    expect(at, "the result draws an open group").toBeGreaterThan(-1);
    return markup.slice(at);
  };

  it("a one-country result with two routes open draws it under the open heading, before the first open card", () => {
    const verdict = verdictFor(PERSONA_A);
    expect(choiceLinesIn(verdict)).toEqual([CHOICE_LINE]);
    const open = openGroupOf(verdict.body);
    expect(open.indexOf(`<p class="choice-line">`)).toBeGreaterThan(-1);
    expect(open.indexOf(`<p class="choice-line">`), "before the first card").toBeLessThan(open.indexOf("<article"));
  });

  it("a four-country result with two routes open draws it once, in the section holding them", () => {
    const verdict = verdictFor(GERMAN_OFFER_ON_FOUR);
    expect(choiceLinesIn(verdict)).toEqual([CHOICE_LINE]);
    expect(openGroupOf(sectionMarkupOf(verdict, "Germany"))).toContain(`<p class="choice-line">`);
  });

  it("a result with one route open draws none", () => {
    expect(verdictFor(DENIZ).body).toContain("Open — criteria met");
    expect(choiceLinesIn(verdictFor(DENIZ))).toEqual([]);
  });
});
