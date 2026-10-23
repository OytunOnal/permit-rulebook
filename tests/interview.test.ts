import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import {
  EMPTY_INTERVIEW, interviewAfter, type Gesture, type InterviewState, type InterviewStep, type KeptRecord,
} from "../src/lib/interview/index.js";

const ds = dataset as unknown as Dataset;

/** The interview's first question, the same for every reader with nothing on the record. */
const FIRST_FIELD = "destination";
const NO_RECORD: KeptRecord = { answers: {}, history: [] };
const NO_LINES = { arrival: null, resumed: null, setAside: [], justRecorded: null };
/** Germany, an offer, an Indian passport: the next question is the qualification. */
const GERMAN_THREE: KeptRecord = {
  answers: { destination: "de", situation: "offer", citizenship: "IN" }, history: ["destination", "situation", "citizenship"],
};
/** The same reader with a degree Germany has recognised: an answer only Germany asks for. */
const GERMAN_FIVE: KeptRecord = {
  answers: { ...GERMAN_THREE.answers, qualification: "degree", recognition_de: "recognized" },
  history: [...GERMAN_THREE.history, "qualification", "recognition_de"],
};
/** A passport free movement covers: nothing is left to ask, and the verdict is the screen. */
const EU_PASSPORT: KeptRecord = { answers: { destination: "de", citizenship: "PL" }, history: ["destination", "citizenship"] };

/** The step a gesture leads to, where it leads to one. */
function after(state: InterviewState, gesture: Gesture): InterviewStep {
  const step = interviewAfter(ds, state, gesture);
  if (step === null) throw new Error(`precondition: ${gesture.kind} leads to a step`);
  return step;
}

/** The page opened onto `record` at an address whose search is `search`. */
const loaded = (record: KeptRecord, search: string): InterviewStep =>
  after(EMPTY_INTERVIEW, { kind: "loaded", record, search });

describe("interviewAfter: loaded", () => {
  it("loaded onto no record: question one, no line, the first paint's landing, no beat, no save, no history move", () => {
    const step = loaded(NO_RECORD, "");
    expect(step.screen).toEqual({ kind: "question", field: FIRST_FIELD, started: false });
    expect(step.lines).toEqual(NO_LINES);
    expect([step.land, step.beat, step.save, step.history]).toEqual(["first-paint", false, null, []]);
  });

  it("loaded onto a kept record: the question it resumes on, with the resumed line counting the answers kept", () => {
    const step = loaded(GERMAN_THREE, "");
    expect(step.screen).toEqual({ kind: "question", field: "qualification", started: true });
    expect(step.lines).toEqual({ arrival: null, resumed: 3, setAside: [], justRecorded: null });
    expect(step.state.asked).toEqual(GERMAN_THREE.history);
    expect([step.land, step.beat, step.save, step.history]).toEqual(["first-paint", false, null, []]);
  });

  it("loaded onto a kept record with an arrival: the arrival line alone, and the moved record saved once", () => {
    const step = loaded(GERMAN_THREE, "?country=nl");
    expect(step.lines.arrival?.country).toBe("NL");
    expect(step.lines.resumed, "one line about the return, not two").toBeNull();
    expect(step.save).toEqual({
      answers: { destination: "nl", situation: "offer", citizenship: "IN" }, history: GERMAN_THREE.history, done: false,
    });
    expect(step.screen).toMatchObject({ kind: "question", started: true });
  });

  it("loaded with an arrival that changes nothing: no line, the resumed line, nothing saved", () => {
    const step = loaded(GERMAN_THREE, "?country=de");
    expect(step.lines.arrival).toBeNull();
    expect(step.lines.resumed).toBe(3);
    expect(step.save).toBeNull();
  });

  it("loaded from a route's address: that route sorts first in every verdict after", () => {
    expect(loaded(NO_RECORD, "?route=de-blue-card-general").state.scopedRouteId).toBe("de-blue-card-general");
    expect(loaded(NO_RECORD, "").state.scopedRouteId).toBeNull();
  });

  it("loaded onto a finished record: the verdict, with the resumed line counting the answers kept, and no history move", () => {
    const step = loaded(EU_PASSPORT, "");
    expect(step.screen).toEqual({ kind: "verdict" });
    expect(step.lines).toEqual({ arrival: null, resumed: 2, setAside: [], justRecorded: null });
    expect([step.land, step.beat, step.save, step.history]).toEqual(["first-paint", false, null, []]);
  });

  it("loaded onto a finished record with an arrival that moved it: the verdict with the arrival line alone", () => {
    const step = loaded(EU_PASSPORT, "?country=nl");
    expect(step.screen).toEqual({ kind: "verdict" });
    expect(step.lines.arrival?.country).toBe("NL");
    expect(step.lines.resumed, "one line about the return, not two").toBeNull();
  });

  it("loaded onto a record the rules have moved past: what they no longer ask is dropped, and not named", () => {
    const step = loaded({ answers: { ...GERMAN_THREE.answers, nl_recent_grad: "yes" }, history: [...GERMAN_THREE.history, "nl_recent_grad"] }, "");
    expect(step.state.asked).toEqual(GERMAN_THREE.history);
    expect(step.lines.setAside).toEqual([]);
  });
});

