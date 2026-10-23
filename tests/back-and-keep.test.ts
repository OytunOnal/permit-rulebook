import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { deriveQuestions, shortLabelOf, type Dataset, type Profile } from "permit-rulebook-data";
import { backToLine, keepNextLine, keepToResultLine } from "../src/lib/copy/interview.js";
import {
  EMPTY_INTERVIEW, interviewAfter, type Gesture, type HistoryCall, type InterviewState, type InterviewStep,
  type KeptRecord,
} from "../src/lib/interview/index.js";
import { openInterviewHistory, type InterviewHistory } from "../src/lib/interview-history/index.js";
import {
  DESK, fieldOnScreen, recordSeedScript, skipReason, tapOn, waitOutTheBeat, warnNotWalked, withSite,
  type BrowserPage, type PageOnSite,
} from "./browser-walk.js";
import { FakeTab, stepOf } from "./fake-browser-history.js";

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
    history.pushScreen("citizenship");
    expect(history.backTarget({ asked: ["destination"], editing: null })).toBe("destination");
  });

  it("Back on an edit screen past the first held step: the screen the browser holds behind, where its Back goes", () => {
    const tab = freshTab();
    const history = openInterviewHistory(tab, { asked: [], showing: "destination" });
    for (const field of ["citizenship", "situation", "qualification"]) history.pushScreen(field);
    history.replaceScreen("citizenship");
    expect(history.backTarget({ asked: ASKED, editing: "citizenship" })).toBe("situation");
    const shown: (string | null)[] = [];
    history.onMove((move) => shown.push(move.field));
    expect(history.back({ asked: ASKED, editing: "citizenship" })).toEqual({ kind: "browser" });
    expect(shown).toEqual(["situation"]);
  });

  it("Back in place, on an edit screen an outside entrance opened onto: the question asked before it", () => {
    const history = openInterviewHistory(freshTab(), { asked: ASKED, showing: "qualification" });
    history.replaceScreen("citizenship");
    expect(history.backTarget({ asked: ASKED, editing: "citizenship" })).toBe("destination");
    expect(history.back({ asked: ASKED, editing: "citizenship" })).toEqual({ kind: "in-place", field: "destination" });
  });

  /** Two entries in a row can show one question: a ✎ on the result redraws the result's entry as
   * the question the reader had kept from (#216, ruling 1). Back never names the screen it is on. */
  it("Back past entries that show the question on screen: the question before them, and the browser goes there", () => {
    const tab = freshTab();
    const history = openInterviewHistory(tab, { asked: [], showing: "destination" });
    for (const field of ["citizenship", "situation", null]) history.pushScreen(field);
    history.replaceScreen("situation");
    expect(history.backTarget({ asked: ASKED, editing: "situation" })).toBe("citizenship");
    const shown: (string | null)[] = [];
    history.onMove((move) => shown.push(move.field));
    expect(history.back({ asked: ASKED, editing: "situation" })).toEqual({ kind: "browser" });
    expect([shown, stepOf(tab)]).toEqual([["citizenship"], 1]);
  });

  it("Back past entries that show the question on screen, down to the first held step: the question before, in place", () => {
    const tab = freshTab();
    const history = openInterviewHistory(tab, { asked: ASKED, showing: null });
    history.replaceScreen("situation");
    history.pushScreen(null);
    history.replaceScreen("situation");
    expect(history.backTarget({ asked: ASKED, editing: "situation" })).toBe("citizenship");
    expect(history.back({ asked: ASKED, editing: "situation" })).toEqual({ kind: "in-place", field: "citizenship" });
    expect(stepOf(tab)).toBe(4);
  });
});

