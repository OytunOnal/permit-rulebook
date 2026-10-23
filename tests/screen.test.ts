import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { SITUATION_FIELD, deriveQuestions, evaluate, isClosed, type Dataset, type Profile } from "permit-rulebook-data";
import { INTRO_SUBLINE, SHORT_SUBLINE } from "../src/lib/copy/interview.js";
import { answersCheckedLine, nearestLine } from "../src/lib/copy/verdict.js";
import {
  EMPTY_INTERVIEW, interviewAfter, type Gesture, type InterviewState, type InterviewStep,
} from "../src/lib/interview/index.js";
import { questionMastheadOf } from "../src/lib/question.js";
import type { Masthead } from "../src/lib/screen.js";
import { verdictOf, type Verdict } from "../src/lib/verdict/index.js";
import { groupsIn } from "./verdict-cards.js";

const ds = dataset as unknown as Dataset;

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/**
 * Whether a line makes a checkable statement about a comparison that happened.
 * Used by the test that no question screen ever carries one — the symptom B4
 * was, rather than the one line that produced it. The four shapes such a
 * statement takes: the verb, its denial, a pointer at results that may not be
 * there, and a count of what was compared. (A bare digit is not one of them —
 * that made the name a description of something else, review S6.)
 *
 * The verb is the past one. Since the intro went passive (s17) the word
 * "compared" also stands in a sentence that claims nothing has happened —
 * "your answers ARE compared" is the promise, in the present — so the shape
 * this looks for is the comparison that has been done: "were compared", "was
 * compared", or the old active "compared your". Preceded by "is" or "are" it
 * is the promise and does not count. The results say "were checked" (#151),
 * and that is the same claim.
 */
function claimsAComparison(text: string): boolean {
  return /(?<!\b(?:is|are)\s)\bcompared\b/i.test(text) ||
    /\b(?:was|were)\s+checked\b/i.test(text) ||
    /nothing to compare/i.test(text) ||
    /\bbelow\b/i.test(text) ||
    /\b\d+\s+(?:answers?|routes?|published|rule)/i.test(text);
}

/** The masthead a step's screen shows: the question card's on a question
 * screen, the one the verdict composed on the verdict — as the page draws it. */
function mastheadOn(step: InterviewStep): Masthead {
  if (step.screen.kind === "question") return questionMastheadOf(step.screen);
  const { answers, asked } = step.state;
  return verdictOf(ds, answers, { cameFrom: step.state.scopedRouteId, answered: asked.length }).action.masthead;
}

/** The step a gesture leads to, where it leads to one. */
function after(state: InterviewState, gesture: Gesture): InterviewStep {
  const step = interviewAfter(ds, state, gesture);
  if (step === null) throw new Error(`precondition: ${gesture.kind} leads to a step`);
  return step;
}

/** The page opened onto `answers`, asked in the order they are written. */
const openOnto = (answers: Profile): InterviewStep =>
  after(EMPTY_INTERVIEW, { kind: "loaded", record: { answers, history: Object.keys(answers) }, search: "" });

/** A reader of the Netherlands alone, with an offer there: one route open,
 * one within reach, the rest not yet. */
const DUTCH_OFFER: Profile = {
  destination: "nl", citizenship: "IN", situation: "offer", situation_country: "nl", english: "b1", age_band: "u30",
  qualification: "none", experience_7y: "lt3", occupation_it: "yes", salary_eur_month: "band_0", nl_recent_grad: "yes",
};
/** An explorer of all four with no offer: nothing open, and steps that would change that (s23). */
const PRIYA: Profile = {
  destination: "all", citizenship: "IN", situation: "none", qualification: "degree", recognition_de: "unknown",
  occupation_shortage: "unknown", experience_5y: "2plus", experience_7y: "3to5", german: "none", english: "c1",
  nl_recent_grad: "no", top200_grad: "unknown", funds_eur_month: "band_1", age_band: "u30", de_stay6m: "no",
  partner_ck: "no",
};
/** France with no offer: nothing open, and no step that changes it. */
const FRANCE_NOTHING: Profile = { destination: "fr", situation: "none", citizenship: "IN" };
/** A passport free movement covers: the notice answers outright. */
const EU_PASSPORT: Profile = { destination: "de", citizenship: "PL" };

