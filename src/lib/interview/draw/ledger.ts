// @level presentation
/**
 * The ledger, "You declared": the answered rows and the question on the
 * table, its set-aside line, its count and its "Start over"; its fold on a
 * phone; and its fold for the print.
 */
import { declarationCount, declarationHtml, setAsideHtml } from "../../question.js";
import type { InterviewStep } from "../flow/interview-after.js";
import type { InterviewPage } from "./page.js";
import { draw, paint, say } from "./paint.js";

/** Hangs the ✎ gesture on each answered row the ledger drew. */
function wireRows(page: InterviewPage): void {
  page.els.declList.querySelectorAll<HTMLElement>("[data-field]").forEach((row) => {
    const jump = () => page.hands.makeGesture({ kind: "editedRow", field: row.dataset.field! });
    row.addEventListener("click", jump);
    row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); jump(); } });
  });
}

/**
 * Draws the ledger a step leaves: only the answered rows and the question on
 * the table (`currentField`, null on the verdict), so a field never asked
 * never appears.
 */
export function renderDeclaration(page: InterviewPage, step: InterviewStep, currentField: string | null): void {
  const { answers, asked } = step.state;
  const { decl, declList, declSetAside, declSetAsideFolded, declCount, restart, root } = page.els;
  // "Start over" is the ledger's control. The resumed line borrows it for one
  // screen, and every render takes it back first, so the box never holds a
  // node the renderer did not draw and the next write cannot destroy it.
  if (restart.parentElement !== decl) decl.append(restart);
  paint(declList, declarationHtml(page.ds, { answers, asked, currentField }), () => wireRows(page));
  // One line, in two places: under the rows, and in the summary row of a
  // phone's folded panel. The stylesheet shows the one that can be seen.
  const setAsideLine = setAsideHtml(page.ds, step.lines.setAside);
  draw(declSetAside, setAsideLine);
  draw(declSetAsideFolded, setAsideLine);
  say(declCount, declarationCount(asked.length));
  restart.hidden = currentField !== null;
  // The fact the count states, as a state the stylesheet reads: on a phone
  // the ledger line stands above the question and the result once it holds
  // something (amendments 6–7). The pre-paint script seeds it for a reader
  // whose answers are on the device or in the link, and the first screen
  // keeps that seed: a link this page cannot read brings no answer, and
  // moving the line after the module lands is the shift s10 forbids. A
  // gesture (Start over) takes it down.
  if (asked.length > 0) root.dataset.answered = "";
  else if (step.meeting !== "untouched") delete root.dataset.answered;
}

/**
 * The resumed line ends in the ledger's own "Start over", moved in after it:
 * one control and one listener, on a question screen or the verdict. The
 * ledger takes it back on the next render.
 */
export function lendRestartToResumedLine(page: InterviewPage): void {
  const { main, restart } = page.els;
  const line = main.querySelector<HTMLElement>(".resumed");
  if (!line) return;
  line.append(" ", restart);
  restart.hidden = false;
}

/**
 * The ledger is a fixed panel on a wide screen and a one-line disclosure on a
 * phone, where it would push the question below the fold (product-critique
 * v0.7, F8). Wide is always open, its summary no control. Narrow starts
 * folded, and once the reader opens or closes it, that stands.
 */
export function foldLedgerByWidth(page: InterviewPage): void {
  const { decl, root } = page.els;
  const { wide } = page;
  let chosen = false;
  const sync = () => {
    if (!chosen || wide.matches) decl.open = wide.matches;
    // The stylesheet folded the panel before the first paint on the seed the
    // pre-paint script wrote; the seed comes down in the task that makes the
    // real decision, so nothing is painted between the two (s10).
    delete root.dataset.narrow;
  };
  decl.addEventListener("toggle", () => { if (!wide.matches) chosen = true; });
  wide.addEventListener("change", sync);
  sync();
}

/**
 * A printed record that hides its own evidence is not a record: every folded
 * section opens for the print and folds again after. A stylesheet cannot do
 * it — a closed <details> hides its contents below the level CSS reaches.
 */
export function openFoldsForPrint(): void {
  const opened: HTMLDetailsElement[] = [];
  window.addEventListener("beforeprint", () => {
    for (const d of document.querySelectorAll<HTMLDetailsElement>("details"))
      if (!d.open) { d.open = true; opened.push(d); }
  });
  window.addEventListener("afterprint", () => {
    for (const d of opened.splice(0)) d.open = false;
  });
}
