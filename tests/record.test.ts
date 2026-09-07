import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import {
  clearRecord, loadRecord, restore, saveRecord, serialize, LEGACY_STORAGE_KEY, STORAGE_KEY,
  type RecordStore,
} from "../src/lib/record.js";

const dataset = rawDataset as unknown as Dataset;
const known = dataset.fields.map((f) => f.id);

describe("the record survives leaving the page (F2, F10)", () => {
  it("comes back exactly as it went in", () => {
    const answers = { destination: "nl", citizenship: "TR", situation: "offer" };
    const history = ["destination", "citizenship", "situation"];
    expect(restore(serialize(answers, history), known)).toEqual({ answers, history });
  });

  it("an absent, empty or corrupt record starts a fresh interview rather than crashing", () => {
    for (const raw of [null, "", "{", "null", "[]", '"nope"', "17"])
      expect(restore(raw, known), JSON.stringify(raw)).toEqual({ answers: {}, history: [] });
  });

  it("a record written by an older format is not half-read", () => {
    expect(restore(JSON.stringify({ version: 0, answers: { destination: "nl" }, history: ["destination"] }), known))
      .toEqual({ answers: {}, history: [] });
  });

  it("an answer to a question the rules no longer ask is dropped, not resurrected", () => {
    const raw = serialize(
      { destination: "nl", legacy_field: "yes" },
      ["destination", "legacy_field"],
    );
    expect(restore(raw, known)).toEqual({ answers: { destination: "nl" }, history: ["destination"] });
  });

  it("an answer with no place in the order is dropped too — it could never be shown or edited", () => {
    const raw = JSON.stringify({ version: 1, answers: { destination: "nl", citizenship: "TR" }, history: ["destination"] });
    expect(restore(raw, known)).toEqual({ answers: { destination: "nl" }, history: ["destination"] });
  });

  it("a duplicated field in the order is recorded once", () => {
    const raw = JSON.stringify({ version: 1, answers: { destination: "nl" }, history: ["destination", "destination"] });
    expect(restore(raw, known).history).toEqual(["destination"]);
  });

  it("the key is versioned, so a future format change cannot half-read this one", () => {
    expect(STORAGE_KEY).toMatch(/\.v\d+$/);
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

describe("the record is kept on the device, and \"Start over\" takes it with it", () => {
  const answers = { destination: "nl", citizenship: "TR", situation: "offer" };
  const history = ["destination", "citizenship", "situation"];

  it("what was answered is there again after the tab closes", () => {
    const store = fakeStore();
    saveRecord(store, answers, history);
    expect(loadRecord(store, known)).toEqual({ answers, history });
  });

  it("\"Start over\" hands the next person nothing", () => {
    // A shared or borrowed computer must not hand the next person a
    // stranger's salary: the stored record goes with the screen.
    const store = fakeStore();
    saveRecord(store, answers, history);
    clearRecord(store);
    expect(loadRecord(store, known)).toEqual({ answers: {}, history: [] });
    expect(store.size).toBe(0);
  });

  it("an interview with nothing answered leaves no record behind", () => {
    // An empty record still says someone was here.
    const store = fakeStore();
    saveRecord(store, answers, history);
    saveRecord(store, {}, []);
    expect(store.size).toBe(0);
  });

  it("a browser that refuses site data does not break the interview", () => {
    expect(() => saveRecord(refusingStore, answers, history)).not.toThrow();
    expect(() => clearRecord(refusingStore)).not.toThrow();
    expect(loadRecord(refusingStore, known)).toEqual({ answers: {}, history: [] });
  });

  it("no storage at all is the same as an empty one", () => {
    // `localStorage` can throw on the property access itself, so the page may
    // have nothing to hand over.
    expect(() => saveRecord(null, answers, history)).not.toThrow();
    expect(loadRecord(null, known)).toEqual({ answers: {}, history: [] });
  });
});

describe("the record never leaves the device", () => {
  const source = readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8");

  it("the page makes no network call carrying an answer", () => {
    // The privacy promise is on the first screen. Nothing here transmits: no
    // fetch, no XHR, no beacon, no form post, no socket. These read the
    // source, and stay source-level deliberately: they are absences, so
    // writing anything at all — a rename, a comment — can only make them
    // fire, never silence them. The positive half of this promise (the
    // answers ARE stored, and "Start over" clears them) is a behaviour, and
    // is tested as one above rather than by grepping for a word (review S4).
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/XMLHttpRequest/);
    expect(source).not.toMatch(/sendBeacon/);
    expect(source).not.toMatch(/<form\b/);
    expect(source).not.toMatch(/new WebSocket/);
    expect(source).not.toMatch(/location\.hash\s*=/); // sharing by link is out of scope, deliberately
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
    saveRecord(store, answers, history);
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
