import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  deriveBands, evaluate, formatEURPer, gapCriterionOf, shortLabelOf, type Dataset, type Profile,
} from "permit-rulebook-data";
import {
  ABOVE_THE_AMOUNT, BELOW_THE_AMOUNT, asksOrMoreHtml, needsOrMoreLine, shortByUpTo, shortByUpToLine, upToShort,
} from "../src/lib/copy.js";
import { esc } from "../src/lib/reason.js";
import { blocksIn, cardOn, everyCardIn, verdictFor } from "./verdict-cards.js";

/**
 * A gap is said one way and drawn on every rail (#174; rulings 2, 3 and 11 on
 * #55, adjustment 1 of the v1.2.1 gate).
 *
 * The headline, the card's note and the rail's row print one gap in one form:
 * the exact amount with its period, "up to" on a bounded band. A band open at
 * the bottom has no lower edge to measure a gap from, so all three name the
 * line instead. And every rail draws the reader's band: a bar where it has
 * two edges, a point at the rail's edge where it is open at one end.
 */

const ds = dataset as unknown as Dataset;

/** The critique's hostile walk: a Nigerian passport, Germany, a job offer, no
 * completed qualification, IT, two years in the last five. One route stands
 * within reach of it on salary, and none is open. */
const HOSTILE: Profile = {
  destination: "de", citizenship: "NG", situation: "offer", situation_country: "de", qualification: "none",
  occupation_it: "yes", experience_5y: "2plus",
};

/** A reader every German salary route can be measured against. */
const QUALIFIED: Profile = {
  destination: "de", citizenship: "NG", situation: "offer", situation_country: "de", qualification: "degree",
  recognition_de: "recognized", occupation_shortage: "yes", occupation_it: "no", experience_5y: "2plus",
  experience_7y: "3to5", german: "b1", english: "none", funds_eur_month: "band_1",
};

const SALARY = "salary_eur_year";
const bands = deriveBands(ds, SALARY);
const lowest = bands.find((b) => b.min === undefined)!;
const highest = bands.find((b) => b.max === undefined)!;
const period = ds.fields.find((f) => f.id === SALARY)!.period;

/** The route within reach on a reader's answers, and the threshold it was measured against. */
function nearOn(answers: Profile) {
  const near = evaluate(ds, answers).filter((r) => r.status === "near" && r.gap_max !== undefined);
  expect(near.length, "precondition: one route within reach on a money gap").toBe(1);
  const r = near[0]!;
  return { route: r.route.id, threshold: gapCriterionOf(ds, r, answers)!.threshold.amount };
}

/** The headline's emphasis, as the page draws it. */
const emphasisOf = (answers: Profile): string => {
  const m = /<b>([\s\S]*)<\/b>/.exec(verdictFor(answers).action.masthead.headline);
  expect(m, "the headline carries no emphasis").not.toBeNull();
  return m![1]!;
};

/** The words a copy template puts round its one argument, read out of `text`;
 * undefined where `text` is not that template's sentence. */
function filledIn(template: (amount: string) => string, text: string): string | undefined {
  const [before, after] = template("\u0000").split("\u0000") as [string, string];
  const start = text.indexOf(before);
  if (start < 0) return undefined;
  const end = after ? text.indexOf(after, start + before.length) : text.length;
  return end < 0 ? undefined : text.slice(start + before.length, end);
}

/** The words a card's note stresses. */
const stressedIn = (note: string): string => /<b>([\s\S]*?)<\/b>/.exec(note)?.[1] ?? "";

/** The rows of a rail, as text. */
const rowsOf = (rail: string): string[] =>
  [...rail.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1]!.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).join(" "));

/** The mark a rail draws for the reader's answer: a bar with its left edge and
 * width, or a point at one edge of the rail. */
function answerMarkOf(rail: string): { bar?: { left: number; width: number }; point?: string } {
  const bar = /class="you" style="left:([-\d.]+)%;width:([-\d.]+)%"/.exec(rail);
  const point = /class="you-point at-(left|right)"/.exec(rail);
  return {
    ...(bar ? { bar: { left: Number.parseFloat(bar[1]!), width: Number.parseFloat(bar[2]!) } } : {}),
    ...(point ? { point: point[1] } : {}),
  };
}

/** Every rail the verdict on these answers draws, by route. */
const railsOn = (answers: Profile): [string, string][] =>
  everyCardIn(verdictFor(answers)).map((c) => [c.route, blocksIn(c.html, "rail")] as [string, string])
    .filter(([, rail]) => rail !== "");

