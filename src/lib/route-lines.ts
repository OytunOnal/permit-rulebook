// @level presentation
import {
  formatEURPer, periodOf, phraseOf, scopeLine, thresholdsUnder,
  type Country, type Criterion, type Dataset, type Route, type ThresholdCriterion,
} from "permit-rulebook-data";
import { audienceLine } from "./copy/route-page.js";
import type { PrintedQuotes } from "./dataset-facts/reckon-dataset-facts.js";

/**
 * The lines a route is told in outside its own rules: its gist, the figure it
 * turns on, and whom its country's routes are for. The route page and the
 * country page both print them, so they live in neither, and no page imports
 * another (ruling 2 on #323).
 */

/**
 * Who the page is for, said before the first rule. An Irish reader who lands on
 * a German route page from a search is told here, not after seven rules and a
 * refusal (`tests/s6-edges.test.ts`), and the call to action below leads to the notice
 * that answers her rather than to a rejection.
 */
export const audienceSentence = (country: Country): string => audienceLine(phraseOf(country.code));

/**
 * A route in one line, for the list of the country's other routes. The summary's
 * first sentence, and no more than a line of it: the aside is a way across, not
 * a second card, and four routes' full summaries turned it into a wall.
 */
export function gist(route: Route): string {
  // A whole sentence or nothing: ten of the twenty-three cards ended in an
  // ellipsis mid-clause, which is a sentence the reader has to open the page to
  // finish (Spec review, 2026-09-08). The summary's first sentence is written
  // to stand alone, so it stands.
  const first = (route.summary ?? "").split(/(?<=\.)\s/)[0] ?? "";
  return first || scopeLine(route, { reader: "not-answered" });
}

/**
 * The one figure a route turns on, with the label its own field gives it.
 *
 * The country index prints it beside every route, and an unlabelled number on
 * an index is a number a reader has to open the page to understand: "€1,091"
 * is a salary to anyone who does not already know the Opportunity Card asks for
 * living costs (isolated critique of the nav mock, B2/F3, 2026-09-08). The
 * label is derived from the field, never typed per route.
 */
export interface RouteFigure {
  label: string;
  /** Empty where the route asks for no number at all. */
  value: string;
}

type Points = Extract<Criterion, { op: "points" }>;

/**
 * The figures a route turns on, which the headline panel and the country card
 * both print: its rule cards' thresholds, one per amount and lowest first, or
 * failing those its points total.
 */
export function figuresOf(route: Route, printed: PrintedQuotes): { amounts: ThresholdCriterion[]; points?: Points } {
  const seen = new Set<number>();
  const amounts = printed.cards.map((card) => card.criterion).flatMap(thresholdsUnder)
    .filter((c) => (seen.has(c.threshold.amount) ? false : seen.add(c.threshold.amount)))
    .sort((a, b) => a.threshold.amount - b.threshold.amount);
  return { amounts, points: route.criteria.find((c): c is Points => c.op === "points") };
}

export function routeFigure(dataset: Dataset, route: Route, printed: PrintedQuotes): RouteFigure {
  const { amounts, points } = figuresOf(route, printed);
  if (amounts.length) {
    const own = amounts[0]!;
    // "Salary threshold" and "funds to show" are the two things money means on
    // these routes, and the field says which: one is what a job pays you, the
    // other is what you must be able to show you have.
    const label = /funds/.test(own.field) ? "funds to show" : "salary threshold";
    const from = amounts.length > 1 ? "from " : "";
    return {
      label,
      value: `${from}${formatEURPer(own.threshold.amount, periodOf(dataset, own.field))}`,
    };
  }
  if (points) return { label: "points needed", value: String(points.required.value) };
  return { label: "no salary threshold", value: "" };
}
