// @level presentation
import { formatEURPer, periodOf, shortLabelOf, type Dataset, type Profile } from "permit-rulebook-data";
import type { PrintedFigureGap, PrintedShortfall } from "../../copy/verdict.js";
import { bandOf, type FigureGap, type MoneyShortfall } from "../reckon/reckon-verdict.js";

/**
 * An amount on a money field as the verdict prints it, a gap in the headline,
 * the card's note, the rail and a step alike, or the line a route asks: the
 * exact amount, cents only where it has them, with the period of the field it
 * is measured on. Never rounded — a gap rounded down would understate "up to".
 */
export const amountAsPrinted = (ds: Dataset, field: string, amount: number): string =>
  formatEURPer(amount, periodOf(ds, field));

/** The decided shortfall with its amounts printed, for the copy to say: the
 * one place a shortfall's amount is formatted. */
export function printedShortfallOf(ds: Dataset, shortfall: MoneyShortfall): PrintedShortfall {
  if (shortfall.kind === "open-below")
    return { kind: "open-below", line: amountAsPrinted(ds, shortfall.field, shortfall.line), band: shortfall.band.label };
  return { kind: "bounded", gap: amountAsPrinted(ds, shortfall.field, shortfall.gap) };
}

/** A figure a route is short on, printed on these answers: an amount as a
 * bounded gap, or, from a band open at the bottom, as the line it asks; the
 * field by its short label; points as they are. */
export function printedFigureGapOf(ds: Dataset, gap: FigureGap, answers: Profile): PrintedFigureGap {
  if (gap.kind === "points") return gap;
  const { field, threshold } = gap.criterion;
  const band = bandOf(ds, field, answers);
  const shortfall: MoneyShortfall = band && band.min === undefined
    ? { kind: "open-below", field, line: threshold.amount, band }
    : { kind: "bounded", field, gap: gap.gap };
  return { kind: "money", shortfall: printedShortfallOf(ds, shortfall), field: shortLabelOf(ds, field).toLowerCase() };
}