describe("a band open at the bottom names the line", () => {
  const answers: Profile = { ...HOSTILE, [SALARY]: lowest.id };
  const { route, threshold } = nearOn(answers);
  const line = formatEURPer(threshold, period);

  it("the headline names the line the route asks, never an amount short", () => {
    expect(emphasisOf(answers)).toBe(esc(needsOrMoreLine(line)));
    expect(filledIn(shortByUpToLine, emphasisOf(answers))).toBeUndefined();
  });

  it("the card names the line and the reader's band", () => {
    const note = blocksIn(cardOn(verdictFor(answers), route), "gapnote");
    const field = shortLabelOf(ds, SALARY).toLowerCase();
    expect(note).toContain(asksOrMoreHtml(esc(line), esc(field), esc(lowest.label)));
    expect(filledIn(shortByUpTo, stressedIn(note))).toBeUndefined();
  });

  it("every rail says below the amount and draws a point at its left edge", () => {
    const rails = railsOn(answers);
    expect(rails.length, "precondition: a rail is drawn").toBeGreaterThan(0);
    for (const [id, rail] of rails) {
      const amounts = rowsOf(rail).slice(0, -1);
      expect(amounts.length, id).toBeGreaterThan(0);
      for (const row of amounts) expect(row.endsWith(BELOW_THE_AMOUNT), `${id}: ${row}`).toBe(true);
      expect(answerMarkOf(rail), id).toEqual({ point: "left" });
    }
  });
});

describe("a bounded band is short by up to one gap, printed one way", () => {
  /** The gap as the headline, the card's note and the rail's row print it. */
  function printedGaps(answers: Profile) {
    const { route } = nearOn(answers);
    const card = cardOn(verdictFor(answers), route);
    const rows = rowsOf(blocksIn(card, "rail"));
    return {
      headline: filledIn(shortByUpToLine, emphasisOf(answers)),
      card: filledIn(shortByUpTo, stressedIn(blocksIn(card, "gapnote"))),
      rail: rows.map((row) => filledIn(upToShort, row)).find((g) => g !== undefined),
    };
  }

  /** The line the hostile walk's one route within reach asks. */
  const asked = (): number => nearOn({ ...HOSTILE, [SALARY]: lowest.id }).threshold;

  it("the headline says up to, and the headline, the card and the rail print the same gap", () => {
    const band = bands.find((b) => b.min !== undefined && b.max !== undefined && b.max <= asked())!;
    const answers: Profile = { ...HOSTILE, [SALARY]: band.id };
    const gaps = printedGaps(answers);
    expect(gaps.headline, "the headline does not say up to").toBeDefined();
    expect(gaps.card).toBe(gaps.headline);
    expect(gaps.rail).toBe(gaps.headline);
  });

  it("a gap with cents is printed with its cents everywhere", () => {
    // The band whose distance to the line it sits under is not whole euros.
    const threshold = asked();
    const band = bands.find((b) => b.min !== undefined && b.max === threshold)!;
    expect(Math.round((threshold - band.min!) * 100) % 100, "precondition: a gap with cents").not.toBe(0);
    const answers: Profile = { ...HOSTILE, [SALARY]: band.id };
    const exact = esc(formatEURPer(threshold - band.min!, period));
    expect(printedGaps(answers)).toEqual({ headline: exact, card: exact, rail: exact });
  });

  it("every rail draws a bounded band as a bar of positive width", () => {
    const bounded = bands.filter((b) => b.min !== undefined && b.max !== undefined);
    expect(bounded.length, "precondition: bounded bands").toBeGreaterThan(0);
    for (const band of bounded) {
      const rails = railsOn({ ...HOSTILE, [SALARY]: band.id });
      expect(rails.length, `precondition: a rail is drawn on ${band.id}`).toBeGreaterThan(0);
      for (const [id, rail] of rails) {
        const mark = answerMarkOf(rail);
        expect(mark.point, `${band.id} ${id}`).toBeUndefined();
        expect(mark.bar?.width ?? 0, `${band.id} ${id}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("a band open at the top is a point at the right edge", () => {
  it("every rail draws a point at its right edge and says above the amount", () => {
    const answers: Profile = { ...QUALIFIED, [SALARY]: highest.id };
    const rails = railsOn(answers);
    expect(rails.length, "precondition: several rails are drawn").toBeGreaterThan(1);
    for (const [id, rail] of rails) {
      // Every row but the last, which is the reader's own answer.
      const amounts = rowsOf(rail).slice(0, -1);
      expect(amounts.length, id).toBeGreaterThan(0);
      for (const row of amounts) expect(row.endsWith(ABOVE_THE_AMOUNT), `${id}: ${row}`).toBe(true);
      expect(answerMarkOf(rail), id).toEqual({ point: "right" });
    }
  });
});
