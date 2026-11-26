import { describe, expect, it } from "vitest";
import { DESK, type BrowserPage, type PageOnSite } from "../scripts/browser/browser.mjs";
import { InterviewPage, type Point, type ScreenShown } from "../scripts/interview-page/interview-page.mjs";
import { BEAT_MS, openCold, skipReason, waitUntilPastTheBeat, warnNotWalked, withSite } from "./browser-walk.js";
import { shiftScoreSince } from "./layout-shifts.js";

/**
 * #86 — a fast second click answers the next question.
 *
 * Every question's options sit in the same spot, so a second click lands on an
 * answer to a question nobody has read yet.
 *
 * So a question card a gesture draws is drawn with a *beat* (GLOSSARY.md): it
 * fades in, and for the beat nothing on it commits an answer — a click on an
 * option or a row, Enter on a focused option, Enter in the search box — the
 * same with or without motion. The gestures are an answer, a correction (✎),
 * ← Back, Keep this answer and the browser's Back. The beat's length is the
 * token `--motion-beat`, read from the page here only to wait it out or to
 * time a click against it; no case types it. The first paint has no beat,
 * and neither has Start over, which opens the interview as a cold load does.
 *
 * The clicks and keys are the platform's own, at a point of the viewport or on
 * the focused element, so whatever the new card has drawn under that point is
 * what the second one lands on. The walks run on the desktop, where the card
 * sits beside the ledger and nothing scrolls after an answer.
 */
const skipped = skipReason();
if (skipped) warnNotWalked("THE BEAT BETWEEN QUESTIONS", skipped);

/** Where the reader is: how many answers the record holds, the question on
 * the screen, whether it is the search, whether the focus is on its first
 * control, and how many animations the question card is running. */
interface Where { answers: number; question: string; search: boolean; focusOnFirst: boolean; cardAnimations: number }

/** Where the reader is on a screen a gesture drew, the card's layout aside. */
type Drawn = Pick<Where, "answers" | "question" | "search">;

/** Where the reader is, from the screen `shown` as read and the record read now. */
const drawnOf = async (interview: InterviewPage, { question, search }: ScreenShown): Promise<Drawn> =>
  ({ answers: Object.keys((await interview.readRecord())?.answers ?? {}).length, question, search: search !== null });

/** Where the reader is now. */
async function where(page: BrowserPage): Promise<Where> {
  const interview = new InterviewPage({ page });
  const drawn = await drawnOf(interview, await interview.readScreen());
  const layout = await interview.readCardLayout();
  return { ...drawn, focusOnFirst: layout?.focus.isOnFirstControl ?? false, cardAnimations: layout?.animations ?? 0 };
}

/** Waits until a gesture has drawn another screen than `from`, and returns it
 * read the moment it is there: the page answers in the task that draws the
 * card, and a history move draws on the browser's turn, not the gesture's. */
async function drawnAfter(page: BrowserPage, from: ScreenShown): Promise<Drawn> {
  const interview = new InterviewPage({ page });
  return drawnOf(interview, await interview.waitUntilScreenChanges(from));
}

/** The centre of each answer the question card offers, in order, in viewport
 * pixels: the first is what a reader's quick second click lands on. */
const answerCentres = async (page: BrowserPage): Promise<Point[]> =>
  ((await new InterviewPage({ page }).readCardLayout())?.answers ?? []).map((a) => a.centre);

/** Clicks the centre of the card's first answer, as the platform's own click. */
async function pressFirstOption(page: BrowserPage): Promise<void> {
  const at = (await answerCentres(page))[0]!;
  await page.clickAt(at.x, at.y);
}

/** In the page: the centre of the first element `selector` finds, in viewport pixels, as JSON. */
function readCentreOf(selector: string): string {
  const r = document.querySelector(selector)!.getBoundingClientRect();
  return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) });
}

/** Clicks the centre of the first element a selector finds, as the platform's own click. */
async function clickOn(page: BrowserPage, selector: string): Promise<void> {
  const at = JSON.parse(await page.evaluate(`(${readCentreOf})(${JSON.stringify(selector)})`)) as Point;
  await page.clickAt(at.x, at.y);
}

/** On the page's clock, the span of the clocked gestures and the beat the page declares. */
interface SpanAndBeat { spanMs: number; beatMs: number }

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
const CLOCK_THE_GESTURES = `(${startClockingGestures})()`;

/** In the page: from the first gesture clocked reaching the page to the last done, beside `beatMs`, as JSON. */
function readSpanBeside(beatMs: number): string {
  const { reached, done } = (window as unknown as { __gestures: { reached: number[]; done: number[] } }).__gestures;
  return JSON.stringify({ spanMs: done[done.length - 1]! - reached[0]!, beatMs });
}

