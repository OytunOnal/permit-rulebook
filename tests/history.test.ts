import { describe, expect, it } from "vitest";
import { openInterviewHistory, type InterviewHistory } from "../src/lib/interview-history/index.js";
import { FakeTab, stepOf } from "./fake-browser-history.js";

/**
 * The phone's back gesture, on the human's walk of 2026-09-08.
 *
 * Spain, then a transfer, then a Turkish passport: three answers, and
 * `history.length` had grown by one while the page's own state read
 * `{"step":7}`. The first back gesture jumped three questions to "Where are you
 * looking to go?", and the second went FORWARD to "Which best describes your
 * situation?".
 *
 * Every render pushed an entry, so the numbers stopped naming the questions.
 * One entry per question screen now, and "← Back" is the browser's Back itself
 * wherever the browser holds a step of ours behind the reader, so there the
 * two gestures cannot land on different screens. Where it holds none — the
 * screen a stored record was opened onto — the screen's Back steps back in
 * place and the browser's leaves (s37).
 *
 * Every case runs through the history's entry against a tab's history in
 * memory; the walks in a real browser are `s37.test.ts`'.
 */

/** The questions, in the order a walk answers them. */
const QUESTIONS = ["destination", "citizenship", "situation", "qualification", "occupation_it", "salary"];
/** A stored record of three answers, which opens on the fourth question. */
const ASKED = QUESTIONS.slice(0, 3);

/** A tab that has just opened `/` from outside. */
function freshTab(): FakeTab {
  const tab = new FakeTab();
  tab.open("/");
  return tab;
}

/** A tab that walked `fields` live: the first shown on opening, each next one by answering. */
function walkedLive(fields: string[]): { tab: FakeTab; history: InterviewHistory } {
  const tab = freshTab();
  const history = openInterviewHistory(tab, { asked: [], showing: fields[0]! });
  for (const field of fields.slice(1)) history.pushScreen(field);
  return { tab, history };
}

/** The page opened onto the three stored answers, on an entry whose state is `state`. */
function openedOnto(state: unknown): { tab: FakeTab; history: InterviewHistory } {
  const tab = freshTab();
  tab.replace(state);
  return { tab, history: openInterviewHistory(tab, { asked: ASKED, showing: "qualification" }) };
}

/** The tab reloaded, and the page opened again onto `asked`. */
function reopened(tab: FakeTab, asked: string[], showing: string | null): InterviewHistory {
  tab.reload();
  return openInterviewHistory(tab, { asked, showing });
}

/** Every question the browser's moves draw, in order; null for the verdict. */
function shownOnMoves(history: InterviewHistory): (string | null)[] {
  const shown: (string | null)[] = [];
  history.onMove((move) => shown.push(move.field));
  return shown;
}

/** Whether the screen's Back asks the browser, on a page opened onto `answered` answers and `state`. */
function holdsBehind(state: unknown, answered: number): boolean {
  const tab = freshTab();
  tab.replace(state);
  const asked = QUESTIONS.slice(0, answered);
  const history = openInterviewHistory(tab, { asked, showing: QUESTIONS[answered]! });
  return history.back(asked, null).kind === "browser";
}

/** The browser's Back onto an entry whose state is `state`, from a page opened onto `answered`
 * answers: what it drew, and whether the screen's Back asks the browser after it. */
function poppedOnto(state: unknown, answered: number): { shown: (string | null)[]; held: boolean } {
  const tab = freshTab();
  tab.replace(state);
  tab.push(null);
  const asked = QUESTIONS.slice(0, answered);
  const history = openInterviewHistory(tab, { asked, showing: QUESTIONS[answered]! });
  const shown = shownOnMoves(history);
  tab.back();
  return { shown, held: history.back(asked, shown[0] ?? null).kind === "browser" };
}

describe("a reloaded page rebuilds the entries the browser kept", () => {
  it("one entry per answered question, then the one on screen", () => {
    const { tab } = walkedLive(["destination", "situation", "qualification", "citizenship"]);
    const history = reopened(tab, ["destination", "situation", "qualification"], "citizenship");
    // Standing on the last one, which is what the browser is showing.
    expect(stepOf(tab)).toBe(3);
    const shown = shownOnMoves(history);
    for (let i = 0; i < 3; i++) tab.back();
    expect(shown).toEqual(["qualification", "situation", "destination"]);
  });

  it("a fresh interview rebuilds to the one screen it is showing", () => {
    const tab = freshTab();
    const history = openInterviewHistory(tab, { asked: [], showing: "destination" });
    expect([tab.length, stepOf(tab)]).toEqual([1, 0]);
    expect(history.back([], null)).toEqual({ kind: "none" });
  });

  it("a step the rebuilt list is shorter than lands on the nearest question", () => {
    // The browser kept an entry for a question the record no longer holds.
    const tab = freshTab();
    tab.replace({ step: 1, held: 1 });
    tab.push({ step: 7, held: 7 });
    tab.push(null);
    const history = openInterviewHistory(tab, { asked: ["destination", "situation"], showing: "qualification" });
    const shown = shownOnMoves(history);
    tab.back();
    tab.back();
    expect(shown).toEqual(["qualification", "situation"]);
    // Once "Start over" has emptied the list, an entry behind restores nothing.
    history.startOver();
    tab.forward();
    expect(shown).toHaveLength(2);
  });
});

