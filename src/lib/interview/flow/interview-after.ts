// @level application
/**
 * The interview's decisions: from the state it stands in and one gesture of
 * the reader's, the next state and everything the interview does about it —
 * the screen, the lines above it, the landing, the beat, the save and the
 * history move. Pure, so every decision is tested in Node; the entry and the
 * drawing parts apply the result, and the drawing reads what is runtime (the
 * screen's width, reduced motion, the DOM) itself.
 *
 * One masthead, one writer: a question screen carries no masthead of its own
 * here, only whether the interview has started, so no path back into the
 * interview (Start over, an edit, the browser's Back) can leave a claim about
 * a comparison standing (product-critique v0.7, B4). A verdict's masthead is
 * the verdict's.
 */
import { remainingQuestions, type Dataset, type Profile } from "permit-rulebook-data";
import type { BrowserMove } from "../../interview-history/index.js";
import type { RecordToKeep, StoredRecord } from "../../record.js";
import { arrivalOf, replayRecord, type ArrivalFacts, type RecordOnArrival } from "../../scope.js";

/** Where the interview stands between gestures. */
export interface InterviewState {
  answers: Profile;
  /** The answered fields, in the order they were asked. */
  asked: string[];
  /** The answered field being reconsidered, from a ledger row or from Back. */
  editing: string | null;
  /** What lasts of the arrival: the route that sorts first in every verdict. */
  scopedRouteId: string | null;
}

/** The interview before the record is read. */
export const EMPTY_INTERVIEW: InterviewState = { answers: {}, asked: [], editing: null, scopedRouteId: null };

/** The record as the store kept it. */
export type KeptRecord = Pick<StoredRecord, "answers" | "history">;

/** Every gesture that moves the interview. */
export type Gesture =
  /** The page opened: the kept record, and the address's search. */
  | { kind: "loaded"; record: KeptRecord; search: string }
  /** An answer to the question on screen; `recordedAs` is the words the next
   * screen says were recorded, where the control can commit a row that is not
   * the text in the box. */
  | { kind: "answered"; value: string; recordedAs?: string }
  /** A ledger row's ✎. */
  | { kind: "editedRow"; field: string }
  /** The screen's Back, where the history said to show this question in place. */
  | { kind: "back"; field: string }
  /** Keep this answer. */
  | { kind: "kept" }
  /** Start over, and the address's search, which arrives again. */
  | { kind: "restarted"; search: string }
  /** The browser moved onto one of the interview's entries. */
  | ({ kind: "browserMoved" } & BrowserMove);

/** The screen a gesture lands on: a question, or the verdict. `started` says
 * which standing promise a question screen's masthead carries. */
export type InterviewScreen = { kind: "question"; field: string; started: boolean } | { kind: "verdict" };

/** The lines a screen says once, above what it draws. */
export interface InterviewLines {
  /** What an arrival did, on the first screen only. */
  arrival: ArrivalFacts | null;
  /** How many answers a return brought back, on the question or the verdict it resumes on. */
  resumed: number | null;
  /** The answers an edit's replay set aside, named on the screen it leads to. */
  setAside: string[];
  /** What the country picker just committed, on the question after it. */
  justRecorded: { field: string; label: string } | null;
}

/**
 * Where a drawn screen meets the reader (GLOSSARY: Reveal / landing). Each
 * names the landing the gesture asks for; the drawing turns it into a scroll
 * with the width it reads.
 */
export type Landing =
  /** The first paint: the browser's own scroll, and no focus taken. */
  | "first-paint"
  /** A browser move onto the page's first screen, or onto the verdict: the scroll the browser restores. */
  | "browser-scroll"
  /** A browser move onto a later question: on a narrow screen, the card under the header once the browser has restored its scroll. */
  | "card-under-header-after-restore"
  /** An answer, or Keep: on a narrow screen the card under the header; on a wide one, the card into view. */
  | "card-under-header"
  /** An edit, from a ledger row or Back in place: the ledger folds and the card lands as an answer's does. */
  | "card-under-folded-ledger"
  /** Start over: the page's top, as a cold load opens it, on every width. */
  | "page-top"
  /** A verdict a gesture drew: its masthead into view and the focus on its headline. */
  | "verdict-masthead";

/** One call on the interview's history, in the order the entry makes them. */
export type HistoryCall =
  | { call: "movedForward"; field: string | null }
  | { call: "redrawnInPlace"; field: string | null }
  | { call: "restarted" };

/** What a gesture leads to. */
export interface InterviewStep {
  state: InterviewState;
  screen: InterviewScreen;
  lines: InterviewLines;
  land: Landing;
  /** Whether the question card it draws takes the beat (#86). */
  beat: boolean;
  /** The record to keep, which replaces the stored one whole; "clear" when Start over leaves
   * nothing to keep; or null when it is untouched. */
  save: RecordToKeep | "clear" | null;
  history: HistoryCall[];
}

