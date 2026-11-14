// @level application
/**
 * The verdict's reckoning: what the results screen decides, with no words and
 * no markup — the results in view and their groups, the steps, the not-yet
 * group, the money shortfall, the figure gaps and the layout (#372). The
 * drawing reaches it only through this entry.
 */
export {
  arrangeSteps, arrangedRowsOf, routesAJobOfferFreesFor, type Step,
} from "./layout/steps.js";
export { groupedRoutesOf, resultsInViewOf, type Compared, type ResultsInView } from "./layout/in-view.js";
export { countryMarkOf, hasLiveUnknown, layoutOf, stepKeyed, writtenStateKeyOf } from "./layout/layout.js";
export { bandOf, measuredCriterionOf, moneyShortfallOf, type MoneyShortfall } from "./layout/money-shortfall.js";
export { figureGapsOf, type FigureGap } from "./layout/figure-gaps.js";
export type {
  AnswerRef, ArrangedLine, ComparedLayout, CountrySection, Explore, Fold, HeadlineLayout, JobOfferLine, RouteGroupKind,
  StepPlace, Strip, Tally, VerdictGroup, VerdictLayout,
} from "./layout/verdict-layout.js";
