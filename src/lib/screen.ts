// @level application
/**
 * The interview's flow and its history: which screen a gesture lands on, and
 * what the browser's history does about it. No words: a question screen's
 * masthead is written beside the question card (`question.ts`), a verdict's
 * inside the verdict (`verdict/`).
 *
 * A claim about a comparison can only stand on a screen that has one. The
 * type says so: only the results and notice screens carry a masthead, and
 * only the two moves that end on a verdict produce one (product-critique
 * v0.7, blocker B4).
 */
export type Screen =
  /**
   * Any question screen: the interview has compared nothing yet. `started` is
   * only about length — after question 1 the promise has been read, so the
   * subtitle shortens and stops pushing the question below the fold on a
   * phone (product-critique v0.7, F8).
   */
  | { kind: "question"; started: boolean }
  /** The verdict, with the masthead the comparison composed. */
  | { kind: "results"; masthead: VerdictMasthead }
  /** A published rule answers the person directly; no routes were compared. */
  | { kind: "notice"; masthead: VerdictMasthead };

export interface Masthead {
  /**
   * innerHTML — the only markup of its own is one emphasis (`<em>` on the
   * intro, `<b>` on a result). Every other word is escaped: they can be the
   * dataset's (a notice's title, a country's name), and a tag in them would be
   * drawn (#25).
   */
  headline: string;
  /** textContent — never markup, so nothing can be smuggled into it. */
  subline: string;
}

/** A verdict screen's masthead, as the verdict composed it. */
export interface VerdictMasthead extends Masthead {
  /**
   * The same words as `subline` with the one link the s19 written state
   * carries, composed from escaped parts and present only on that screen: the
   * page draws it where it exists and writes `subline` as text everywhere
   * else. The text form stays the one that is announced and the one every test
   * reads.
   */
  sublineHtml?: string;
  /** The sentence the live region announces: the headline's words, without
   * its markup. */
  announced: string;
}

/**
 * Every move the page can make between screens. B4 was a wiring defect rather
 * than a rendering one — "Start over" cleared the answers and left the claim
 * about them standing — so the transitions live here, where a property test
 * can walk them in any order.
 */
export type FlowAction =
  /** An answer recorded, or an edit finished. */
  | { kind: "answer" }
  /** An answered row reopened — from the ledger, or with "← Back". */
  | { kind: "edit" }
  /** A stored record read back, or a browser-Back snapshot restored. */
  | { kind: "restore" }
  /** "Start over". */
  | { kind: "reset" }
  /** The interview ended and the routes were compared. */
  | { kind: "compare"; masthead: VerdictMasthead }
  /** A published notice answers the person outright, so nothing was compared. */
  | { kind: "answered-outright"; masthead: VerdictMasthead };

/** What the flow needs to know about the interview so far. */
export interface Interview {
  /** Questions answered and on file — the page's `asked`. */
  answered: number;
}

/** The screen a gesture lands on. Only `compare` and `answered-outright` can
 * produce a screen that says anything about a comparison, so no path back into
 * the interview can leave a claim standing. */
export function screenAfter(action: FlowAction, interview: Interview): Screen {
  switch (action.kind) {
    case "reset":
      // Start over does not take the count on trust: after it, by definition,
      // nothing has been answered and nothing can be claimed.
      return { kind: "question", started: false };
    case "answer":
    case "edit":
    case "restore":
      return { kind: "question", started: interview.answered > 0 };
    case "compare":
      return { kind: "results", masthead: action.masthead };
    case "answered-outright":
      return { kind: "notice", masthead: action.masthead };
  }
}

/**
 * The history the interview keeps, as a value rather than as a side effect.
 *
 * One entry per screen the reader can go back to, and each entry remembers
 * which question it was showing — never a copy of the answers, so stepping
 * back keeps everything answered since. The page turns these into
 * `pushState`/`replaceState`; the rule about WHEN each happens lives here,
 * where it can be read by a test.
 *
 * It went wrong the other way round: every render pushed, so answering,
 * editing and going back all added entries, the numbers stopped naming the
 * questions, and a phone that throttles a burst of pushes dropped some of them
 * — three answers, one entry, and a back gesture that jumped three questions
 * and then went forward (human's phone walk, 2026-09-08).
 */
