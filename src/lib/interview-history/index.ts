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
  clampStep, emptyHistory, heldStepBehind, historyFor, recordAdvance, recordInPlace, screenAt,
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
  /** The browser's own Back, `steps` entries at once. */
  back(steps: number): void;
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

/** The questions answered so far, and the one of them on screen again to be changed: what a Back
 * in place steps back through. */
export interface AnsweredSoFar {
  /** The questions answered, in the order they were asked. */
  asked: readonly string[];
  /** The answered question being reconsidered; null when none is. */
  editing: string | null;
}

/** What the screen's "← Back" did: asked the browser, or a question to show in place, or nothing behind. */
export type BackMove = { kind: "browser" } | { kind: "in-place"; field: string } | { kind: "none" };

/** A move the browser made, as the interview draws it. */
export interface BrowserMove {
  /** The question to draw; null for the verdict. */
  field: string | null;
  /** Whether it moved onto the page's first screen, which keeps the top of the page as a cold load does. */
  ontoFirstScreen: boolean;
}

export interface InterviewHistory {
  /** A screen drawn by answering: a new entry. `field` is null for the verdict. */
  pushScreen(field: string | null): void;
  /** A screen drawn by any other gesture: the entry it stands on, rewritten. */
  replaceScreen(field: string | null): void;
  /** "Start over": the entries go with the record. */
  startOver(): void;
  /** The question the screen's "← Back" goes to, or null where none is behind. */
  backTarget(answered: AnsweredSoFar): string | null;
  /** The screen's "← Back". */
  back(answered: AnsweredSoFar): BackMove;
  /** Calls `show` each time the browser moves onto one of the interview's entries. */
  onMove(show: (move: BrowserMove) => void): void;
}

/** What the history holds between gestures. */
interface HistoryMemory {
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
  const memory: HistoryMemory = { list, restoring: false, show: null };
  write(browser, memory, "replace");
  browser.onMove((state) => showBrowserMove(memory, state));
  return {
    pushScreen: (field) => {
      if (!memory.restoring) write(browser, memory, recordAdvance(memory.list, field));
    },
    replaceScreen: (field) => {
      if (!memory.restoring) write(browser, memory, recordInPlace(memory.list, field));
    },
    startOver: () => { memory.list = emptyHistory(); },
    backTarget: (answered) => backTargetOf(memory.list, answered),
    back: (answered) => {
      const held = heldStepBehind(memory.list);
      if (held !== null) {
        browser.back(memory.list.current - held);
        return { kind: "browser" };
      }
      const field = inPlaceTarget(answered);
      return field === undefined ? { kind: "none" } : { kind: "in-place", field };
    },
    onMove: (show) => { memory.show = show; },
  };
}

/** Writes the entry the reader stands on. Every entry says how many held steps stand behind it, so a
 * reload or a return onto it can tell (s37). */
function write(browser: BrowserHistory, memory: HistoryMemory, how: HistoryWrite): void {
  const state = entryState(memory.list);
  if (how === "push") browser.push(state);
  else browser.replace(state);
}

/** The question before the one on screen, or before the last answered: where a Back in place goes. */
function inPlaceTarget({ asked, editing }: AnsweredSoFar): string | undefined {
  const at = editing ? asked.indexOf(editing) : asked.length;
  return asked[at - 1];
}

function backTargetOf(list: ScreenHistory, answered: AnsweredSoFar): string | null {
  const held = heldStepBehind(list);
  if (held !== null) return screenAt(list, held)?.field ?? null;
  return inPlaceTarget(answered) ?? null;
}

/**
 * The browser moved onto an entry. One nothing of ours wrote, or one "Start
 * over" has since emptied the list of, restores nothing: a stranger's answers
 * are never shown. A step past the list lands on the nearest question it has,
 * and how many steps the browser holds behind it is read from that entry,
 * believed only where it lands on its own step (s37).
 */
function showBrowserMove(memory: HistoryMemory, state: unknown): void {
  const { step } = readEntry(state);
  if (step === undefined || memory.show === null) return;
  const at = clampStep(memory.list, step);
  const screen = screenAt(memory.list, at);
  if (!screen) return;
  memory.list.current = at;
  memory.list.firstHeld = firstHeldStep(state, at);
  memory.restoring = true;
  try {
    memory.show({ field: screen.field, ontoFirstScreen: at === 0 });
  } finally {
    memory.restoring = false;
  }
}
