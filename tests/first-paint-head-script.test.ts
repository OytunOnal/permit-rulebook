import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { COVERS, FIRST_PAINT_SCRIPT, takeCoversOff } from "../src/lib/first-paint.js";
import { RECORD_MAX_LENGTH, serialize } from "../src/lib/record.js";

/**
 * The first paint: the page as the build wrote it must already be the reader's
 * page, so who the reader is — fresh, returning, arriving by a link, owed a
 * verdict — is decided in <head> before anything is painted (s10, s22).
 */
// The dataset the page is built from, whose names the head script must never carry.
const DATASET = rawDataset as unknown as Dataset;

interface Reader { search?: string; stored?: string | null; throws?: boolean; narrow?: boolean }
/** What the head script writes on `<html>` for this reader. */
const written = (o: Reader): Record<string, string> => {
  const dataset: Record<string, string> = {};
  runInNewContext(FIRST_PAINT_SCRIPT, {
    document: { documentElement: { dataset } },
    location: { search: o.search ?? "" },
    localStorage: {
      getItem: () => { if (o.throws) throw new Error("blocked"); return o.stored ?? null; },
    },
    matchMedia: () => ({ matches: !o.narrow }),
  });
  return dataset;
};
const halfDone = serialize({ destination: "fr" }, ["destination"]);
const finished = serialize({ destination: "fr" }, ["destination"], true);

/** Every reader the head script tells apart, at both sides of the threshold. */
const READERS: Record<string, Reader> = Object.fromEntries([
  ["fresh", { stored: null }],
  ["a record part-way", { stored: halfDone }],
  ["a finished record", { stored: finished }],
  ["a record from before the bit", { stored: JSON.stringify({ version: 1, answers: {}, history: [] }) }],
  ["a record that is not JSON", { stored: "{" }],
  ["a country link", { search: "?country=fr" }],
  ["a route link", { search: "?route=de-blue-card-general" }],
  ["an unknown link", { search: "?country=zz" }],
  ["a link and a record", { search: "?country=fr", stored: halfDone }],
  ["a link and a finished record", { search: "?route=x", stored: finished }],
  ["a blocked store", { throws: true }],
  ["a blocked store and a link", { search: "?country=fr", throws: true }],
].flatMap(([name, r]) => [[`${name}, wide`, r], [`${name}, narrow`, { ...(r as Reader), narrow: true }]]));

/** Checks every cover written is a declared one, and taking covers off removes it and nothing else. */
function expectEveryCoverDeclaredAndTakenOffAlone(): void {
  // The set is the contract the stylesheet's cover rules are rendered from,
  // so a cover outside it is one no rule hides and no step takes off; a
  // cover left standing drew a card with every child invisible (s20).
  for (const [name, reader] of Object.entries(READERS)) {
    const dataset = written(reader);
    const cover = dataset.cover;
    if (cover !== undefined) {
      expect(Object.keys(COVERS), `${name}: wrote the cover ${JSON.stringify(cover)}`).toContain(cover);
      expect(Object.keys(COVERS[cover as keyof typeof COVERS].hides).length, `${name}: ${cover} hides nothing`)
        .toBeGreaterThan(0);
    }
    // The page then writes its own state: the promise it settles on, which
    // here is the other one than the seed, so a step that rewrote it shows.
    dataset.promise = dataset.promise === "fresh" ? "started" : "fresh";
    const asThePageWroteThem = { ...dataset };
    takeCoversOff({ dataset });
    for (const member of Object.keys(COVERS))
      expect(Object.values(dataset), `${name}: ${member} still stands`).not.toContain(member);
    delete asThePageWroteThem.cover;
    expect(dataset, `${name}: covers off touched more than the cover`).toEqual(asThePageWroteThem);
  }
}

/** Checks only the product's own key, under the product's own name, marks a record finished. */
function expectOnlyTheOneKeyMarksFinished(): void {
  // The bit is the product's own word, in the product's own place: a truthy
  // value under the same name, or the word under another name, is not it.
  expect(written({ stored: JSON.stringify({ version: 1, answers: {}, history: [], done: "yes" }) }).cover).toBe("record");
  expect(written({ stored: JSON.stringify({ version: 1, answers: {}, history: [], finished: true }) }).cover).toBe("record");
}

