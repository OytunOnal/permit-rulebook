// @level presentation
/**
 * The interview's drawing: the page made ready once, and every step drawn as
 * `interviewAfter` decided it.
 */
import type { Dataset, Question } from "permit-rulebook-data";
import { takeCoversOff } from "../../first-paint.js";
import type { InterviewStep } from "../flow/interview-after.js";
import { foldLedgerByWidth, openFoldsForPrint } from "./screen/ledger.js";
import { setStamp } from "./screen/masthead.js";
import { interviewPageOf, type GestureHands } from "./screen/interview-page.js";
import { renderQuestion } from "./screen/question-screen.js";
import { renderResults } from "./screen/verdict-screen.js";

export interface Drawing {
  /** Takes the first paint's covers off, in the task that draws the first screen. */
  uncover(): void;
  /** Draws the screen a step leads to. `backTo` is the question the
   * history says the screen's Back goes to, null where none is behind. */
  drawStep(step: InterviewStep, backTo: string | null): void;
}

/**
 * Makes the page ready to draw on. The stand-in lines go first: they kept a
 * reader from being shown a question they had already answered while the
 * script loaded, and the screen they should have is about to be drawn. Gone
 * before anything is compared, what `paint` finds in the box is what the
 * renderer would draw, so a fresh visit is a page this module leaves alone.
 */
export function openDrawing(ds: Dataset, questions: Question[], hands: GestureHands): Drawing {
  for (const standIn of document.querySelectorAll(".stand-in")) standIn.remove();
  const page = interviewPageOf(ds, questions, hands);
  setStamp(page, "rules-read");
  page.els.restart.addEventListener("click", (e) => {
    e.preventDefault();
    hands.makeGesture({ kind: "restarted", search: location.search });
  });
  foldLedgerByWidth(page);
  openFoldsForPrint();
  return {
    uncover: () => takeCoversOff(page.els.root),
    drawStep: (step, backTo) => {
      if (step.screen.kind === "verdict") renderResults(page, step);
      else renderQuestion(page, step, { screen: step.screen, backTo });
    },
  };
}