/** On the page's clock, from the first gesture clocked reaching the page to the
 * last done, beside the beat the page declares: a span shorter than the beat
 * puts the last press inside it. */
const readSpanAndBeat = async (page: BrowserPage): Promise<SpanAndBeat> =>
  JSON.parse(await page.evaluate(`(${readSpanBeside})(${BEAT_MS})`)) as SpanAndBeat;

/** The first screen with nothing on the record, and its first option's centre. */
async function coldStart(site: PageOnSite): Promise<Point> {
  await openCold(site);
  return (await answerCentres(site.page))[0]!;
}

/** Answers `count` questions with the first option each, each after its
 * card's beat: the card's own first option, which an asked-for line (#139)
 * can draw lower than the last card's. */
async function answerFirstOptions(page: BrowserPage, count: number): Promise<Where> {
  for (let i = 0; i < count; i++) {
    await waitUntilPastTheBeat(page);
    await pressFirstOption(page);
    await page.waitUntilAtRest();
  }
  return where(page);
}

/** Two questions answered: a card with a Back, and an answer to correct. */
const answerTwoQuestions = (page: BrowserPage) => answerFirstOptions(page, 2);

/** The walks a case takes for its press meant for inside the beat to land there:
 * a press the machine delays past the beat says nothing of the guard, so the
 * walk is taken again; late on every walk, the case says so. */
const WALKS_FOR_A_PRESS_INSIDE = 3;

interface AroundTheBeat<T> extends SpanAndBeat { walked: T; drawn: Drawn; within: Where; after: Where }

type Step<T> = (page: BrowserPage) => Promise<T>;
interface Walk<T> { walkUp: Step<T>; gesture: Step<void>; press?: Step<void> }

/**
 * From a cold start, `walkUp`, then `gesture`, then `press` on the card the
 * gesture drew at once, and again after the beat, as a reader does; walked
 * again while the press meant for inside the beat came after it.
 */
async function pressedAroundTheBeat<T>(site: PageOnSite, { walkUp, gesture, press = pressFirstOption }: Walk<T>): Promise<AroundTheBeat<T>> {
  const { page } = site;
  for (let walk = 1; ; walk++) {
    await coldStart(site);
    const walked = await walkUp(page);
    const before = await new InterviewPage({ page }).readScreen();
    await page.evaluate(CLOCK_THE_GESTURES);
    await gesture(page);
    const drawn = await drawnAfter(page, before);
    await press(page);
    await page.waitUntilAtRest();
    const within = await where(page);
    const timed = await readSpanAndBeat(page);
    if (timed.spanMs >= timed.beatMs && walk < WALKS_FOR_A_PRESS_INSIDE) continue;
    await waitUntilPastTheBeat(page);
    await press(page);
    await page.waitUntilAtRest();
    return { ...timed, walked, drawn, within, after: await where(page) };
  }
}

/** What a gesture's beat must hold: the press inside it answers nothing,
 * and the press after it answers. */
function expectTheBeatHeld(seen: AroundTheBeat<unknown>): void {
  expect(seen.spanMs, "the press meant for inside the beat came after it").toBeLessThan(seen.beatMs);
  expect(seen.within.question, "a click inside the beat answered the card the gesture drew").toBe(seen.drawn.question);
  expect(seen.within.answers).toBe(seen.drawn.answers);
  expect(seen.after.question, "the guard did not lift after the beat").not.toBe(seen.drawn.question);
}

interface DoubleClick extends SpanAndBeat { cold: ScreenShown; drawn: Drawn; under: string; after: Where }

/**
 * Two clicks at one point of a cold card, the second on the card the first
 * one draws, before its beat is out. The point is the first option's centre
 * that lands on an option of that card: an asked-for line (#139) can set its
 * options lower, and a second click on its padding answers nothing with or
 * without a guard. Null when no option's centre does. Walked again at the
 * same point while the second click came after the beat.
 */
async function doubleClickOnAnOption(site: PageOnSite): Promise<DoubleClick | null> {
  const { page } = site;
  const interview = new InterviewPage({ page });
  for (let i = 0; ; i++)
    for (let walk = 1; ; walk++) {
      await coldStart(site);
      const at = (await answerCentres(page))[i];
      if (!at) return null;
      const cold = await interview.readScreen();
      await page.evaluate(CLOCK_THE_GESTURES);
      await page.clickAt(at.x, at.y);
      const drawn = await drawnAfter(page, cold);
      const under = await interview.readAnswerAt(at);
      if (!under) break;
      await page.clickAt(at.x, at.y);
      await page.waitUntilAtRest();
      const timed = await readSpanAndBeat(page);
      if (timed.spanMs >= timed.beatMs && walk < WALKS_FOR_A_PRESS_INSIDE) continue;
      return { ...timed, cold, drawn, under, after: await where(page) };
    }
}

