import type { BrowserPage } from "../scripts/browser/browser.mjs";
import { InterviewPage } from "../scripts/interview-page/interview-page.mjs";
import { BEAT_MS } from "./browser-walk.js";

/**
 * The question card as `beat.test.ts` reads and presses it: where the reader
 * is, the points its clicks land on, the moment a gesture has drawn another
 * question, and the page's clock on the gestures, each read in the page by a
 * function serialised into it.
 */

/** Where the reader is: how many answers the record holds, the question on
 * the screen, whether it is the search, whether the focus is on its first
 * option, and how many animations the question card is running. */
export interface Where { answers: number; question: string; search: boolean; focusOnFirst: boolean; cardAnimations: number }

/** A point of the viewport, in pixels. */
export type Point = { x: number; y: number };

/** On the page's clock, the span of the clocked gestures and the beat the page declares. */
export interface SpanAndBeat { spanMs: number; beatMs: number }

// The question card's options, in order: the first is what a reader's quick second click lands on.
export const FIRST_OPTION = "#main .qcard .opt";

/** In the page: where the reader is on the question card, the record aside, as JSON. */
function readCard(): string {
  const card = document.querySelector("#main .qcard");
  const first = card && card.querySelector(".opt");
  return JSON.stringify({
    question: card ? (card.querySelector(".qlabel")?.textContent || "").trim() : "",
    search: !!card && !!card.querySelector("#cfilter"),
    focusOnFirst: !!first && document.activeElement === first,
    cardAnimations: card ? card.getAnimations({ subtree: true }).length : 0,
  });
}

/** Where the reader is, from the card as `card` read it and the record read now. */
const withAnswersOnRecord = async (page: BrowserPage, card: string): Promise<Where> =>
  ({ answers: Object.keys((await new InterviewPage({ page }).readRecord())?.answers ?? {}).length, ...JSON.parse(card) });

/** Where the reader is now. */
export const where = async (page: BrowserPage): Promise<Where> => withAnswersOnRecord(page, await page.evaluate(`(${readCard})()`));

/** In the page: the centre of every element `selector` finds, in order, in viewport pixels, as JSON. */
function readCentresOf(selector: string): string {
  return JSON.stringify([...document.querySelectorAll(selector)].map((el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }));
}

/** The centre of every element a selector finds, in order, in viewport pixels. */
export const centresOf = async (page: BrowserPage, selector: string): Promise<Point[]> =>
  JSON.parse(await page.evaluate(`(${readCentresOf})(${JSON.stringify(selector)})`)) as Point[];

/** The centre of the first element a selector finds, in viewport pixels. */
export const pointOf = async (page: BrowserPage, selector: string): Promise<Point> => (await centresOf(page, selector))[0]!;

/** Clicks the centre of the first element a selector finds, as the platform's own click. */
export async function clickOn(page: BrowserPage, selector: string): Promise<void> {
  const at = await pointOf(page, selector);
  await page.clickAt(at.x, at.y);
}

/** Waits until a gesture has drawn a question other than `before`, and
 * returns the screen read the moment it is there: the page answers in the
 * task that draws the card, and a history move draws on the browser's turn,
 * not the gesture's. */
export async function waitUntilAnotherQuestionDrawn(page: BrowserPage, before: string): Promise<Where> {
  const drawn = `(${readCardOnceAnotherQuestionIsDrawn})(${JSON.stringify(before)}, ${readCard})`;
  return withAnswersOnRecord(page, String(await page.waitUntil(drawn, `no question replaced "${before}"`)));
}

/** In the page: once the card shows a question other than `before`, the card as `readCardNow` reads it then. */
function readCardOnceAnotherQuestionIsDrawn(before: string, readCardNow: () => string): Promise<string> {
  return new Promise((resolve) => {
    const check = () => {
      const label = document.querySelector("#main .qcard .qlabel");
      const question = label ? (label.textContent || "").trim() : "";
      if (!question || question === before) return;
      watching.disconnect();
      resolve(readCardNow());
    };
    const watching = new MutationObserver(check);
    watching.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    check();
  });
}

/** Starts the page's clock on the reader's gestures: when each reaches the
 * page, by its own time stamp, before a handler of the page's can begin a
 * beat, and when each is done, after the page's handlers have judged it. */
function startClockingGestures(): string {
  const clock = { reached: [] as number[], done: [] as number[] };
  Object.assign(window, { __gestures: clock });
  for (const type of ["click", "keydown", "popstate"]) {
    addEventListener(type, (e) => clock.reached.push(e.timeStamp), true);
    addEventListener(type, () => clock.done.push(performance.now()));
  }
  return "clocking";
}

// The clock started on the page: each walk starts it before the gesture it times.
export const CLOCK_THE_GESTURES = `(${startClockingGestures})()`;

/** In the page: from the first gesture clocked reaching the page to the last done, beside `beatMs`, as JSON. */
function readSpanBeside(beatMs: number): string {
  const { reached, done } = (window as unknown as { __gestures: { reached: number[]; done: number[] } }).__gestures;
  return JSON.stringify({ spanMs: done[done.length - 1]! - reached[0]!, beatMs });
}

/** On the page's clock, from the first gesture clocked reaching the page to the
 * last done, beside the beat the page declares: a span shorter than the beat
 * puts the last press inside it. */
export const readSpanAndBeat = async (page: BrowserPage): Promise<SpanAndBeat> =>
  JSON.parse(await page.evaluate(`(${readSpanBeside})(${BEAT_MS})`)) as SpanAndBeat;

/** In the page: the value of the card's option (what `selector` finds) under a point, or "" where there is none. */
function readOptionUnder({ x, y }: Point, selector: string): string {
  const opt = document.elementFromPoint(x, y)?.closest<HTMLElement>(selector);
  return opt?.dataset.value ?? "";
}

/** The value of the question card's option under a point, or "" where the point lands on none, read in the page. */
export const optionUnder = (page: BrowserPage, at: Point): Promise<string> =>
  page.evaluate(`(${readOptionUnder})(${JSON.stringify(at)}, ${JSON.stringify(FIRST_OPTION)})`);