const verdictOn = (data: Dataset, answers: Profile, answered = Object.keys(answers).length): Verdict =>
  verdictOf(data, answers, { cameFrom: null, answered });

/** The routes the engine leaves on a one-country reader's screen: the
 * destination's, less the ones their passport is shut out of. */
const routesChecked = (answers: Profile): number =>
  evaluate(ds, answers).filter((r) => r.country === answers.destination!.toUpperCase() && !isClosed(r)).length;

/** The dataset with France and a second country that has no routes: two
 * countries on the screen, and still nothing a step could open. */
function twoCountriesNothingOpen(): Dataset {
  const copy = JSON.parse(JSON.stringify(ds)) as Dataset;
  const france = copy.countries.find((c) => c.code === "FR")!;
  const empty = { ...copy.countries.find((c) => c.code === "NL")!, routes: [] };
  copy.countries = [france, empty];
  return copy;
}

/** The dataset with one Dutch route only. */
function oneDutchRoute(): Dataset {
  const copy = JSON.parse(JSON.stringify(ds)) as Dataset;
  const nl = copy.countries.find((c) => c.code === "NL")!;
  nl.routes = nl.routes.filter((r) => r.id === "nl-orientation-year");
  return copy;
}

/** Each question's answers, to answer it with one of them. */
const OPTIONS = new Map(deriveQuestions(ds).map((q) => [q.field, q.options.map((o) => o.value)]));

/** One of `items`, chosen by `rand`. */
const pick = <T>(rand: () => number, items: readonly T[]): T => items[Math.floor(rand() * items.length)];

/**
 * A gesture the page can make on the screen `step` drew: on a question, an
 * answer from its options, Keep on an edit, Back in place; anywhere, a ledger
 * row's ✎, the browser's Back or Forward and Start over.
 */
function gestureOn(rand: () => number, step: InterviewStep): Gesture {
  const { asked, editing } = step.state;
  const anywhere: Gesture[] = [{ kind: "restarted", search: "" }, { kind: "browserMoved", field: null, ontoFirstScreen: false }];
  if (asked.length > 0) {
    anywhere.push({ kind: "editedRow", field: pick(rand, asked) });
    anywhere.push({ kind: "browserMoved", field: pick(rand, asked), ontoFirstScreen: rand() < 0.3 });
  }
  if (step.screen.kind === "verdict") return pick(rand, anywhere);
  const onQuestion: Gesture[] = [{ kind: "answered", value: pick(rand, OPTIONS.get(step.screen.field)!) }];
  if (editing) onQuestion.push({ kind: "kept" }, { kind: "back", field: pick(rand, asked) });
  // Answering is what moves an interview forward, so it is half of every walk.
  return rand() < 0.5 ? pick(rand, onQuestion) : pick(rand, anywhere);
}

/** Whether the masthead `step` draws claims a comparison, with where it was drawn. */
function claimOn(step: InterviewStep): { claims: boolean; where: string } {
  const { headline, subline } = mastheadOn(step);
  return { claims: claimsAComparison(headline) || claimsAComparison(subline), where: subline };
}

