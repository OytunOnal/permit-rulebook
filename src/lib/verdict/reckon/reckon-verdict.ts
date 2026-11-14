// @level application
/**
 * The verdict's reckoning: what the results screen decides, with no words and
 * no markup — the results in view and their groups, whether nothing is open,
 * whether a notice answers outright, the steps, the arranged rows, what a job
 * offer frees, and the layout (#372). The verdict's entry asks this module
 * everything it reckons, and only draws what it is handed. Only
 * `reckonVerdict` and the types leave this entry, so no drawing file can
 * reckon again (ruling 8 on #322).
 */
import { unlocks, type Dataset, type Notice, type Profile } from "permit-rulebook-data";
import { groupedRoutesOf, resultsInViewOf, type ResultsInView } from "./layout/in-view.js";
import { indexStepsByKey, layoutOf } from "./layout/layout.js";
import { arrangeSteps, arrangedRowsOf, routesAJobOfferFreesFor, type Step } from "./layout/steps.js";
import type { ComparedLayout } from "./layout/verdict-layout.js";

export type { ResultsInView } from "./layout/in-view.js";
export type {
  AnswerRef, ArrangedLine, ComparedLayout, CountrySection, Explore, Fold, HeadlineLayout, JobOfferLine, MeasuredOn,
  RouteGroupKind, RouteStanding, RouteStandings, RouteWithStepTaken, StepPlace, Strip, Tally, VerdictGroup,
  VerdictLayout, WrittenStateKey,
} from "./layout/verdict-layout.js";
export type { MoneyShortfall } from "./layout/money-shortfall.js";
export type { FigureGap } from "./layout/figure-gaps.js";
export type { Step } from "./layout/steps.js";

/** The screen no route can produce: a notice answers instead of the routes,
 * with the notices that answer outright first and every other after. */
export interface ReckonedNoticeScreen {
  kind: "answered-outright";
  outright: Notice[];
  others: Notice[];
}

/** A comparison: the results in view, the steps the drawing names, each by
 * the key its places in the layout name it by, and the layout reckoned from
 * them. */
export interface ReckonedComparison {
  kind: "compare";
  inView: ResultsInView;
  steps: Record<string, Step>;
  layout: ComparedLayout;
}

/** What the verdict reckons: the notice screen, or a comparison. */
export type ReckonedVerdict = ReckonedNoticeScreen | ReckonedComparison;

/**
 * Everything the verdict reckons on these answers. Only a notice that
 * answers instead of the routes takes the screen, where nothing is open: an
 * extra-rights notice adds to a verdict the rules computed, so it never takes
 * the screen, and the zero-open screen keeps its headline and its steps
 * (s5c). Otherwise, counterfactual leverage: what each other answer would
 * unlock, the steps ordered by what the reader can do, each ladder one step
 * (s3b, s23); the arranged answers' rows and what an offer would free, said
 * apart (#175).
 */
export function reckonVerdict(dataset: Dataset, answers: Profile, cameFrom: string | null): ReckonedVerdict {
  const inView = resultsInViewOf(dataset, answers, cameFrom);
  const whole = groupedRoutesOf(inView.results, inView.closed, inView.unsettledIds);
  const zeroOpen = whole.met.length + whole.near.length === 0;
  const outright = inView.notices.filter((n) => n.kind === "no-permit-needed");
  if (outright.length && zeroOpen)
    return { kind: "answered-outright", outright, others: inView.notices.filter((n) => !outright.includes(n)) };
  const rows = unlocks(dataset, answers);
  const steps = arrangeSteps(dataset, rows);
  const layout = layoutOf({ ds: dataset, answers }, {
    inView, whole, zeroOpen, steps, arranged: arrangedRowsOf(rows), freed: routesAJobOfferFreesFor(dataset, answers),
  });
  return { kind: "compare", inView, steps: indexStepsByKey(steps), layout };
}
