// @level presentation
import {
  decidingCriteria, type Band, type Dataset, type Profile, type RouteResult, type ThresholdCriterion,
} from "permit-rulebook-data";
import { esc, escAttr } from "../../../../reason.js";
import {
  ABOVE_THE_AMOUNT, BELOW_THE_AMOUNT, RAIL_ROWS_LABEL, WHAT_THIS_ROUTE_ASKS, YOUR_ANSWER, upToShort,
} from "../../../../copy/verdict.js";
import { bandOf, measuredCriterionOf } from "../../money-shortfall.js";
import { amountAsPrinted } from "../../printed-shortfall.js";

/**
 * The thresholds this route actually asks of this reader — the amounts on the
 * deciding path, deduplicated, in order.
 *
 * Not every threshold in the dataset on the same field: the card drew six ticks
 * for a Dutch salary, five of them belonging to other routes and carrying
 * nothing but a hover title, which is invisible to a reader and to a finger
 * (human walk, 2026-09-08). Neighbouring amounts are context, and the route
 * page's own rail is where context belongs.
 */
function decidingThresholds(ds: Dataset, r: RouteResult, answers: Profile): ThresholdCriterion[] {
  const measured = measuredCriterionOf(ds, r, answers);
  if (!measured) return [];
  const decided = decidingCriteria(r.criteria)
    .flatMap((cr) => (cr.criterion.op === "gte" ? [cr.criterion] : []))
    .filter((c) => c.field === measured.field);
  const all = decided.length ? decided : [measured];
  const seen = new Set<number>();
  return all
    .filter((c) => (seen.has(c.threshold.amount) ? false : seen.add(c.threshold.amount)))
    .sort((a, b) => a.threshold.amount - b.threshold.amount);
}

/**
 * Where the reader's band stands against one amount, in the words the card
 * already uses elsewhere: a band open at the bottom is below it, with no gap
 * to name. No band straddles an amount: the dataset's bands are cut at every
 * amount it states, so a band not above an amount is below it.
 */
function bandStandsAt(band: Band, amount: number, gapSaid: (gap: number) => string): string {
  if (band.min !== undefined && band.min >= amount) return ABOVE_THE_AMOUNT;
  return band.min === undefined ? BELOW_THE_AMOUNT : upToShort(gapSaid(amount - band.min));
}

/** One scale and one rounding for everything on the bar. */
interface RailScale {
  /** Where an amount sits, as a left offset. */
  at(v: number): string;
  /** How wide the stretch between two amounts is. */
  span(from: number, to: number): string;
}

/**
 * The bar's scale: the route's amounts and the band's edges where it has both.
 * An open end is drawn at the rail's edge, never at an invented amount — one
 * was 80% of the lowest amount or 130% of the highest, and where the band's
 * real edge lay past it the bar had negative width and drew nothing. The
 * band's left edge and a tick at the same amount are the same string, or a
 * reader sees the band miss the line it starts on.
 */
function railScale(amounts: number[], band: Band): RailScale {
  const edges = band.min !== undefined && band.max !== undefined ? [band.min, band.max] : [];
  const lo = Math.min(...amounts, ...edges) * 0.94;
  const hi = Math.max(...amounts, ...edges) * 1.04;
  const at = (v: number): string => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100)).toFixed(2)}%`;
  const span = (from: number, to: number): string =>
    `${(Number.parseFloat(at(to)) - Number.parseFloat(at(from))).toFixed(2)}%`;
  return { at, span };
}

/**
 * The reader's answer on the bar, drawn whatever it is: a band with two edges
 * as a bar between them; a band open at one end as a point at the rail's edge
 * on that side, its row's caption saying which way it runs. A tick on an empty
 * track never stands for an answer.
 */
function answerMarkHtml(band: Band, scale: RailScale): string {
  if (band.min === undefined) return `<span class="you-point at-left"></span>`;
  if (band.max === undefined) return `<span class="you-point at-right"></span>`;
  return `<span class="you" style="left:${scale.at(band.min)};width:${scale.span(band.min, band.max)}"></span>`;
}

/**
 * The salary rail: this route's own amounts, the reader's band, and a line of
 * words for each — nothing drawn that is not named.
 *
 * Three things it will not do again, all seen on one NL ICT card. It will not
 * draw a mark it does not label: five of six ticks said what they were only in
 * a `title` nobody hovers. It will not measure the bar and the band on two
 * roundings: the band began five pixels left of the tick it starts on, so the
 * picture disagreed with itself. And it will not position labels absolutely:
 * they wrapped into a three-line stack at the right edge, which is the same
 * collision the route page's rail was rebuilt to end (critique B1).
 */
export function railHtml(ds: Dataset, r: RouteResult, answers: Profile): string {
  const thresholds = decidingThresholds(ds, r, answers);
  if (!thresholds.length) return "";
  const field = thresholds[0].field;
  const band = bandOf(ds, field, answers);
  if (!band) return "";
  const amounts = thresholds.map((c) => c.threshold.amount);
  const scale = railScale(amounts, band);

  // `rail-tick`, not `tick`: the results screen already used `.tick` for the
  // chosen-answer checkmark, whose `margin-left:.35rem` was silently shifting
  // every line on this bar six pixels right of the amount it marks. That is the
  // "the band does not meet the lines" the walk reported — a class collision,
  // not a rounding error, and the same shape as the `.country` one this
  // codebase has met before (human walk, 2026-09-08).
  const ticks = amounts
    .map((a) => `<span class="rail-tick" style="left:${scale.at(a)}"></span>`)
    .join("");

  const gapSaid = (gap: number): string => amountAsPrinted(ds, field, gap);
  const rows = [
    ...thresholds.map((c) => {
      const label = c.threshold_label ? ` — ${esc(c.threshold_label)}` : "";
      return `<li><span class="sw sw-asks"></span><b>${esc(amountAsPrinted(ds, field, c.threshold.amount))}</b>` +
        `<span>${esc(WHAT_THIS_ROUTE_ASKS)}${label} · ${esc(bandStandsAt(band, c.threshold.amount, gapSaid))}</span></li>`;
    }),
    `<li><span class="sw sw-you"></span><b>${esc(band.label)}</b><span>${esc(YOUR_ANSWER)}</span></li>`,
  ].join("");

  return `
        <div class="rail">
          <div class="bar" aria-hidden="true">${answerMarkHtml(band, scale)}${ticks}</div>
          <ul class="rail-rows" aria-label="${escAttr(RAIL_ROWS_LABEL)}">${rows}</ul>
        </div>`;
}
