import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import rawDataset from "visa-rules/data/dataset.json";
import type { Dataset } from "visa-rules";
import { restore, serialize, STORAGE_KEY } from "../src/lib/record.js";

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

describe("the record never leaves the device", () => {
  const source = readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8");

  it("the page makes no network call carrying an answer", () => {
    // The privacy promise is on the first screen. Nothing here transmits: no
    // fetch, no XHR, no beacon, no form post, no image ping.
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/XMLHttpRequest/);
    expect(source).not.toMatch(/sendBeacon/);
    expect(source).not.toMatch(/<form\b/);
    expect(source).not.toMatch(/new WebSocket/);
  });

  it("the answers are stored on the device and nowhere else", () => {
    expect(source).toMatch(/localStorage/);
    expect(source).not.toMatch(/location\.hash\s*=/); // sharing by link is out of scope, deliberately
  });

  it("\"Start over\" clears the stored answers, not only the screen", () => {
    // A shared or borrowed computer must not hand the next person a
    // stranger's salary.
    expect(source).toMatch(/removeItem/);
  });
});
