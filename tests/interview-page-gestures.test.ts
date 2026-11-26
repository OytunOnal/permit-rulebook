import { describe, expect, it } from "vitest";
import { skipReason, warnNotWalked } from "./browser-walk.js";
import { FIRST_ANSWER, first, withInterview } from "./interview-on-site.js";

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
