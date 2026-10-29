// @level presentation
/**
 * The verdict: the whole results screen as data, from the dataset, the
 * answers and the interview, and the body the interview paints from it.
 *
 * The interview keeps what has a side effect — painting, the arrival line, the
 * announcement, the landing and the focus, recording the screen — and asks
 * this module everything a verdict decides: which screen it is (a
 * comparison, or a notice that answers outright), that screen's whole masthead with the sentence the live region
 * announces, and the layout, each group's routes in order with each card's
 * markup.
 */
import { contradictionsIn, unlocks, type Dataset, type Notice, type Profile } from "permit-rulebook-data";
import { noticeHtml, type VerdictScreen } from "./compose/card/cards.js";
import { esc } from "../reason.js";
import { arrangeSteps, arrangedRowsOf, routesAJobOfferFreesFor } from "./compose/steps.js";
import { comparedActionOf } from "./compose/headline.js";
import { countrySectionHtml, feedbackLineHtml, flatGroupsHtml, stripHtml } from "./compose/html.js";
import { noticeMastheadOf } from "./compose/masthead.js";
import { groupedRoutesOf, resultsInViewOf, type ResultsInView } from "./compose/in-view.js";
import { layoutOf } from "./compose/sections.js";
import type { InterviewSoFar, Verdict } from "./compose/types.js";
// The verdict's look travels with its markup: the page that paints a verdict
// links this stylesheet in its <head>.
import "./verdict.css";

export type {
  ArrangedLine, CountrySection, DrawnRoute, Fold, InterviewSoFar, JobOfferLine, StepCard, Strip, Tally, Verdict,
  VerdictAction, VerdictGroup, VerdictLayout,
} from "./compose/types.js";

/**
 * The screen no route can produce: this passport needs no permit at all, and
 * the notice IS the result (critique #1). Only a notice that answers instead
 * of the routes takes the screen; any other notice still stands on it, after
 * (review).
 */
function answeredOutright(screen: VerdictScreen, inView: ResultsInView, outright: Notice[]): Verdict {
  const others = inView.notices.filter((n) => !outright.includes(n));
  return {
    action: { kind: "answered-outright", masthead: noticeMastheadOf(outright[0].title) },
    notices: [...outright, ...others].map((n) => noticeHtml(n, screen.glossary)).join(""),
    layout: { kind: "notice" },
  };
}

/**
 * The notices above a comparison, with the results intact. Two answers that
 * cannot both be true ride at the very top: a met verdict resting on an
 * answer the reader contradicted must never arrive silently (isolated
 * v1-gate critique, 2026-09-08, F7). The pairs and their wording are the
 * dataset's.
 */
function noticesAbove(screen: VerdictScreen, inView: ResultsInView): string {
  const clash = contradictionsIn(screen.ds, screen.answers)
    .map((c) => `<p class="clash" role="status">${esc(c.say)}</p>`).join("");
  return clash + inView.notices.map((n) => noticeHtml(n, screen.glossary)).join("");
}

export function verdictOf(dataset: Dataset, answers: Profile, interview: InterviewSoFar): Verdict {
  const screen: VerdictScreen = { ds: dataset, answers, glossary: new Set(), cameFrom: interview.cameFrom };
  const inView = resultsInViewOf(dataset, answers, interview.cameFrom);
  const whole = groupedRoutesOf(inView.results, inView.closed, inView.unsettledIds);
  const zeroOpen = whole.met.length + whole.near.length === 0;
  // An extra-rights notice adds to a verdict the rules computed, so it never
  // takes the screen; the zero-open screen keeps its headline and its steps
  // (s5c).
  const outright = inView.notices.filter((n) => n.kind === "no-permit-needed");
  if (outright.length && zeroOpen) return answeredOutright(screen, inView, outright);
  // Counterfactual leverage: what each other answer would unlock, the steps
  // ordered by what the reader can do, each ladder one step (s3b, s23); the
  // arranged answers' rows and what an offer would free, said apart (#175).
  const rows = unlocks(dataset, answers);
  const compared = {
    inView, whole, zeroOpen, steps: arrangeSteps(dataset, rows), arranged: arrangedRowsOf(rows),
    freed: routesAJobOfferFreesFor(dataset, answers),
  };
  const notices = noticesAbove(screen, inView);
  return { action: comparedActionOf(screen, compared, interview.answered), notices, layout: layoutOf(screen, compared) };
}

/** The body the interview paints for a verdict, under its arrival line. */
export function verdictHtml(verdict: Verdict): string {
  const { layout } = verdict;
  switch (layout.kind) {
    case "notice":
      return verdict.notices;
    case "one-country":
      return verdict.notices + stripHtml(layout.strip) + flatGroupsHtml(layout.groups) + feedbackLineHtml();
    case "countries":
      return verdict.notices + stripHtml(layout.strip) + layout.sections.map(countrySectionHtml).join("")
        + feedbackLineHtml();
  }
}