describe("invariant: a screen that has compared nothing claims nothing (B4)", () => {
  it("holds over random walks of the flow, at every point in every walk", () => {
    // B4 was a WIRING defect, not a rendering one: "Start over" cleared the
    // answers and left the claim about them standing. So the walk is what is
    // tested — every gesture the page can make, in any order, including the
    // two B4 was found on: post-reset and post-edit.
    const rand = lcg(2718);
    for (let walk = 0; walk < 300; walk++) {
      let step = openOnto({});
      const trail: string[] = [];
      for (let move = 0; move < 12; move++) {
        const gesture = gestureOn(rand, step);
        trail.push(gesture.kind);
        step = interviewAfter(ds, step.state, gesture) ?? step;
        // Only the verdict states what was compared.
        if (step.screen.kind === "verdict") continue;
        const { claims, where } = claimOn(step);
        expect(claims, `after ${trail.join(" → ")}: "${where}"`).toBe(false);
      }
      // And from wherever that walk ended — the verdict included — both ways
      // back into the interview land on a screen that claims nothing.
      const backs: Gesture[] = [{ kind: "restarted", search: "" }];
      if (step.state.asked.length > 0) backs.push({ kind: "editedRow", field: step.state.asked[0] });
      for (const back of backs)
        expect(claimOn(after(step.state, back)).claims, `${back.kind} after ${trail.join(" → ")}`).toBe(false);
    }
  });

  it("\"Start over\" starts over regardless of what the caller believes", () => {
    // The reset does not take a count on trust: nothing was answered, so the
    // long promise is what a first-time reader gets, every time.
    const restarted = after(openOnto(DUTCH_OFFER).state, { kind: "restarted", search: "" });
    expect(restarted.screen).toMatchObject({ kind: "question", started: false });
    expect(mastheadOn(restarted).subline).toBe(INTRO_SUBLINE);
  });

  it("an interview under way keeps the short promise, and an untouched one the long", () => {
    const threeAnswered = openOnto({ destination: "de", situation: "offer", citizenship: "IN" });
    const underWay: Gesture[] = [
      { kind: "answered", value: "degree" }, { kind: "editedRow", field: "situation" },
      { kind: "back", field: "citizenship" }, { kind: "browserMoved", field: "destination", ontoFirstScreen: true },
    ];
    expect(mastheadOn(threeAnswered).subline, "loaded").toBe(SHORT_SUBLINE);
    for (const gesture of underWay) expect(mastheadOn(after(threeAnswered.state, gesture)).subline, gesture.kind).toBe(SHORT_SUBLINE);
    const untouched = openOnto({});
    expect(mastheadOn(untouched).subline, "loaded").toBe(INTRO_SUBLINE);
    const moved = after(untouched.state, { kind: "browserMoved", field: "destination", ontoFirstScreen: true });
    expect(mastheadOn(moved).subline, "browserMoved").toBe(INTRO_SUBLINE);
  });

  it("the promise on a question screen is present tense, and counts nothing", () => {
    // Present, and passive since s17: "are compared" is the promise, and the
    // word "compared" alone no longer tells the two apart — the detector does.
    expect(claimsAComparison(INTRO_SUBLINE)).toBe(false);
    expect(INTRO_SUBLINE).not.toMatch(/\b(?:was|were)\s+compared\b/i);
    expect(INTRO_SUBLINE).not.toMatch(/\d/);
    expect(INTRO_SUBLINE).not.toMatch(/\bbelow\b/i);
    // What it must still say: the mechanism, and where the answers stay.
    expect(INTRO_SUBLINE).toMatch(/are compared against published rules/);
    expect(INTRO_SUBLINE).toMatch(/this device/);
    // The shortened form, once the interview is under way, promises the same
    // things and claims no more.
    expect(SHORT_SUBLINE).not.toMatch(/\d/);
    expect(claimsAComparison(SHORT_SUBLINE)).toBe(false);
    expect(SHORT_SUBLINE).toMatch(/this device/);
    expect(SHORT_SUBLINE.length).toBeLessThan(INTRO_SUBLINE.length);
  });

  it("only a result screen states what was compared, and states it exactly", () => {
    const { subline } = verdictOn(ds, DUTCH_OFFER, 13).action.masthead;
    expect(subline).toContain("13 answers");
    expect(subline).toContain(`the published rules of ${routesChecked(DUTCH_OFFER)} routes`);
    expect(claimsAComparison(subline)).toBe(true);
  });

  it("one answer and one route are singular, and the verb agrees with the one answer", () => {
    // The count is the sentence's subject since s17, so the verb follows it:
    // "Your 1 answer was checked", never "were".
    const { subline } = verdictOn(oneDutchRoute(), DUTCH_OFFER, 1).action.masthead;
    expect(subline).toContain("Your 1 answer was checked against the published rules of 1 route.");
  });

  it("the no-permit-needed screen says a comparison did not happen, and is a result", () => {
    const { action } = verdictOn(ds, EU_PASSPORT);
    expect(action.kind).toBe("answered-outright");
    expect(openOnto(EU_PASSPORT).screen.kind).toBe("verdict");
    expect(action.masthead.headline).toBe("No work permit needed.");
    expect(action.masthead.subline).toMatch(/nothing to compare/i);
  });
});

