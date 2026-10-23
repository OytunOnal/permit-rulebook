import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { deriveQuestions, type Dataset } from "permit-rulebook-data";
import {
  EMPTY_INTERVIEW, interviewAfter, type Gesture, type HistoryCall, type InterviewState, type InterviewStep,
  type KeptRecord,
} from "../src/lib/interview/index.js";
import { openInterviewHistory, type InterviewHistory } from "../src/lib/interview-history/index.js";
import { FakeTab } from "./fake-browser-history.js";

/**
 * P7 (#56, ruling 6): every exit of the question card says where it goes.
 * "← Back" names the question the history says it goes to, so its label and
 * its move cannot disagree; "Keep this answer" names the question it lands
 * on, or the result (its target is `interviewAfter`'s, in `interview.test.ts`).
 */
const ds = dataset as unknown as Dataset;

/** A tab that has just opened `/` from outside. */
function freshTab(): FakeTab {
  const tab = new FakeTab();
  tab.open("/");
  return tab;
}

/** Three stored answers, which open on the qualification. */
const ASKED = ["destination", "citizenship", "situation"];

describe("Back's target, through the interview's history", () => {
  it("Back on a plain question: the question answered before it", () => {
    const history = openInterviewHistory(freshTab(), { asked: [], showing: "destination" });
    history.movedForward("citizenship");
    expect(history.backTarget(["destination"], null)).toBe("destination");
  });

  it("Back on an edit screen past the first held step: the screen the browser holds behind, where its Back goes", () => {
    const tab = freshTab();
    const history = openInterviewHistory(tab, { asked: [], showing: "destination" });
    for (const field of ["citizenship", "situation", "qualification"]) history.movedForward(field);
    history.redrawnInPlace("citizenship");
    expect(history.backTarget(ASKED, "citizenship")).toBe("situation");
    const shown: (string | null)[] = [];
    history.onMove((move) => shown.push(move.field));
    expect(history.back(ASKED, "citizenship")).toEqual({ kind: "browser" });
    expect(shown).toEqual(["situation"]);
  });

  it("Back in place, on an edit screen an outside entrance opened onto: the question asked before it", () => {
    const history = openInterviewHistory(freshTab(), { asked: ASKED, showing: "qualification" });
    history.redrawnInPlace("citizenship");
    expect(history.backTarget(ASKED, "citizenship")).toBe("destination");
    expect(history.back(ASKED, "citizenship")).toEqual({ kind: "in-place", field: "destination" });
  });
});

/** One step's call on the history, as the interview's entry makes it. */
function tell(history: InterviewHistory, call: HistoryCall): void {
  if (call.call === "restarted") history.restarted();
  else if (call.call === "movedForward") history.movedForward(call.field);
  else history.redrawnInPlace(call.field);
}

/** The first option of the question asked about `field`. */
const firstOptionOf = (field: string): string => deriveQuestions(ds).find((q) => q.field === field)!.options[0]!.value;

/**
 * The interview in a tab, wired as its entry wires it: each gesture's step
 * decided by `interviewAfter`, its history calls told, and the screen's Back
 * asking the history first.
 */
class WiredInterview {
  readonly tab = freshTab();
  state: InterviewState = EMPTY_INTERVIEW;
  /** The question on screen; null on the verdict. */
  showing: string | null = null;
  private history: InterviewHistory | null = null;

  constructor(record: KeptRecord) {
    this.apply({ kind: "loaded", record, search: "" });
  }

  apply(gesture: Gesture): void {
    const step = interviewAfter(ds, this.state, gesture);
    if (!step) return;
    this.state = step.state;
    this.showing = step.screen.kind === "question" ? step.screen.field : null;
    this.history ??= this.openedOn(step);
    for (const call of step.history) tell(this.history, call);
  }

  /** The question the screen's Back is labelled with. */
  backLabel(): string | null {
    return this.history!.backTarget(this.state.asked, this.state.editing);
  }

  pressBack(): void {
    const move = this.history!.back(this.state.asked, this.state.editing);
    if (move.kind === "in-place") this.apply({ kind: "back", field: move.field });
  }

  private openedOn(first: InterviewStep): InterviewHistory {
    const history = openInterviewHistory(this.tab, { asked: first.state.asked, showing: this.showing });
    history.onMove((move) => this.apply({ kind: "browserMoved", ...move }));
    return history;
  }
}

/** A reader's gesture on the interview as it stands. */
type Move = (walk: WiredInterview) => void;
const ANSWER: Move = (w) => { if (w.showing) w.apply({ kind: "answered", value: firstOptionOf(w.showing) }); };
const EDIT_FIRST: Move = (w) => w.apply({ kind: "editedRow", field: w.state.asked[0]! });
const EDIT_SECOND: Move = (w) => w.apply({ kind: "editedRow", field: w.state.asked[1]! });
const BACK: Move = (w) => w.pressBack();
const KEEP: Move = (w) => { if (w.state.editing) w.apply({ kind: "kept" }); };
const BROWSER_BACK: Move = (w) => w.tab.back();
const BROWSER_FORWARD: Move = (w) => w.tab.forward();

/** Answers, edits, both Backs, Keep and Forward, in an order that crosses the first held step both ways. */
const WALK: Move[] = [
  ANSWER, ANSWER, ANSWER, ANSWER, EDIT_SECOND, BACK, KEEP, ANSWER, BROWSER_BACK, BACK, BACK, BROWSER_FORWARD,
  EDIT_FIRST, BACK, KEEP, ANSWER, BROWSER_BACK, BROWSER_BACK, ANSWER, ANSWER, ANSWER,
];

/** On every question screen of `walk` from `record`: the question Back is labelled with, and where pressing it lands. */
function backsAlong(record: KeptRecord): { label: string | null; landed: string | null; before: string }[] {
  const seen: { label: string | null; landed: string | null; before: string }[] = [];
  for (let at = 0; at <= WALK.length; at++) {
    const walk = new WiredInterview(record);
    for (const move of WALK.slice(0, at)) move(walk);
    if (walk.showing === null) continue;
    const before = walk.showing;
    const label = walk.backLabel();
    walk.pressBack();
    seen.push({ label, landed: walk.showing, before });
  }
  return seen;
}

describe("the field Back's label names is the field Back goes to", () => {
  it.each([
    ["a walk from the first question", { answers: {}, history: [] }],
    ["a walk from an outside entrance onto three answers", {
      answers: { destination: "de", citizenship: "IN", situation: "offer" }, history: ASKED,
    }],
  ] as [string, KeptRecord][])("over every step of %s", (_, record) => {
    const seen = backsAlong(record);
    expect(seen.filter((s) => s.label !== null).length, "the walk offered no Back to check").toBeGreaterThan(5);
    seen.forEach((s, i) => {
      expect(s.landed, `screen ${i + 1}: Back labelled ${String(s.label)} from ${s.before}`).toBe(s.label ?? s.before);
    });
  });
});
