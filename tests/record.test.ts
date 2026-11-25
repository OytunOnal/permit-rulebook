import { describe, expect, it } from "vitest";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { deriveQuestions, type Dataset } from "permit-rulebook-data";
import { RECORD_MAX_LENGTH, RECORD_VERSION,
  clearRecord, loadRecord, restore, saveRecord, serialize, LEGACY_STORAGE_KEY, STORAGE_KEY,
  type RecordStore,
} from "../src/lib/record.js";

const dataset = rawDataset as unknown as Dataset;
const known = deriveQuestions(dataset);

/** Checks a record longer than the page ever writes restores as no record at all. */
function expectOverlongRecordIsNone() {
  const answers = { destination: "nl" };
  const raw = JSON.stringify({ version: RECORD_VERSION, answers, history: ["destination"], pad: "x".repeat(RECORD_MAX_LENGTH) });
  expect(restore(raw, known)).toEqual({ answers: {}, history: [] });
}

/** Checks an answer to a field the rules no longer ask is dropped on restore. */
function expectRetiredFieldDropped() {
  const raw = serialize(
    { destination: "nl", legacy_field: "yes" },
    ["destination", "legacy_field"],
  );
  expect(restore(raw, known)).toEqual({ answers: { destination: "nl" }, history: ["destination"] });
}

/** Checks an answer its field no longer offers is dropped on restore. */
function expectRetiredOptionDropped() {
  // s25 replaced the seven-year yes/no with three rungs; a record carrying
  // "yes" must not sit on the ledger as an answer nobody can pick.
  const raw = serialize({ destination: "nl", experience_7y: "yes" }, ["destination", "experience_7y"]);
  expect(restore(raw, known)).toEqual({ answers: { destination: "nl" }, history: ["destination"] });
}

/** Checks the recognition answer that split into two options is dropped, so the question comes back. */
function expectSplitRecognitionAnswerDropped() {
  // `not_yet` covered both "Not assessed yet" and "Assessed and not
  // recognised"; a reader who holds it picks again between the two.
  expect(known.map((q) => q.field)).toContain("recognition_de"); // precondition: the question is still asked
  const raw = serialize({ destination: "de", recognition_de: "not_yet" }, ["destination", "recognition_de"]);
  expect(restore(raw, known)).toEqual({ answers: { destination: "de" }, history: ["destination"] });
}

/** Checks an answer whose field is missing from the order is dropped on restore. */
function expectUnorderedAnswerDropped() {
  const raw = JSON.stringify({ version: RECORD_VERSION, answers: { destination: "nl", citizenship: "TR" }, history: ["destination"] });
  expect(restore(raw, known)).toEqual({ answers: { destination: "nl" }, history: ["destination"] });
}

describe("the record survives leaving the page", () => {
  it("comes back exactly as it went in", () => {
    const answers = { destination: "nl", citizenship: "TR", situation: "offer" };
    const history = ["destination", "citizenship", "situation"];
    expect(restore(serialize(answers, history), known)).toEqual({ answers, history });
  });

  it("a record longer than any the page writes is no record, and is not parsed (#25)", expectOverlongRecordIsNone);

  it("an absent, empty or corrupt record starts a fresh interview rather than crashing", () => {
    for (const raw of [null, "", "{", "null", "[]", '"nope"', "17"])
      expect(restore(raw, known), JSON.stringify(raw)).toEqual({ answers: {}, history: [] });
  });

  it("a record written by an older format is not half-read", () => {
    expect(restore(JSON.stringify({ version: 0, answers: { destination: "nl" }, history: ["destination"] }), known))
      .toEqual({ answers: {}, history: [] });
  });

  it("an answer to a question the rules no longer ask is dropped, not resurrected", expectRetiredFieldDropped);

  it("an answer the field no longer offers is dropped the same way — a retired option is not an answer", expectRetiredOptionDropped);

  it("a saved recognition answer that became two options is dropped, so the question is asked again (#157)", expectSplitRecognitionAnswerDropped);

  it("an answer with no place in the order is dropped too — it could never be shown or edited", expectUnorderedAnswerDropped);

  it("a duplicated field in the order is recorded once", () => {
    const raw = JSON.stringify({ version: RECORD_VERSION, answers: { destination: "nl" }, history: ["destination", "destination"] });
    expect(restore(raw, known).history).toEqual(["destination"]);
  });

  it("the key is versioned, so a future format change cannot half-read this one", () => {
    expect(STORAGE_KEY).toMatch(/\.v\d+$/);
  });
});

/**
 * The one bit the verdict already implies (s22).
 *
 * A reader who comes back with a finished record restores straight to the
 * verdict, and the page has to know that BEFORE it paints — the pre-paint
 * script reads a few bytes, never the engine. So the record says whether the
 * interview was complete when it was written. It is a fact about the answers
 * under the rules they were written against, not a new thing remembered: the
 * same answers replayed give the same screen.
 */
