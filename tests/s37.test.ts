import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { PHONE, type BrowserPage, type PageOnSite, type Screen } from "../scripts/browser/browser.mjs";
import { InterviewPage } from "../scripts/interview-page/interview-page.mjs";
import { withSite, skipReason } from "./browser-walk.js";

/**
 * s37 — Back on a restored record, and the Back gesture, in a real browser:
 * what a browser alone does. Its real Back and Forward and the moves they
 * hand the page, a reload that keeps the entries and their states, a Back
 * that leaves the site, two real tabs on one stored record, a phone's width,
 * and no tab throwing. Where the browser's history and the page's list part —
 * a second tab, an outside entrance, an entry another tab's record no longer
 * matches — every corner is walked in Node, through the history's entry
 * (`history-corners.test.ts`, `history.test.ts`).
 */

const ds = dataset as unknown as Dataset;

/** The question each field asks, in the dataset's own words. */
const asks = (field: string) => ds.fields.find((f) => f.id === field)!.label;

/** Three answers, in the order they were given. */
const RECORD = { destination: "de", citizenship: "IN", situation: "offer" };

/** A gesture made in the page: a function its source text carries there. */
type Gesture = () => void;

/** In the page: the screen's own Back control, tapped, which the cases set against the browser's. */
function tapScreenBackInPage(): void {
  document.getElementById("back")!.click();
}
/** In the page: the browser's Back, as a reader's back gesture makes it. */
function goBackInPage(): void {
  history.back();
}
/** In the page: the browser's Forward, which has to undo a Back exactly. */
function goForwardInPage(): void {
  history.forward();
}
/** In the page: a reload, which once emptied the page's own list while the browser kept its entries. */
function reloadInPage(): void {
  location.reload();
}

/** In the page: runs `gesture` on the page's next task, and returns at once. */
function runOnTheNextTaskInPage(gesture: Gesture): number {
  setTimeout(gesture, 0);
  return 0;
}

// The gestures by the names the cases use.
const [SCREEN_BACK, BROWSER_BACK, BROWSER_FORWARD, RELOAD] = [tapScreenBackInPage, goBackInPage, goForwardInPage, reloadInPage];

interface Where { path: string; question: string; length: number; step: number | null }
// Where the tab stands in the browser's history, read in the page: with the question, what a case compares before
// and after each gesture.
const IN_HISTORY = "JSON.stringify({ path: location.pathname, length: history.length, step: (history.state || {}).step ?? null })";

/** Where the tab stands: its place in the browser's history, and the question on the screen, "" off the interview,
 * which is the site's `/` alone. */
async function readWhere(interview: InterviewPage, page: BrowserPage): Promise<Where> {
  const inHistory = JSON.parse(await page.evaluate(IN_HISTORY)) as Omit<Where, "question">;
  const question = inHistory.path === "/" ? (await interview.readScreen()).question : "";
  return { ...inHistory, question };
}

/** Opens `/` from `/data/`, an outside entrance, onto the three answers
 * stored, or with no record stored, so a live walk starts from a first
 * question of its own; returns where the tab stands. */
async function openFromData(site: PageOnSite, record: "stored" | "none"): Promise<Where> {
  const interview = new InterviewPage(site);
  if (record === "stored") await interview.seed(RECORD);
  await site.page.goto(site.url("/data/"));
  if (record === "none") await interview.clearRecord();
  await site.page.goto(site.url("/"));
  return readWhere(interview, site.page);
}

/** A walk: `at()` reads where the tab stands, `act` makes a gesture that stays
 * on the page and `actAcross` one that loads a document, `answer()` answers
 * the question on the screen, `openFromOutside()` opens `/` onto the three
 * answers seeded from `/data/` — an outside entrance — and `live(n)` answers
 * n questions in the tab. */
function walker(page: BrowserPage, url: (path: string) => string) {
  const interview = new InterviewPage({ page, url });
  const at = () => readWhere(interview, page);
  // The gesture runs on the page's next task, so the evaluation has returned
  // before a Back that leaves the site tears the document down.
  const runOnTheNextTask = (gesture: Gesture) => page.evaluate(`(${runOnTheNextTaskInPage})(${gesture})`);
  // A history move draws on the browser's turn, not the gesture's, so a
  // gesture that stays on the page is waited on until the screen it leaves is gone.
  const act = async (gesture: Gesture) => {
    const before = await interview.readScreen();
    await runOnTheNextTask(gesture);
    await interview.waitUntilScreenChanges(before);
    await page.waitUntilAtRest();
    return at();
  };
  // Whatever the question on the screen offers first, tapped: how a live walk answers.
  const answer = async () => {
    await interview.answerFirstOffered();
    return at();
  };
  const actAcross = async (gesture: Gesture) => {
    await runOnTheNextTask(gesture);
    await page.waitUntilNewDocumentDrawn();
    return at();
  };
  const openOnto = async (path: string) => {
    await page.goto(url(path));
    return at();
  };
  return {
    at, act, actAcross, openOnto, answer,
    openFromOutside: () => openFromData({ page, url }, "stored"),
    async live(n: number) {
      const seen = [await openFromData({ page, url }, "none")];
      for (let i = 0; i < n; i++) seen.push(await answer());
      return seen;
    },
  };
}
type Walker = ReturnType<typeof walker>;

