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
function tell(history: InterviewHistory | null, call: HistoryCall): void {
  if (call.call === "restarted") history?.restarted();
  else if (call.call === "movedForward") history?.movedForward(call.field);
  else history?.redrawnInPlace(call.field);
}

/**
 * Starts the interview on the page. The history opens once the first screen
 * is drawn, onto the entry the page opened onto, and rebuilds its list from
 * the record, since a reload empties the page while the browser keeps every
 * entry; until then a step tells it nothing.
 */
export function startInterview({ browserHistory, store }: InterviewPorts): void {
  const ds = dataset as unknown as Dataset;
  const questions = deriveQuestions(ds);
  let interview = EMPTY_INTERVIEW;
  let history: InterviewHistory | null = null;
  /** A gesture, applied: the state kept, the record saved or cleared, the
   * screen drawn, and the history told last. One that leads nowhere draws nothing. */
  const apply = (gesture: Gesture): InterviewStep | null => {
    const step = interviewAfter(ds, interview, gesture);
    if (!step) return null;
    interview = step.state;
    if (step.save === "clear") clearRecord(store);
    else if (step.save) saveRecord(store, step.save);
    drawing.drawStep(step);
    for (const call of step.history) tell(history, call);
    return step;
  };
  const drawing = openDrawing(ds, questions, {
    made: (gesture) => { apply(gesture); },
    // Where the browser holds a step of ours behind, the history asks it to go
    // back and its move draws that entry's question; elsewhere the previous
    // question is drawn in place. Nothing is erased on the way.
    backPressed: () => {
      const move = history?.back(interview.asked, interview.editing);
      if (move?.kind === "in-place") apply({ kind: "back", field: move.field });
    },
  });
  // The record keeps only the questions this interview can ask, with the
  // answers each takes (s25).
  const kept = loadRecord(store, questions);
  drawing.uncover();
  const first = apply({ kind: "loaded", record: kept, search: location.search });
  const showing = first?.screen.kind === "question" ? first.screen.field : null;
  history = openInterviewHistory(browserHistory, { asked: interview.asked, showing });
  history.onMove((move) => apply({ kind: "browserMoved", ...move }));
}