describe.skipIf(skipped !== null)("a question card a gesture draws takes no click for a beat (#86)", () => {
  it("two clicks at the same point within the beat leave one answer", expectTwoClicksWithinTheBeatLeaveOneAnswer, 120000);
  it("a click after the beat answers", expectAClickAfterTheBeatAnswers, 120000);
  it("two fast Enters on the focused first option leave one answer", expectTwoFastEntersLeaveOneAnswer, 120000);
  it("Enter in the search box ← Back has drawn commits nothing within the beat, and commits after it",
    expectEnterInTheSearchHeldByTheBeat, 120000);

  it("← Back draws its card with a beat", async () => {
    expectTheBeatHeld(await withSite((site) => pressedAroundTheBeat(site, {
      walkUp: answerTwoQuestions, gesture: (page) => clickOn(page, "#back"),
    }), DESK));
  }, 120000);

  it("✎, a correction, draws its card with a beat", async () => {
    expectTheBeatHeld(await withSite((site) => pressedAroundTheBeat(site, {
      walkUp: answerTwoQuestions, gesture: (page) => clickOn(page, "[data-field]"),
    }), DESK));
  }, 120000);

  it("Keep this answer draws its card with a beat", expectKeepThisAnswerDrawnWithABeat, 120000);
  it("Start over draws its card with no beat: a click at once answers", expectStartOverDrawnWithNoBeat, 120000);

  it("the browser's Back draws its card with a beat", async () => {
    expectTheBeatHeld(await withSite((site) => pressedAroundTheBeat(site, {
      walkUp: answerTwoQuestions, gesture: (page) => page.back(),
    }), DESK));
  }, 120000);

  it("after an answer the focus is on the new card's first option, zero Tabs away", expectFocusOnTheNewFirstOption, 120000);
  it("with reduced motion the guard holds and the card runs no animation", expectReducedMotionGuardHolds, 120000);
  it("nothing on the page shifts across an answer: CLS stays 0", expectNoShiftAcrossAnAnswer, 120000);
  it("the first paint has no beat: an option answers at once", expectFirstPaintHasNoBeat, 120000);
});

/** Checks two clicks at one point within the beat leave one answer. */
async function expectTwoClicksWithinTheBeatLeaveOneAnswer(): Promise<void> {
  const seen = await withSite(async (site) => ({ twice: await doubleClickOnAnOption(site) }), DESK);
  expect(seen.twice, "no option's centre lands on an option of the card its click draws").not.toBeNull();
  const { cold, drawn, under, spanMs, beatMs, after } = seen.twice!;
  expect(drawn.answers, "the first click did not answer").toBe(1);
  expect(under, "the second click's point is on no option of the drawn card").not.toBe("");
  expect(spanMs, "the second click came after the beat").toBeLessThan(beatMs);
  expect(after.answers, "the second click answered the question it landed on").toBe(1);
  expect(after.question).not.toBe(cold.question);
}

/** Checks a click after the beat answers. */
async function expectAClickAfterTheBeatAnswers(): Promise<void> {
  const seen = await withSite(async (site) => {
    const { page } = site;
    await coldStart(site);
    const first = await answerFirstOptions(page, 1);
    return { first, second: await answerFirstOptions(page, 1) };
  }, DESK);
  expect(seen.first.answers).toBe(1);
  expect(seen.second.answers, "the guard did not lift after the beat").toBe(2);
  expect(seen.second.question).not.toBe(seen.first.question);
}

/** Checks two fast Enters on the focused first option leave one answer. */
async function expectTwoFastEntersLeaveOneAnswer(): Promise<void> {
  const seen = await withSite(async (site) => {
    const { page } = site;
    const at = await coldStart(site);
    await page.clickAt(at.x, at.y);
    await page.waitUntilAtRest();
    await waitUntilPastTheBeat(page);
    const ready = await where(page);
    await page.pressEnter();
    await page.pressEnter();
    await page.waitUntilAtRest();
    return { ready, after: await where(page) };
  }, DESK);
  expect(seen.ready.focusOnFirst, "the focus was not on the first option to press Enter on").toBe(true);
  expect(seen.after.answers, "the second Enter answered the question it landed on").toBe(2);
  expect(seen.after.question).not.toBe(seen.ready.question);
}

