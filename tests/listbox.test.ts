import { describe, expect, it } from "vitest";
import { fieldOptions, matchOptions, type Dataset } from "visa-rules";
import rawDataset from "visa-rules/data/dataset.json";
import {
  activeOption, onKey, shownOptions, stateFor, type ListboxKey, type ListboxState,
} from "../src/lib/listbox.js";

const dataset = rawDataset as unknown as Dataset;
const countries = fieldOptions(dataset, "citizenship");

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** Type a needle, then press these keys. Returns what was committed, if any. */
function drive(query: string, keys: ListboxKey[]) {
  let state: ListboxState = stateFor(query);
  const seen: Array<{ before: ListboxState; key: ListboxKey }> = [];
  for (const key of keys) {
    seen.push({ before: state, key });
    const result = onKey(countries, state, key);
    if (result.commit) return { commit: result.commit, at: state, seen };
    state = result.state;
  }
  return { commit: undefined, at: state, seen };
}

describe("invariant: the committed country equals the highlighted option (B1)", () => {
  it("holds over random typed prefixes and arrow-key sequences", () => {
    const rand = lcg(1861);
    const keys: ListboxKey[] = ["ArrowDown", "ArrowUp", "ArrowDown", "Home", "End", "ArrowUp"];
    for (let i = 0; i < 400; i++) {
      // A needle a person would plausibly type: a prefix of some country name.
      const name = countries[Math.floor(rand() * countries.length)].label;
      const query = name.slice(0, 1 + Math.floor(rand() * name.length));
      const sequence: ListboxKey[] = [];
      for (let k = 0; k < Math.floor(rand() * 5); k++)
        sequence.push(keys[Math.floor(rand() * keys.length)]);
      sequence.push("Enter");

      const { commit, at } = drive(query, sequence);
      const highlighted = activeOption(countries, at);
      expect(commit?.value, `"${query}" + ${sequence.join(",")}`).toBe(highlighted?.value);
      expect(commit).toBeDefined(); // a typed needle always has a highlight
    }
  });

  it("↓ once from a fresh needle commits the SECOND row, not the first", () => {
    // The exact regression: "niger" + ↓ + Enter recorded Niger, because ↓ moved
    // nothing. Nigeria is the second row now, and the second row is what a
    // person who pressed ↓ once is looking at.
    const { commit } = drive("niger", ["ArrowDown", "Enter"]);
    expect(matchOptions(countries, "niger").slice(0, 2).map((o) => o.value)).toEqual(["NE", "NG"]);
    expect(commit!.value).toBe("NG");
  });

  it("Enter with no arrow key takes the exact match", () => {
    expect(drive("niger", ["Enter"]).commit!.value).toBe("NE");
    expect(drive("sudan", ["Enter"]).commit!.value).toBe("SD");
    expect(drive("sudan", ["ArrowDown", "Enter"]).commit!.value).toBe("SS");
  });

  it("Escape closes the list and commits nothing", () => {
    const { commit, at } = drive("germany", ["Escape", "Enter"]);
    expect(commit).toBeUndefined();
    expect(at.open).toBe(false);
    expect(activeOption(countries, at)).toBeUndefined();
  });

  it("an untouched box highlights nothing, so a habitual Enter answers nothing", () => {
    const empty = stateFor("");
    expect(activeOption(countries, empty)).toBeUndefined();
    expect(onKey(countries, empty, "Enter").commit).toBeUndefined();
    expect(onKey(countries, empty, "ArrowDown").state.active).toBe(-1);
  });

  it("the highlight never runs off either end of the list", () => {
    const rand = lcg(4242);
    for (let i = 0; i < 200; i++) {
      let state = stateFor("an");
      const rows = shownOptions(countries, state);
      for (let k = 0; k < 20; k++)
        state = onKey(countries, state, rand() < 0.5 ? "ArrowDown" : "ArrowUp").state;
      expect(state.active).toBeGreaterThanOrEqual(0);
      expect(state.active).toBeLessThan(rows.length);
      expect(activeOption(countries, state)).toBeDefined();
    }
  });

  it("a needle that matches nothing has nothing to commit", () => {
    const state = stateFor("zzzz");
    expect(shownOptions(countries, state)).toEqual([]);
    expect(onKey(countries, state, "Enter").commit).toBeUndefined();
    expect(onKey(countries, state, "ArrowDown").state.active).toBe(0); // no rows: unchanged
  });

  it("typing again re-ranks the list and returns the highlight to the top of it", () => {
    let state = stateFor("niger");
    state = onKey(countries, state, "ArrowDown").state;
    expect(state.active).toBe(1);
    // Typing re-ranks the list, and a fresh state for the new query is the
    // whole of that: the highlight returns to the top.
    state = stateFor("nigeria");
    expect(state.active).toBe(0);
    expect(activeOption(countries, state)!.value).toBe("NG");
  });
});