export interface HistoryEntry {
  /** The question this entry shows; null on the results or a notice screen. */
  field: string | null;
}

export interface ScreenHistory {
  entries: HistoryEntry[];
  /** Which entry the reader is standing on; -1 before the first render. */
  current: number;
  /**
   * The first step the browser holds an entry of this interview for. Every
   * step from here to `current` is one `history.back()` can land on; the
   * steps before it are the page's own, rebuilt from the record, and the
   * browser has nothing of ours there (s37).
   */
  firstHeld: number;
}

export const emptyHistory = (): ScreenHistory => ({ entries: [], current: -1, firstHeld: 0 });

/** What the page should do with the browser's history for this render. */
export interface HistoryMove {
  /** `push` adds an entry; `replace` rewrites the one being stood on. */
  how: "push" | "replace";
  step: number;
}

/**
 * Advancing to a new question (or to the results) pushes; every other render —
 * an edit, a restore, starting over — replaces the entry it is standing on. A
 * new answer after going back drops what was ahead, exactly as the browser's
 * own forward stack does.
 */
export function recordScreen(history: ScreenHistory, field: string | null, advance: boolean): HistoryMove {
  if (advance && history.current >= 0) {
    history.current += 1;
    history.entries.length = history.current;
    history.entries.push({ field });
    return { how: "push", step: history.current };
  }
  if (history.current < 0) {
    // The first screen — of the page, or after "Start over" — rewrites the
    // entry the reader is standing on, which the browser holds: the steps
    // counted from it are all held.
    history.current = 0;
    history.firstHeld = 0;
  }
  history.entries[history.current] = { field };
  return { how: "replace", step: history.current };
}

/** The screen an entry names, or nothing where it is not ours to restore. */
export function screenAt(history: ScreenHistory, step: number): HistoryEntry | undefined {
  return history.entries[step];
}

/**
 * The entries a reloaded page has to rebuild.
 *
 * A reload empties the page's own list while the browser keeps every entry it
 * pushed: `step` restarted at 0, `history.length` stayed at 5, and both Backs
 * stopped meaning anything — the browser's found no screen to restore and the
 * page's fell through to the edit path (Spec review, 2026-09-08). The record
 * knows the order the questions were answered in, so the list can be rebuilt
 * from it: one entry per answered question, then the one on screen.
 */
export function historyFor(answered: string[], showing: string | null): ScreenHistory {
  const entries: HistoryEntry[] = answered.map((field) => ({ field }));
  entries.push({ field: showing });
  return { entries, current: entries.length - 1, firstHeld: 0 };
}

/** What every entry the interview writes carries in `history.state`. */
export interface EntryState {
  /** The step of the page's list the entry shows. */
  step: number;
  /**
   * How many held steps stand behind this one — how many times the browser
   * can go back from it and stay in the interview. A count, not the step they
   * begin at: a record grown in another tab rebuilds a longer list on reload,
   * and a step number written against the shorter one then stood behind the
   * reader, so the screen's Back left the site (Security review, s37 round 1).
   */
  held: number;
}

/**
 * The state for the entry the reader stands on: the one object every
 * `pushState` and `replaceState` writes, so the shape has one author (s37).
 */
export function entryState(history: ScreenHistory): EntryState {
  return { step: history.current, held: history.current - history.firstHeld };
}

/** A count a history could hold: a non-negative integer, and a safe one — a
 * count past that is not one the page wrote. */
const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

/**
 * What a load or a popstate believes of an entry's state. A step only where it
 * is a count, or none — the entry is not ours. A held count only where it is a
 * count no larger than that step, which is every count the page writes;
 * anything else — missing, a string, a negative, a fraction, an infinity, NaN,
 * more steps held than the entry stands on — is read as 0, nothing held
 * behind, which is an outside entrance. That is the safe side: stepping back
 * in place never leaves the site, and `history.back()` onto nothing does
 * (Security review, s37 rounds 1 and 2).
 *
 * It includes the build before s37, which wrote `{ step }` alone: a tab left
 * open across the deploy reloads onto an entry that says nothing of what is
 * held, and it is read as an outside entrance. For a tab that had walked its
 * questions live the two Backs then disagree once — the screen's steps in
 * place, the browser's goes back — which is the smaller harm: read the other
 * way, a tab that had opened onto a stored record would be sent off the site.
 */
