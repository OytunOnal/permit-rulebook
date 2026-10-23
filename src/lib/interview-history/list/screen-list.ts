// @level domain
/**
 * The history the interview keeps, as a value rather than as a side effect.
 *
 * One entry per screen the reader can go back to, and each entry remembers
 * which question it was showing — never a copy of the answers, so stepping
 * back keeps everything answered since. The rule about when an entry is added
 * and when one is rewritten lives here, where a test reaches it through the
 * module's entry: an entry added on every render would stop the steps naming
 * the questions, and a phone that throttles a burst of pushes drops some of
 * them.
 */
export interface HistoryEntry {
  /** The question this entry shows; null on the results or a notice screen. */
  field: string | null;
}

export interface ScreenHistory {
  entries: HistoryEntry[];
  /** Which entry the reader is standing on; -1 before the first screen. */
  current: number;
  /**
   * The first step the browser holds an entry of this interview for. Every
   * step from here to `current` is one the browser's Back can land on; the
   * steps before it are the page's own, rebuilt from the record, and the
   * browser has nothing of ours there.
   */
  firstHeld: number;
}

/** What the browser's history does for one screen: add an entry, or rewrite the one stood on. */
export type HistoryWrite = "push" | "replace";

export const emptyHistory = (): ScreenHistory => ({ entries: [], current: -1, firstHeld: 0 });

/**
 * A screen drawn by answering: a new entry, which drops what was ahead, as the
 * browser's own forward stack does. The first screen — of the page, or after
 * "Start over" — rewrites the entry the reader stands on instead.
 */
export function recordAdvance(history: ScreenHistory, field: string | null): HistoryWrite {
  if (history.current < 0) return recordInPlace(history, field);
  history.current += 1;
  history.entries.length = history.current;
  history.entries.push({ field });
  return "push";
}

/**
 * A screen drawn by any other gesture — an edit, a step back in place,
 * starting over — rewrites the entry it stands on. The first screen rewrites
 * the entry the browser holds, so the steps counted from it are all held.
 */
export function recordInPlace(history: ScreenHistory, field: string | null): HistoryWrite {
  if (history.current < 0) {
    history.current = 0;
    history.firstHeld = 0;
  }
  history.entries[history.current] = { field };
  return "replace";
}

/** The screen an entry names, or nothing where it is not ours to restore. */
export function screenAt(history: ScreenHistory, step: number): HistoryEntry | undefined {
  return history.entries[step];
}

/**
 * The entries an opened page rebuilds. A reload empties the page's own list
 * while the browser keeps every entry it pushed, and without the list both
 * Backs would mean nothing. The record knows the order the
 * questions were answered in: one entry per answered question, then the one
 * on screen.
 */
export function historyFor(answered: readonly string[], showing: string | null): ScreenHistory {
  const entries: HistoryEntry[] = answered.map((field) => ({ field }));
  entries.push({ field: showing });
  return { entries, current: entries.length - 1, firstHeld: 0 };
}

/**
 * The held step the screen's "← Back" goes to: the nearest one behind the
 * reader that shows another screen than the one on screen. There the screen's
 * Back is the browser's, so the two are one gesture. Two entries in a row can
 * show one question — a ✎ on the result redraws the result's entry as the
 * question kept from — and Back to the question on screen would be a dead
 * tap, so those are skipped. Null where no held step behind shows another
 * screen: the browser has nothing of ours to go to, and the previous question
 * is shown in place instead.
 */
export function heldStepBehind(history: ScreenHistory): number | null {
  const showing = history.entries[history.current]?.field;
  for (let step = history.current - 1; step >= history.firstHeld; step--)
    if (history.entries[step]?.field !== showing) return step;
  return null;
}

/**
 * The nearest entry this page knows about. A browser entry may name a step
 * the rebuilt list is shorter than — the reader answered more before the
 * reload than the record kept, or a route the dataset no longer asks dropped
 * an answer — and lands on the nearest question instead of a dead gesture.
 */
export function clampStep(history: ScreenHistory, step: number): number {
  if (!history.entries.length) return 0;
  return Math.max(0, Math.min(step, history.entries.length - 1));
}
