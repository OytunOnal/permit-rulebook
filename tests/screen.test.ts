import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  INTRO_SUBLINE, SHORT_SUBLINE, claimsAComparison, mastheadFor, type Screen,
} from "../src/lib/screen.js";

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

describe("invariant: a screen that has compared nothing claims nothing (B4)", () => {
  it("holds for every question screen, at any point in the flow", () => {
    // The bug was reached from three directions — a fresh load, "Start over",
    // and entering the edit flow from a result — and all three land on the
    // same screen kind. Anything that is not a result gets the same masthead,
    // by construction, so none of the three can drift apart again.
    const rand = lcg(2718);
    for (let i = 0; i < 300; i++) {
      const answered = Math.floor(rand() * 14);
      const screen: Screen = { kind: "question", started: answered > 0 };
      const { headline, subline } = mastheadFor(screen);
      expect(claimsAComparison(subline), `after ${answered} answers: "${subline}"`).toBe(false);
      expect(claimsAComparison(headline)).toBe(false);
    }
  });

  it("the promise on a question screen is present tense, and counts nothing", () => {
    expect(INTRO_SUBLINE).not.toMatch(/\bcompared\b/i);
    expect(INTRO_SUBLINE).not.toMatch(/\d/);
    expect(INTRO_SUBLINE).not.toMatch(/\bbelow\b/i);
    // What it must still say: the mechanism, and where the answers stay.
    expect(INTRO_SUBLINE).toMatch(/compares/);
    expect(INTRO_SUBLINE).toMatch(/this device/);
    // The shortened form, once the interview is under way, promises the same
    // things and claims no more.
    expect(claimsAComparison(SHORT_SUBLINE)).toBe(false);
    expect(SHORT_SUBLINE).toMatch(/this device/);
    expect(SHORT_SUBLINE.length).toBeLessThan(INTRO_SUBLINE.length);
  });

  it("only a result screen states what was compared, and states it exactly", () => {
    const { subline } = mastheadFor({ kind: "results", answered: 13, ruleSets: 23, headline: "x" });
    expect(subline).toContain("13 answers");
    expect(subline).toContain("23 published rule sets");
    expect(claimsAComparison(subline)).toBe(true);
  });

  it("one answer and one rule set are singular", () => {
    const { subline } = mastheadFor({ kind: "results", answered: 1, ruleSets: 1, headline: "x" });
    expect(subline).toContain("1 answer against 1 published rule set.");
  });

  it("the no-permit-needed screen says a comparison did not happen, and is a result", () => {
    const { headline, subline } = mastheadFor({ kind: "notice", title: "No work permit needed" });
    expect(headline).toBe("No work permit needed.");
    expect(subline).toMatch(/nothing to compare/i);
  });
});

describe("the page keeps no field-id map of its own (B3, structurally)", () => {
  const source = readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8");

  it("has no hand-maintained field-id-to-label table", () => {
    // The table was the mechanism: every field it had not heard of fell
    // through to `SHORT[f] ?? f`, printing the raw id as the verdict.
    expect(source).not.toMatch(/const SHORT\b/);
    expect(source).not.toMatch(/SHORT\[/);
  });

  it("never falls back to a field id when it needs a name", () => {
    // `x ?? f` / `?? field` / `?? c.field` are all the same escape hatch.
    expect(source).not.toMatch(/\?\?\s*(f|field|c\.field)\b/);
  });

  it("takes its verdict prose from the engine, not from its own strings", () => {
    expect(source).toMatch(/reasonFor/);
    expect(source).toMatch(/shortLabelOf/);
    // Comments may name the old copy — that is how the fix stays explained.
    // What must be gone is the page emitting it.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/Not met:/);
    expect(code).not.toMatch(/Unknown \(you answered/);
  });
});
