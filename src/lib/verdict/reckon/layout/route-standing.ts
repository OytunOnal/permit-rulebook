// @level application
import {
  decidingCriteria, liveUnknowns, type Band, type RouteResult, type ThresholdCriterion,
} from "permit-rulebook-data";
import { figureGapsOf } from "./figure-gaps.js";
import type { ResultsInView } from "./in-view.js";
import { bandOf, measuredCriterionOf, moneyShortfallOf, type MoneyShortfall } from "./money-shortfall.js";
import type {
  AnsweredDataset, BandAgainstThreshold, MeasuredOn, RouteStanding, RouteStandings, ThresholdAsked,
} from "./verdict-layout.js";

/**
 * The thresholds this route actually asks of this reader — the amounts on the
 * deciding path on the field it is measured on, each amount once, lowest
 * first; the measured criterion alone where no deciding path asks one.
 *
 * Not every threshold in the dataset on the same field: the card drew six ticks
 * for a Dutch salary, five of them belonging to other routes and carrying
 * nothing but a hover title, which is invisible to a reader and to a finger
 * (human walk, 2026-09-08). Neighbouring amounts are context, and the route
 * page's own rail is where context belongs.
 */
function decideThresholdCriteria(r: RouteResult, measured: ThresholdCriterion): ThresholdCriterion[] {
  const decided = decidingCriteria(r.criteria)
    .flatMap((cr) => (cr.criterion.op === "gte" ? [cr.criterion] : []))
    .filter((c) => c.field === measured.field);
  const all = decided.length ? decided : [measured];
  const seen = new Set<number>();
  return all
    .filter((c) => (seen.has(c.threshold.amount) ? false : seen.add(c.threshold.amount)))
    .sort((a, b) => a.threshold.amount - b.threshold.amount);
}

/** Where the reader's band stands against one amount: a band whose floor is
 * at or over it is above it; a band open at the bottom is below it, with no
 * gap to name; any other is short of it by up to the amount less its floor. */
function decideBandAgainstThreshold(band: Band, amount: number): BandAgainstThreshold {
  if (band.min !== undefined && band.min >= amount) return { kind: "above" };
  return band.min === undefined ? { kind: "below" } : { kind: "short", gap: amount - band.min };
}

/** Each threshold the rail draws for this route against the reader's band;
 * none where the reader gave no answer on the field. */
const decideThresholdsAsked = (r: RouteResult, criterion: ThresholdCriterion, band: Band | null): ThresholdAsked[] =>
  (band
    ? decideThresholdCriteria(r, criterion)
      .map((c) => ({ criterion: c, bandStands: decideBandAgainstThreshold(band, c.threshold.amount) }))
    : []);

/** What a route is measured on, on the answers given, or null where no
 * amount decides it. */
function measuredOnOf(answeredDataset: AnsweredDataset, r: RouteResult): MeasuredOn | null {
  const { ds, answers } = answeredDataset;
  const criterion = measuredCriterionOf(ds, r, answers);
  if (!criterion) return null;
  const band = bandOf(ds, criterion.field, answers) ?? null;
  return { criterion, band, thresholds: decideThresholdsAsked(r, criterion, band) };
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
