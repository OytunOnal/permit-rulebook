import { describe, expect, it } from "vitest";
import {
  INTRO_SUBLINE, SHORT_SUBLINE, claimsAComparison, mastheadFor, screenAfter,
  type FlowAction, type Screen,
} from "../src/lib/screen.js";

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** The gestures that move the interview, and what each does to the count of
 * answers on file — the page's own `asked` array, modelled. */
const GESTURES: Array<{ action: FlowAction; answers: (n: number) => number }> = [
  { action: { kind: "answer" }, answers: (n) => n + 1 },
  { action: { kind: "edit" }, answers: (n) => n },
  { action: { kind: "restore" }, answers: (n) => n },
  { action: { kind: "reset" }, answers: () => 0 },
];

const COMPARE: FlowAction = { kind: "compare", routes: 23, headline: "3 routes look open." };

describe("invariant: a screen that has compared nothing claims nothing (B4)", () => {
  it("holds over random walks of the flow, at every point in every walk", () => {
    // B4 was a WIRING defect, not a rendering one: "Start over" cleared the
    // answers and left the claim about them standing. So the walk is what is
    // tested — every gesture the page can make, in any order, including the
    // two the scenario names: post-reset and post-edit.
    const rand = lcg(2718);
    for (let walk = 0; walk < 300; walk++) {
      let answered = 0;
      let last: FlowAction = { kind: "reset" };
      const trail: string[] = [];
      for (let step = 0; step < 12; step++) {
        // A result screen is reachable from anywhere the interview can end.
        const gesture = rand() < 0.15 && answered > 0
          ? { action: COMPARE, answers: (n: number) => n }
          : GESTURES[Math.floor(rand() * GESTURES.length)];
        answered = gesture.answers(answered);
        last = gesture.action;
        trail.push(last.kind);
        const screen = screenAfter(last, { answered });
        const { headline, subline } = mastheadFor(screen);
        const where = `after ${trail.join(" → ")} with ${answered} answers: "${subline}"`;
        if (last.kind === "compare") {
          expect(screen.kind, where).toBe("results");
          continue;
        }
        expect(screen.kind, where).toBe("question");
        expect(claimsAComparison(subline), where).toBe(false);
        expect(claimsAComparison(headline), where).toBe(false);
      }
      // And from wherever that walk ended — a result screen included — both
      // ways back into the interview land on a screen that claims nothing.
      for (const back of [{ kind: "reset" }, { kind: "edit" }] as FlowAction[]) {
        const { headline, subline } = mastheadFor(screenAfter(back, { answered }));
        expect(claimsAComparison(subline), `${back.kind} after ${trail.join(" → ")}`).toBe(false);
        expect(claimsAComparison(headline), back.kind).toBe(false);
      }
    }
  });

  it("\"Start over\" starts over regardless of what the caller believes", () => {
    // The reset does not take a count on trust: nothing was answered, so the
    // long promise is what a first-time reader gets, every time.
    expect(screenAfter({ kind: "reset" }, { answered: 13 })).toEqual({ kind: "question", started: false });
    expect(mastheadFor(screenAfter({ kind: "reset" }, { answered: 13 })).subline).toBe(INTRO_SUBLINE);
  });

  it("an interview under way keeps the short promise, and an untouched one the long", () => {
    for (const kind of ["answer", "edit", "restore"] as const) {
      expect(mastheadFor(screenAfter({ kind }, { answered: 4 })).subline).toBe(SHORT_SUBLINE);
      expect(mastheadFor(screenAfter({ kind }, { answered: 0 })).subline).toBe(INTRO_SUBLINE);
    }
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
    const { subline } = mastheadFor({ kind: "results", answered: 13, routes: 23, headline: "x" });
    expect(subline).toContain("13 answers");
    expect(subline).toContain("23 published rule sets");
    expect(claimsAComparison(subline)).toBe(true);
  });

  it("one answer and one route are singular, and the verb agrees with the one answer", () => {
    // The count is the sentence's subject since s17, so the verb follows it:
    // "Your 1 answer was compared", never "were".
    const { subline } = mastheadFor({ kind: "results", answered: 1, routes: 1, headline: "x" });
    expect(subline).toContain("Your 1 answer was compared against 1 published rule set.");
  });

  it("the no-permit-needed screen says a comparison did not happen, and is a result", () => {
    const { headline, subline } = mastheadFor({ kind: "notice", title: "No work permit needed" });
    expect(headline).toBe("No work permit needed.");
    expect(subline).toMatch(/nothing to compare/i);
  });
});

describe("the masthead has exactly one author", () => {
  it("the nothing-open screen's own next step comes from here, not from a second writer", () => {
    // It used to be appended to the element after the fact — a second hand on
    // the one line the type exists to keep honest (review J2).
    const base = mastheadFor({ kind: "results", answered: 3, routes: 23, headline: "Nothing open on these answers." });
    const one = mastheadFor({ kind: "results", answered: 3, routes: 23, headline: "x", explore: "one-country" });
    const several = mastheadFor({ kind: "results", answered: 3, routes: 23, headline: "x", explore: "several-countries" });
    expect(one.subline.startsWith(base.subline)).toBe(true);
    expect(several.subline.startsWith(base.subline)).toBe(true);
    // A single country has no country sections to send anyone to (F7).
    expect(one.subline).toMatch(/every route below says what it asks for/);
    expect(several.subline).toMatch(/each country's reasons below/);
  });

  it("a nearest near-miss and an explore hint never fight over the same sentence", () => {
    const { subline } = mastheadFor({
      kind: "results", answered: 3, routes: 23, headline: "x", nearest: "A Dutch salary band",
    });
    expect(subline).toMatch(/Nearest: A Dutch salary band\.$/);
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
    const { subline } = mastheadFor({ kind: "results", answered: 3, routes: 4, headline: "x" });
    expect(subline).toBe(
      "Your 3 answers were compared against 4 published rule sets. Every value below shows its official " +
        "quote and the date we read it from the source.",
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
    const screens: Screen[] = [
      { kind: "question", started: false },
      { kind: "question", started: true },
      { kind: "results", answered: 3, routes: 4, headline: "x", nearest: "n", explore: "one-country" },
      { kind: "results", answered: 1, routes: 1, headline: "x", explore: "several-countries" },
      { kind: "notice", title: "No work permit needed" },
    ];
    for (const screen of screens) {
      const { headline, subline } = mastheadFor(screen);
      expect(subline, JSON.stringify(screen)).not.toMatch(/\bCode compar/);
      expect(headline, JSON.stringify(screen)).not.toMatch(/\bCode compar/);
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
    ])
      expect(claimsAComparison(claim), claim).toBe(true);
  });
});