describe("the masthead has exactly one author", () => {
  it("the nothing-open screen's own next step comes from here, not from a second writer", () => {
    // It used to be appended to the element after the fact — a second hand on
    // the one line the type exists to keep honest (review J2).
    const one = verdictOn(ds, FRANCE_NOTHING, 3).action.masthead;
    const several = verdictOn(twoCountriesNothingOpen(), { ...FRANCE_NOTHING, destination: "all" }, 3).action.masthead;
    expect(one.headline).toBe("Nothing open on these answers.");
    expect(several.headline).toBe("Nothing open on these answers.");
    expect(one.subline.startsWith(answersCheckedLine(3, routesChecked(FRANCE_NOTHING)))).toBe(true);
    expect(several.subline.startsWith(answersCheckedLine(3, routesChecked(FRANCE_NOTHING)))).toBe(true);
    // A single country has no country sections to send anyone to (F7).
    expect(one.subline).toMatch(/every route below says what it asks for/);
    expect(several.subline).toMatch(/each country's reasons below/);
  });

  it("a nearest near-miss and an explore hint never fight over the same sentence", () => {
    const verdict = verdictOn(ds, PRIYA);
    const { subline } = verdict.action.masthead;
    const steps = groupsIn(verdict).flatMap((g) => (g.kind === "steps" ? g.steps.map((s) => s.title) : []));
    expect(steps.length, "precondition: the explorer is offered steps").toBeGreaterThan(0);
    expect(steps.some((title) => subline.endsWith(nearestLine(title))), subline).toBe(true);
    expect(subline).not.toMatch(/Change an answer to explore/);
  });
});

describe("the comparison has no subject called \"Code\" (s17)", () => {
  // "Code compares your answers…" on the home masthead and "Code compared your
  // 3 answers…" on the results screen read oddly to the human as sentences
  // whose subject is "Code" (raised 2026-09-15 and withdrawn; raised again on
  // the s16 walk, 2026-09-16: "bu code hala duruyor"). Of three forms offered
  // — "We compared…", the passive, "The rules compared…" — they chose the
  // passive: the subject leaves the sentence, the claim (a comparison by code,
  // not a judgement by a person) stays.
  it("the results screen says what was compared, in the passive, with the counts", () => {
    const { subline } = verdictOn(ds, DUTCH_OFFER, 3).action.masthead;
    expect(subline).toBe(
      `Your 3 answers were checked against the published rules of ${routesChecked(DUTCH_OFFER)} routes. `
        + "Every value below shows its official quote and the date we read it from the source.",
    );
  });

  it("the home masthead promises the comparison, in the passive, before anything is compared", () => {
    expect(INTRO_SUBLINE).toBe(
      "Your answers are compared against published rules — every value shows its official quote and the " +
        "date we read it from the source. Your answers stay on this device. At the end: which routes look " +
        "open, how close the near-misses are, and which single step would unlock more.",
    );
  });

  it("no masthead line, on any screen, has \"Code\" as the subject of the comparison", () => {
    const mastheads: Array<[string, Masthead]> = [
      ["question, fresh", questionMastheadOf({ kind: "question", started: false })],
      ["question, started", questionMastheadOf({ kind: "question", started: true })],
      ["results, open", verdictOn(ds, DUTCH_OFFER).action.masthead],
      ["results, nearest", verdictOn(ds, PRIYA).action.masthead],
      ["results, explore", verdictOn(ds, FRANCE_NOTHING).action.masthead],
      ["notice", verdictOn(ds, EU_PASSPORT).action.masthead],
    ];
    for (const [where, { headline, subline }] of mastheads) {
      expect(subline, where).not.toMatch(/\bCode compar/);
      expect(headline, where).not.toMatch(/\bCode compar/);
    }
  });
});

describe("claimsAComparison tests what it is named for", () => {
  it("catches the four shapes a claim about a past comparison takes", () => {
    for (const claim of [
      "Your 13 answers were compared against 23 published rule sets.",
      "Nothing to compare: the published rule below answers your situation directly.",
      "Every value below shows its official quote.",
      "3 answers against 23 published rule sets.",
    ])
      expect(claimsAComparison(claim), claim).toBe(true);
  });

  it("does not fire on a digit that counts nothing compared", () => {
    // It used to be `/\d/` — any digit at all, which made the name a
    // description of something else (review S6).
    for (const honest of [
      "Which work-permit routes could fit? A few quick questions.",
      "Answer 3 quick questions — nothing is checked against anything yet.",
      "Your answers stay on this device.",
    ])
      expect(claimsAComparison(honest), honest).toBe(false);
  });

  it("tells a promise in the present passive from a claim in the past (s17)", () => {
    // The intro went passive on 2026-09-16 — "Your answers are compared
    // against published rules" — and the bare word "compared" now stands in a
    // sentence that claims nothing has happened yet. What the detector is
    // named for is a comparison that HAS happened: "were compared", "was
    // compared", or the old active "compared your". "Are compared" is the
    // promise, in the present, and must not fire — or the B4 invariant would
    // forbid the very sentence the human chose.
    for (const promise of [
      "Your answers are compared against published rules — every value shows its official quote.",
      "Each answer is compared with what the authority publishes.",
    ])
      expect(claimsAComparison(promise), promise).toBe(false);
    for (const claim of [
      "Your 3 answers were compared against 4 published rule sets.",
      "Your 1 answer was compared against 1 published rule set.",
      "Code compared your answers against the rules.",
      "Your 3 answers were checked against the published rules of 4 routes.",
      "Your 1 answer was checked against the published rules of 1 route.",
    ])
      expect(claimsAComparison(claim), claim).toBe(true);
  });
});

describe("the headline escapes what the dataset says (#25)", () => {
  // The headline is drawn as markup, for its one <b>. A notice's title, a
  // country's name, a situation's label and an amount's period are the
  // dataset's, and a pull request can put a tag in any of them: a <meta>
  // refresh there sends the reader off the site, and the CSP does not stop it.
  const HOSTILE = "<meta http-equiv=refresh content=0;url=https://example.org>";
  const tagIn = (html: string) => /<(?!\/?b>)/.test(html);
  const wrecked = (): Dataset => JSON.parse(JSON.stringify(dataset)) as Dataset;

  it("a notice's title", () => {
    const data = wrecked();
    data.notices!.find((n) => n.kind === "no-permit-needed")!.title = HOSTILE;
    const { action } = verdictOn(data, EU_PASSPORT);
    expect(action.kind).toBe("answered-outright");
    expect(tagIn(action.masthead.headline)).toBe(false);
  });

  it("the sentence and its emphasis, as the page hands them over", () => {
    // The emphasis prints the nearest gap with its period, which is the
    // dataset's word for the field's amount.
    const data = wrecked();
    data.fields.find((f) => f.id === "salary_eur_month")!.period = HOSTILE as "month";
    const { headline } = verdictOn(data, DUTCH_OFFER).action.masthead;
    expect(headline).toContain("<b>");
    expect(headline).toContain("&lt;meta");
    expect(tagIn(headline)).toBe(false);
  });

  it("an unscored verdict built from a country's name and a situation's label", () => {
    const data = wrecked();
    data.countries.find((c) => c.code === "FR")!.name = HOSTILE;
    const option = data.fields.find((f) => f.id === SITUATION_FIELD)!.options!.find((o) => o.value === "research")!;
    option.short = HOSTILE;
    const answers: Profile = { destination: "fr", situation: "research" };
    const m = verdictOn(data, answers).action.masthead;
    // Only the s19 written state carries a subline in markup, for its door.
    expect(m.sublineHtml, "precondition: the s19 written state").toBeDefined();
    expect(tagIn(m.headline)).toBe(false);
  });
});