/** Checks Enter in the search box ← Back has drawn commits nothing within the beat, and commits after it. */
async function expectEnterInTheSearchHeldByTheBeat(): Promise<void> {
  const seen = await withSite((site) => pressedAroundTheBeat(site, {
    walkUp: async (page) => {
      let now = await where(page);
      for (let i = 0; i < 10 && !now.search; i++) now = await answerFirstOptions(page, 1);
      await waitUntilPastTheBeat(page);
      await page.type("a");
      await page.pressEnter();
      await page.waitUntilAtRest();
      return { search: now, past: await where(page) };
    },
    gesture: (page) => clickOn(page, "#back"),
    press: (page) => page.pressEnter(),
  }), DESK);
  expect(seen.walked.search.search, "the walk never reached the search").toBe(true);
  expect(seen.walked.past.question, "Enter in the search did not commit").not.toBe(seen.walked.search.question);
  expect(seen.drawn.search, "← Back did not draw the search").toBe(true);
  expect(seen.spanMs, "the Enter meant for inside the beat came after it").toBeLessThan(seen.beatMs);
  expect(seen.within.question, "Enter inside the beat committed the search's row").toBe(seen.drawn.question);
  expect(seen.after.question, "Enter after the beat did not commit").not.toBe(seen.drawn.question);
}

/** Checks Keep this answer draws its card with a beat. */
async function expectKeepThisAnswerDrawnWithABeat(): Promise<void> {
  expectTheBeatHeld(await withSite((site) => pressedAroundTheBeat(site, {
    walkUp: async (page) => {
      await answerTwoQuestions(page);
      await clickOn(page, "[data-field]");
      await page.waitUntilAtRest();
    },
    gesture: (page) => clickOn(page, "#done"),
  }), DESK));
}

/** Checks Start over draws its card with no beat: a click at once answers. */
async function expectStartOverDrawnWithNoBeat(): Promise<void> {
  const seen = await withSite(async (site) => {
    const { page } = site;
    await coldStart(site);
    await answerFirstOptions(page, 2);
    // The resumed line carries "Start over" while a question is on the table.
    await page.goto(site.url("/"));
    const resumed = await new InterviewPage({ page }).readScreen();
    await clickOn(page, "#restart");
    const drawn = await drawnAfter(page, resumed);
    await pressFirstOption(page);
    await page.waitUntilAtRest();
    return { drawn, after: await where(page) };
  }, DESK);
  expect(seen.drawn.answers, "Start over did not clear the record").toBe(0);
  expect(seen.after.answers, "the card Start over drew refused the first click").toBe(1);
}

/** Checks after an answer the focus is on the new card's first option, zero Tabs away. */
async function expectFocusOnTheNewFirstOption(): Promise<void> {
  const seen = await withSite(async (site) => {
    const { page } = site;
    const at = await coldStart(site);
    await page.clickAt(at.x, at.y);
    await page.waitUntilAtRest();
    return { after: await where(page) };
  }, DESK);
  expect(seen.after.answers).toBe(1);
  expect(seen.after.focusOnFirst).toBe(true);
}

/** Checks with reduced motion the guard holds and the card runs no animation. */
async function expectReducedMotionGuardHolds(): Promise<void> {
  const seen = await withSite(async (site) => {
    const { page } = site;
    await page.emulateMedia([{ name: "prefers-reduced-motion", value: "reduce" }]);
    const at = await coldStart(site);
    const reduced = await page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches");
    await page.clickAt(at.x, at.y);
    const drawn = await where(page);
    await page.clickAt(at.x, at.y);
    await page.waitUntilAtRest();
    return { reduced, drawn, after: await where(page) };
  }, DESK);
  expect(seen.reduced, "the browser did not take the reduced-motion preference").toBe(true);
  expect(seen.drawn.cardAnimations, "the card animated for a reader who asked for no motion").toBe(0);
  expect(seen.after.answers, "without motion the second click answered").toBe(1);
}

/** Checks nothing on the page shifts across an answer: CLS stays 0. */
async function expectNoShiftAcrossAnAnswer(): Promise<void> {
  const seen = await withSite(async (site) => {
    const { page } = site;
    await coldStart(site);
    await answerFirstOptions(page, 2);
    return { cls: await shiftScoreSince(page), after: await where(page) };
  }, DESK);
  expect(seen.after.answers).toBe(2);
  expect(seen.cls).toBe(0);
}

/** Checks the first paint has no beat: an option answers at once. */
async function expectFirstPaintHasNoBeat(): Promise<void> {
  const seen = await withSite(async (site) => {
    const { page } = site;
    const at = await coldStart(site);
    const cold = await where(page);
    await page.clickAt(at.x, at.y);
    return { cold, after: await where(page) };
  }, DESK);
  expect(seen.cold.answers).toBe(0);
  expect(seen.after.answers, "the first paint's option did not answer").toBe(1);
}
