// @level presentation
import {
  deriveBands, formatEURPer, gapCriterionOf,
  type Criterion, type Dataset, type Profile, type RouteResult,
} from "permit-rulebook-data";
import { esc } from "../../reason.js";
import {
  asksOrMore, asksOrMoreHtml, needsOrMoreLine, onField, shortByUpTo, shortByUpToLine,
} from "../../copy/verdict.js";

export type Gte = Extract<Criterion, { op: "gte" }>;

export const bandOf = (ds: Dataset, field: string, answers: Profile) =>
  deriveBands(ds, field).find((b) => b.id === answers[field]);

/**
 * The gte CRITERION this result was measured against — the glossary fixes both
 * words and this returns the criterion, not the threshold it carries (review
 * 2026-09-07).
 *
 * It is the engine's answer, not a second one computed here: the rail, the
 * "short by" banner and the card's one-line explanation are three statements
 * about one rule, and while the sentence was written in the engine and the rail
 * here, they disagreed — a reader with a good salary and too little in the bank
 * was told her salary was short (isolated v1-gate critique, 2026-09-08).
 */
export const measuredCriterionOf = (ds: Dataset, r: RouteResult, answers: Profile): Gte | undefined =>
  gapCriterionOf(ds, r, answers) as Gte | undefined;

/** The period a money field's amounts are stated per. */
export const periodOf = (ds: Dataset, field: string) => ds.fields.find((f) => f.id === field)?.period;

/**
 * A gap as the verdict prints it, in the headline, the card's note, the rail
 * and a step alike: the exact amount, cents only where it has them, with the
 * period of the field it is measured on. Never rounded — rounded down, "up
 * to" would understate it.
 */
export const gapAsPrinted = (ds: Dataset, field: string, gap: number): string => formatEURPer(gap, periodOf(ds, field));

/**
 * What a route within reach on money is short of, in each form a place
 * prints it. Where the reader's band has a lower edge, the band's widest gap;
 * where it is open at the bottom there is no edge to measure a gap from, and
 * the route's line is said instead, with the band. Read from the band, never
 * from a list of fields; decided once, in `moneyShortfallOf`.
 */
export interface MoneyShortfall {
  /** The field the shortfall is measured on. */
  field: string;
  /** The card's note, given the field's name as markup. */
  noteHtml(fieldHtml: string): string;
  /** How near a step would bring the route, as its parenthesis says it. */
  reach: string;
  /** The headline's emphasis. */
  headline: string;
}

/** The money shortfall of a result on the answers it was evaluated on, or
 * undefined where it has no money gap. */
export function moneyShortfallOf(ds: Dataset, r: RouteResult, answers: Profile): MoneyShortfall | undefined {
  const measured = measuredCriterionOf(ds, r, answers);
  if (!r.gap_max || !measured) return undefined;
  const { field } = measured;
  const band = bandOf(ds, field, answers);
  if (band && band.min === undefined) {
    const line = formatEURPer(measured.threshold.amount, periodOf(ds, field));
    return {
      field, noteHtml: (fieldHtml) => asksOrMoreHtml(esc(line), fieldHtml, esc(band.label)),
      reach: asksOrMore(line), headline: needsOrMoreLine(line),
    };
  }
  const gap = gapAsPrinted(ds, field, r.gap_max);
  return {
    field, noteHtml: (fieldHtml) => `<b>${esc(shortByUpTo(gap))}</b> ${onField(fieldHtml)}.`,
    reach: gap, headline: shortByUpToLine(gap),
  };
}
