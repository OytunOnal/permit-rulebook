// @level application
import { deriveBands, gapCriterionOf, type Band, type Criterion, type Dataset, type Profile, type RouteResult } from "permit-rulebook-data";

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
 * What a route within reach on money is short of, decided once and in no
 * words. Where the reader's band has a lower edge, the band's widest gap;
 * where it is open at the bottom there is no edge to measure a gap from, and
 * the route's line stands instead, with the band. Read from the band, never
 * from a list of fields.
 */
export type MoneyShortfall =
  /** The field the shortfall is measured on, and the band's widest gap. */
  | { kind: "bounded"; field: string; gap: number }
  /** The field, the amount the route asks, and the reader's band. */
  | { kind: "open-below"; field: string; line: number; band: Band };

/** The money shortfall of a result on the answers it was evaluated on, or
 * undefined where it has no money gap. */
export function moneyShortfallOf(ds: Dataset, r: RouteResult, answers: Profile): MoneyShortfall | undefined {
  const measured = measuredCriterionOf(ds, r, answers);
  if (!r.gap_max || !measured) return undefined;
  const { field } = measured;
  const band = bandOf(ds, field, answers);
  if (band && band.min === undefined) return { kind: "open-below", field, line: measured.threshold.amount, band };
  return { kind: "bounded", field, gap: r.gap_max };
}