const NO_LINES: InterviewLines = { arrival: null, resumed: null, setAside: [], justRecorded: null };

/** How a screen was reached: what its landing, its beat and its history move follow from. */
interface Reach {
  questionLand: Landing;
  verdictLand: Landing;
  /** Whether a question card drawn this way takes the beat: every gesture's
   * but Start over's, which opens the interview as a cold load does. */
  beat: boolean;
  /** The call a question screen makes on the history; none while the browser moves or before it opens. */
  questionCall: "movedForward" | "redrawnInPlace" | null;
  /** The call a verdict makes: one entry on top of the last question's, so Back lands on that question. */
  verdictCall: "movedForward" | null;
}

const FIRST_PAINT: Reach = {
  questionLand: "first-paint", verdictLand: "first-paint", beat: false, questionCall: null, verdictCall: null,
};
/** An answer, or Keep: one entry per question screen, and answering moves forward. */
const BY_ANSWER: Reach = {
  questionLand: "card-under-header", verdictLand: "verdict-masthead", beat: true,
  questionCall: "movedForward", verdictCall: "movedForward",
};
/** A ledger row's ✎, or Back in place: the question stands on the entry it replaces. */
const BY_EDIT: Reach = {
  questionLand: "card-under-folded-ledger", verdictLand: "verdict-masthead", beat: true,
  questionCall: "redrawnInPlace", verdictCall: "movedForward",
};
/** Start over: the first question stands on the entry it replaces, at the page's top, and takes no
 * beat, since nothing on a screen the reader did not reach by answering refuses their first click. */
const BY_RESTART: Reach = {
  questionLand: "page-top", verdictLand: "verdict-masthead", beat: false,
  questionCall: "redrawnInPlace", verdictCall: "movedForward",
};
/** The browser's Back or Forward onto a later screen: the browser restores the scroll, then the card lands. */
const BY_BROWSER: Reach = {
  questionLand: "card-under-header-after-restore", verdictLand: "browser-scroll", beat: true,
  questionCall: null, verdictCall: null,
};
/** The browser's move onto the page's first screen, which keeps the top of the page as a cold load does. */
const BY_BROWSER_ONTO_FIRST: Reach = { ...BY_BROWSER, questionLand: "browser-scroll" };

/**
 * The step a gesture leads to. Null where it changes nothing: a ledger row
 * whose answer is not on the record, or an answer with no question on screen.
 */
export function interviewAfter(dataset: Dataset, state: InterviewState, gesture: Gesture): InterviewStep | null {
  switch (gesture.kind) {
    case "loaded":
      return afterLoad(dataset, gesture);
    case "answered":
      return afterAnswer(dataset, state, gesture);
    case "editedRow":
      if (!state.asked.includes(gesture.field)) return null;
      return stepOnto(dataset, BY_EDIT, { state: { ...state, editing: gesture.field } });
    case "back":
      return stepOnto(dataset, BY_EDIT, { state: { ...state, editing: gesture.field } });
    case "kept":
      return stepOnto(dataset, BY_ANSWER, { state: { ...state, editing: null } });
    case "restarted":
      return afterRestart(dataset, gesture.search);
    case "browserMoved":
      return afterBrowserMove(dataset, state, gesture);
  }
}

/**
 * Start over. A shared or borrowed computer must not hand the next person a
 * stranger's salary, so the stored record goes with the screen, and Back
 * must not undo it: the entries go with the record. Then the address arrives
 * again on the empty record, as the load does, so the screen matches the
 * address the reader is on: its country back on the record with its line, its
 * route sorting first. Where the arrival moved the record, the save replaces
 * the stored record whole; elsewhere it is cleared.
 */
function afterRestart(dataset: Dataset, search: string): InterviewStep {
  const { state, lines } = arrivedOn(dataset, search, { answers: {}, order: [] });
  const step = stepOnto(dataset, BY_RESTART, { state, lines });
  const save = lines.arrival ? recordToKeep(dataset, state) : "clear";
  return { ...step, save, history: [{ call: "restarted" }, ...step.history] };
}

/** The interview an address's arrival leaves on `record`, and the arrival line where it moved it. */
function arrivedOn(dataset: Dataset, search: string, record: RecordOnArrival): Required<Onto> {
  const arrival = arrivalOf(dataset, search, record);
  const state: InterviewState = {
    answers: arrival.record.answers, asked: arrival.record.order, editing: null, scopedRouteId: arrival.scopedRouteId,
  };
  return { state, lines: { ...NO_LINES, arrival: arrival.line } };
}

