import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import { DESTINATION_FIELD, SITUATION_FIELD, joinOr, type Dataset, type Profile } from "permit-rulebook-data";
import { SITUATION_COUNTRY_FIELD } from "../src/lib/situations.js";
import { routesNeed } from "../src/lib/copy/verdict.js";
import { url } from "../src/lib/site.js";
import { verdictHtml, type Tally } from "../src/lib/verdict/verdict.js";
import {
  PAINTED_AS_COMPOSED, answerWordsOf, countryNamed, paintedAsComposedScript, saidLineOf, verdictOn,
} from "./verdict-cards.js";
import { withSite, skipReason } from "./browser-walk.js";
import { InterviewPage } from "../scripts/interview-page.mjs";
import { countryQuestion } from "./s21-country-question.js";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/**
 * s21 — the mark on the country, and on the four-country result: the walk.
 *
 * The same researcher on the "Any of these four" path answers research at
 * question 2 and France at question 3, and met "Nothing open on these answers"
 * thirteen questions later, France's line saying "5 not yet" (v1.1 gate
 * critique, N1). This file walks that path, from the verdict and in the browser.
 */

/** The critique's walk: all four, research, France at question 3, then the
 * quickest profile to a result that contradicts nothing — no qualification, a
 * Turkish passport, no Dutch graduation, no top-200 degree. */
const WALKED: Profile = {
  [DESTINATION_FIELD]: "all", [SITUATION_FIELD]: "research", [SITUATION_COUNTRY_FIELD]: "fr", qualification: "none",
  citizenship: "TR", nl_recent_grad: "no", top200_grad: "no",
};

describe("s21 — the walk's result, from the verdict", () => {
  it("France's written state heads it; France's line says the sentence with its link, over the not-yet rows as before; the other three lines are their counts", () => {
    expectWalkedVerdictSaysItOnFranceLine();
  });
});

/** A section of the four-country verdict: one country's line and groups. */
type CountrySection = Extract<ReturnType<typeof verdictOn>["layout"], { kind: "countries" }>["sections"][number];

/** Checks the walk's verdict: France's written state heads it, France's line carries the sentence and link, the rest stay. */
function expectWalkedVerdictSaysItOnFranceLine(): void {
  const verdict = verdictOn(ds, WALKED);
  expect(verdict.notices).not.toContain("Both cannot be true");
  // The headline this walk ended on was "Nothing open on these answers."
  // when s21 built it — the France line did the saying, third in the
  // list. s26 gave the headline to the country the reader named at
  // question 3 and led with its section; tests/s26 pins those two, and
  // what this case keeps is s21's own: the sentence with its link on
  // France's line.
  expect(verdict.action.masthead.announced).toBe("No route we check in France takes a research hosting agreement.");
  if (verdict.layout.kind !== "countries") throw new Error("the four-country verdict draws no country sections");
  const sections = verdict.layout.sections;
  expect(sections.map((s) => countryNamed(s.country))).toEqual(["France", "Germany", "Spain", "Netherlands"]);
  const [fr, germany, spain, netherlands] = sections;
  const said = saidLineOf(verdict, fr!);
  expect(said!.text).toBe(
    "No route we check in France takes a research hosting agreement — Talent — researcher (chercheur) is quoted, not checked.",
  );
  const link = /<a ([^>]*)href="([^"]*)">([^<]*)<\/a>/.exec(said!.html);
  expect({ text: link?.[3], href: link?.[2] }).toEqual({ text: "Talent — researcher (chercheur)", href: url("/france/talent-researcher") });
  expect(link?.[1]).not.toMatch(/class="[^"]*\bout\b/);
  expectFranceNotYetRowsAsBefore(fr!, verdict.cards.routes);
  // The other three lines, unchanged: each its not-yet count and nothing
  // else — no job offer line and no arranged line for them to name either
  // (ruling 7 of #187).
  expect(germany!.tally).toEqual(notYetOnlyTally(8));
  expect(spain!.tally).toEqual(notYetOnlyTally(4));
  expect(netherlands!.tally).toEqual(notYetOnlyTally(6));
  // The critique's four strings, absent from the whole page then, present now.
  for (const word of ["chercheur", "researcher", "talent-researcher", "research hosting"])
    expect(verdictHtml(verdict) + link?.[2], word).toContain(word);
}

/** Checks France's section keeps its five not-yet rows: four folded on a path answer, one on its own. */
function expectFranceNotYetRowsAsBefore(fr: CountrySection, routeCards: Record<string, string>): void {
  // The body stays: the not-yet rows, as before. One of the five also lacks
  // the degree and is listed on its own; the other four fold.
  expect(fr.groups.filter((g) => g.kind !== "arranged").map((g) => g.kind)).toEqual(["not-yet"]);
  const notYet = fr.groups.find((g) => g.kind === "not-yet");
  if (notYet?.kind !== "not-yet") throw new Error("France draws no not-yet group");
  expect(notYet.count).toBe(5);
  const fold = notYet.items.flatMap((i) => (typeof i !== "string" && i.kind === "needs-path-answers" ? [i] : []))[0];
  if (!fold) throw new Error("France's rows gated on a path answer do not fold");
  const named = fold.pathAnswers.map((a) => answerWordsOf(a.field, a.value));
  expect(routesNeed(fold.routes.length, joinOr(named))).toBe("4 routes need a job offer or an intra-corporate transfer");
  const ownRows = notYet.items.flatMap((i) => (typeof i === "string" ? [routeCards[i]!] : []));
  expect(ownRows.join("")).toContain("Needs a job offer and a university degree");
}