describe("interviewAfter: answered", () => {
  it("answered: the next question under the header, the beat, the record saved, a new history entry", () => {
    const step = after(loaded(GERMAN_THREE, "").state, { kind: "answered", value: "degree" });
    expect(step.screen).toEqual({ kind: "question", field: "recognition_de", started: true });
    expect(step.lines).toEqual(NO_LINES);
    expect([step.land, step.beat]).toEqual(["card-under-header", true]);
    expect(step.save).toEqual({
      answers: { ...GERMAN_THREE.answers, qualification: "degree" }, history: [...GERMAN_THREE.history, "qualification"],
      done: false,
    });
    expect(step.history).toEqual([{ call: "movedForward", field: "recognition_de" }]);
  });

  it("answered with the words it recorded: the next question says what was recorded", () => {
    const state = loaded({ answers: { destination: "de", situation: "offer", qualification: "degree" }, history: ["destination", "situation", "qualification"] }, "").state;
    const step = after(state, { kind: "answered", value: "IN", recordedAs: "India" });
    expect(step.lines.justRecorded).toEqual({ field: "citizenship", label: "India" });
    expect(step.state.answers["citizenship"]).toBe("IN");
  });

  it("answered the last question: the verdict, its masthead landed on, no beat, one entry on top", () => {
    const state = loaded({ answers: { destination: "fr" }, history: ["destination"] }, "").state;
    const step = after(state, { kind: "answered", value: "none", recordedAs: "None of these" });
    expect(step.screen).toEqual({ kind: "verdict" });
    expect(step.lines.justRecorded, "the commit banner is the next question's, and the verdict is not one").toBeNull();
    expect([step.land, step.beat]).toEqual(["verdict-masthead", false]);
    expect(step.save).toMatchObject({ done: true });
    expect(step.history).toEqual([{ call: "movedForward", field: null }]);
  });

  it("answered on an edit that sets answers aside: the order kept, the rest replayed, the set-aside named once", () => {
    const editing = after(loaded(GERMAN_FIVE, "").state, { kind: "editedRow", field: "destination" }).state;
    const step = after(editing, { kind: "answered", value: "nl" });
    expect(step.lines.setAside).toEqual(["recognition_de"]);
    expect(step.state).toMatchObject({ asked: ["destination", "situation", "citizenship", "qualification"], editing: null });
    expect(step.screen).toEqual({ kind: "question", field: "age_band", started: true });
    expect(step.save).toMatchObject({ history: ["destination", "situation", "citizenship", "qualification"] });
    expect(step.history).toEqual([{ call: "movedForward", field: "age_band" }]);
  });
});

