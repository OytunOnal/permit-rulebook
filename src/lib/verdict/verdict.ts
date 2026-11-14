// @level presentation
/**
 * The verdict: the whole results screen as data, from the dataset, the
 * answers and the interview, and the body the interview paints from it.
 *
 * The interview keeps what has a side effect — painting, the arrival line, the
 * announcement, the landing and the focus, recording the screen — and asks
 * this module everything a verdict decides: which screen it is (a
 * comparison, or a notice that answers outright), that screen's whole masthead with the sentence the live region
 * announces, and the layout as data — each group's routes in order, which
 * sections open, what each fold holds and what is counted — with each drawn
 * route's and step's markup by its id (#314).
 */
import { contradictionsIn, type Dataset, type Profile } from "permit-rulebook-data";
import { noticeHtml } from "./compose/card/cards.js";
import { esc } from "../reason.js";
import { drawnCardsOf } from "./compose/drawn-cards.js";
import {
  reckonVerdict, type ReckonedComparison, type ReckonedNoticeScreen, type ResultsInView,
} from "./reckon/reckon-verdict.js";
import { comparedHeadlineOf } from "./compose/headline.js";
import { bodyHtml } from "./compose/html.js";
import { comparedMastheadOf, noticeMastheadOf } from "./compose/masthead.js";
import type { InterviewSoFar, Verdict, VerdictScreen } from "./compose/types.js";
// The verdict's look travels with its markup: the page that paints a verdict
// links this stylesheet in its <head>.
import "./verdict.css";

export type { InterviewSoFar, Verdict, VerdictAction } from "./compose/types.js";
export type { StepCard } from "./compose/drawn-cards.js";
export type {
  AnswerRef, ArrangedLine, ComparedLayout, CountrySection, Explore, Fold, HeadlineLayout, JobOfferLine, RouteGroupKind,
  RouteStanding, StepPlace, Strip, Tally, VerdictGroup, VerdictLayout,
} from "./reckon/reckon-verdict.js";

/**
 * The screen no route can produce: this passport needs no permit at all, and
 * the notice IS the result (critique #1). Only a notice that answers instead
 * of the routes takes the screen; any other notice still stands on it, after
 * (review).
 */
function answeredOutright(screen: VerdictScreen, reckoned: ReckonedNoticeScreen): Verdict {
  const { outright, others } = reckoned;
  return {
    action: { kind: "answered-outright", masthead: noticeMastheadOf(outright[0].title) },
    notices: [...outright, ...others].map((n) => noticeHtml(n, screen.glossary)).join(""),
    layout: { kind: "notice" }, cards: { routes: {}, steps: {} }, body: "",
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

/**
 * A comparison: the layout as the reckoning hands it, drawn — the notices
 * first, the masthead, then every card in the order the screen lists them, so
 * a screen explains an abbreviation on its first use.
 */
function comparedVerdictOf(screen: VerdictScreen, compared: ReckonedComparison, interview: InterviewSoFar): Verdict {
  const notices = noticesAbove(screen, compared.inView);
  const { layout } = compared;
  const headline = comparedHeadlineOf(screen, compared, layout.headline);
  const masthead = comparedMastheadOf(headline, interview.answered, compared.inView.results.length);
  const cards = drawnCardsOf(screen, compared, layout);
  return { action: { kind: "compare", masthead }, notices, layout, cards, body: bodyHtml(screen, layout, cards) };
}

/** The verdict on these answers: the reckoning's, drawn. */
export function verdictOf(dataset: Dataset, answers: Profile, interview: InterviewSoFar): Verdict {
  const screen: VerdictScreen = { ds: dataset, answers, glossary: new Set(), cameFrom: interview.cameFrom };
  const reckoned = reckonVerdict(dataset, answers, interview.cameFrom);
  return reckoned.kind === "answered-outright"
    ? answeredOutright(screen, reckoned)
    : comparedVerdictOf(screen, reckoned, interview);
}

/** The body the interview paints for a verdict, under its arrival line. */
export const verdictHtml = (verdict: Verdict): string => verdict.notices + verdict.body;
