// @level presentation
import { formatEURPer, type Dataset } from "permit-rulebook-data";
import type { PrintedShortfall } from "../../copy/verdict.js";
import type { MoneyShortfall } from "./money-shortfall.js";

/** The period a money field's amounts are stated per. */
export const periodOf = (ds: Dataset, field: string) => ds.fields.find((f) => f.id === field)?.period;

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