describe("one history entry per question", () => {
  it("advancing pushes, everything else replaces where it stands", () => {
    const tab = freshTab();
    // The first screen replaces the page's own entry: pushing there would trap
    // the visitor, because Back would always land on another of our screens.
    const history = openInterviewHistory(tab, { asked: [], showing: "destination" });
    expect([tab.length, stepOf(tab)]).toEqual([1, 0]);
    history.pushScreen("situation");
    expect([tab.length, stepOf(tab)]).toEqual([2, 1]);
    history.pushScreen("citizenship");
    expect([tab.length, stepOf(tab)]).toEqual([3, 2]);
    // An edit is not a new screen: it rewrites the entry it is standing on.
    history.replaceScreen("citizenship");
    // Three questions answered, three entries — never four, never one.
    expect([tab.length, stepOf(tab)]).toEqual([3, 2]);
  });

  it("every entry names the question it was showing", () => {
    const { tab, history } = walkedLive(["destination", "situation", "citizenship"]);
    // The results screen is an entry too, and names no question.
    history.pushScreen(null);
    expect(stepOf(tab)).toBe(3);
    const shown = shownOnMoves(history);
    for (let i = 0; i < 3; i++) tab.back();
    for (let i = 0; i < 3; i++) tab.forward();
    expect(shown).toEqual(["citizenship", "situation", "destination", "situation", "citizenship", null]);
    // An entry nobody wrote restores nothing.
    tab.push("not ours");
    tab.back();
    tab.forward();
    expect(shown.slice(6)).toEqual([null]);
  });

  it("answering after going back drops what was ahead", () => {
    const { tab, history } = walkedLive(["destination", "situation", "citizenship"]);
    const shown = shownOnMoves(history);
    // Back to the second question, then a different answer.
    tab.back();
    history.pushScreen("qualification");
    expect([tab.length, stepOf(tab)]).toEqual([3, 2]);
    tab.back();
    tab.forward();
    expect(shown).toEqual(["situation", "situation", "qualification"]);
  });
});

/** The nine held counts the Security axis measured (s37 round 1): none of them
 * a count the page could have written. */
const NOT_A_COUNT: unknown[] = ["5", {}, -1, -Infinity, 1e308, Infinity, NaN, 2.5, null];

/**
 * s37: a reader who opens the site onto a stored record is shown the question
 * the record left them on, with the page's list rebuilt behind it — but the
 * browser holds one entry of this interview, the screen it opened on, and
 * "← Back" as the browser's Back took them off the site (measured
 * 2026-09-25). The screen's Back hands the browser only steps it holds.
 */
