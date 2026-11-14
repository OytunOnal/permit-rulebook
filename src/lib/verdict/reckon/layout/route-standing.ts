// @level application
import { liveUnknowns, type RouteResult } from "permit-rulebook-data";
import { figureGapsOf } from "./figure-gaps.js";
import type { ResultsInView } from "./in-view.js";
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

/** One route's standing on the answers given (#372, ruling 4 on #322); its
 * row opens on a live unknown, or where it is the route the reader came from
 * (`cameFrom`, by id, or none). */
function routeStandingOf(answeredDataset: AnsweredDataset, r: RouteResult, cameFrom: string | null): RouteStanding {
  const live = liveUnknowns(r, answeredDataset.answers);
  return {
    shortfall: shortfallOf(answeredDataset, r),
    measuredOn: measuredOnOf(answeredDataset, r),
    figureGaps: figureGapsOf(answeredDataset.ds, r, answeredDataset.answers),
    liveUnknowns: live,
    rowOpens: live.length > 0 || r.route.id === cameFrom,
  };
}

/** Each route's standing in view, by its id, closed routes included: the one
 * place the card, the headline, the rail and the layout's counts read a
 * route's shortfall, what it is measured on, its figure gaps, its live
 * unknowns and whether its row opens. */
export function routeStandingsOf(answeredDataset: AnsweredDataset, inView: ResultsInView): RouteStandings {
  const routes = [...inView.results, ...inView.closed];
  return Object.fromEntries(routes.map((r) => [r.route.id, routeStandingOf(answeredDataset, r, inView.cameFrom)]));
}