describe("interviewAfter: editedRow and back", () => {
  it("editedRow: the question reopened in place, the ledger folded and the card landed, the beat, no save", () => {
    const step = after(loaded(GERMAN_THREE, "").state, { kind: "editedRow", field: "situation" });
    expect(step.screen).toEqual({ kind: "question", field: "situation", started: true });
    expect(step.state).toMatchObject({ editing: "situation", answers: GERMAN_THREE.answers, asked: GERMAN_THREE.history });
    expect(step.lines).toEqual(NO_LINES);
    expect([step.land, step.beat, step.save]).toEqual(["card-under-folded-ledger", true, null]);
    expect(step.history).toEqual([{ call: "redrawnInPlace", field: "situation" }]);
  });

  it("editedRow from the verdict: the question it names, never the verdict", () => {
    const step = after(loaded(EU_PASSPORT, "").state, { kind: "editedRow", field: "citizenship" });
    expect(step.screen).toEqual({ kind: "question", field: "citizenship", started: true });
  });

  it("editedRow on a field that is not on the record: nothing happens", () => {
    expect(interviewAfter(ds, loaded(GERMAN_THREE, "").state, { kind: "editedRow", field: "german" })).toBeNull();
  });

  it("back in place: the question the history named, reopened as an edit is", () => {
    const step = after(loaded(GERMAN_THREE, "").state, { kind: "back", field: "citizenship" });
    expect(step.screen).toEqual({ kind: "question", field: "citizenship", started: true });
    expect(step.state.editing).toBe("citizenship");
    expect([step.land, step.beat, step.save]).toEqual(["card-under-folded-ledger", true, null]);
    expect(step.history).toEqual([{ call: "redrawnInPlace", field: "citizenship" }]);
  });
});

describe("interviewAfter: kept", () => {
  it("kept: the first unanswered question, landed as an answer is, a new history entry, nothing saved", () => {
    const editing = after(loaded(GERMAN_THREE, "").state, { kind: "editedRow", field: "situation" }).state;
    const step = after(editing, { kind: "kept" });
    expect(step.screen).toEqual({ kind: "question", field: "qualification", started: true });
    expect(step.state.editing).toBeNull();
    expect([step.land, step.beat, step.save]).toEqual(["card-under-header", true, null]);
    expect(step.history).toEqual([{ call: "movedForward", field: "qualification" }]);
  });

  it("kept on an edit of a finished record: the verdict, one entry on top", () => {
    const editing = after(loaded(EU_PASSPORT, "").state, { kind: "editedRow", field: "citizenship" }).state;
    const step = after(editing, { kind: "kept" });
    expect(step.screen).toEqual({ kind: "verdict" });
    expect([step.land, step.beat]).toEqual(["verdict-masthead", false]);
    expect(step.history).toEqual([{ call: "movedForward", field: null }]);
  });
});

/** Where "Keep this answer" goes, said on its label (#56, ruling 6). */
describe("interviewAfter: Keep this answer's target", () => {
  it("Keep on an edit with questions left: the first question still asked, where kept lands", () => {
    const editing = after(loaded(GERMAN_THREE, "").state, { kind: "editedRow", field: "situation" });
    expect(editing.keepLandsOn).toEqual({ kind: "question", field: "qualification" });
    expect(after(editing.state, { kind: "kept" }).screen).toMatchObject({ field: "qualification" });
  });

  it("Keep on an edit with nothing left to ask: the verdict, where kept lands", () => {
    const editing = after(loaded(EU_PASSPORT, "").state, { kind: "editedRow", field: "citizenship" });
    expect(editing.keepLandsOn).toEqual({ kind: "verdict" });
    expect(after(editing.state, { kind: "kept" }).screen).toEqual({ kind: "verdict" });
  });

  it("a question that is not an edit, and the verdict, have no Keep", () => {
    expect(loaded(GERMAN_THREE, "").keepLandsOn).toBeNull();
    expect(loaded(EU_PASSPORT, "").keepLandsOn).toBeNull();
  });
});

