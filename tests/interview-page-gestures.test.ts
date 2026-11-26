import { describe, expect, it } from "vitest";
import { PHONE } from "../scripts/browser/browser.mjs";
import { skipReason, warnNotWalked } from "./browser-walk.js";
import { BEFORE_PASSPORT, FIRST_ANSWER, first, withInterview } from "./interview-on-site.js";

/**
 * `InterviewPage` on the built site (#485): the gestures a reader makes on the
 * question card — a real tap, the search typed into and Enter, whatever is
 * offered first — and the wait until the screen changes.
 */
const skipped = skipReason();
if (skipped) warnNotWalked("THE QUESTION CARD'S GESTURES THROUGH INTERVIEWPAGE", skipped);

// Long enough that the wait's first read of the page comes before the tap; the wait itself is on the page's own change.
const LATER_MS = 300;

/** The screen the card's Back draws after the first answer, as the wait read it, and as it stands at rest. */
const screenBackDraws = () => withInterview(async (interview, page) => {
  await interview.open();
  await interview.answer(first.field, FIRST_ANSWER[first.field]!);
  const from = await interview.readScreen();
  // The card's Back, tapped by the page itself a while after the call returns: a screen that moves after the wait
  // has begun, so a wait that read the screen once and returned would hand back the one it left.
  await page.evaluate(`setTimeout(() => document.getElementById("back").click(), ${LATER_MS}), 0`);
  const drawn = await interview.waitUntilScreenChanges(from);
  await page.waitUntilAtRest();
  return { from, drawn, atRest: await interview.readScreen() };
});

describe.skipIf(skipped !== null)("waitUntilScreenChanges() waits in the page until the screen moves", () => {
  it("returns the screen a later Back draws, once it is drawn: the question before, its answer chosen", async () => {
    const seen = await screenBackDraws();
    expect(seen.from.question, "precondition: the answer moved the screen on").not.toBe(first.label);
    expect([seen.drawn.question, seen.drawn.chosen]).toEqual([first.label, FIRST_ANSWER[first.field]]);
    expect(seen.atRest.question).toBe(seen.drawn.question);
  }, 120000);
});

/** What `run` threw, or null where it threw nothing. */
const messageOf = (run: Promise<unknown>): Promise<string | null> => run.then(() => null, (e: Error) => e.message);

/** The first question answered by hand from a cold start, and the passport answered by hand on the search; with
 * what an answer by an unknown gesture throws. */
const answeredByHand = () => withInterview(async (interview) => {
  await interview.open();
  const unknownGesture = await messageOf(interview.answer(first.field, FIRST_ANSWER[first.field]!, { by: "voice" } as never));
  await interview.answer(first.field, FIRST_ANSWER[first.field]!, { by: "hand" });
  const tapped = await interview.readRecord();
  await interview.seed(BEFORE_PASSPORT);
  await interview.open();
  await interview.answer("citizenship", "TR", { by: "hand" });
  return { unknownGesture, tapped, typed: await interview.readRecord() };
}, PHONE);

// What the search's list says to "Puerto Rico", a territory with no passport of its own, read once from the built page.
const PUERTO_RICO_LINE = "Puerto Rico is not on this list: people from Puerto Rico hold a passport of the United States. Choose United States.";

/** The search for a territory with no passport of its own, then for a country, each as the screen shows it. */
const searchedTwice = () => withInterview(async (interview) => {
  await interview.seed(BEFORE_PASSPORT);
  await interview.open();
  await interview.searchFor("Puerto Rico");
  const territory = await interview.readScreen();
  await interview.searchFor("Turkey");
  return { territory, country: await interview.readScreen() };
}, PHONE);

describe.skipIf(skipped !== null)("answer(field, value, { by: \"hand\" }) and searchFor(text) are a reader's own gestures", () => {
  it("by hand: a real tap on the button, and on the search the name typed and Enter; each recorded", async () => {
    const seen = await answeredByHand();
    expect(seen.unknownGesture).toMatch(/^precondition: /);
    expect(seen.tapped?.answers).toEqual(FIRST_ANSWER);
    expect(seen.typed?.answers).toEqual({ ...BEFORE_PASSPORT, citizenship: "TR" });
  }, 120000);

  it("searchFor types into the search: a territory's line with no row, then a country's rows, the box holding only what was typed", async () => {
    const seen = await searchedTwice();
    const { query, line, status } = seen.territory.search!;
    expect(query).toBe("Puerto Rico");
    expect(line).toBe(PUERTO_RICO_LINE);
    expect(status, "the live region does not say the list's line").toBe(line);
    expect(seen.territory.answers).toEqual([]);
    expect(seen.country.search!.query).toBe("Turkey");
    expect(seen.country.answers.map((a) => a.value)).toContain("TR");
  }, 120000);
});

/** In the page, as a reader's read would be: the sum of `a` and `b`. */
function addInPage(a: number, b: number): number {
  return a + b;
}

/** Whatever is offered first, answered on a button card and on the search, with the record after each. */
const answeredFirst = () => withInterview(async (interview) => {
  await interview.open();
  const onButtons = await interview.answerFirstOffered();
  const afterButtons = await interview.readRecord();
  await interview.seed(BEFORE_PASSPORT);
  await interview.open();
  const onSearch = await interview.answerFirstOffered();
  return { onButtons, afterButtons, onSearch, afterSearch: await interview.readRecord() };
});

/** The first offered answered with a read in the tap's own task, with motion and without, and the card at rest. */
const readAtOnce = () => withInterview(async (interview, page) => {
  await interview.open();
  await interview.answer(first.field, FIRST_ANSWER[first.field]!);
  const moving = await interview.answerFirstOffered({ readAtOnce: { probe: addInPage, args: [2, 3] } });
  const atRest = await interview.readCardLayout();
  await page.emulateMedia([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await interview.open();
  const still = await interview.answerFirstOffered();
  return { moving, atRest, still };
});

describe.skipIf(skipped !== null)("answerFirstOffered() answers whatever the screen offers first", () => {
  it("the first button, or on the search the first row it lists; returns the answer, as recorded", async () => {
    const seen = await answeredFirst();
    expect(seen.onButtons.value).toBe(first.options[0]!.value);
    expect(seen.afterButtons?.answers).toEqual({ [first.field]: seen.onButtons.value });
    expect(seen.afterSearch?.answers).toEqual({ ...BEFORE_PASSPORT, citizenship: seen.onSearch.value });
  }, 120000);

  it("reads in the tap's own task, before a frame: the drawn card's beat begun, none under reduced motion, and the caller's read", async () => {
    const seen = await readAtOnce();
    expect(seen.moving.readAtOnce).toBe(5);
    expect(seen.moving.layoutAtOnce!.animations, "the card drawn by the tap runs no beat").toBeGreaterThan(0);
    expect(seen.atRest!.animations, "precondition: at rest the beat is over").toBe(0);
    expect(seen.still.layoutAtOnce!.animations, "the card animated for a reader who asked for no motion").toBe(0);
  }, 120000);
});
