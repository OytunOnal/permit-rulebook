// @level presentation
import { formatEURPer, periodOf, type Dataset, type Route } from "permit-rulebook-data";
import { esc } from "../../reason.js";
import {
  ANSWER_SOURCED, NO_FIGURE, NO_FIGURE_LABEL, POINTS_FIGURE_LABEL, pointsFigure,
} from "../../copy/route-page.js";
import type { PrintedQuotes } from "../../dataset-facts/reckon-dataset-facts.js";
import { figuresOf } from "../../route-lines.js";
import { readDateTime } from "./rule-card.js";

/**
 * The headline figures, each with the day its own page was read, which is the
 * day its quote below prints. Empty where the route asks for no number.
 */
function headlineFigures(dataset: Dataset, route: Route, printed: PrintedQuotes): string {
  const { amounts, points } = figuresOf(route, printed);
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
export function answerBlock(dataset: Dataset, route: Route, printed: PrintedQuotes): string {
  const figures = headlineFigures(dataset, route, printed);
  return `
  <section class="answer" aria-labelledby="answer-h">
    <h2 class="label" id="answer-h">What this route asks for</h2>${figures ? `
    <p class="answer-figure">${figures}</p>
    <p class="answer-read">${esc(ANSWER_SOURCED)}</p>` : `
    <p class="answer-figure"><b>${esc(NO_FIGURE)}</b> <span class="answer-label">${esc(NO_FIGURE_LABEL)}</span></p>`}
  </section>`;
}