/** The tally of a country line that holds only its not-yet count. */
const notYetOnlyTally = (notYetCount: number): Tally => ({
  open: 0, withinReach: 0, unsettled: 0, closed: 0, notYet: notYetCount, openUnknowns: 0, steps: 0,
  checkedWithJobOffer: 0, openedByArrangedAnswers: 0, mark: null,
});

/**
 * The browser: the walk the critique took, with the mark where it was missing
 * and the sentence where "5 not yet" was.
 */
const skipped = skipReason();
if (skipped)
  process.stderr.write(`\n  !! THE S21 WALK WAS NOT SEEN IN A BROWSER: ${skipped}.\n     Run: npm run build && npm test\n\n`);

// The page script that reads each drawn mark back, with its id and link glyph, so the walk compares what the reader gets.
const MARKS = 'JSON.stringify([...document.querySelectorAll(".qcard .opt-mark")].map((m) => ({'
  + ' under: m.dataset.for, id: m.id, text: m.textContent.trim(),'
  + ' href: m.querySelector("a") ? m.querySelector("a").getAttribute("href") : null,'
  + ' glyph: m.querySelector("a") ? getComputedStyle(m.querySelector("a"), "::after").content : null })))';
// The page script that reads which mark each option is described by, so the walk checks the mark is announced.
const DESCRIBED = 'JSON.stringify([...document.querySelectorAll(".qcard .opt")].map((b) => ({'
  + ' value: b.dataset.value, by: b.getAttribute("aria-describedby"),'
  + ' resolves: b.getAttribute("aria-describedby") ? !!document.getElementById(b.getAttribute("aria-describedby")) : null })))';
/** The mark the stylesheet draws after the link in each country's line that
 * carries one. */
const LINK_GLYPHS = 'JSON.stringify([...document.querySelectorAll(".country-sec .tally a")]'
  + '.map((a) => getComputedStyle(a, "::after").content))';

describe.skipIf(skipped !== null)("s21 — in the browser", () => {
  it("question 3 is never in the cold HTML; the mark is drawn from the two answers before it", () => {
    const cold = readFileSync(`${dist}/index.html`, "utf8");
    expect(cold).not.toContain("opt-mark");
    expect(cold).not.toContain("aria-describedby");
    expect(cold).not.toContain(countryQuestion().label);
  });

  it("all four → research: France is marked at question 3, announced, with an internal link; the walk ends with the sentence on France's line", async () => {
    expectAllFourResearchWalk(await walkAllFourResearchThroughFrance());
  }, 120_000);
});

/** What the browser read on the walk: question 3's marks and descriptions, question 4's label, and the result. */
type AllFourWalk = {
  q3: {
    question: string;
    marks: { under: string; id: string; text: string; href: string | null; glyph: string | null }[];
    described: { value: string; by: string | null; resolves: boolean | null }[];
  };
  q4: string;
  result: { state: string; glyphs: string[]; painted: typeof PAINTED_AS_COMPOSED };
};

/** Walks all four → research → France in the browser to the result, and returns what each screen read. */
async function walkAllFourResearchThroughFrance(): Promise<AllFourWalk> {
  return await withSite(async (site) => {
    const { page } = site;
    const interview = new InterviewPage(site);
    await interview.seed({ destination: "all", situation: "research" });
    await interview.open();
    // Nothing thrown is read once the page is at rest.
    await page.waitUntilAtRest();
    const q3 = {
      question: (await interview.readScreen()).question,
      marks: JSON.parse(await page.evaluate(MARKS)),
      described: JSON.parse(await page.evaluate(DESCRIBED)),
    };
    // France, by the button — then the quickest profile to a result that
    // contradicts nothing: no qualification, a Turkish passport, no Dutch
    // graduation, no top-200 degree. Seven answers; nothing open, as the
    // critique's walk ended, with the France line now saying why.
    await interview.answer(SITUATION_COUNTRY_FIELD, "fr");
    const q4 = (await interview.readScreen()).question;
    await interview.answer("qualification", "none");
    await interview.answer("citizenship", "TR");
    await interview.answer("nl_recent_grad", "no");
    await interview.answer("top200_grad", "no");
    const result = {
      state: (await interview.readScreen()).screen,
      glyphs: JSON.parse(await page.evaluate(LINK_GLYPHS)),
      painted: JSON.parse(await page.evaluate(paintedAsComposedScript(verdictOn(ds, WALKED)))),
    };
    return { q3, q4, result };
  }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as AllFourWalk;
}

/** Checks the walk marked France at question 3, announced, with an internal link, and ended on the verdict its answers compose. */
function expectAllFourResearchWalk(seen: AllFourWalk): void {
  const { q3, q4, result } = seen;
  expect(q3.question).toBe(countryQuestion().label);
  expect(q3.marks).toEqual([{
    under: "fr",
    id: q3.marks[0]?.id,
    text: "Not checked for France yet — Talent — researcher (chercheur) is quoted, not checked: read it here.",
    href: url("/france/talent-researcher"),
    glyph: "none",
  }]);
  expect(q3.marks[0]!.id).toBeTruthy();
  expect(q3.described).toEqual([
    { value: "de", by: null, resolves: null },
    { value: "fr", by: q3.marks[0]!.id, resolves: true },
    { value: "es", by: null, resolves: null },
    { value: "nl", by: null, resolves: null },
  ]);
  expect(q4).toBe("Your highest completed qualification?");

  expect(result.state).toBe("results");
  // The walk ends on the verdict its answers compose — France's written
  // state, the sentence with its link on France's line ("s21 — the walk's
  // result, from the verdict" reads it) — and France's link, the only one
  // in a line, is drawn with no outbound mark.
  expect(result.painted).toEqual(PAINTED_AS_COMPOSED);
  expect(result.glyphs).toEqual(["none"]);
}