describe("interviewAfter: restarted", () => {
  it("restarted on /: an empty record, question one, no line, the record cleared, the entries gone", () => {
    const step = after(loaded(GERMAN_THREE, "").state, { kind: "restarted", search: "" });
    expect(step.screen).toEqual({ kind: "question", field: FIRST_FIELD, started: false });
    expect(step.state).toEqual(EMPTY_INTERVIEW);
    expect(step.lines).toEqual(NO_LINES);
    expect(step.save).toBe("clear");
    expect(step.history).toEqual([{ call: "restarted" }, { call: "redrawnInPlace", field: FIRST_FIELD }]);
  });

  it("restarted lands at the page's top, with no beat", () => {
    for (const search of ["", "?country=de"]) {
      const step = after(loaded(GERMAN_FIVE, search).state, { kind: "restarted", search });
      expect([step.land, step.beat], search).toEqual(["page-top", false]);
    }
  });

  it("restarted on ?country=de: Germany back on the record, the arrival line, the question after the destination", () => {
    const step = after(loaded(GERMAN_FIVE, "?country=de").state, { kind: "restarted", search: "?country=de" });
    expect(step.state).toEqual({ answers: { destination: "de" }, asked: ["destination"], editing: null, scopedRouteId: null });
    expect(step.screen).toEqual({ kind: "question", field: "situation", started: true });
    expect(step.lines.arrival?.country).toBe("DE");
    expect(step.lines.resumed).toBeNull();
    // A shared device keeps nothing of a reader after Start over (#216, ruling 2): the arrival's
    // record lives on screen, and the next answer saves it as every answer does.
    expect(step.save).toBe("clear");
    expect(after(step.state, { kind: "answered", value: "offer" }).save)
      .toEqual({ answers: { destination: "de", situation: "offer" }, history: ["destination", "situation"], done: false });
    expect(step.history).toEqual([{ call: "restarted" }, { call: "redrawnInPlace", field: "situation" }]);
  });

  it("restarted on a route's address: that route sorts first again, its country on the record with the arrival line", () => {
    const step = after(EMPTY_INTERVIEW, { kind: "restarted", search: "?route=de-blue-card-general" });
    expect(step.state.scopedRouteId).toBe("de-blue-card-general");
    expect(step.state.answers).toEqual({ destination: "de" });
    expect(step.lines.arrival?.route?.id).toBe("de-blue-card-general");
    expect(step.save).toBe("clear");
  });
});

describe("interviewAfter: the resumed line marks the return only", () => {
  it("no gesture after the first screen gives the resumed line, on a question or the verdict", () => {
    for (const record of [GERMAN_THREE, EU_PASSPORT]) {
      const first = loaded(record, "");
      expect(first.lines.resumed, "precondition: the first screen resumes").toBe(record.history.length);
      const gestures: Gesture[] = [
        { kind: "answered", value: "degree" }, { kind: "editedRow", field: "citizenship" },
        { kind: "back", field: "destination" }, { kind: "kept" }, { kind: "restarted", search: "" },
        { kind: "browserMoved", field: null, ontoFirstScreen: false },
        { kind: "browserMoved", field: "destination", ontoFirstScreen: true },
      ];
      for (const gesture of gestures) {
        const step = interviewAfter(ds, first.state, gesture);
        expect(step?.lines.resumed ?? null, `${gesture.kind} after a return`).toBeNull();
      }
    }
  });
});

describe("interviewAfter: browserMoved", () => {
  it("browserMoved onto a later question: it shows in place, the card landed after the browser's restore, no history move", () => {
    const step = after(loaded(GERMAN_THREE, "").state, { kind: "browserMoved", field: "situation", ontoFirstScreen: false });
    expect(step.screen).toEqual({ kind: "question", field: "situation", started: true });
    expect(step.state).toMatchObject({ editing: "situation", answers: GERMAN_THREE.answers });
    expect([step.land, step.beat, step.save, step.history]).toEqual(["card-under-header-after-restore", true, null, []]);
  });

  it("browserMoved onto the first screen: the browser's scroll kept, the beat still run", () => {
    const step = after(loaded(GERMAN_THREE, "").state, { kind: "browserMoved", field: FIRST_FIELD, ontoFirstScreen: true });
    expect(step.screen).toMatchObject({ kind: "question", field: FIRST_FIELD });
    expect([step.land, step.beat, step.history]).toEqual(["browser-scroll", true, []]);
  });

  it("browserMoved to the verdict: the verdict even with questions left, the browser's scroll, no beat", () => {
    const step = after(loaded(GERMAN_THREE, "").state, { kind: "browserMoved", field: null, ontoFirstScreen: false });
    expect(step.screen).toEqual({ kind: "verdict" });
    expect(step.state.editing).toBeNull();
    expect([step.land, step.beat, step.save, step.history]).toEqual(["browser-scroll", false, null, []]);
  });
});
