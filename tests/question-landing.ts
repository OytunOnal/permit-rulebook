import { expect } from "vitest";
import { WIDE_QUERY } from "../src/lib/first-paint.js";
import type { BrowserPage } from "../scripts/browser/browser.mjs";
import { InterviewPage } from "../scripts/interview-page/interview-page.mjs";

/**
 * Where the reader stands as s30 reads it — the card's top against the
 * viewport, the header's height and the breath it keeps under itself, the
 * ledger, and what holds the focus — and the landing it checks that against.
 */

/**
 * In the page: where the reader is, read the way a reader would, its question
 * aside, as JSON; `wideQuery` is the site's breakpoint. The page's frame —
 * header, masthead, ledger, main — is on every screen and read straight; only
 * the screen's own parts (the card, the strip) can be absent.
 */
function readWhereInPage(wideQuery: string): string {
  const card = document.querySelector("#main .qcard");
  const first = card && (card.querySelector(".opt, #cfilter") || card.querySelector(".qlabel"));
  const head = document.querySelector(".site-head")!;
  const decl = document.getElementById("decl") as HTMLDetailsElement;
  const declBox = decl.getBoundingClientRect();
  const main = document.getElementById("main")!.getBoundingClientRect();
  const masthead = document.querySelector(".masthead-with-stamps")!.getBoundingClientRect();
  const strip = document.querySelector("#main .strip");
  const active = document.activeElement;
  const nameOf = (el: Element) => (el.id ? "#" + el.id : el.tagName + "." + (el.className || "").split(" ")[0]);
  return JSON.stringify({
    state: document.getElementById("app")!.dataset.state,
    wide: matchMedia(wideQuery).matches,
    scrollY: window.scrollY,
    viewport: window.innerHeight,
    cardTop: card ? card.getBoundingClientRect().top : null,
    cardLeft: card ? card.getBoundingClientRect().left : null,
    mainLeft: main.left,
    mainTop: main.top,
    declTop: declBox.top,
    declBottom: declBox.bottom,
    declLeft: declBox.left,
    declOpen: decl.open,
    answered: document.documentElement.dataset.answered !== undefined,
    mastheadTop: masthead.top,
    mastheadBottom: masthead.bottom,
    stripTop: strip ? strip.getBoundingClientRect().top : null,
    headline: (document.getElementById("headline")!.textContent || "").trim(),
    headerHeight: head.getBoundingClientRect().height,
    gap: parseFloat(getComputedStyle(head).paddingBottom),
    activeIsFirst: !!first && active === first,
    active: active ? nameOf(active) : "",
  });
}

export interface Where {
  state: string;
  wide: boolean;
  scrollY: number;
  viewport: number;
  cardTop: number | null;
  cardLeft: number | null;
  mainLeft: number;
  mainTop: number;
  declTop: number;
  declBottom: number;
  declLeft: number;
  declOpen: boolean;
  answered: boolean;
  mastheadTop: number;
  mastheadBottom: number;
  /** The verdict's summary strip, the first thing of the result after the
   * notices; null on a question screen. */
  stripTop: number | null;
  headline: string;
  headerHeight: number;
  gap: number;
  question: string;
  activeIsFirst: boolean;
  active: string;
}

/** Where the reader is, and which question is being asked. */
export async function where(page: BrowserPage): Promise<Where> {
  const stood = JSON.parse(await page.evaluate(`(${readWhereInPage})(${JSON.stringify(WIDE_QUERY)})`)) as Omit<Where, "question">;
  return { ...stood, question: (await new InterviewPage({ page }).readScreen()).question };
}

/** In the page: the first option of the question on the screen tapped, then
 * the reader's position read by `readWhere` before the browser has had a
 * frame: what an instant landing leaves, and a smooth one does not. */
function tapFirstAndRead(readWhere: typeof readWhereInPage, wideQuery: string): string {
  document.querySelector<HTMLElement>("#main .qcard .opt")!.click();
  return readWhere(wideQuery);
}

/** The first option tapped and the reader's position read in the same task: the gesture a case answers with. */
export const TAP_FIRST_AND_READ = `(${tapFirstAndRead})(${readWhereInPage}, ${JSON.stringify(WIDE_QUERY)})`;

/** The question card's top sits one header and one gap under the viewport's
 * top — within the pixel the browser rounds a scroll to — and the ledger line
 * keeps its place above the card — its bottom at or above the card's top (amendment
 * 8: every answer had felt like arriving at *You declared*). */
export function expectLanded(step: Omit<Where, "question">, label: string): void {
  expect(step.state, `${label}: left the interview`).toBe("questions");
  expect(step.cardTop, `${label}: no question card`).not.toBeNull();
  expect(step.declBottom, `${label}: the ledger (bottom ${step.declBottom}) is not above the card (${step.cardTop})`)
    .toBeLessThanOrEqual(step.cardTop!);
  const landing = step.headerHeight + step.gap;
  expect(
    Math.abs(step.cardTop! - landing),
    `${label}: the card's top is at ${step.cardTop} px, the landing is ${landing} px (scrollY ${step.scrollY})`,
  ).toBeLessThanOrEqual(1);
}