/** The desktop the fault was measured at; the phone is the entry's `PHONE`. */
const WIDE: Screen = { viewport: { width: 1100, height: 900 }, mobile: false };

/** `walk` in a fresh browser of `size` over the built site; the cases assert the tabs' errors themselves. */
function walkInBrowser<T>(size: Screen, walk: (w: Walker, site: PageOnSite) => Promise<T>): Promise<T> {
  return withSite((site: PageOnSite) => walk(walker(site.page, site.url), site), size);
}

const skipped = skipReason();
if (skipped)
  process.stderr.write([
    "",
    `  !! BACK ON A RESTORED RECORD WAS NOT WALKED: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join("\n"));

describe("Back on a restored record, in a real browser", () => {
  it("never lets a pipeline skip the walk", () => {
    if (skipped) expect(process.env.CI, `CI cannot skip: ${skipped}`).toBeFalsy();
    else expect(skipped).toBeNull();
  });
});

describe.skipIf(skipped !== null)("Back on a restored record", () => {
  it("from the screen an outside entrance opened on, the browser's Back still leaves to the page before", async () => {
    await expectBrowserBackLeavesTheOutsideEntrance();
  }, 180000);

  /** At a phone's width, where the rule this bends was written: three screen Backs from an
   * outside entrance, each a question back, none of them off the site, and nothing thrown. */
  it("the same walk on a phone, where the rule this bends was written", async () => {
    await expectScreenBacksOnAPhoneStayOnTheSite();
  }, 180000);

  /** Two real tabs share the stored record and nothing else: tab B answers two more, tab A
   * reloads onto the longer record, and its screen's Back steps back in place. */
  it("two real tabs on one stored record: grown in tab B, tab A reloads and steps back in place, and no tab threw", async () => {
    await expectTabAReloadsOntoTabBsRecord();
  }, 180000);

  it("the reload path stays mended: three answered live, a reload, then step 3 → 2 → 1", async () => {
    await expectReloadThenStepsBackOneByOne();
  }, 180000);

  it("mid-interview, the screen's Back and the browser's land on the same question", async () => {
    await expectBothBacksAgreeMidInterview();
  }, 180000);

  /**
   * A browser move reads the entry it lands on against the step it lands at,
   * not against the list's last step. Read against the last, the browser's
   * Back from step 5 lands on step 4 with nothing held, the screen's Back then
   * steps back in place, and the browser's Back after it shows that same
   * question again — a dead Back in a single tab, which no other walk caught.
   */
  it("in one tab, the browser's Back, the screen's, then the browser's: each a question back", async () => {
    await expectMixedBacksEachAQuestionBack();
  }, 180000);
});

/** Checks the browser's Back from an outside entrance's screen leaves to the page before. */
async function expectBrowserBackLeavesTheOutsideEntrance(): Promise<void> {
  const seen = await walkInBrowser(WIDE, async (w) => {
    const entrance = await w.openFromOutside();
    return { entrance, back: await w.actAcross(BROWSER_BACK) };
  });
  expect(seen.entrance.question).toBe(asks("qualification"));
  expect(seen.back.path, "the browser's Back was held on the site").toBe("/data/");
}

/** Checks three screen Backs on a phone from an outside entrance are each a question back, on the site. */
async function expectScreenBacksOnAPhoneStayOnTheSite(): Promise<void> {
  const seen = await walkInBrowser(PHONE, async (w) => {
    const entrance = await w.openFromOutside();
    const backs: Where[] = [];
    for (let i = 0; i < 3; i++) backs.push(await w.act(SCREEN_BACK));
    return { entrance, backs };
  });
  expect(seen.entrance.question, "the record did not restore to the fourth question").toBe(asks("qualification"));
  expect(seen.backs.map((s) => s.question), "a tap is not the question before")
    .toEqual(["situation", "citizenship", "destination"].map(asks));
  for (const back of seen.backs)
    expect([back.path, back.length], "a tap left the site or changed the browser's history")
      .toEqual(["/", seen.entrance.length]);
}

/** Checks tab A reloads onto the record tab B grew, and its screen's Back steps back in place. */
async function expectTabAReloadsOntoTabBsRecord(): Promise<void> {
  const seen = await walkInBrowser(WIDE, async (a, { page, url }) => {
    const entrance = await a.openFromOutside();
    const tabB = await page.openTab();
    await tabB.front();
    const b = walker(tabB, url);
    const inB = [await b.openOnto("/"), await b.answer(), await b.answer()];
    await page.front();
    const reloaded = await a.actAcross(RELOAD);
    const back = await a.act(SCREEN_BACK);
    return { entrance, inB, reloaded, back };
  });
  expect(seen.inB[0]!.question, "tab B did not open on the stored record").toBe(seen.entrance.question);
  expect(new Set(seen.inB.map((s) => s.question)).size, "tab B's answers did not move it on").toBe(3);
  expect(seen.reloaded.question, "the reload did not restore what tab B left").toBe(seen.inB[2]!.question);
  expect([seen.back.path, seen.back.question], "the screen's Back left the site, or stayed").toEqual(["/", seen.inB[1]!.question]);
  expect(seen.back.length, "stepping back in place pushed an entry").toBe(seen.reloaded.length);
}

/** Checks three live answers, a reload, then the screen's Back and the browser's step 3 → 2 → 1. */
async function expectReloadThenStepsBackOneByOne(): Promise<void> {
  const seen = await walkInBrowser(PHONE, async (w) => {
    const live = await w.live(3);
    const reloaded = await w.actAcross(RELOAD);
    const screenBack = await w.act(SCREEN_BACK);
    const browserBack = await w.act(BROWSER_BACK);
    return { live, reloaded, screenBack, browserBack };
  });
  const questions = seen.live.map((s) => s.question);
  expect(new Set(questions).size, questions.join(" | ")).toBe(4);
  expect([seen.reloaded.step, seen.reloaded.question]).toEqual([3, questions[3]]);
  expect([seen.screenBack.step, seen.screenBack.question]).toEqual([2, questions[2]]);
  expect([seen.browserBack.step, seen.browserBack.question]).toEqual([1, questions[1]]);
  for (const s of [seen.screenBack, seen.browserBack]) expect(s.path).toBe("/");
}

/** Checks, two answers in, the screen's Back and the browser's land on the same question. */
async function expectBothBacksAgreeMidInterview(): Promise<void> {
  const seen = await walkInBrowser(PHONE, async (w) => {
    const walk = async (goBack: Gesture) => {
      const live = await w.live(2);
      return { live, back: await w.act(goBack) };
    };
    return { screen: await walk(SCREEN_BACK), browser: await walk(BROWSER_BACK) };
  });
  expect(seen.screen.live.map((s) => s.question)).toEqual(seen.browser.live.map((s) => s.question));
  expect(seen.screen.back.question, "the two Backs disagree").toBe(seen.browser.back.question);
  expect(seen.screen.back.step).toBe(seen.browser.back.step);
  expect(seen.screen.back.question).toBe(seen.screen.live[1]!.question);
  expect(seen.screen.back.step).toBe(1);
}

/** Checks the browser's Back, the screen's, then the browser's, five answers in, each step one question back. */
async function expectMixedBacksEachAQuestionBack(): Promise<void> {
  const seen = await walkInBrowser(PHONE, async (w) => {
    const live = await w.live(5);
    const backs: Where[] = [];
    for (const gesture of [BROWSER_BACK, SCREEN_BACK, BROWSER_BACK]) backs.push(await w.act(gesture));
    return { live, backs };
  });
  const questions = seen.live.map((s) => s.question);
  expect(new Set(questions).size, questions.join(" | ")).toBe(6);
  expect(seen.backs.map((s) => s.question), "a Back showed the question already on screen")
    .toEqual([4, 3, 2].map((step) => questions[step]));
  seen.backs.forEach((screen, i) => {
    expect(screen.path, `Back ${i + 1} left the site`).toBe("/");
    expect(screen.step, `Back ${i + 1} is not a step back`).toBe(4 - i);
    expect(screen.length, `Back ${i + 1} changed the browser's history`).toBe(seen.live[5]!.length);
  });
}