export function readEntry(state: unknown): { step: number | undefined; held: number } {
  const s = (state !== null && typeof state === "object" ? state : {}) as Record<string, unknown>;
  const step = isCount(s.step) ? s.step : undefined;
  return { step, held: step !== undefined && isCount(s.held) && s.held <= step ? s.held : 0 };
}

/**
 * Where the held steps begin, for a page that has just rebuilt its list and
 * stands on `current`, opened onto an entry whose state is `state`.
 *
 * The rebuilt list is right about the questions and says nothing about what
 * the browser holds. A re-entrance — a reload, a return through the
 * browser's history, a restored session — keeps every entry the interview
 * wrote; an outside entrance onto a stored record holds one, the screen it
 * opened on, and a "← Back" that asked the browser for the step before it
 * took the reader off the site (s37, measured 2026-09-25).
 *
 * The navigation's type cannot tell them apart: an outside entrance that is
 * then reloaded, or left and returned to, reads `reload` or `back_forward`
 * while the browser still holds only the screen it opened on — measured in
 * headless Chrome the same day, `history.length` 3 and `/data/` behind in
 * both. The entry itself can: every entry carries how many held steps stand
 * behind it, and the browser keeps that state with the entry through a
 * reload, a return and a restored session, and drops it with the entry.
 *
 * The count is believed only where the step the entry names is the step the
 * page stands on (human, 2026-09-25). Another tab shares the record and not
 * the history: it grows the record, or starts over and answers again, and the
 * entries behind this one still name steps of the list they were written
 * against. Popped, one past the rebuilt list clamps onto the question already
 * on screen — a dead tap, and the screen's Back gone after it (headless
 * Chrome, s37 delta rounds 1 and 2) — and over a grown list they skip the
 * questions the other tab added. Where the count is not believed nothing is
 * held, and the screen's Back steps back in place, which can neither leave
 * the site nor stay put.
 *
 * `current` is where the page stands. On load it is the rebuilt list's last
 * step, so a record grown or shrunk in another tab holds nothing, and one
 * started over back to the same length reads as unchanged. On a popstate it
 * is the popped entry's step clamped to the list, not the list's last step: a
 * Back mid-interview lands on an entry with steps ahead of it and held steps
 * behind it that the browser still has. Where the clamp moved it nothing is
 * held; where it did not, the count is believed even after a shallow grow or
 * shrink in another tab — safely, since every entry behind it names a step
 * the list still has. Read once on load instead, a record grown in another
 * tab left the first held step where the grown list put it while the Backs
 * popped entries further down (Spec review, s37 delta round 1).
 */
export function firstHeldStep(state: unknown, current: number): number {
  const top = Math.max(0, current);
  const { step, held } = readEntry(state);
  return step === top ? top - held : top;
}

/**
 * What the screen's "← Back" does from where the reader stands. Past the first
 * held step it is `history.back()`, so the screen's Back and the phone's are
 * one gesture (human, 2026-09-08); on or before it the browser has nothing of
 * ours behind, and the previous question is shown in place instead.
 */
export function backFor(history: ScreenHistory): "browser" | "in-place" {
  return history.current > history.firstHeld ? "browser" : "in-place";
}

/**
 * The nearest entry this page knows about.
 *
 * A browser entry may name a step the rebuilt list is shorter than — the
 * reader answered more before the reload than the record kept, or a route the
 * dataset no longer asks dropped an answer. Clamping lands them on the nearest
 * question instead of leaving the gesture dead.
 */
export function clampStep(history: ScreenHistory, step: number): number {
  if (!history.entries.length) return 0;
  return Math.max(0, Math.min(step, history.entries.length - 1));
}
