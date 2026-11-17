import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Profile } from "permit-rulebook-data";
import { RECORD_VERSION, STORAGE_KEY } from "../src/lib/record.js";
import type { Verdict } from "../src/lib/verdict/verdict.js";
import { withSite } from "./browser-walk.js";
import {
  DUTCH_OFFER_ON_FOUR, FRENCH_OFFER_NO_STEPS, FRENCH_OFFER_TWO_STEPS, GERMAN_OFFER_ON_FOUR,
} from "../scripts/seeded-results.mjs";
import { DENIZ, PERSONA_A, PRIYA_EXPLORING_ALL } from "./personas.js";
import { plainTextOf } from "./reader-pages.js";
import { PAINTED_AS_COMPOSED, paintedAsComposedScript, verdictFor } from "./verdict-cards.js";

/**
 * The first screen says which steps would unlock more, and that choosing
 * between open routes is the reader's (#424; rulings 8–11 on #362, 24, 26
 * and 27 on #420), read from the result's markup at the verdict's entry, and
 * where the page paints the Steps line on a phone.
 */

/** An offer in France, all four countries asked, an Indian passport, a
 * degree recognised in Germany and in France: one route open in France and
 * one in Germany. */
const FRENCH_OFFER_OPEN_IN_TWO: Profile = {
  destination: "all", citizenship: "IN", situation: "offer", situation_country: "fr", qualification: "degree",
  recognition_de: "recognized", occupation_shortage: "yes", experience_5y: "2plus", experience_7y: "5plus",
  german: "b1", english: "c1", nl_recent_grad: "no", top200_grad: "no", age_band: "a30to35", funds_eur_month: "band_1",
  fr_degree: "yes", fr_innovative_employer: "no", fr_local_contract: "no", salary_eur_year: "band_3",
  salary_eur_month: "band_3",
};

/** The Steps line's words as the masthead carries them, under its rule (ruling
 * 24 on #362), or null where the result draws none. */
function stepsLineOf(verdict: Verdict): string | null {
  const html = verdict.action.masthead.stepsLineHtml;
  if (html === undefined) return null;
  const lines = [...html.matchAll(/<p class="steps-line">([\s\S]*?)<\/p>/g)];
  expect(lines.length, "the masthead carries one Steps line").toBe(1);
  return lines[0]![1]!;
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

/** The Choice line's words, on both results, as ruling 27 on #420 writes them. */
const CHOICE_LINE = "More than one route is open on your answers. Which to apply for turns on things we don't check — "
  + "compare what each open route also requires.";

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
  });

  it("the line stands in the masthead, never in the body, so a Notice above the body cannot push it down", () => {
    for (const reader of [DUTCH_OFFER_ON_FOUR, PERSONA_A]) {
      const verdict = verdictFor(reader);
      expect(stepsLineOf(verdict)).not.toBeNull();
      expect(verdict.body).not.toContain("steps-line");
    }
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
});

describe("where no Steps line is drawn (ruling 9 on #362)", () => {
  it("a result whose headline names its nearest step draws none", () => {
    expect(verdictFor(PRIYA_EXPLORING_ALL).action.masthead.subline).toContain("Nearest:");
    expect(stepsLineOf(verdictFor(PRIYA_EXPLORING_ALL))).toBeNull();
  });

  it("a result with no steps draws none", () => {
    expect(verdictFor(FRENCH_OFFER_NO_STEPS).body).not.toContain("unlockh");
    expect(stepsLineOf(verdictFor(FRENCH_OFFER_NO_STEPS))).toBeNull();
  });
});

describe("the Choice line (ruling 8 on #362, rulings 26 and 27 on #420)", () => {
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

  it("a four-country result with two routes open draws it once, under the Strip, above the country sections", () => {
    for (const reader of [GERMAN_OFFER_ON_FOUR, FRENCH_OFFER_OPEN_IN_TWO]) {
      const { body } = verdictFor(reader);
      expect(choiceLinesIn(verdictFor(reader))).toEqual([CHOICE_LINE]);
      const at = body.indexOf(`<p class="choice-line">`);
      expect(at, "under the Strip").toBeGreaterThan(body.indexOf(`<div class="strip"`));
      expect(at, "above the first country section").toBeLessThan(body.indexOf(`<details class="country-sec"`));
    }
  });

  it("the routes open in two countries, one each, still draw it", () => {
    const { layout } = verdictFor(FRENCH_OFFER_OPEN_IN_TWO);
    const opens = layout.kind === "countries" ? layout.sections.filter((s) => s.tally.open > 0).map((s) => s.tally.open) : [];
    expect(opens, "one route open in each of two countries").toEqual([1, 1]);
    expect(choiceLinesIn(verdictFor(FRENCH_OFFER_OPEN_IN_TWO))).toEqual([CHOICE_LINE]);
  });

  it("a result with one route open draws none", () => {
    expect(verdictFor(DENIZ).body).toContain("Open — criteria met");
    expect(choiceLinesIn(verdictFor(DENIZ))).toEqual([]);
  });
});

const dist = fileURLToPath(new URL("../dist", import.meta.url));
const unbuilt = !existsSync(dist);
if (unbuilt) process.stderr.write("\n  !! the Steps line's place was not walked: no dist/. Run: npm run build && npm test\n\n");

/** The phone the first screen is read on. */
const PHONE = { viewport: { width: 390, height: 844 }, mobile: true };

/** Where the page drew the Steps line and what stands around it, each box's
 * top and bottom in the document, and whether the page painted the verdict as
 * composed. */
const PLACES = `JSON.stringify((() => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY }; };
  return {
    masthead: box(document.querySelector(".masthead-with-stamps")),
    stepsLine: box(document.querySelector(".steps-line")),
    declared: box(document.getElementById("decl")),
    notice: box(document.querySelector("#main article.notice")),
  };
})())`;

describe.skipIf(unbuilt)("the Steps line on a phone (ruling 24 on #420)", () => {
  it("stands under the masthead, before \"You declared\" and the Notice, on the first screen", async () => {
    const seen = await withSite(async ({ page, url }) => {
      await page.goto(url("/"));
      await page.evaluate(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify({
        version: RECORD_VERSION, answers: DUTCH_OFFER_ON_FOUR, history: Object.keys(DUTCH_OFFER_ON_FOUR),
      }))})`);
      await page.goto(url("/"));
      return {
        places: JSON.parse(await page.evaluate(PLACES)),
        painted: JSON.parse(await page.evaluate(paintedAsComposedScript(verdictFor(DUTCH_OFFER_ON_FOUR)))),
      };
    }, PHONE) as { places: Record<"masthead" | "stepsLine" | "declared" | "notice", { top: number; bottom: number }>;
      painted: typeof PAINTED_AS_COMPOSED; };
    expect(seen.painted).toEqual(PAINTED_AS_COMPOSED);
    const { masthead, stepsLine, declared, notice } = seen.places;
    expect(stepsLine.top, "under the masthead's rule").toBeGreaterThanOrEqual(masthead.bottom);
    expect(stepsLine.bottom, "before \"You declared\"").toBeLessThanOrEqual(declared.top);
    expect(stepsLine.bottom, "before the Notice").toBeLessThanOrEqual(notice.top);
    expect(stepsLine.bottom, "on the first phone screen").toBeLessThanOrEqual(PHONE.viewport.height);
  }, 180000);
});
