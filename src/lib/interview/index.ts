// @level main
/**
 * The interview: `startInterview` wires its parts in the browser, and every
 * decision they apply comes from one pure step function, `interviewAfter`,
 * which a test drives gesture by gesture, as the verdict's tests drive
 * `verdictOf`.
 *
 * Each gesture is decided by `interviewAfter`; its history move goes to the
 * interview's history, its save to the record's store, and the drawing parts
 * apply the rest.
 */
import dataset from "permit-rulebook-data/data/dataset.json";
// The interview's look travels with it: the page that starts it links this
// stylesheet in its <head>. It stands second here and before the verdict's
// stylesheet: the build orders a page's stylesheets by where each is imported,
// so the page's own (the tokens, the identity) come first, then this one,
// then the verdict's, which overrides it where both style one element.
import "./interview.css";
import { deriveQuestions, type Dataset } from "permit-rulebook-data";
import {
  openInterviewHistory, type BrowserHistory, type InterviewHistory,
} from "../interview-history/index.js";
import { clearRecord, loadRecord, saveRecord, type RecordStore } from "../record.js";
import { openDrawing } from "./draw/drawing.js";
import {
  EMPTY_INTERVIEW, interviewAfter, type Gesture, type HistoryCall, type InterviewStep,
} from "./flow/interview-after.js";

export { EMPTY_INTERVIEW, interviewAfter } from "./flow/interview-after.js";
export type {
  Gesture, HistoryCall, InterviewLines, InterviewScreen, InterviewState, InterviewStep, KeepTarget, KeptRecord, Landing,
} from "./flow/interview-after.js";

/** What the page hands the interview: the browser's history, and the record's store, null where site data is blocked. */
export interface InterviewPorts {
  browserHistory: BrowserHistory;
  store: RecordStore | null;
}

/** One call on the interview's history, as the step named it. */
function tell(history: InterviewHistory, call: HistoryCall): void {
  if (call.call === "startOver") history.startOver();
  else if (call.call === "pushScreen") history.pushScreen(call.field);
  else history.replaceScreen(call.field);
}

/**
 * Starts the interview on the page. The history opens with the first step,
 * onto the entry the page opened onto, and rebuilds its list from the
 * record, since a reload empties the page while the browser keeps every
 * entry.
 */
export function startInterview({ browserHistory, store }: InterviewPorts): void {
  const ds = dataset as unknown as Dataset;
  const questions = deriveQuestions(ds);
  let interview = EMPTY_INTERVIEW;
  let history: InterviewHistory | null = null;
  /** A gesture, applied: the state kept, the record saved or cleared, the history told, and the screen drawn
   * last, so its Back names where the history now sends it. One that leads nowhere draws nothing. */
  const apply = (gesture: Gesture): void => {
    const step = interviewAfter(ds, interview, gesture);
    if (!step) return;
    interview = step.state;
    if (step.save === "clear") clearRecord(store);
    else if (step.save) saveRecord(store, step.save);
    history ??= openHistoryOn(step);
    for (const call of step.history) tell(history, call);
    drawing.drawStep(step, history.backTarget(step.state.asked, step.state.editing));
  };
  /** Opens the history onto the first step's screen; the browser's moves are gestures from then on. */
  const openHistoryOn = (first: InterviewStep): InterviewHistory => {
    const showing = first.screen.kind === "question" ? first.screen.field : null;
    const firstHistory = openInterviewHistory(browserHistory, { asked: first.state.asked, showing });
    firstHistory.onMove((move) => apply({ kind: "browserMoved", ...move }));
    return firstHistory;
  };
  const drawing = openDrawing(ds, questions, {
    makeGesture: apply,
    // Where the browser holds a step of ours behind, the history asks it to go
    // back and its move draws that entry's question; elsewhere the previous
    // question is drawn in place. Nothing is erased on the way.
    pressBack: () => {
      const move = history?.back(interview.asked, interview.editing);
      if (move?.kind === "in-place") apply({ kind: "back", field: move.field });
    },
  });
  // The record keeps only the questions this interview can ask, with the
  // answers each takes (s25).
  const kept = loadRecord(store, questions);
  drawing.uncover();
  apply({ kind: "loaded", record: kept, search: location.search });
}
