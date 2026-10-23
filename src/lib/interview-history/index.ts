// @level application
/**
 * The interview's history: one browser entry per screen the reader can go
 * back to, and one gesture behind both Backs.
 *
 * Browser Back is the phone's "previous question" gesture, and it means
 * exactly what the screen's own "← Back" means: answering pushes an entry,
 * every other screen replaces the one it stands on, and "← Back" is the
 * browser's Back wherever the browser holds an entry of ours behind the
 * reader. Where it holds none — the screen an outside entrance opened on, or
 * a record another tab changed — the screen's Back shows the previous
 * question in place, and the browser's own Back leaves, as it does from any
 * page just opened (s37).
 *
 * The browser is a port, so the rule is tested in Node against a history in
 * memory; `browser-history.ts` is the adapter over `window.history`.
 */
import { entryState, firstHeldStep, readEntry } from "./list/entry-state.js";
import {
  backFor, clampStep, emptyHistory, historyFor, recordAdvance, recordInPlace, screenAt,
  type HistoryWrite, type ScreenHistory,
} from "./list/screen-list.js";

/** The browser's history, as the interview uses it. */
export interface BrowserHistory {
  /** The state of the entry the browser stands on. */
  state(): unknown;
  /** A new entry after the one stood on, carrying `state`. */
  push(state: unknown): void;
  /** The entry stood on, rewritten to carry `state`. */
  replace(state: unknown): void;
  /** The browser's own Back. */
  back(): void;
  /** Calls `listener` with the state of the entry the browser moved onto within the page. */
  onMove(listener: (state: unknown) => void): void;
}

/** Where the interview stands when its history is opened, once its first screen is decided. */
export interface OpenedOn {
  /** The questions answered, in the order the record keeps. */
  asked: readonly string[];
  /** The question on screen; null for the verdict. */
  showing: string | null;
}

/** What the screen's "← Back" did: asked the browser, or a question to show in place, or nothing behind. */
export type BackMove = { kind: "browser" } | { kind: "in-place"; field: string } | { kind: "none" };

/** A move the browser made, as the interview draws it. */
export interface BrowserMove {
  /** The question to draw; null for the verdict. */
  field: string | null;
  /** Whether it landed on the page's first screen, which keeps the top of the page as a cold load does. */
  ontoFirstScreen: boolean;
}

export interface InterviewHistory {
  /** A screen drawn by answering: a new entry. `field` is null for the verdict. */
  movedForward(field: string | null): void;
  /** A screen drawn by any other gesture: the entry it stands on, rewritten. */
  redrawnInPlace(field: string | null): void;
  /** "Start over": the entries go with the record. */
  restarted(): void;
  /** The question the screen's "← Back" goes to, or null where none is behind. */
  backTarget(asked: readonly string[], editing: string | null): string | null;
  /** The screen's "← Back". */
  back(asked: readonly string[], editing: string | null): BackMove;
  /** Calls `show` each time the browser moves onto one of the interview's entries. */
  onMove(show: (move: BrowserMove) => void): void;
}

/** What the history holds between gestures. */
interface Kept {
  list: ScreenHistory;
  /** Whether the browser is moving the reader: the screen it draws writes no entry. */
  restoring: boolean;
  show: ((move: BrowserMove) => void) | null;
}

/**
 * The history of an interview whose first screen is decided. The list is
 * rebuilt from the record, since a reload empties it while the browser keeps
 * every entry; where the held steps begin is read from the entry the page
 * opened onto, before the history writes one of its own.
 */
export function openInterviewHistory(browser: BrowserHistory, { asked, showing }: OpenedOn): InterviewHistory {
  const list = historyFor(asked, showing);
  list.firstHeld = firstHeldStep(browser.state(), list.current);
  const kept: Kept = { list, restoring: false, show: null };
  write(browser, kept, "replace");
  browser.onMove((state) => browserMoved(kept, state));
  return {
    movedForward: (field) => {
      if (!kept.restoring) write(browser, kept, recordAdvance(kept.list, field));
    },
    redrawnInPlace: (field) => {
      if (!kept.restoring) write(browser, kept, recordInPlace(kept.list, field));
    },
    restarted: () => { kept.list = emptyHistory(); },
    backTarget: (asked, editing) => backTargetOf(kept.list, asked, editing),
    back: (asked, editing) => {
      if (backFor(kept.list) === "browser") {
        browser.back();
        return { kind: "browser" };
      }
      const field = inPlaceTarget(asked, editing);
      return field === undefined ? { kind: "none" } : { kind: "in-place", field };
    },
    onMove: (show) => { kept.show = show; },
  };
}

/** Writes the entry the reader stands on. Every entry says how many held steps stand behind it, so a
 * reload or a return onto it can tell (s37). */
function write(browser: BrowserHistory, kept: Kept, how: HistoryWrite): void {
  const state = entryState(kept.list);
  if (how === "push") browser.push(state);
  else browser.replace(state);
}

/** The question before the one on screen, or before the last answered: where a Back in place goes. */
function inPlaceTarget(asked: readonly string[], editing: string | null): string | undefined {
  const at = editing ? asked.indexOf(editing) : asked.length;
  return asked[at - 1];
}

function backTargetOf(list: ScreenHistory, asked: readonly string[], editing: string | null): string | null {
  if (backFor(list) === "browser") return screenAt(list, list.current - 1)?.field ?? null;
  return inPlaceTarget(asked, editing) ?? null;
}

/**
 * The browser moved onto an entry. One nothing of ours wrote, or one "Start
 * over" has since emptied the list of, restores nothing: a stranger's answers
 * are never shown. A step past the list lands on the nearest question it has,
 * and how many steps the browser holds behind it is read from that entry,
 * believed only where it lands on its own step (s37).
 */
function browserMoved(kept: Kept, state: unknown): void {
  const { step } = readEntry(state);
  if (step === undefined || kept.show === null) return;
  const at = clampStep(kept.list, step);
  const screen = screenAt(kept.list, at);
  if (!screen) return;
  kept.list.current = at;
  kept.list.firstHeld = firstHeldStep(state, at);
  kept.restoring = true;
  try {
    kept.show({ field: screen.field, ontoFirstScreen: at === 0 });
  } finally {
    kept.restoring = false;
  }
}
