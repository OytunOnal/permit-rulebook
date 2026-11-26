import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { remainingQuestions, type Dataset, type Profile } from "permit-rulebook-data";
import { DESK, walkSite } from "../scripts/browser/browser.mjs";
import { InterviewPage } from "../scripts/interview-page.mjs";
import { skipReason, warnNotWalked } from "./browser-walk.js";

/**
 * `InterviewPage` on the built site (#475, seam 1): a record seeded, the
 * interview opened on it, a question answered, the screen read and the record
 * read back and cleared, each through the module's own calls and the walk.
 */
const skipped = skipReason();
if (skipped) warnNotWalked("THE INTERVIEW PAGE", skipped);

const ds = rawDataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

/** The question a cold interview asks first. */
const first = remainingQuestions(ds, {})[0]!;
/** The first answer that question offers, as a record holds it: a real answer the dataset gives. */
const FIRST_ANSWER: Profile = { [first.field]: first.options[0]!.value };

/** Walks the built site at the desk, handing `run` an interview on its page. */
async function withInterview<T>(run: (interview: InterviewPage) => Promise<T>): Promise<T> {
  const { returned } = await walkSite({ site: { folder: dist }, screen: DESK }, (site) => run(new InterviewPage(site)));
  return returned;
}

/** The screen answering the first question from a cold start reaches, and the one a record of that answer opens on. */
const answeredAndSeeded = () => withInterview(async (interview) => {
  await interview.open();
  await interview.answer(first.field, FIRST_ANSWER[first.field]!);
  const answered = await interview.readScreen();
  await interview.seed(FIRST_ANSWER);
  await interview.open();
  return { answered, seeded: await interview.readScreen() };
});

/** The screen before and after the first question is answered from a cold start, and the record after. */
const answeredFromCold = () => withInterview(async (interview) => {
  await interview.open();
  const before = await interview.readScreen();
  await interview.answer(first.field, FIRST_ANSWER[first.field]!);
  return { before, after: await interview.readScreen(), record: await interview.readRecord() };
});

/** The record on the device once seeded and opened, and once cleared. */
const seededAndCleared = () => withInterview(async (interview) => {
  await interview.seed(FIRST_ANSWER);
  await interview.open();
  const seeded = await interview.readRecord();
  await interview.clearRecord();
  return { seeded, cleared: await interview.readRecord() };
});

/** What `run` threw, or null where it threw nothing. */
const messageOf = (run: Promise<unknown>): Promise<string | null> => run.then(() => null, (e: Error) => e.message);

/** What an answer the first question does not offer throws, from a cold start. */
const refusedAnswer = () => withInterview(async (interview) => {
  await interview.open();
  return messageOf(interview.answer(first.field, "no-such-answer"));
});

/** What reading the screen throws on the page a seed leaves, outside the interview. */
const screenReadOffTheInterview = () => withInterview(async (interview) => {
  await interview.seed(FIRST_ANSWER);
  return messageOf(interview.readScreen());
});

describe.skipIf(skipped !== null)("InterviewPage drives the interview on the built site", () => {
  it("a seeded record opens on its screen: the one answering it from a cold start reaches", async () => {
    const { answered, seeded } = await answeredAndSeeded();
    expect(answered.question, "answering the first question leaves another on the screen").not.toBe("");
    expect(seeded).toEqual(answered);
  }, 120000);

  it("answer moves the screen on, and the page records the answer", async () => {
    const { before, after, record } = await answeredFromCold();
    expect(before.screen).toBe("questions");
    expect(after).not.toEqual(before);
    expect(record?.answers).toEqual(FIRST_ANSWER);
  }, 120000);

  it("readRecord() reads back what seed wrote", async () => {
    const history = [first.field];
    const record = await withInterview(async (interview) => {
      await interview.seed(FIRST_ANSWER, { history, done: true });
      return interview.readRecord();
    });
    expect(record).toEqual({ answers: FIRST_ANSWER, history, done: true });
  }, 120000);

  it("clearRecord() leaves no record: readRecord() is null", async () => {
    const { seeded, cleared } = await seededAndCleared();
    expect(seeded, "precondition: the seeded record is on the device").not.toBeNull();
    expect(cleared).toBeNull();
  }, 120000);

  it("a refused answer throws, naming the field", async () => {
    expect(await refusedAnswer()).toContain(first.field);
  }, 120000);

  it("readScreen() off the interview throws, naming the page's address", async () => {
    expect(await screenReadOffTheInterview()).toMatch(/^readScreen: no interview on http:\/\/\S+\/404\.html$/);
  }, 120000);
});
