// @level presentation
/**
 * The verdict a step leads to: the whole verdict from one call (`verdict/`),
 * painted under the resumed or the arrival line the step says, announced, and
 * met as the step asks.
 */
import { arrivalLineHtml } from "../../../arrival-line.js";
import type { Glossary } from "../../../gloss.js";
import { resumedLineHtml } from "../../../question.js";
import { verdictHtml, verdictOf, type Verdict } from "../../../verdict/index.js";
import type { InterviewStep } from "../../flow/interview-after.js";
import { meetVerdict } from "./meeting.js";
import { lendRestartToResumedLine, renderDeclaration } from "./ledger.js";
import { setStamp, writeMasthead } from "./masthead.js";
import type { InterviewPage } from "./page.js";
import { announce, unwire } from "./paint.js";

/**
 * The one line over the verdict's body, where the step says one: the resumed
 * line on the first screen of a return, or the arrival line. A notice that
 * answers the reader outright is the whole body: the arrival line stands over
 * a comparison only.
 */
function lineAboveVerdictHtml(page: InterviewPage, step: InterviewStep, verdict: Verdict): string {
  const { arrival, resumed } = step.lines;
  if (resumed) return resumedLineHtml(resumed);
  if (!arrival || verdict.layout.kind === "notice") return "";
  // The arrival line's own memory of the symbols it explained; the verdict's
  // cards keep theirs inside `verdictOf`.
  const glossary: Glossary = new Set();
  return arrivalLineHtml(page.ds, arrival, glossary);
}

export function renderResults(page: InterviewPage, step: InterviewStep): void {
  const { app, main } = page.els;
  // A verdict that replaces a question is brought to its headline; one drawn
  // over a result the reader is still reading is not moved under them (s20).
  const drawnOver = app.dataset.state === "results" ? "verdict" : "question";
  // The verdict writes the box itself and hangs its own listeners, so what
  // `paint` remembers about the box stops being true here.
  unwire(main);
  renderDeclaration(page, step, null);
  app.dataset.state = "results";
  setStamp(page, "record");
  const { answers, asked, scopedRouteId } = step.state;
  const verdict = verdictOf(page.ds, answers, { cameFrom: scopedRouteId, answered: asked.length });
  writeMasthead(page, verdict.action.masthead, null);
  main.innerHTML = lineAboveVerdictHtml(page, step, verdict) + verdictHtml(verdict);
  if (step.lines.resumed) lendRestartToResumedLine(page);
  announce(verdict.action.masthead.announced);
  meetVerdict(page, step.meeting, drawnOver);
}
