// @level domain
import type { ScreenHistory } from "./screen-list.js";

/** What every entry the interview writes carries in the browser's state. */
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

/** The state for the entry the reader stands on: the one object every push
 * and replace writes, so the shape has one author (s37). */
export function entryState(history: ScreenHistory): EntryState {
  return { step: history.current, held: history.current - history.firstHeld };
}

/** A count a history could hold: a non-negative integer, and a safe one — a
 * count past that is not one the page wrote. */
const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

/**
 * What an opened page or a browser move believes of an entry's state. A step
 * only where it is a count, or none — the entry is not ours. A held count
 * only where it is a count no larger than that step, which is every count the
 * page writes; anything else — missing, a string, a negative, a fraction, an
 * infinity, NaN, more steps held than the entry stands on — is read as 0,
 * nothing held behind, which is an outside entrance. That is the safe side:
 * stepping back in place never leaves the site, and the browser's Back onto
 * nothing does (Security review, s37 rounds 1 and 2).
 *
 * An entry that carries a step and no held count is read as an outside
 * entrance too. For a tab that had walked its questions live the two Backs
 * then disagree once — the screen's steps in place, the browser's goes back —
 * which is the smaller harm: read the other way, a tab that had opened onto a
 * stored record would be sent off the site.
 */
export function readEntry(state: unknown): { step: number | undefined; held: number } {
  const s = (state !== null && typeof state === "object" ? state : {}) as Record<string, unknown>;
  const step = isCount(s.step) ? s.step : undefined;
  return { step, held: step !== undefined && isCount(s.held) && s.held <= step ? s.held : 0 };
}

/**
 * Where the held steps begin, for a page that stands on `current`, on an
 * entry whose state is `state`.
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
 * while the browser still holds only the screen it opened on (headless
 * Chrome, 2026-09-25). The entry itself can: every entry carries how many
 * held steps stand behind it, and the browser keeps that state with the
 * entry through a reload, a return and a restored session.
 *
 * The count is believed only where the step the entry names is the step the
 * page stands on (human, 2026-09-25). Another tab shares the record and not
 * the history: it grows the record, or starts over and answers again, and the
 * entries behind this one still name steps of the list they were written
 * against. Popped, one past the rebuilt list clamps onto the question already
 * on screen — a dead tap — and over a grown list they skip the questions the
 * other tab added. Where the count is not believed nothing is held, and the
 * screen's Back steps back in place, which can neither leave the site nor
 * stay put.
 *
 * `current` is where the page stands. On opening it is the rebuilt list's
 * last step, so a record grown or shrunk in another tab holds nothing, and
 * one started over back to the same length reads as unchanged. On a browser
 * move it is the entry's step clamped to the list: a Back mid-interview lands
 * on an entry with steps ahead of it and held steps behind it that the
 * browser still has. Where the clamp moved it nothing is held; where it did
 * not, the count is believed even after a shallow grow or shrink in another
 * tab — safely, since every entry behind it names a step the list still has.
 */
export function firstHeldStep(state: unknown, current: number): number {
  const top = Math.max(0, current);
  const { step, held } = readEntry(state);
  return step === top ? top - held : top;
}