/** One step's call on the history, as the interview's entry makes it. */
function applyHistoryCall(history: InterviewHistory, call: HistoryCall): void {
  if (call.call === "startOver") history.startOver();
  else if (call.call === "pushScreen") history.pushScreen(call.field);
  else history.replaceScreen(call.field);
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
    for (const call of step.history) applyHistoryCall(this.history, call);
  }

  /** The question the screen's Back is labelled with. */
  backLabel(): string | null {
    return this.history!.backTarget(this.state);
  }

  pressBack(): void {
    const move = this.history!.back(this.state);
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

const skipped = skipReason();
if (skipped) warnNotWalked("WHERE BACK AND KEEP THIS ANSWER GO", skipped);

/** What the verdict is called where a screen is named. */
const RESULT = "the result";

/** The words on the question card's two exits; null where the card has none. */
const EXITS = `JSON.stringify({
  back: document.querySelector("#main #back")?.textContent.trim() ?? null,
  keep: document.querySelector("#main #done")?.textContent.trim() ?? null,
})`;
interface Exits { back: string | null; keep: string | null }
const exitsOf = async (page: BrowserPage): Promise<Exits> => JSON.parse(await page.evaluate(EXITS)) as Exits;

/** The question an exit's words name, by its short label; null where they name none. */
const fieldNamedBy = (line: (label: string) => string, words: string | null): string | null =>
  ds.fields.find((f) => line(shortLabelOf(ds, f.id)) === words)?.id ?? null;
/** Where Keep's words say it goes: a question, or the result. */
const keepNames = (words: string | null): string | null =>
  (words === keepToResultLine ? RESULT : fieldNamedBy(keepNextLine, words));

/** The screen the interview shows: a question's field, or the result. */
async function screenOf(page: BrowserPage): Promise<string> {
  const state = await page.evaluate('document.getElementById("app").dataset.state');
  return state === "results" ? RESULT : fieldOnScreen(page);
}

/** A real click on `selector`, then the beat of the card it draws waited out. */
async function tapAndWait(page: BrowserPage, selector: string): Promise<void> {
  await tapOn(page, selector);
  await waitOutTheBeat(page);
}

/** `/` opened onto a stored record of `answers`, asked in their own order, and the ✎ of `field` tapped. */
async function editingOnRecord({ page, url }: PageOnSite, answers: Profile, field: string): Promise<Exits> {
  await page.goto(url("/404.html"), 300);
  await page.evaluate(recordSeedScript(answers));
  await page.goto(url("/"), 1200);
  await tapAndWait(page, `#decl-list [data-field="${field}"]`);
  return exitsOf(page);
}

describe.skipIf(skipped !== null)("Back and Keep this answer go where their labels say, at 1280", () => {
  it("on an edit screen, Back lands on the question its label names, and Keep on the next question its label names", async () => {
    const seen = await withSite(async (site) => {
      const { page } = site;
      const editing = await editingOnRecord(site, { destination: "de", citizenship: "IN", situation: "offer" }, "situation");
      await tapAndWait(page, "#main #back");
      const backedOnto = { screen: await screenOf(page), exits: await exitsOf(page) };
      await tapAndWait(page, "#main #done");
      return { editing, backedOnto, kept: await screenOf(page), problems: page.problems() };
    }, DESK);
    expect(seen.problems).toEqual([]);
    expect(seen.editing.keep, "the ✎ did not open an edit screen").not.toBeNull();
    // Back in place from the situation: the question asked before it.
    expect([fieldNamedBy(backToLine, seen.editing.back), seen.backedOnto.screen]).toEqual(["citizenship", "citizenship"]);
    // Keep from there: the first question the record leaves unanswered.
    expect([keepNames(seen.backedOnto.exits.keep), seen.kept]).toEqual(["qualification", "qualification"]);
  }, 180_000);

  it("on an edit screen with nothing left to ask, Keep's label names the result, and Keep shows it", async () => {
    const seen = await withSite(async (site) => {
      const editing = await editingOnRecord(site, { destination: "de", citizenship: "PL" }, "citizenship");
      await tapAndWait(site.page, "#main #done");
      return { editing, kept: await screenOf(site.page), problems: site.page.problems() };
    }, DESK);
    expect(seen.problems).toEqual([]);
    expect([keepNames(seen.editing.keep), seen.kept]).toEqual([RESULT, RESULT]);
  }, 180_000);

  /** The Spec axis's repro (#216, ruling 1): Keep to the result, then the same row's ✎ again. */
  it("✎, Keep to the result, ✎ on the same row: Back names the question before, and lands there", async () => {
    const seen = await withSite(async (site) => {
      const { page } = site;
      await editingOnRecord(site, { destination: "de", citizenship: "PL" }, "citizenship");
      await tapAndWait(page, "#main #done");
      const kept = await screenOf(page);
      await tapAndWait(page, '#decl-list [data-field="citizenship"]');
      const again = { screen: await screenOf(page), exits: await exitsOf(page) };
      await tapAndWait(page, "#main #back");
      return { kept, again, backedOnto: await screenOf(page), problems: page.problems() };
    }, DESK);
    expect(seen.problems).toEqual([]);
    expect([seen.kept, seen.again.screen], "precondition: Keep showed the result, and the ✎ reopened the row")
      .toEqual([RESULT, "citizenship"]);
    expect([fieldNamedBy(backToLine, seen.again.exits.back), seen.backedOnto]).toEqual(["destination", "destination"]);
  }, 180_000);
});
