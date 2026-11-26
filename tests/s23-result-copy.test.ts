import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  SITUATION_FIELD, deriveBands, evaluate, fieldOptions, unlockTitleOf, unlocks,
  type Dataset, type Profile,
} from "permit-rulebook-data";
import { SEEK_HINT, WOULD_BE_MET, nearestLine, orAbove, pointsOfNeeded } from "../src/lib/copy/verdict.js";
import {
  PAINTED_AS_COMPOSED, blocksIn, drawnRouteOn, hintsIn, paintedAsComposedScript, placed, standingOn, stepsIn, verdictFor,
} from "./verdict-cards.js";
import { withSite, skipReason } from "./browser-walk.js";
import { InterviewPage } from "../scripts/interview-page/interview-page.mjs";
import { DENIZ, PRIYA_EXPLORING_ALL } from "./personas.js";

const ds = dataset as unknown as Dataset;
const textOf = (html: string): string =>
  html.replace(/<[^>]*>/g, " ").split(/\s+/).join(" ").split(String.fromCharCode(160)).join(" ").trim();

/**
 * s23 — the copy pass (v1.1 gate critique, F1, F3, F4, P1–P6), on the result
 * screen: the job-search sentence, the unlock steps, the Opportunity Card's
 * tally, the Anabin link and Priya's result. The pages' half is
 * `s23-page-copy.test.ts`.
 *
 * Every case reads a rendered string, because every finding was one: a
 * sentence that contradicted the reader, named what they could not see,
 * repeated itself, or spoke the model's language.
 */

const fieldKind = (id: string) => ds.fields.find((f) => f.id === id)?.kind;

/** A step the verdict offers, with the field the engine's unlock row behind it reads. */
interface OfferedStep { title: string; field: string; html: string }

/**
 * The steps the verdict for these answers offers, in the order drawn, each
 * with the field it reads: the engine's own unlock rows, titled as the data
 * package titles them, a folded ladder titled by its lowest rung.
 */
function stepsOffered(answers: Profile): OfferedStep[] {
  const raw = unlocks(ds, answers);
  return stepsIn(verdictFor(answers)).map((step) => {
    const row = raw.find((u) => [unlockTitleOf(ds, u, answers), orAbove(unlockTitleOf(ds, u, answers))].includes(step.title));
    if (!row) throw new Error(`no unlock row is titled ${step.title}`);
    return { title: step.title, field: row.field, html: step.html };
  });
}

/** The step the verdict's masthead names, where it names one. */
function nearestNamed(answers: Profile): string | undefined {
  const verdict = verdictFor(answers);
  const { subline } = verdict.action.masthead;
  return stepsIn(verdict).map((s) => s.title).find((title) => subline.includes(nearestLine(title)));
}

describe("the job-search sentence reaches only a reader without an offer", () => {
  const seekOpen = (answers: Profile) =>
    evaluate(ds, answers).some((r) => r.route.kind === "seek" && r.status !== "hold");

  it("an explorer with an open job-search permit is told it is exactly for this", () => {
    // Priya, with the two unknowns answered her way, opens the Opportunity Card.
    const explorer: Profile = { ...PRIYA_EXPLORING_ALL, recognition_de: "recognized", occupation_shortage: "yes" };
    expect(seekOpen(explorer), "the profile no longer opens a job-search route").toBe(true);
    const html = hintsIn(verdictFor(explorer));
    expect(html).toContain(SEEK_HINT);
    expect(SEEK_HINT).toContain("job-search permit above");
  });

  it("an offer-holder, a transferee and a researcher never see it — whatever their cards say", () => {
    const explorer: Profile = { ...PRIYA_EXPLORING_ALL, recognition_de: "recognized", occupation_shortage: "yes" };
    for (const situation of fieldOptions(ds, SITUATION_FIELD).filter((o) => !o.is_fallback && !o.is_unknown)) {
      const declared = { ...explorer, [SITUATION_FIELD]: situation.value };
      expect(hintsIn(verdictFor(declared)), situation.value).toBe("");
    }
    // Derived from the option the dataset marks as the fallback, not from a typed "none".
    expect(fieldOptions(ds, SITUATION_FIELD).find((o) => o.is_fallback)?.value).toBe(PRIYA_EXPLORING_ALL[SITUATION_FIELD]);
  });

  it("and not without a step to take, nor without an open job-search permit", () => {
    const explorer: Profile = { ...PRIYA_EXPLORING_ALL, recognition_de: "recognized", occupation_shortage: "yes" };
    // The sentence stands under a section's steps, so a section that offers
    // none carries none, and only the section that holds the open job-search
    // permit carries it.
    const { layout } = verdictFor(explorer);
    if (layout.kind !== "countries") throw new Error("the explorer of all four drew no country sections");
    for (const section of layout.sections) {
      const steps = section.groups.find((g) => g.kind === "steps");
      const hint = steps?.kind === "steps" && steps.hint;
      const seeks = evaluate(ds, explorer).some((r) => r.route.kind === "seek" && r.status !== "hold"
        && r.country === section.country);
      if (!steps || !seeks) expect(hint, section.country).toBe(false);
    }
    expect(hintsIn(verdictFor(PRIYA_EXPLORING_ALL))).toBe("");
  });
});

