// @level presentation
import {
  formatEURPer, periodOf, scopeLine, thresholdsUnder,
  type Criterion, type Dataset, type Route, type ThresholdCriterion,
} from "permit-rulebook-data";
import { esc } from "../../reason.js";
import {
  ANSWER_SOURCED, NO_FIGURE, NO_FIGURE_LABEL, POINTS_FIGURE_LABEL, pointsFigure,
} from "../../copy/route-page.js";
import { readDateTime, ruleCriteria } from "./rule-card.js";

/**
 * A route in one line, for the list of the country's other routes. The summary's
 * first sentence, and no more than a line of it: the aside is a way across, not
 * a second card, and four routes' full summaries turned it into a wall.
 */
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
 * both print: its thresholds, one per amount and lowest first, or failing
 * those its points total.
 */
function figuresOf(dataset: Dataset, route: Route): { amounts: ThresholdCriterion[]; points?: Points } {
  const seen = new Set<number>();
  const amounts = ruleCriteria(dataset, route).flatMap(thresholdsUnder)
    .filter((c) => (seen.has(c.threshold.amount) ? false : seen.add(c.threshold.amount)))
    .sort((a, b) => a.threshold.amount - b.threshold.amount);
  return { amounts, points: route.criteria.find((c): c is Points => c.op === "points") };
}

export function routeFigure(dataset: Dataset, route: Route): RouteFigure {
  const { amounts, points } = figuresOf(dataset, route);
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

export function gist(route: Route): string {
  // A whole sentence or nothing: ten of the twenty-three cards ended in an
  // ellipsis mid-clause, which is a sentence the reader has to open the page to
  // finish (Spec review, 2026-09-08). The summary's first sentence is written
  // to stand alone, so it stands.
  const first = (route.summary ?? "").split(/(?<=\.)\s/)[0] ?? "";
  return first || scopeLine(route, { reader: "not-answered" });
}

/**
 * The headline figures, each with the day its own page was read, which is the
 * day its quote below prints. Empty where the route asks for no number.
 */
function headlineFigures(dataset: Dataset, route: Route): string {
  const { amounts, points } = figuresOf(dataset, route);
  if (amounts.length)
    return amounts.map((c) => `<b>${esc(formatEURPer(c.threshold.amount, periodOf(dataset, c.field)))}</b>${
      c.threshold_label ? ` <span class="answer-label">— ${esc(c.threshold_label)}</span>` : ""} · ${
      readDateTime(c.threshold.retrieved_at)}`).join("<br>");
  if (!points) return "";
  return `<b>${esc(pointsFigure(points.required.value))}</b> <span class="answer-label">${esc(POINTS_FIGURE_LABEL)}</span> · ${
    readDateTime(points.required.retrieved_at)}`;
}

/**
 * What a search visitor came for, before anything explains itself: the number
 * this route asks for, the day it was read, and the way in. A route that asks
 * for no money says so in the same place, since the absence is an answer to
 * "what is the threshold"; no sentence states an absence, so it points to none.
 */
export function answerBlock(dataset: Dataset, route: Route): string {
  const figures = headlineFigures(dataset, route);
  return `
  <section class="answer" aria-labelledby="answer-h">
    <h2 class="label" id="answer-h">What this route asks for</h2>${figures ? `
    <p class="answer-figure">${figures}</p>
    <p class="answer-read">${esc(ANSWER_SOURCED)}</p>` : `
    <p class="answer-figure"><b>${esc(NO_FIGURE)}</b> <span class="answer-label">${esc(NO_FIGURE_LABEL)}</span></p>`}
  </section>`;
}
