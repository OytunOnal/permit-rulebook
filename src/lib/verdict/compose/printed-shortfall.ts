// @level presentation
import { formatEURPer, periodOf, shortLabelOf, type Dataset } from "permit-rulebook-data";
import type { PrintedFigureGap, PrintedShortfall } from "../../copy/verdict.js";
import type { FigureGap, MoneyShortfall } from "../reckon/reckon-verdict.js";

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

/** A figure a route is short on, printed: an amount's decided shortfall, with
 * the field by its short label; points as they are. */
export function printedFigureGapOf(ds: Dataset, gap: FigureGap): PrintedFigureGap {
  if (gap.kind === "points") return gap;
  const { shortfall } = gap;
  return { kind: "money", shortfall: printedShortfallOf(ds, shortfall), field: shortLabelOf(ds, shortfall.field).toLowerCase() };
}
