// @level presentation
/**
 * The question screen a step leads to: its masthead, its ledger, its card
 * with the lines the step says, the card's listeners, and meeting the reader
 * there with the scroll the step asks for, the focus and the beat.
 */
import { remainingQuestions, type Question } from "permit-rulebook-data";
import { arrivalLineHtml } from "../../../arrival-line.js";
import { countrySearchOf, hasClasses, mountCountrySearch } from "../../../country-search/index.js";
import type { Glossary } from "../../../gloss.js";
import { isLongList, questionCardHtml, questionMastheadOf } from "../../../question.js";
import type { InterviewScreen, InterviewStep } from "../../flow/interview-after.js";
import { focusFirst, scrollToQuestion } from "./meeting.js";
import { lendRestartToResumedLine, renderDeclaration } from "./ledger.js";
import { setStamp, writeMasthead } from "./masthead.js";
import type { InterviewPage } from "./interview-page.js";
import { announce, paint } from "./paint.js";

type QuestionScreen = Extract<InterviewScreen, { kind: "question" }>;

/**
 * Hangs a question card's listeners: its answers, "Keep this answer" and
 * "← Back". `chosen` is the answer on file for it, if any.
 */
function wireQuestion(page: InterviewPage, q: Question, chosen: string | undefined): void {
  const { main } = page.els;
  const { hands } = page;
  /** The card's one door for a commit, shut for the beat. `recordedAs` is the
   * words the next screen says were recorded, where the control can commit a
   * row that is not the text in the box. */
  const answer = (value: string, recordedAs?: string) => {
    if (!page.beat.inside()) hands.makeGesture({ kind: "answered", value, recordedAs });
  };
  if (isLongList(q)) {
    const classed = hasClasses(q) ? { dataset: page.ds, field: q.field } : null;
    mountCountrySearch(main, countrySearchOf(q.options, { chosen, classed }, answer));
  } else {
    main.querySelectorAll<HTMLButtonElement>(".opt").forEach((btn) =>
      btn.addEventListener("click", () => answer(btn.dataset.value!)));
  }
  main.querySelector<HTMLElement>("#done")?.addEventListener("click", () => hands.makeGesture({ kind: "kept" }));
  main.querySelector<HTMLElement>("#back")?.addEventListener("click", () => hands.pressBack());
}

/** Meets the reader at the question card just drawn: the scroll the step
 * asks for, the focus, and the beat. */
function meetQuestion(page: InterviewPage, step: InterviewStep): void {
  const { main } = page.els;
  const card = main.querySelector<HTMLElement>(".qcard");
  /** The card a gesture drew, as opposed to the one the first paint put in the box. */
  const gestureCard = step.meeting === "untouched" ? null : card;
  if (gestureCard) scrollToQuestion(page, gestureCard, step.meeting);
  // The box a long list is asked through, where the card drew one.
  const search = main.querySelector<HTMLInputElement>("#cfilter");
  if (search) {
    // Every render of a search question puts the caret in it with its text
    // selected, so a correction starts by replacing, not by prepending
    // (product-critique v0.7, F3).
    search.focus({ preventScroll: true });
    search.select();
  } else if (gestureCard) {
    focusFirst(gestureCard);
  }
  if (step.beat) page.beat.begin();
}

/** The card's markup, with the lines the step says above the question and
 * its exits: Back to `backTo`, and Keep where the step says it goes. */
function cardHtml(page: InterviewPage, step: InterviewStep, { q, backTo }: { q: Question; backTo: string | null }): string {
  const { state, lines } = step;
  // A symbol a stranger cannot read is explained the first time a screen
  // uses it: one memory per screen, shared by the arrival line and the card.
  const glossary: Glossary = new Set();
  const remaining = remainingQuestions(page.ds, state.answers);
  const arrival = lines.arrival ? arrivalLineHtml(page.ds, lines.arrival, glossary) : "";
  return questionCardHtml({
    dataset: page.ds, question: q, answers: state.answers, asked: state.asked, editing: state.editing,
    total: state.asked.length + remaining.length, arrival, justRecorded: lines.justRecorded,
    resumed: lines.resumed ?? undefined, glossary, exits: { backTo, keepTo: step.keepGoesTo },
  });
}

/** Draws the question screen a step leads to, then meets the reader there.
 * `backTo` is the question the history says the screen's Back goes to. */
export function renderQuestion(
  page: InterviewPage, step: InterviewStep, { screen, backTo }: { screen: QuestionScreen; backTo: string | null },
): void {
  const { app, main } = page.els;
  const { answers } = step.state;
  // A question a still-alive route cares about, or the one on the record.
  const q = remainingQuestions(page.ds, answers).find((x) => x.field === screen.field)
    ?? page.questions.find((x) => x.field === screen.field)!;
  // A question drawn over the verdict takes the stamp back to the rules' date.
  if (app.dataset.state !== "questions") {
    setStamp(page, "rules-read");
    app.dataset.state = "questions";
  }
  writeMasthead(page, questionMastheadOf(screen), screen.started ? "started" : "fresh");
  announce("");
  renderDeclaration(page, step, q.field);
  paint(main, cardHtml(page, step, { q, backTo }), () => wireQuestion(page, q, answers[q.field]));
  if (step.lines.resumed) lendRestartToResumedLine(page);
  meetQuestion(page, step);
}