/** Checks a record, finished or not, decides the cover over a link. */
function expectARecordWinsOverALink(): void {
  expect(written({ search: "?country=fr", stored: null }).cover).toBe("link");
  expect(written({ search: "?country=fr", stored: halfDone }).cover).toBe("record");
  expect(written({ search: "?route=fr-talent-blue-card", stored: finished }).cover).toBe("verdict");
}

/** Checks a store that throws reads as no record, so only a link covers. */
function expectABlockedStoreIsNoRecord(): void {
  expect(written({ throws: true }).cover).toBeUndefined();
  expect(written({ search: "?country=fr", throws: true }).cover).toBe("link");
}

/** Checks the head writes the answered seed for a record or a link, and not for a fresh visit or a verdict. */
function expectAnsweredSeedForRecordsAndLinks(): void {
  // A record and a link both bring an answer; a fresh visit brings none. A
  // verdict's ledger is the module's to place, not the head's: on a phone it
  // stands above the result once answers exist (s30 amendment 7), but s22's
  // cover hides #app until the module draws, so the head has nothing to
  // decide there. The head cannot know whether a link's code is one the
  // page knows, so the seed is written for every link and the module keeps
  // its word for the first screen.
  expect(written({ stored: halfDone }).answered).toBe("");
  expect(written({ search: "?country=fr", stored: null }).answered).toBe("");
  expect(written({ search: "?country=zz", stored: null }).answered).toBe("");
  expect(written({ stored: null }).answered).toBeUndefined();
  expect(written({ stored: finished }).answered).toBeUndefined();
}

/** Checks the head script names no country code and no route id from the dataset. */
function expectNoDatasetNameInTheScript(): void {
  // It is inlined into the page, where nothing checks a name against the
  // dataset: the only words it knows are the four readers and the key.
  for (const c of DATASET.countries)
    expect(FIRST_PAINT_SCRIPT, c.code).not.toMatch(new RegExp(`\\b${c.code}\\b`, "i"));
  for (const c of DATASET.countries)
    for (const r of c.routes) expect(FIRST_PAINT_SCRIPT, r.id).not.toContain(r.id);
}

/**
 * The pre-paint script, run against a page in a bottle.
 *
 * It is a string that runs in <head>, so the browser gate
 * (`first-paint-arrivals.test.ts`) is what proves it; this is the same script
 * read for its one decision at a time, with the three things it looks at held
 * still — the link, the store and the width — because the gate can only seed
 * what the product writes and the script has to be right about what the
 * product never writes too (s22).
 */
describe("the pre-paint script decides who the reader is from a few bytes (s10, s22)", () => {
  it("every cover it writes is a declared one, and covers off takes it off and nothing else (#67)", () => {
    expectEveryCoverDeclaredAndTakenOffAlone();
  });

  it("a fresh visit is nobody in particular", () => {
    expect(written({ stored: null }).cover).toBeUndefined();
  });

  it("a record is a returning reader; a finished one is a reader owed a verdict", () => {
    expect(written({ stored: halfDone }).cover).toBe("record");
    expect(written({ stored: finished }).cover).toBe("verdict");
  });

  it("a record from before the bit existed is a returning reader, not a verdict", () => {
    expect(written({ stored: JSON.stringify({ version: 1, answers: { destination: "fr" }, history: ["destination"] }) }).cover)
      .toBe("record");
  });

  it("reads one key, and nothing else in the record can stand in for it", () => expectOnlyTheOneKeyMarksFinished());

  it("a record longer than any the page writes is no record: the head does not parse it (#25)", () => {
    const stored = JSON.stringify({ version: 1, answers: {}, history: [], done: true, pad: "x".repeat(RECORD_MAX_LENGTH) });
    expect(written({ stored }).cover).toBeUndefined();
  });

  it("a record that is not JSON is still a record, never a crashed head", () => {
    expect(written({ stored: "{" }).cover).toBe("record");
  });

  it("a record wins over a link, and a finished one still does", () => expectARecordWinsOverALink());

  it("a browser that refuses site data is a reader with no record", () => expectABlockedStoreIsNoRecord());

  it("says whether the reader has answered, so a phone paints the ledger line where it will stay (s30)",
    () => expectAnsweredSeedForRecordsAndLinks());

  it("names nothing from the dataset", () => expectNoDatasetNameInTheScript());
});
