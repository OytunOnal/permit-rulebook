import { describe, expect, it } from "vitest";
import type { Profile } from "permit-rulebook-data";
import { middleBandOf, skipReason, topBandOf, warnNotWalked } from "./browser-walk.js";
import { FIRST_ANSWER, findLabel, firstQuestion, withInterview } from "./interview-on-site.js";

/**
 * `InterviewPage.readCardLayout()` and `readAnswerAt()` on the built site
 * (#485): where the question card and its parts sit, where the focus is, and
 * which answer is under a point.
 */
const skipped = skipReason();
if (skipped) warnNotWalked("THE QUESTION CARD'S LAYOUT READ THROUGH INTERVIEWPAGE", skipped);

/** Every question answered: a record that opens on the verdict. */
const FINISHED: Profile = {
  destination: "de", citizenship: "IN", situation: "offer", qualification: "degree", qualification_recent: "no",
  recognition_de: "recognized", experience_5y: "2plus", experience_7y: "3to5", occupation_shortage: "yes",
  occupation_it: "yes", salary_eur_year: topBandOf("salary_eur_year"), german: "a1", english: "b2",
  age_band: "a30to35", de_stay6m: "no", partner_ck: "no", funds_eur_month: middleBandOf("funds_eur_month"),
};

/** Reads the card after the first answer: its layout, its answers, and the answer read at each answer's centre. */
const readCardAfterAnAnswer = () => withInterview(async (interview) => {
  await interview.open();
  await interview.answer(firstQuestion.field, FIRST_ANSWER[firstQuestion.field]!);
  const layout = (await interview.readCardLayout())!;
  const atCentres = [];
  for (const { centre } of layout.answers) atCentres.push(await interview.readAnswerAt(centre));
  return { layout, answers: (await interview.readScreen()).answers, atCentres, offAnAnswer: await interview.readAnswerAt({ x: 1, y: 1 }) };
});

/** Reads the layout of the first paint's card, of a card with an asked-for line, and of the verdict. */
const readThreeLayouts = () => withInterview(async (interview) => {
  await interview.open();
  const cold = await interview.readCardLayout();
  await interview.seed({ destination: "all", citizenship: "IN" });
  await interview.open();
  const lined = { question: (await interview.readScreen()).question, layout: await interview.readCardLayout() };
  await interview.seed(FINISHED, { done: true });
  await interview.open();
  return { cold, lined, verdict: { screen: (await interview.readScreen()).screen, layout: await interview.readCardLayout() } };
});

describe.skipIf(skipped !== null)("readCardLayout() reads where the question card sits and where the focus is", () => {
  it("after an answer: the focus on the new card's first control, in the card and shown; each answer on the card, read back at its centre", async () => {
    const seen = await readCardAfterAnAnswer();
    expect(seen.layout.focus).toEqual({ isOnFirstControl: true, isInCard: true, isFirstControlShown: true });
    expect(seen.layout.answers.map((a) => a.value)).toEqual(seen.answers.map((a) => a.value));
    expect(seen.layout.answers.every((a) => a.isInsideCard), "an answer is off the card").toBe(true);
    expect(seen.atCentres).toEqual(seen.answers.map((a) => a.value));
    expect(seen.offAnAnswer, "a point on no answer reads none").toBe("");
    const firstCentre = seen.layout.answers[0]!.centre;
    expect(firstCentre.x > seen.layout.left && firstCentre.y > seen.layout.top, "the card's top left is not above and left of its first answer").toBe(true);
  }, 120000);

  it("the first paint's card holds no focus and no asked-for line; a card with one reads its box; the verdict has no card", async () => {
    const seen = await readThreeLayouts();
    expect(seen.cold!.focus.isOnFirstControl, "the first paint took the focus").toBe(false);
    expect(seen.cold!.askedFor).toBeNull();
    expect(seen.lined.question, "precondition: the situation question is on the screen").toBe(findLabel("situation"));
    expect(seen.lined.layout!.askedFor).toEqual({ isInsideCard: true, isOverflowing: false, lines: expect.any(Number) });
    expect(seen.lined.layout!.askedFor!.lines).toBeGreaterThan(0);
    expect(seen.verdict.screen, "precondition: the finished record opens on the verdict").toBe("results");
    expect(seen.verdict.layout).toBeNull();
  }, 120000);
});
