// @level presentation
import { formatEURPer, type Dataset } from "permit-rulebook-data";
import type { PrintedShortfall } from "../../copy/verdict.js";
import { periodOf, type MoneyShortfall } from "./money-shortfall.js";

/**
 * A gap as the verdict prints it, in the headline, the card's note, the rail
 * and a step alike: the exact amount, cents only where it has them, with the
 * period of the field it is measured on. Never rounded — rounded down, "up
 * to" would understate it.
 */
export const gapAsPrinted = (ds: Dataset, field: string, gap: number): string => formatEURPer(gap, periodOf(ds, field));

/** The decided shortfall with its amounts printed, for the copy to say: the
 * one place a shortfall's amount is formatted. */
export function printedShortfallOf(ds: Dataset, money: MoneyShortfall): PrintedShortfall {
  if (money.kind === "open-below")
    return { kind: "open-below", line: formatEURPer(money.line, periodOf(ds, money.field)), band: money.band.label };
  return { kind: "bounded", gap: gapAsPrinted(ds, money.field, money.gap) };
}