/**
 * The browser moved onto one of the interview's entries: the screen that
 * entry was showing, with everything answered since still on the record —
 * back is a step, not an undo. The verdict is drawn as it stands, and the
 * screen writes no entry of its own.
 */
function afterBrowserMove(
  dataset: Dataset, state: InterviewState, move: Extract<Gesture, { kind: "browserMoved" }>,
): InterviewStep {
  const reach = move.ontoFirstScreen ? BY_BROWSER_ONTO_FIRST : BY_BROWSER;
  if (move.field === null) return verdictStep(reach, { state: { ...state, editing: null } });
  return stepOnto(dataset, reach, { state: { ...state, editing: move.field } });
}

/**
 * The page opened. The kept record is replayed against the rules as they
 * stand, then the address's arrival is applied to it; the record is saved
 * once, when the arrival moved it. A returning reader is told they returned
 * on the screen the first paint brings them to, a question or the verdict,
 * and not where an arrival line already narrates what came back — one
 * sentence about it, not two.
 */
function afterLoad(dataset: Dataset, gesture: Extract<Gesture, { kind: "loaded" }>): InterviewStep {
  const replayed = replayRecord(dataset, gesture.record.answers, gesture.record.history);
  const { state, lines } = arrivedOn(dataset, gesture.search, replayed);
  const resumes = !lines.arrival && state.asked.length > 0;
  const step = stepOnto(dataset, FIRST_PAINT, { state, lines: { ...lines, resumed: resumes ? state.asked.length : null } });
  return { ...step, save: lines.arrival ? recordToKeep(dataset, state) : null };
}

/**
 * An answer to the question on screen goes on the record, and the next
 * screen is drawn. An edited answer keeps its place in the order; everything
 * after it survives unless the flow no longer asks it, and what does not
 * survive is named on the next screen (#137).
 */
function afterAnswer(
  dataset: Dataset, state: InterviewState, gesture: Extract<Gesture, { kind: "answered" }>,
): InterviewStep | null {
  const field = fieldOnScreen(dataset, state);
  if (field === null) return null;
  const answers: Profile = { ...state.answers, [field]: gesture.value };
  const replayed = state.editing
    ? replayRecord(dataset, answers, state.asked)
    : { answers, order: [...state.asked, field], setAside: [] };
  const next: InterviewState = { ...state, answers: replayed.answers, asked: replayed.order, editing: null };
  const justRecorded = gesture.recordedAs === undefined ? null : { field, label: gesture.recordedAs };
  const lines = { ...NO_LINES, setAside: replayed.setAside, justRecorded };
  const step = stepOnto(dataset, BY_ANSWER, { state: next, lines });
  return { ...step, save: recordToKeep(dataset, next) };
}

/** The question on screen: the one being edited, or the next one the rules
 * still ask; null on the verdict. */
function fieldOnScreen(dataset: Dataset, state: InterviewState): string | null {
  return state.editing ?? remainingQuestions(dataset, state.answers)[0]?.field ?? null;
}

/** A state to draw, and the lines its screen says once. */
interface Onto {
  state: InterviewState;
  lines?: InterviewLines;
}

/** The question the state puts on screen — the one being edited, or the next
 * one the rules still ask — or the verdict when nothing is left to ask. */
function stepOnto(dataset: Dataset, reach: Reach, { state, lines = NO_LINES }: Onto): InterviewStep {
  const remaining = remainingQuestions(dataset, state.answers);
  if (!state.editing && remaining.length === 0) return verdictStep(reach, { state, lines });
  const field = state.editing ?? remaining[0].field;
  return {
    state, lines, land: reach.questionLand, beat: reach.beat, save: null,
    screen: { kind: "question", field, started: state.asked.length > 0 },
    history: reach.questionCall ? [{ call: reach.questionCall, field }] : [],
  };
}

/** The verdict. The commit banner belongs to the question after a commit,
 * and the verdict is not it. */
function verdictStep(reach: Reach, { state, lines = NO_LINES }: Onto): InterviewStep {
  return {
    state, lines: { ...lines, justRecorded: null }, land: reach.verdictLand, beat: false, save: null,
    screen: { kind: "verdict" },
    history: reach.verdictCall ? [{ call: reach.verdictCall, field: null }] : [],
  };
}

/** What a save keeps, with the one bit the verdict implies: whether the
 * interview had nothing left to ask, so the next visit can paint for a
 * verdict before the engine has run (s22). */
function recordToKeep(dataset: Dataset, state: InterviewState): RecordToKeep {
  return {
    answers: state.answers, history: state.asked, done: remainingQuestions(dataset, state.answers).length === 0,
  };
}
