// @level presentation
/**
 * The verdict a step lands on: the whole verdict from one call (`verdict/`),
 * painted under the arrival line the step says, announced, and landed on.
 */
import { arrivalLineHtml } from "../../arrival-line.js";
import type { Glossary } from "../../gloss.js";
import { verdictHtml, verdictOf } from "../../verdict/index.js";
import type { InterviewStep } from "../flow/interview-after.js";
import { landOnVerdict } from "./landing.js";
import { renderDeclaration } from "./ledger.js";
import { advance, setStamp } from "./masthead.js";
import type { InterviewPage } from "./page.js";
import { announce, unwire } from "./paint.js";

export function renderResults(page: InterviewPage, step: InterviewStep): void {
  const { app, main } = page.els;
  // The arrival line's own memory of the symbols it explained; the verdict's
  // cards keep theirs inside `verdictOf`.
  const glossary: Glossary = new Set();
  // A verdict that replaces a question is brought to its headline; one drawn
  // over a result the reader is still reading is not moved under them (s20).
  const wasResult = app.dataset.state === "results";
  // The verdict writes the box itself and hangs its own listeners, so what
  // `paint` remembers about the box stops being true here.
  unwire(main);
  renderDeclaration(page, step, null);
  app.dataset.state = "results";
  setStamp(page, "record");
  const { answers, asked, scopedRouteId } = step.state;
  const verdict = verdictOf(page.ds, answers, { cameFrom: scopedRouteId, answered: asked.length });
  advance(page, verdict.action.masthead, null);
  // A notice that answers the reader outright is the whole body: the arrival
  // line stands over a comparison only.
  const answeredOutright = verdict.layout.kind === "notice";
  const facts = step.lines.arrival;
  const arrivalHtml = facts && !answeredOutright ? arrivalLineHtml(page.ds, facts, glossary) : "";
  main.innerHTML = arrivalHtml + verdictHtml(verdict);
  announce(verdict.action.masthead.announced);
  landOnVerdict(page, wasResult, step.land);
}