describe("the unlock steps are ordered by what the reader can do", () => {
  it("a change of situation the reader can make comes after the steps within their own situation", () => {
    expectPathStepsAfterImprovableOnes();
  });

  it("Nearest names the first step the reader can take — never a situation they did not declare", () => {
    // The headline names a step where nothing is open: Priya's. Deniz has
    // routes open, so his headline names none, and his first step is the one
    // it would name.
    const nearest = nearestNamed(PRIYA_EXPLORING_ALL)!;
    expect(nearest).toBeDefined();
    expect(stepsOffered(PRIYA_EXPLORING_ALL).find((s) => s.title === nearest)!.field).not.toBe(SITUATION_FIELD);
    expect(nearest).not.toMatch(/transfer|hosting agreement/);
    expect(nearestNamed(DENIZ)).toBeUndefined();
    const first = stepsOffered(DENIZ)[0]!;
    expect(first.field).not.toBe(SITUATION_FIELD);
    expect(first.title).not.toMatch(/transfer|hosting agreement/);
  });

  it("within a group, a step that meets a route beats one that only brings routes within reach, then breadth", () => {
    const steps = stepsOffered(DENIZ);
    const rank = (s: OfferedStep) =>
      (s.html.includes(WOULD_BE_MET) ? 1 : 0) * 1000 + (s.html.match(/<li>/g) ?? []).length;
    const improvable = steps.filter((s) => fieldKind(s.field) === "improvable");
    expect(improvable.length).toBeGreaterThan(1);
    for (let i = 1; i < improvable.length; i++)
      expect(rank(improvable[i - 1]!)).toBeGreaterThanOrEqual(rank(improvable[i]!));
  });

  it("a reader whom only arranged answers would open more for is offered no step", () => {
    expectNoStepWhereOnlyArrangedAnswersOpenMore();
  });
});

/** Checks Deniz as a transferee is offered his path step after every improvable one, and as an offer-holder none. */
function expectPathStepsAfterImprovableOnes(): void {
  // Deniz as a transferee: a job offer is a path step he can take, and it
  // ranks after the improvable ones (recognition, language) — the key is
  // the field's own kind. An arranged answer is no step at all (#175).
  const transferee: Profile = { ...DENIZ, situation: "ict" };
  const steps = stepsOffered(transferee);
  expect(steps.length).toBeGreaterThan(2);
  const kinds = steps.map((s) => fieldKind(s.field));
  const firstPath = kinds.indexOf("path");
  expect(firstPath).toBeGreaterThan(0);
  expect(kinds.slice(firstPath).every((k) => k === "path")).toBe(true);
  expect(kinds.slice(0, firstPath).every((k) => k === "improvable")).toBe(true);
  // An offer-holder has no path step left to take.
  expect(stepsOffered(DENIZ).map((s) => fieldKind(s.field))).not.toContain("path");
}

/** Checks a reader whom only arranged answers would open more for, or nothing would, is offered no step. */
function expectNoStepWhereOnlyArrangedAnswersOpenMore(): void {
  // Deniz with everything else answered his way: a transfer and a hosting
  // agreement are all that would open more, and neither is his to take
  // (#175): they are said apart, never as steps.
  const settled: Profile = {
    ...DENIZ, recognition_de: "recognized", experience_5y: "2plus", experience_7y: "5plus", german: "b2plus",
    salary_eur_year: deriveBands(ds, "salary_eur_year").at(-1)!.id,
  };
  const raw = unlocks(ds, settled);
  expect(raw.length).toBeGreaterThan(0);
  expect(raw.every((u) => u.field === SITUATION_FIELD && u.option.is_arranged)).toBe(true);
  expect(stepsOffered(settled)).toEqual([]);
  // A verdict with no step to take names none: France, no offer and no qualification.
  const stuck: Profile = { destination: "fr", citizenship: "TR", situation: "none", qualification: "none" };
  expect(unlocks(ds, stuck)).toEqual([]);
  expect(stepsIn(verdictFor(stuck))).toEqual([]);
  expect(nearestNamed(stuck)).toBeUndefined();
}

