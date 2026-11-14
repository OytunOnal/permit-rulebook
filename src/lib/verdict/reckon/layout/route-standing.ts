// @level application
import type { RouteResult } from "permit-rulebook-data";
import { figureGapsOf, type FigureGap } from "./figure-gaps.js";
import { bandOf, measuredCriterionOf, moneyShortfallOf, type MoneyShortfall } from "./money-shortfall.js";
import type { AnsweredDataset, MeasuredOn, RouteStanding, RouteStandings } from "./verdict-layout.js";

/** What a route is measured on, on the answers given, or null where no
 * amount decides it. */
function measuredOnOf(answeredDataset: AnsweredDataset, r: RouteResult): MeasuredOn | null {
  const { ds, answers } = answeredDataset;
  const criterion = measuredCriterionOf(ds, r, answers);
  return criterion ? { criterion, band: bandOf(ds, criterion.field, answers) ?? null } : null;
}

/** What a route is short of on money, or null: only a route within reach is
 * short of anything. */
const shortfallOf = (answeredDataset: AnsweredDataset, r: RouteResult): MoneyShortfall | null =>
  r.status === "near" ? moneyShortfallOf(answeredDataset.ds, r, answeredDataset.answers) ?? null : null;

/** Each figure a route is short on, in the order its badge names them: each
 * amount, then points (#375, ruling 4 on #322). */
function standingFigureGapsOf(answeredDataset: AnsweredDataset, r: RouteResult): FigureGap[] {
  const gaps = figureGapsOf(answeredDataset.ds, r, answeredDataset.answers);
  return [...gaps.filter((g) => g.kind === "money"), ...gaps.filter((g) => g.kind === "points")];
}

/** One route's standing on the answers given (#372, ruling 4 on #322). */
const routeStandingOf = (answeredDataset: AnsweredDataset, r: RouteResult): RouteStanding => ({
  shortfall: shortfallOf(answeredDataset, r),
  measuredOn: measuredOnOf(answeredDataset, r),
  figureGaps: standingFigureGapsOf(answeredDataset, r),
});

/** Each route's standing, by its id: the one place the card, the headline and
 * the rail read a route's shortfall and what it is measured on. */
export const routeStandingsOf = (answeredDataset: AnsweredDataset, results: RouteResult[]): RouteStandings =>
  Object.fromEntries(results.map((r) => [r.route.id, routeStandingOf(answeredDataset, r)]));
