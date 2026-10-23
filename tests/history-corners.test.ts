import { describe, expect, it } from "vitest";
import { InterviewTab, QUESTIONS, type Store, type Where } from "./interview-tab.js";

/**
 * s37 — Back on a restored record, in Node: the corners where the browser's
 * history and the page's list part. A second tab, an outside entrance and an
 * entry another tab's record no longer matches are walked against a tab's
 * history in memory, through the history's entry; `s37.test.ts` keeps what a
 * browser alone does.
 *
 * A tab visits `/data/`, the record holds three answers, the reader opens `/`:
 * the interview restores to the fourth question and shows "← Back". The page
 * had rebuilt a list of four screens and stood on the last, but the browser
 * held one entry of the interview — the screen it opened on — and the
 * screen's Back, as the browser's Back, went to `/data/` (measured
 * 2026-09-25). The screen's Back now asks the browser only for entries it
 * holds; the browser's own Back is left alone.
 */

const asks = (n: number) => QUESTIONS[n]!;
const newStore = (): Store => ({ asked: [] });
const SCREEN_BACK = (tab: InterviewTab) => tab.screenBack();
const BROWSER_BACK = (tab: InterviewTab) => tab.browserBack();

/** The first proof: three screen Backs from the outside entrance, each a
 * question back, none of them off the site. */
function expectThreeStepsBack() {
  const tab = new InterviewTab(newStore());
  const entrance = tab.openFromOutside(3);
  expect(entrance.question, "the record did not restore to the fourth question").toBe(asks(3));
  const backs = [tab.screenBack(), tab.screenBack(), tab.screenBack()];
  backs.forEach((screen, i) => {
    expect(screen.path, `tap ${i + 1} of the screen's Back left the site`).toBe("/");
    expect(screen.question, `tap ${i + 1} is not the question before`).toBe(asks(2 - i));
    // Stepping back in place pushes nothing: the browser's history stays the
    // length the reader walked it.
    expect(screen.length, `tap ${i + 1} changed the browser's history`).toBe(entrance.length);
  });
}

/** A record changed in another tab under the entry tab A stands on. */
interface Change {
  /** Tab A opened `/` from outside onto this many stored answers, or walked
   * live from the first question. */
  entrance: number | "live";
  /** Tab A's answers in the tab after that. */
  answeredInA: number;
  /** Whether tab B pressed "Start over" before answering. */
  restart: boolean;
  /** Tab B's answers. */
  answers: number;
}
/** Tab A's walk, tab B's, tab A's reload and the Backs tapped after it. */
interface TwoTabWalk {
  inA: Where[]; inB: Where[]; reloaded: Where; backs: Where[];
}

/** The step the list tab A rebuilds on reload stands on: one per answer on the record. */
const topAfter = (c: Change) =>
  c.restart ? c.answers : (c.entrance === "live" ? 0 : c.entrance) + c.answeredInA + c.answers;

/**
 * Walk `change` — tab A, then tab B on the record the two share, then a
 * reload in tab A — and tap `gesture` in tab A for as long as it keeps the tab
 * on the interview and, for the screen's Back, is offered: at most two more
 * taps than the two tabs made screens, so a Back that never ends still does.
 */
function changedThenBack(change: Change, gesture: (tab: InterviewTab) => Where): TwoTabWalk {
  const store = newStore();
  const a = new InterviewTab(store);
  const inA = change.entrance === "live" ? a.live(change.answeredInA) : [a.openFromOutside(change.entrance)];
  if (change.entrance !== "live") for (let i = 0; i < change.answeredInA; i++) inA.push(a.answer());
  const b = new InterviewTab(store);
  const inB = [b.open()];
  if (change.restart) inB.push(b.restart());
  for (let i = 0; i < change.answers; i++) inB.push(b.answer());
  const reloaded = a.reload();
  const backs: Where[] = [];
  while (backs.length < inA.length + inB.length + 2) {
    if ((backs.at(-1) ?? reloaded).path !== "/") break;
    if (gesture === SCREEN_BACK && !a.hasBack) break;
    backs.push(gesture(a));
  }
  return { inA, inB, reloaded, backs };
}

/**
 * The screen's Back after a reload onto a changed record: one tap per
 * question before the one restored, each the question before — never the one
 * already on screen, which is a dead tap — the "← Back" offered until the
 * first question, the reader on `/` throughout and the browser's history the
 * length it was.
 */