describe("the record says whether it was finished (s22)", () => {
  const answers = { destination: "nl", citizenship: "TR", situation: "offer" };
  const history = ["destination", "citizenship", "situation"];

  it("a finished record says so, and an unfinished one says so too", () => {
    expect(JSON.parse(serialize(answers, history, true)).done).toBe(true);
    expect(JSON.parse(serialize(answers, history, false)).done).toBe(false);
    // Left unsaid, an interview is not finished.
    expect(JSON.parse(serialize(answers, history)).done).toBe(false);
  });

  it("the bit changes nothing about what comes back: the screen is computed from the answers", () => {
    expect(restore(serialize(answers, history, true), known)).toEqual({ answers, history });
    // A record from before the bit existed is read the same way.
    expect(restore(JSON.stringify({ version: RECORD_VERSION, answers, history }), known)).toEqual({ answers, history });
  });

  it("the record holds exactly these four things, and nothing else", () => {
    // Named as a list so that a fifth field is a decision someone makes here,
    // not a key that arrives with a feature (the answers never leave the
    // device, and what the device keeps is part of that promise).
    expect(Object.keys(JSON.parse(serialize(answers, history, true))).sort())
      .toEqual(["answers", "done", "history", "version"]);
  });

  it("is written by the save, and is what the pre-paint script will find", () => {
    const store = fakeStore();
    saveRecord(store, { answers, history, done: true });
    expect(JSON.parse(store.getItem(STORAGE_KEY)!).done).toBe(true);
    saveRecord(store, { answers, history });
    expect(JSON.parse(store.getItem(STORAGE_KEY)!).done).toBe(false);
  });
});

/** A browser's storage, in a bottle. */
function fakeStore(): RecordStore & { readonly size: number } {
  const kept = new Map<string, string>();
  return {
    getItem: (key) => kept.get(key) ?? null,
    setItem: (key, value) => { kept.set(key, value); },
    removeItem: (key) => { kept.delete(key); },
    get size() { return kept.size; },
  };
}

/** A browser that refuses site data: reading it throws, not just returns null. */
const refusingStore: RecordStore = {
  getItem() { throw new DOMException("blocked"); },
  setItem() { throw new DOMException("blocked"); },
  removeItem() { throw new DOMException("blocked"); },
};

/** Checks "Start over" after a save leaves the store empty and nothing to load. */
function expectStartOverLeavesNothing(answers: Record<string, string>, history: string[]) {
  // A shared or borrowed computer must not hand the next person a
  // stranger's salary: the stored record goes with the screen.
  const store = fakeStore();
  saveRecord(store, { answers, history });
  clearRecord(store);
  expect(loadRecord(store, known)).toEqual({ answers: {}, history: [] });
  expect(store.size).toBe(0);
}

describe("the record is kept on the device, and \"Start over\" takes it with it", () => {
  const answers = { destination: "nl", citizenship: "TR", situation: "offer" };
  const history = ["destination", "citizenship", "situation"];

  it("what was answered is there again after the tab closes", () => {
    const store = fakeStore();
    saveRecord(store, { answers, history });
    expect(loadRecord(store, known)).toEqual({ answers, history });
  });

  it("\"Start over\" hands the next person nothing", () => expectStartOverLeavesNothing(answers, history));

  it("an interview with nothing answered leaves no record behind", () => {
    // An empty record still says someone was here.
    const store = fakeStore();
    saveRecord(store, { answers, history });
    saveRecord(store, { answers: {}, history: [] });
    expect(store.size).toBe(0);
  });

  it("a browser that refuses site data does not break the interview", () => {
    expect(() => saveRecord(refusingStore, { answers, history })).not.toThrow();
    expect(() => clearRecord(refusingStore)).not.toThrow();
    expect(loadRecord(refusingStore, known)).toEqual({ answers: {}, history: [] });
  });

  it("no storage at all is the same as an empty one", () => {
    // `localStorage` can throw on the property access itself, so the page may
    // have nothing to hand over.
    expect(() => saveRecord(null, { answers, history })).not.toThrow();
    expect(loadRecord(null, known)).toEqual({ answers: {}, history: [] });
  });
});

/**
 * s6 decision 1 — the key the record lives under carries the product's name,
 * and a record written under the old one is carried across rather than thrown
 * away. The comment said the old key went with the first save; nothing did it,
 * and "Start over" removed only the new key, so the stale record came back
 * (Standards review, 2026-09-07).
 */
describe("the rename does not cost anybody their answers", () => {
  it("reads a record left under the old key, then migrates it on the first save", () => {
    const store = fakeStore();
    const answers = { destination: "de", citizenship: "TR" };
    const history = ["destination", "citizenship"];
    store.setItem(LEGACY_STORAGE_KEY, serialize(answers, history));

    // It is found where it was left.
    expect(loadRecord(store, known)).toEqual({ answers, history });

    // The first save puts it under the new key and takes the old one away.
    saveRecord(store, { answers, history });
    expect(store.getItem(STORAGE_KEY)).toBe(serialize(answers, history));
    expect(store.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(store.size).toBe(1);
  });

  it("Start over clears both keys, so nothing stale comes back", () => {
    const store = fakeStore();
    store.setItem(LEGACY_STORAGE_KEY, serialize({ destination: "nl" }, ["destination"]));
    store.setItem(STORAGE_KEY, serialize({ destination: "de" }, ["destination"]));
    clearRecord(store);
    expect(store.size).toBe(0);
    expect(loadRecord(store, known)).toEqual({ answers: {}, history: [] });
  });
});