describe("the screen's Back asks the browser only for entries it holds", () => {
  it("an outside entrance onto a stored record holds nothing behind the screen it opened on", () => {
    const { tab, history } = openedOnto(null);
    expect(stepOf(tab)).toBe(3);
    expect(history.back(ASKED, null)).toEqual({ kind: "in-place", field: "situation" });
    expect(tab.length).toBe(1);
  });

  it("an entry that says how many held steps stand behind it is believed, however the page was opened", () => {
    // Walked live in this tab, then reloaded: every step is held.
    const live = walkedLive(QUESTIONS.slice(0, 4));
    expect(reopened(live.tab, ASKED, "qualification").back(ASKED, null)).toEqual({ kind: "browser" });
    // An outside entrance, then reloaded or left and returned to: the browser
    // still holds only the screen it opened on, and the entry says so.
    const opened = openedOnto(null);
    expect(reopened(opened.tab, ASKED, "qualification").back(ASKED, null))
      .toEqual({ kind: "in-place", field: "situation" });
  });

  /**
   * Another tab shares the record and not the history: it grows the record,
   * or starts over and answers again, and this tab's entries stay as they were
   * written, against a list the page no longer rebuilds. So an entry's held
   * count is believed only where the step it names is the step the page
   * stands on (human, 2026-09-25); anywhere else nothing is held, and the
   * screen's Back steps back in place.
   */
  it("an entry's held count is believed only where its step is the step the page stands on", () => {
    // The entry names the step the rebuilt list stands on.
    expect(holdsBehind({ step: 3, held: 3 }, 3)).toBe(true);
    expect(holdsBehind({ step: 3, held: 1 }, 3)).toBe(true);
    // Shrunk — the entry names a step past the list: none held. The first is
    // the round's shallow shrink.
    expect(holdsBehind({ step: 6, held: 3 }, 3)).toBe(false);
    expect(holdsBehind({ step: 5, held: 3 }, 3)).toBe(false);
    // The Security axis's other shapes: opened on two and two answered, the
    // other tab starting over with two; opened on three and three answered,
    // the other tab starting over with four; and the deep shrink, with one.
    expect(holdsBehind({ step: 4, held: 2 }, 2)).toBe(false);
    expect(holdsBehind({ step: 6, held: 3 }, 4)).toBe(false);
    expect(holdsBehind({ step: 6, held: 3 }, 1)).toBe(false);
    // Grown — the entry names a step before the list's top: none held.
    expect(holdsBehind({ step: 3, held: 3 }, 4)).toBe(false);
    expect(holdsBehind({ step: 3, held: 3 }, 5)).toBe(false);
    expect(holdsBehind({ step: 5, held: 5 }, 3)).toBe(false);
  });

  /**
   * A record started over in another tab and answered back to the same
   * length leaves the entry's step and held count as an unchanged record
   * would, so it reads as unchanged: this pins what the entry can tell, not a
   * decision that restarts are believed.
   */
  it("a record restarted to the same length reads as unchanged, and every step behind is one the list has", () => {
    expect(holdsBehind({ step: 4, held: 2 }, 4)).toBe(true);
  });

  /**
   * A browser move reads the entry it lands on against the step it lands at:
   * the entry's step clamped to the list. An entry the list still has is
   * believed; a stale entry clamped onto the list's last screen counts
   * nothing held.
   */
  it("a popped entry is believed where it lands on its own step, and not where it was clamped", () => {
    expect(poppedOnto({ step: 2, held: 2 }, 4)).toEqual({ shown: ["situation"], held: true });
    expect(poppedOnto({ step: 5, held: 3 }, 1)).toEqual({ shown: ["citizenship"], held: false });
    expect(poppedOnto({ step: 5, held: 1 }, 1)).toEqual({ shown: ["citizenship"], held: false });
  });

  /**
   * Only a count the page could have written is believed: a non-negative
   * integer a history could hold. Anything else is read as an outside
   * entrance, because stepping back in place never leaves the site and the
   * browser's Back onto nothing does.
   */
  it("a held count that is not a non-negative integer is an outside entrance", () => {
    for (const held of NOT_A_COUNT) expect(holdsBehind({ step: 3, held }, 3), `held: ${String(held)}`).toBe(false);
    // Missing altogether, or no state at all.
    expect(holdsBehind({ step: 3 }, 3)).toBe(false);
    for (const state of [undefined, "5", 5, []]) expect(holdsBehind(state, 3), String(state)).toBe(false);
    // 0 is a count the page writes — on an outside entrance.
    expect(holdsBehind({ step: 3, held: 0 }, 3)).toBe(false);
    // And a count it could have written is believed.
    expect(holdsBehind({ step: 3, held: 2 }, 3)).toBe(true);
  });

  /**
   * An entry that carries a step and no held count says nothing about what is
   * held, and is read as an outside entrance; its step is still read.
   */
  it("an entry written before the held count is an outside entrance, however it was reached", () => {
    expect(holdsBehind({ step: 3 }, 3)).toBe(false);
    expect(poppedOnto({ step: 3 }, 4)).toEqual({ shown: ["qualification"], held: false });
  });

  it("an answer after an outside entrance is held, and the screen it opened on is still the edge", () => {
    const { tab, history } = openedOnto(null);
    const asked = [...ASKED, "qualification"];
    history.pushScreen("occupation_it");
    expect([tab.length, stepOf(tab)]).toEqual([2, 4]);
    // One entry of ours behind: the browser can go back onto it.
    const shown = shownOnMoves(history);
    expect(history.back(asked, null)).toEqual({ kind: "browser" });
    expect(shown).toEqual(["qualification"]);
    // Back on the screen it opened on, nothing of ours is behind again.
    expect(history.back(asked, "qualification")).toEqual({ kind: "in-place", field: "situation" });
    // Stepping back in place rewrites the entry; it never moves the edge.
    history.replaceScreen("situation");
    expect([tab.length, stepOf(tab)]).toEqual([2, 3]);
    expect(history.back(asked, "situation")).toEqual({ kind: "in-place", field: "citizenship" });
  });

  it("starting over stands on a held entry: the edge goes back to the first step", () => {
    const { tab, history } = openedOnto(null);
    // "Start over" empties the list; its first screen rewrites the entry the
    // reader is standing on, which the browser holds.
    history.startOver();
    history.replaceScreen("destination");
    expect(tab.state()).toEqual({ step: 0, held: 0 });
    history.pushScreen("citizenship");
    expect(history.back(["destination"], null)).toEqual({ kind: "browser" });
  });

  it("a live walk from the first question holds every step", () => {
    const tab = freshTab();
    const history = openInterviewHistory(tab, { asked: [], showing: "destination" });
    expect(history.back([], null)).toEqual({ kind: "none" });
    history.pushScreen("citizenship");
    expect(tab.state()).toEqual({ step: 1, held: 1 });
    expect(history.back(["destination"], null)).toEqual({ kind: "browser" });
  });

  /** The label on "← Back" and the move it makes cannot disagree (#56, ruling 6). */
  it("the screen's Back names the question it goes to, past the first held step and on it", () => {
    const { history } = openedOnto(null);
    const asked = [...ASKED, "qualification"];
    expect(history.backTarget(ASKED, null)).toBe("situation");
    history.pushScreen("occupation_it");
    // Past the first held step: the entry behind, which the browser's Back shows.
    expect(history.backTarget(asked, null)).toBe("qualification");
    history.onMove(() => undefined);
    history.back(asked, null);
    // On it: the question before, shown in place.
    expect(history.backTarget(asked, "qualification")).toBe("situation");
    expect(history.backTarget([], null)).toBeNull();
  });
});