/**
 * The phone's back gesture, on the human's walk of 2026-09-08: three answers
 * grew `history.length` by one while the page's own state read `{"step":7}`,
 * the first back gesture jumped three questions and the second went FORWARD.
 * One entry per question screen, and both Backs one gesture.
 */
describe.skipIf(skipped !== null)("back and forward walk the questions", () => {
  it("four answers, back twice and forward once, land on the questions they name", async () => {
    await expectBackTwiceForwardOnceLandOnTheirQuestions();
  }, 180000);

  it("the screen's own Back and the browser's land on the same question", async () => {
    await expectScreenAndBrowserBackAgree();
  }, 180000);

  /**
   * A mid-interview reload emptied the page's own list while the browser
   * kept every entry it had pushed: `step` restarted at 0 with
   * `history.length` still at 5, so browser Back found no screen to restore
   * and the page's own Back fell through to the edit path (Spec review,
   * 2026-09-08).
   */
  it("after a reload both Backs still land on the same previous question, and forward returns", async () => {
    await expectBothBacksAgreeAfterAReload();
  }, 180000);
});

/** Checks four answers add one entry each, two browser Backs step one question each, and Forward undoes the last. */
async function expectBackTwiceForwardOnceLandOnTheirQuestions(): Promise<void> {
  const seen = await walkInBrowser(PHONE, async (w) => {
    const asked = await w.live(4);
    const back1 = await w.act(BROWSER_BACK);
    const back2 = await w.act(BROWSER_BACK);
    return { asked, back1, back2, forward: await w.act(BROWSER_FORWARD) };
  });
  const [first, ...answered] = seen.asked;
  // One entry per answer: the counter and the browser agree, which is the
  // thing that had come apart.
  expect(first!.step).toBe(0);
  answered.forEach((screen, i) => {
    expect(screen.step, `answer ${i + 1} did not add exactly one entry`).toBe(i + 1);
    expect(screen.length - first!.length, `answer ${i + 1}: history grew by ${screen.length - first!.length}`)
      .toBe(i + 1);
  });
  const questions = seen.asked.map((s) => s.question);
  expect(new Set(questions).size, questions.join(" | ")).toBe(questions.length);
  // Back once is the question before the one on screen — not three before;
  // twice is the one before that, and never a step forward.
  expect([seen.back1.question, seen.back1.step]).toEqual([questions[3], 3]);
  expect([seen.back2.question, seen.back2.step]).toEqual([questions[2], 2]);
  // Forward is symmetrical: it undoes the last back exactly.
  expect([seen.forward.question, seen.forward.step]).toEqual([seen.back1.question, 3]);
}

