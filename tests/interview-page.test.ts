import { describe, expect, it } from "vitest";
import { skipReason, warnNotWalked } from "./browser-walk.js";
import { FIRST_ANSWER, catchMessage, firstQuestion, withInterview } from "./interview-on-site.js";

/**
 * `InterviewPage` on the built site (#475, seam 1): a record seeded, the
 * interview opened on it, a question answered, the screen read and the record
 * read back and cleared, each through the module's own calls and the walk.
 */
const skipped = skipReason();
if (skipped) warnNotWalked("THE INTERVIEW PAGE", skipped);

/** Reads the screen answering the first question from a cold start reaches, and the one a record of that answer opens on. */
const readAnsweredAndSeededScreens = () => withInterview(async (interview) => {
  await interview.open();
  await interview.answer(firstQuestion.field, FIRST_ANSWER[firstQuestion.field]!);
  const answered = await interview.readScreen();
  await interview.seed(FIRST_ANSWER);
  await interview.open();
  return { answered, seeded: await interview.readScreen() };
});

/** Answers the first question from a cold start, reading the screen before and after, and the record after. */
const answerFromCold = () => withInterview(async (interview) => {
  await interview.open();
  const before = await interview.readScreen();
  await interview.answer(firstQuestion.field, FIRST_ANSWER[firstQuestion.field]!);
  return { before, after: await interview.readScreen(), record: await interview.readRecord() };
});

/** Seeds a record and clears it, reading the record on the device once opened, and once cleared. */
const seedAndClear = () => withInterview(async (interview) => {
  await interview.seed(FIRST_ANSWER);
  await interview.open();
  const seeded = await interview.readRecord();
  await interview.clearRecord();
  return { seeded, cleared: await interview.readRecord() };
});

/** Catches what an answer the first question does not offer throws, from a cold start. */
const catchRefusedAnswer = () => withInterview(async (interview) => {
  await interview.open();
  return catchMessage(interview.answer(firstQuestion.field, "no-such-answer"));
});

/** Catches what reading the screen throws on the page a seed leaves, outside the interview. */
const catchScreenReadOffTheInterview = () => withInterview(async (interview) => {
  await interview.seed(FIRST_ANSWER);
  return catchMessage(interview.readScreen());
});

/** Answers France's last question to its verdict, reading the screen the answer draws and the headline it shows. */
const readVerdictAnswered = () => withInterview(async (interview, page) => {
  await interview.seed({ destination: "fr" });
  await interview.open();
  await interview.answer("situation", "research");
  return { screen: await interview.readScreen(), headline: (await page.evaluate('document.getElementById("headline").textContent')).trim() };
});

describe.skipIf(skipped !== null)("readScreen() reads what the live region announces", () => {
  it("an answer that draws the verdict: the verdict's headline, on the results screen", async () => {
    const { screen, headline } = await readVerdictAnswered();
    expect(screen.screen, "precondition: the answer drew the verdict").toBe("results");
    expect(headline, "precondition: the verdict has a headline").not.toBe("");
    expect(screen.announced).toBe(headline);
  }, 120000);
});

describe.skipIf(skipped !== null)("InterviewPage drives the interview on the built site", () => {
  it("a seeded record opens on its screen: the one answering it from a cold start reaches", async () => {
    const { answered, seeded } = await readAnsweredAndSeededScreens();
    expect(answered.question, "answering the first question leaves another on the screen").not.toBe("");
    expect(seeded).toEqual(answered);
  }, 120000);

  it("answer moves the screen on, and the page records the answer", async () => {
    const { before, after, record } = await answerFromCold();
    expect(before.screen).toBe("questions");
    expect(after).not.toEqual(before);
    expect(record?.answers).toEqual(FIRST_ANSWER);
  }, 120000);

  it("readRecord() reads back what seed wrote", async () => {
    const history = [firstQuestion.field];
    const record = await withInterview(async (interview) => {
      await interview.seed(FIRST_ANSWER, { history, done: true });
      return interview.readRecord();
    });
    expect(record).toEqual({ answers: FIRST_ANSWER, history, done: true });
  }, 120000);

  it("clearRecord() leaves no record: readRecord() is null", async () => {
    const { seeded, cleared } = await seedAndClear();
    expect(seeded, "precondition: the seeded record is on the device").not.toBeNull();
    expect(cleared).toBeNull();
  }, 120000);

  it("a refused answer throws, naming the field", async () => {
    expect(await catchRefusedAnswer()).toContain(firstQuestion.field);
  }, 120000);

  it("readScreen() off the interview throws, naming the page's address", async () => {
    expect(await catchScreenReadOffTheInterview()).toMatch(/^readScreen: no interview on http:\/\/\S+\/404\.html$/);
  }, 120000);
});