/** The points tally on the Opportunity Card the verdict for these answers draws. */
const tallyFor = (answers: Profile): string =>
  blocksIn(drawnRouteOn(verdictFor(answers), "de-chancenkarte"), "ptsline met", "ptsline short");

/** Checks the not-yet Opportunity Card carries the open card's tally line, from the same scorer, in its own colour. */
function expectNotYetCardCarriesTheTally(): void {
  expect(evaluate(ds, PRIYA_EXPLORING_ALL).find((r) => r.route.id === "de-chancenkarte")!.status).toBe("hold");
  expect(textOf(tallyFor(PRIYA_EXPLORING_ALL))).toContain(pointsOfNeeded(5, 6));
  // A count, not a verdict: the not-yet tally never wears the met colour.
  expect(tallyFor(PRIYA_EXPLORING_ALL)).toContain('class="ptsline short"');
  // Open through the points path: a partial recognition scores, where a
  // full one takes the direct path and counts nothing.
  const partial: Profile = { ...PRIYA_EXPLORING_ALL, recognition_de: "partial", occupation_shortage: "yes" };
  const card = evaluate(ds, partial).find((r) => r.route.id === "de-chancenkarte")!;
  expect(card.status).toBe("met");
  expect(textOf(tallyFor(partial)).startsWith(`${pointsOfNeeded(card.points!.scored, 6)} · `)).toBe(true);
  expect(tallyFor(partial)).toContain('class="ptsline met"');
  // A route that scores no points has no line.
  expect(blocksIn(drawnRouteOn(verdictFor(DENIZ), "de-experienced-worker"), "ptsline met", "ptsline short")).toBe("");
}

/** Checks Priya's German rungs A2, B1 and B2 fold into one "German at A2 … or above" step, and nothing else folds. */
function expectGermanRungsFoldIntoOneStep(): void {
  const raw = unlocks(ds, PRIYA_EXPLORING_ALL);
  const rungs = raw.filter((u) => u.field === "german");
  expect(rungs.map((u) => u.option.value)).toEqual(["a2", "b1", "b2plus"]);
  const steps = stepsOffered(PRIYA_EXPLORING_ALL);
  const german = steps.filter((s) => s.field === "german");
  expect(german).toHaveLength(1);
  expect(german[0]!.title).toBe(orAbove(unlockTitleOf(ds, rungs[0]!, PRIYA_EXPLORING_ALL)));
  expect(german[0]!.title).toMatch(/^German at A2 .*or above$/);
  // The rungs above it are folded into it: no step of their own.
  for (const u of rungs.slice(1)) expect(steps.map((s) => s.title)).not.toContain(unlockTitleOf(ds, u, PRIYA_EXPLORING_ALL));
  // The two recognition answers are two steps still: not a ladder.
  expect(steps.filter((s) => s.field === "recognition_de")).toHaveLength(2);
  for (const s of steps) if (s.field !== "german") expect(s.title).not.toContain("or above");
}

/** Checks Spain's two experience rungs, each opening something of its own, stay two steps, wider first. */
function expectRungThatOpensMoreKeepsItsStep(): void {
  // Spain, no qualification: three years in seven opens the highly-qualified
  // permit, five opens the Blue Card as well — two steps, neither titled
  // "or above".
  const spain: Profile = {
    destination: "es", situation: "offer", situation_country: "es", citizenship: "TR", qualification: "none",
    experience_5y: "lt2", experience_7y: "lt3", salary_eur_year: "band_7", salary_eur_month: "band_7",
    age_band: "a30to35", occupation_it: "no",
  };
  const rungs = unlocks(ds, spain).filter((u) => u.field === "experience_7y");
  expect(rungs.map((u) => u.option.value)).toEqual(["3to5", "5plus"]);
  const steps = stepsOffered(spain).filter((s) => s.field === "experience_7y");
  // Two steps — the wider one first, by the rank every step is ordered on.
  expect(steps.map((s) => s.title)).toEqual([...rungs].reverse().map((u) => unlockTitleOf(ds, u, spain)));
  for (const s of steps) expect(s.title).not.toContain("or above");
}