function expectScreenBackWalksTheList(seen: TwoTabWalk, change: Change) {
  const top = topAfter(change);
  expect(seen.reloaded.question, "the reload did not restore what tab B left").toBe(seen.inB.at(-1)!.question);
  expect(seen.reloaded.step).toBe(top);
  seen.backs.forEach((screen, i) => {
    const before = i === 0 ? seen.reloaded : seen.backs[i - 1]!;
    expect(screen.path, `tap ${i + 1} of the screen's Back left the site`).toBe("/");
    expect(screen.question, `tap ${i + 1} of the screen's Back stayed on the question shown`).not.toBe(before.question);
    expect(screen.length, `tap ${i + 1} changed the browser's history`).toBe(seen.reloaded.length);
  });
  expect(seen.backs.length, "the screen's Back was gone before the first question").toBe(top);
  // A question at a time through the whole list: every one of them seen once.
  const shown = [seen.reloaded, ...seen.backs].map((s) => s.question);
  expect(new Set(shown).size, shown.join(" | ")).toBe(top + 1);
  expect(shown.at(-1)).toBe(asks(0));
}

/** The browser's Back after a reload onto a changed record: one gesture per entry the tab wrote
 * behind the one it reloaded, in order, each on the page and none of them added by it; then off it. */
function expectBrowserBackWalksItsOwnEntries({ inA, inB, reloaded, backs }: TwoTabWalk) {
  expect(reloaded.question, "the reload did not restore what tab B left").toBe(inB.at(-1)!.question);
  const behind = inA.slice(0, -1).map((s) => s.step).reverse();
  expect(backs.slice(0, -1).map((s) => s.step), "the browser's Back did not walk the tab's own entries")
    .toEqual(behind);
  backs.slice(0, -1).forEach((s, i) => {
    expect(s.path, `browser Back ${i + 1} left the site early`).toBe("/");
    expect(s.length, `browser Back ${i + 1}: the page changed the browser's history`).toBe(reloaded.length);
  });
  // ...and after the last, the page the reader came from.
  expect(backs.at(-1)!.path, "the browser's Back was held on the site").toBe("/data/");
}