/** Checks, three answers in, the screen's Back and the browser's land on the same question, one step back. */
async function expectScreenAndBrowserBackAgree(): Promise<void> {
  const seen = await walkInBrowser(PHONE, async (w) => {
    const walk = async (goBack: Gesture) => {
      const live = await w.live(3);
      return { before: live.at(-1)!, after: await w.act(goBack) };
    };
    return { screen: await walk(SCREEN_BACK), browser: await walk(BROWSER_BACK) };
  });
  expect(seen.screen.before.question).toBe(seen.browser.before.question);
  // The same gesture, whichever control the reader used.
  expect(seen.screen.after.question, "the two Backs disagree").toBe(seen.browser.after.question);
  expect(seen.screen.after.step).toBe(seen.browser.after.step);
  // And it is a step, not a jump.
  expect(seen.screen.after.step).toBe(seen.screen.before.step! - 1);
}

/** Checks, after a mid-interview reload, both Backs land on the same previous question and Forward returns. */
async function expectBothBacksAgreeAfterAReload(): Promise<void> {
  const seen = await walkInBrowser(PHONE, async (w) => {
    const walk = async (goBack: Gesture) => {
      const live = await w.live(4);
      const reloaded = await w.actAcross(RELOAD);
      const back = await w.act(goBack);
      const questions = live.map((s) => s.question);
      return { questions, before: live.at(-1)!, reloaded, back, forward: await w.act(BROWSER_FORWARD) };
    };
    return { browser: await walk(BROWSER_BACK), screen: await walk(SCREEN_BACK) };
  });
  for (const [how, walk] of Object.entries(seen)) expectReloadKeptTheWalk(how, walk);
  // The two gestures agree, which is the whole point of the fix.
  expect([seen.screen.back.question, seen.screen.back.step])
    .toEqual([seen.browser.back.question, seen.browser.back.step]);
}

/** The reload changed nothing a reader can see, the entry included; Back is a step to the previous
 * question, not a dead gesture; and forward returns to where the reader stood. */
function expectReloadKeptTheWalk(
  how: string, walk: { questions: string[]; before: Where; reloaded: Where; back: Where; forward: Where },
) {
  expect(walk.reloaded.question, `${how}: the reload lost the question`).toBe(walk.before.question);
  expect(walk.reloaded.step, `${how}: the step restarted at ${walk.reloaded.step}`).toBe(walk.before.step);
  expect(walk.reloaded.length, `${how}: the browser's own entries changed`).toBe(walk.before.length);
  expect(walk.back.question, `${how}: Back did nothing after a reload`).toBe(walk.questions.at(-2));
  expect(walk.back.step).toBe(walk.before.step! - 1);
  expect(walk.forward.question, `${how}: forward did not return`).toBe(walk.before.question);
  expect(walk.forward.step).toBe(walk.before.step);
}