/**
 * The entry's state has one owner: the history writes it on every push and
 * replace, and reads it on opening and on every browser move. Written in one
 * file and read in another, a rename on either side stayed green (Standards
 * review, s37 round 1).
 */
describe("what an entry carries is written and read in one place", () => {
  it("a state the page wrote reads back as the step it names and where the held steps begin", () => {
    const { tab } = walkedLive(["destination", "citizenship", "situation"]);
    const written = tab.state();
    // Reloaded onto that entry, the page's rule gives back the edge it had.
    const reloaded = reopened(tab, ["destination", "citizenship"], "situation");
    expect(tab.state()).toEqual(written);
    expect(reloaded.back(["destination", "citizenship"], null)).toEqual({ kind: "browser" });
  });

  /**
   * Tab A opens onto three answers; tab B answers two more; tab A reloads
   * onto the entry it wrote. The rebuilt list is two steps longer than the one
   * that entry was written against, and a count written against a shorter
   * list is not believed against a longer one (human, 2026-09-25).
   */
  it("a record grown in another tab moves the list, and nothing behind it is held", () => {
    const grown = [...ASKED, "qualification", "occupation_it"];
    const inPlace = { kind: "in-place", field: "occupation_it" };
    const tabA = openedOnto(null).tab;
    expect(reopened(tabA, grown, "salary").back(grown, null)).toEqual(inPlace);
    // Walked live from the first question, then grown: the steps walked are
    // behind the entry in the browser, but they name steps of the shorter list.
    const live = walkedLive(QUESTIONS.slice(0, 4));
    expect(reopened(live.tab, grown, "salary").back(grown, null)).toEqual(inPlace);
  });

  it("a state nothing of ours wrote names no step and holds nothing", () => {
    for (const state of [null, undefined, "2", 2, { step: "2" }, { step: -1 }, { step: NaN }, { step: 1.5 }]) {
      expect(holdsBehind(state, 3), JSON.stringify(state)).toBe(false);
      expect(poppedOnto(state, 3).shown, JSON.stringify(state)).toEqual([]);
    }
  });

  it("the reader believes a held count only where the builder could have written it", () => {
    // The same nine shapes the Security axis measured (s37 round 1), read on a browser move.
    for (const held of NOT_A_COUNT)
      expect(poppedOnto({ step: 3, held }, 4).held, `held: ${String(held)}`).toBe(false);
    expect(poppedOnto({ step: 3 }, 4).held).toBe(false);
    for (const held of [1, 3]) expect(poppedOnto({ step: 3, held }, 4).held).toBe(true);
  });

  /**
   * The page writes `held` as the steps between the first held one and the
   * one it stands on, so an entry it wrote never holds more steps than the one
   * it names. A larger count is not one the page wrote: `{ step: 3, held:
   * 2^53 - 1 }` sent the screen's Back to the browser (Security review, s37
   * delta round 1). It is read as an outside entrance.
   */
  it("a held count larger than the step it stands on is an outside entrance", () => {
    for (const held of [4, 100, Number.MAX_SAFE_INTEGER])
      expect(holdsBehind({ step: 3, held }, 3), `held: ${held}`).toBe(false);
    // A step it cannot read believes no count at all.
    expect(poppedOnto({ held: 2 }, 3).shown).toEqual([]);
    // Up to the step itself, the count is one the page writes.
    for (const held of [2, 3]) expect(holdsBehind({ step: 3, held }, 3)).toBe(true);
  });
});
