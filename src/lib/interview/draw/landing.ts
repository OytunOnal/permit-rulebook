// @level presentation
/**
 * Where a drawn screen meets the reader (GLOSSARY: Reveal / landing), and
 * the focus it leaves them on. `interviewAfter` names the landing a gesture
 * asks for; this turns it into a scroll with the width read at the moment of
 * the gesture.
 *
 * The first paint is not a gesture: nothing on it takes the focus from a
 * reader who has touched nothing, and a browser history move keeps the
 * scroll the browser restores.
 */
import type { Landing } from "../flow/interview-after.js";
import type { InterviewPage } from "./page.js";

/** The motion a scroll of ours makes: none for a reader who asked for none. */
const motionOf = (page: InterviewPage): ScrollBehavior => (page.reducedMotion.matches ? "auto" : "smooth");

/**
 * s20's reveal: the top of what was drawn comes into view when it is not, and
 * nothing scrolls where it already is, so a desktop reader whose card sits
 * beside the ledger is not jolted for a correction they can already see.
 */
function reveal(page: InterviewPage, el: Element): void {
  const { top } = el.getBoundingClientRect();
  if (top >= 0 && top < window.innerHeight) return;
  el.scrollIntoView({ block: "start", behavior: motionOf(page) });
}

/**
 * On a narrow screen the card's top lands just under the header — one
 * header's height and the breath the header keeps under itself, both read
 * from the header — and the masthead scrolls away (v1.1 gate critique, P10).
 * Drawn under the masthead, the next question's options sit below the fold,
 * and `reveal` never fires there: the card's top is on the screen.
 */
function landUnderHeader(page: InterviewPage, card: Element, head: HTMLElement): void {
  const { height } = head.getBoundingClientRect();
  const gap = parseFloat(getComputedStyle(head).paddingBottom);
  const top = window.scrollY + card.getBoundingClientRect().top - height - gap;
  window.scrollTo({ top, behavior: motionOf(page) });
}

/**
 * Lands on a question card a step drew. A browser move onto a later question
 * waits for the frame: the browser restores the scroll the reader left that
 * entry at after the render and before the first animation frame, and that
 * is not where the question is (Spec review, 2026-09-18).
 */
export function landOnQuestion(page: InterviewPage, card: Element, land: Landing): void {
  // The first paint and a browser move onto the first screen keep the
  // browser's own scroll.
  if (land === "first-paint" || land === "browser-scroll") return;
  const afterRestore = land === "card-under-header-after-restore";
  /** s20's reveal: every gesture on a wide screen, and Start over on any. */
  const revealsOnly = page.wide.matches || land === "card-into-view";
  const { head, decl } = page.els;
  if (revealsOnly || !head) {
    if (!afterRestore) reveal(page, card);
    return;
  }
  // The ledger the correction came from folds away, so the question it
  // reopened is the next thing under the line.
  if (land === "card-under-folded-ledger") decl.open = false;
  if (afterRestore) requestAnimationFrame(() => landUnderHeader(page, card, head));
  else landUnderHeader(page, card, head);
}

/** The first control on a question card — a button for a choice, the box
 * for a search — and the card's own heading where there is neither, focused
 * without moving the page a second time. */
export function focusFirst(card: Element): void {
  const first = card.querySelector<HTMLElement>(".opt, #cfilter");
  if (first) { first.focus({ preventScroll: true }); return; }
  const heading = card.querySelector<HTMLElement>(".qlabel");
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
}

/**
 * Brings the card the reader came from into view, opening whatever it is
 * folded inside, and says whether there was one. Instant, not smooth: a
 * reader who arrives mid-scroll on a phone should not watch the page travel.
 */
function showCameFrom(page: InterviewPage): boolean {
  const card = page.els.main.querySelector<HTMLElement>("[data-came-from]");
  if (!card) return false;
  for (let node: HTMLElement | null = card; node; node = node.parentElement)
    if (node instanceof HTMLDetailsElement) node.open = true;
  card.scrollIntoView({ block: "start" });
  return true;
}

/**
 * Where a verdict leaves the reader: the card they came from, when they came
 * from one; otherwise, after a gesture, the masthead whose headline the
 * verdict just wrote, unless the reader was already on a result. The headline
 * takes the focus — it is what the live region just read out — out of the
 * tab order and without a second scroll, on every gesture-drawn verdict.
 */
export function landOnVerdict(page: InterviewPage, wasResult: boolean, land: Landing): void {
  if (showCameFrom(page)) return;
  if (land !== "verdict-masthead") return;
  const { masthead, headline } = page.els;
  if (!wasResult) reveal(page, masthead);
  headline.tabIndex = -1;
  headline.focus({ preventScroll: true });
}