describe("Back on a restored record", () => {
  it("the screen's Back walks back through every answered question and never leaves the site", () => {
    expectThreeStepsBack();
  });

  it("an answer after an outside entrance is held, and the screen it opened on is still the edge", () => {
    const tab = new InterviewTab(newStore());
    const entrance = tab.openFromOutside(3);
    const advanced = tab.answer();
    expect(advanced.question).not.toBe(entrance.question);
    expect(advanced.step).toBe((entrance.step as number) + 1);
    expect(advanced.length, "an answer is one entry").toBe(entrance.length + 1);
    // The first Back goes onto the entry the answer pushed: the screen it opened on.
    const back1 = tab.screenBack();
    expect([back1.path, back1.question, back1.step]).toEqual(["/", asks(3), entrance.step]);
    // The second is behind the first held step: in place, not off the site.
    const back2 = tab.screenBack();
    expect([back2.path, back2.question], "the second Back left the site").toEqual(["/", asks(2)]);
    // From there nothing of ours is behind in the browser, so its Back leaves.
    expect(tab.browserBack().path).toBe("/data/");
  });

  /**
   * The navigation's type cannot carry this: an outside entrance that is then
   * reloaded, or left and returned to, still holds only the screen it opened
   * on. The entry's own state says how many held steps stand behind it.
   */
  it("an outside entrance reloaded, or left and returned to, still steps back in place", () => {
    const tab = new InterviewTab(newStore());
    tab.openFromOutside(3);
    expect(tab.reload().question).toBe(asks(3));
    const afterReload = tab.screenBack();
    expect([afterReload.path, afterReload.question], "after a reload the screen's Back left the site")
      .toEqual(["/", asks(2)]);
    tab.openFromOutside(3);
    expect(tab.browserBack().path).toBe("/data/");
    expect(tab.browserForward().question).toBe(asks(3));
    const afterReturn = tab.screenBack();
    expect([afterReturn.path, afterReturn.question], "after a return the screen's Back left the site")
      .toEqual(["/", asks(2)]);
  });

  /**
   * Two tabs on one origin share the record and nothing else. Tab A opens `/`
   * onto three answers; tab B answers two more; tab A reloads and rebuilds a
   * list two steps longer than the one its entry was written against. An edge
   * kept as a step number then stood behind the reader, and the screen's Back
   * went to `/data/` (Security review, s37 round 1, at both shas).
   */
  it("a record grown in another tab, then a reload, still steps back in place", () => {
    const store = newStore();
    const a = new InterviewTab(store);
    const entrance = a.openFromOutside(3);
    const b = new InterviewTab(store);
    const inB = [b.open(), b.answer(), b.answer()];
    // Tab B opened on the same record, and each answer moved it on.
    expect(inB[0]!.question).toBe(entrance.question);
    expect(new Set(inB.map((s) => s.question)).size).toBe(3);
    // The reload restores what tab B left: two questions further on.
    const reloaded = a.reload();
    expect(reloaded.question).toBe(inB[2]!.question);
    const back = a.screenBack();
    expect(back.path, "the screen's Back left the site").toBe("/");
    expect(back.question).toBe(inB[1]!.question);
    expect(back.length, "stepping back in place pushed an entry").toBe(reloaded.length);
  });

  /**
   * The Security axis's shrinks and the review's own model (s37 delta round
   * 2): tab A opens onto a stored record and answers on, tab B starts over
   * and answers again, tab A reloads. An entry naming a step past the list
   * clamps onto the question already on screen — a dead tap. Its held count
   * is believed only where the record did not change under it (human,
   * 2026-09-25), and here it did: the screen's Back steps back in place, a
   * question at a time, to the first.
   */
  const SHRUNK: (Change & { name: string })[] = [
    { name: "three answers and three more, started over with three — the round's shallow shrink",
      entrance: 3, answeredInA: 3, restart: true, answers: 3 },
    { name: "two answers and two more, started over with two", entrance: 2, answeredInA: 2, restart: true, answers: 2 },
    { name: "three answers and three more, started over with four", entrance: 3, answeredInA: 3, restart: true, answers: 4 },
  ];
  for (const change of SHRUNK) {
    it(`a record shrunk in another tab (${change.name}), then a reload: every screen Back is the question before`, () => {
      expectScreenBackWalksTheList(changedThenBack(change, SCREEN_BACK), change);
    });
  }

  /**
   * A record started over in another tab and answered back to the length
   * this tab's entry was written against reads as unchanged, and its held
   * count is believed. Every entry behind names a step the list still has, so
   * the screen's Back is the browser's while they last and in place after.
   */
  it("a record restarted in another tab to the same length, then a reload: every screen Back is the question before", () => {
    const change: Change = { entrance: 2, answeredInA: 2, restart: true, answers: 4 };
    expectScreenBackWalksTheList(changedThenBack(change, SCREEN_BACK), change);
  });

  /**
   * After a reload onto a record changed in another tab the two Backs part,
   * and each keeps its own promise. The screen's Back steps back through the
   * rebuilt list in place. The browser's own Back is untouched: it walks the
   * entries this tab wrote, one a gesture, and leaves after the last. The
   * screen on show was reached by the other tab's answers, so the two Backs'
   * agreement does not reach it.
   */
  const PARTED: (Change & { name: string })[] = [
    { name: "grown by 1 after a live walk", entrance: "live", answeredInA: 3, restart: false, answers: 1 },
    { name: "grown by 2 after a live walk", entrance: "live", answeredInA: 3, restart: false, answers: 2 },
    { name: "shrunk deep — three answers and three more, started over with one",
      entrance: 3, answeredInA: 3, restart: true, answers: 1 },
  ];
  for (const change of PARTED) {
    it(`a record ${change.name} in another tab, then a reload: the screen's Back walks the list, the browser's its own entries`, () => {
      expectScreenBackWalksTheList(changedThenBack(change, SCREEN_BACK), change);
      expectBrowserBackWalksItsOwnEntries(changedThenBack(change, BROWSER_BACK));
    });
  }

  /**
   * After an outside entrance, a screen reached by answering in this tab is
   * one the two Backs agree on — straight after the entrance, and after a
   * step back in place first. Each Back from its own fresh walk.
   */
  it("after an outside entrance, the two Backs agree on every screen reached by answering", () => {
    /** Answers on `answerOn` — the screen the entrance opened on, or the one a Back in place
     * showed after it — then taps `goBack`. */
    const walk = (answerOn: "entrance" | "back-in-place", goBack: (tab: InterviewTab) => Where) => {
      const tab = new InterviewTab(newStore());
      let answeredOn = tab.openFromOutside(3);
      if (answerOn === "back-in-place") answeredOn = tab.screenBack();
      const answered = tab.answer();
      return { answeredOn, answered, back: goBack(tab) };
    };
    expect(walk("entrance", SCREEN_BACK).answeredOn.question).toBe(asks(3));
    expect(walk("back-in-place", SCREEN_BACK).answeredOn.question).toBe(asks(2));
    for (const answerOn of ["entrance", "back-in-place"] as const) {
      const [screen, browser] = [walk(answerOn, SCREEN_BACK), walk(answerOn, BROWSER_BACK)];
      expect(screen.answered.question).toBe(browser.answered.question);
      expect(screen.answered.question, "the answer did not move on").not.toBe(screen.answeredOn.question);
      for (const back of [screen.back, browser.back]) expect(back.path, "a Back left the site").toBe("/");
      expect([screen.back.question, screen.back.step], "the two Backs disagree")
        .toEqual([browser.back.question, browser.back.step]);
      // And both land on the screen the answer was given on.
      expect(screen.back.question).toBe(screen.answeredOn.question);
    }
  });
});