describe("the not-yet Opportunity Card prints its tally, and the CEFR rungs are one step", () => {
  it("the not-yet card carries the same tally line the open card does, from the same scorer", () => {
    expectNotYetCardCarriesTheTally();
  });

  it("a ladder is an enum every rule reads as 'this rung or above'", () => {
    // Read where the verdict shows it: the rungs of a ladder fold into the
    // lowest one that changes a verdict, titled "… or above".
    const steps = stepsOffered(PRIYA_EXPLORING_ALL);
    // The CEFR fields: every `in` names a tail of the options and the points
    // table climbs them in order.
    expect(steps.filter((s) => s.field === "german").map((s) => s.title.endsWith(orAbove("")))).toEqual([true]);
    // Recognition is a choice of answers, not rungs: its rules name a head of the list.
    expect(steps.filter((s) => s.field === "recognition_de")).toHaveLength(2);
    // A path is not a ladder, nor is a number.
    for (const s of steps.filter((x) => x.field === SITUATION_FIELD || x.field === "salary_eur_year"))
      expect(s.title).not.toContain("or above");
    // English and the experience ladders fold nowhere on these answers:
    // Priya's English is at the top rung, and no answer makes two experience
    // rungs open the same routes (s25 holds the rows form).
  });

  it("the unlock list collapses A2 / B1 / B2 into 'German at A2 … or above'", () => {
    expectGermanRungsFoldIntoOneStep();
  });

  it("a rung that opens something the lower rung does not keeps its own step", () => {
    expectRungThatOpensMoreKeepsItsStep();
  });
});

describe("the Anabin link carries no stray full stop", () => {
  it("the learn box ends on the link: nothing after it can wrap alone", () => {
    // Deniz works in IT with three years in the last seven, so the shortage
    // Blue Card's IT path (#134) meets the card without recognition and no
    // box is left open on it. Out of IT, the degree path's open recognition
    // is the box this case reads.
    const outOfIt: Profile = { ...DENIZ, occupation_it: "no" };
    const html = blocksIn(drawnRouteOn(verdictFor(outOfIt), "de-blue-card-shortage"), "learn");
    expect(html).toContain("anabin");
    expect(html).toMatch(/<\/a><\/div>$/);
    expect(textOf(html)).not.toMatch(/↗ ?\.$/);
    expect(textOf(html)).not.toMatch(/\.$/);
    // A route with nothing left open has no live unknown, so no box links one
    // (#376, ruling 7 on #322).
    expect(standingOn(verdictFor(DENIZ), "de-experienced-worker").liveUnknowns).toEqual([]);
  });
});

describe("the result screen, decided by the verdict", () => {
  it("Priya's not-yet Opportunity Card shows its tally; her steps start with one she can take; the German rungs are one", () => {
    const verdict = verdictFor(PRIYA_EXPLORING_ALL);
    const ck = placed(verdict, "de-chancenkarte");
    expect(ck?.kind, "the not-yet Opportunity Card").toBe("not-yet");
    expect(textOf(ck!.html)).toContain(pointsOfNeeded(5, 6));
    const steps = stepsIn(verdict).map((s) => s.title);
    expect(steps.length).toBeGreaterThan(3);
    expect(steps[0]).not.toMatch(/transfer|hosting agreement/);
    expect(steps.filter((s) => s.includes("German at"))).toHaveLength(1);
    expect(steps.find((s) => s.includes("German at"))).toMatch(/A2 .*or above/);
    // An arranged answer is never a step card (#175).
    expect(steps.filter((s) => /transfer|hosting agreement/.test(s))).toEqual([]);
    expect(verdict.action.masthead.subline).not.toMatch(/Nearest: an intra-corporate transfer|Nearest: a research hosting agreement/);
    // No offer, no open job-search permit: no hint either way.
    expect(hintsIn(verdict)).toBe("");
  });
});

/** And the screen itself: Priya's result, as the browser paints it. */
const skipped = skipReason();
if (skipped)
  process.stderr.write(`\n  !! s23's screen was not walked: ${skipped}.\n     Run: npm run build && npm test\n\n`);

describe.skipIf(skipped !== null)("the result screen, as drawn", () => {
  it("Priya's not-yet Opportunity Card shows its tally; her steps start with one she can take; the German rungs are one", async () => {
    const seen = await withSite(async (site) => {
      const interview = new InterviewPage(site);
      await interview.seed(PRIYA_EXPLORING_ALL);
      await interview.open();
      return {
        state: (await interview.readScreen()).screen,
        painted: JSON.parse(await site.page.evaluate(paintedAsComposedScript(verdictFor(PRIYA_EXPLORING_ALL)))),
      };
    }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as
      { state: string; painted: typeof PAINTED_AS_COMPOSED };

    // What the screen says is the verdict's ("the result screen, decided by
    // the verdict"); the page paints it.
    expect(seen.state).toBe("results");
    expect(seen.painted).toEqual(PAINTED_AS_COMPOSED);
  }, 180000);
});
