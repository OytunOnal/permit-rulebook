import { describe, expect, it } from "vitest";
import { fieldOptions, matchOptions, remainingQuestions, type Dataset } from "permit-rulebook-data";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { QUERY_MAX_LENGTH, countrySearchOf, type SearchView } from "../src/lib/country-search/index.js";
import { questionCardHtml } from "../src/lib/question.js";

const dataset = rawDataset as unknown as Dataset;
const countries = fieldOptions(dataset, "citizenship");

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** A search over the passports that keeps what it commits. */
function searchKeepingCommits() {
  const commits: Array<{ value: string; label: string }> = [];
  const search = countrySearchOf(countries, { chosen: undefined, classed: null }, (value, label) => {
    commits.push({ value, label });
  });
  const press = (key: string) => search.pressKey({ key, isComposing: false });
  return { search, commits, press };
}

/** The rows a view draws, each by its id and its value, in order. */
const rowsOf = (view: SearchView): Array<{ id: string; value: string }> =>
  [...view.listHtml.matchAll(/<button[^>]*role="option" id="([^"]*)"[^>]*data-value="([^"]*)"/g)]
    .map(([, id, value]) => ({ id, value }));

/** The value of the row the view highlights, if any. */
const highlightedIn = (view: SearchView): string | undefined =>
  rowsOf(view).find((row) => row.id === view.activeRowId)?.value;

/** Type a needle, then press these keys. Returns what was committed and on
 * which key, if anything, and the view standing when it was. */
function drive(query: string, keys: string[]) {
  const { search, commits, press } = searchKeepingCommits();
  let view = search.typeQuery(query);
  for (const key of keys) {
    const outcome = press(key);
    if (commits.length) return { commit: commits[0], committedOn: key, view, commits };
    if (outcome.view) view = outcome.view;
  }
  return { commit: undefined, committedOn: undefined, view, commits };
}

describe("invariant: the committed country equals the highlighted option (B1)", () => {
  it("holds over random typed prefixes and arrow-key sequences", () => {
    const rand = lcg(1861);
    const keys = ["ArrowDown", "ArrowUp", "ArrowDown", "Home", "End", "ArrowUp"];
    for (let i = 0; i < 400; i++) {
      // A needle a person would plausibly type: a prefix of some country name.
      const name = countries[Math.floor(rand() * countries.length)].label;
      const query = name.slice(0, 1 + Math.floor(rand() * name.length));
      const sequence: string[] = [];
      for (let k = 0; k < Math.floor(rand() * 5); k++)
        sequence.push(keys[Math.floor(rand() * keys.length)]);
      sequence.push("Enter");

      const { commit, committedOn, view, commits } = drive(query, sequence);
      const said = `"${query}" + ${sequence.join(",")}`;
      expect(commit?.value, said).toBe(highlightedIn(view));
      expect(commit, said).toBeDefined(); // a typed needle always has a highlight
      // And nothing else: one commit, by Enter, under the option's own name.
      expect(committedOn, said).toBe("Enter");
      expect(commits, said).toHaveLength(1);
      expect(commit!.label, said).toBe(countries.find((o) => o.value === commit!.value)!.label);
    }
  });

  it("↓ once from a fresh needle commits the SECOND row, not the first", () => {
    // "niger" + ↓ + Enter records the second row, which is what a person who
    // pressed ↓ once is looking at.
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
    const { commit, view } = drive("germany", ["Escape", "Enter"]);
    expect(commit).toBeUndefined();
    expect(view.expanded).toBe(false);
    expect(highlightedIn(view)).toBeUndefined();
  });

  it("an untouched box highlights nothing, so a habitual Enter answers nothing", () => {
    const { search, commits, press } = searchKeepingCommits();
    expect(search.typeQuery("").activeRowId).toBeNull();
    press("Enter");
    expect(commits).toEqual([]);
    expect(press("ArrowDown").view?.activeRowId).toBeNull();
  });

  it("the highlight never runs off either end of the list", () => {
    const rand = lcg(4242);
    for (let i = 0; i < 200; i++) {
      const { search, press } = searchKeepingCommits();
      let view = search.typeQuery("an");
      for (let k = 0; k < 20; k++)
        view = press(rand() < 0.5 ? "ArrowDown" : "ArrowUp").view ?? view;
      expect(rowsOf(view).findIndex((row) => row.id === view.activeRowId)).toBeGreaterThanOrEqual(0);
      expect(highlightedIn(view)).toBeDefined();
    }
  });

  it("a needle that matches nothing has nothing to commit", () => {
    const { search, commits, press } = searchKeepingCommits();
    expect(rowsOf(search.typeQuery("zzzz"))).toEqual([]);
    press("Enter");
    expect(commits).toEqual([]);
    expect(press("ArrowDown").view?.activeRowId).toBeNull(); // no rows: nothing to highlight
  });

  it("typing again re-ranks the list and returns the highlight to the top of it", () => {
    const { search, press } = searchKeepingCommits();
    search.typeQuery("niger");
    const moved = press("ArrowDown").view!;
    expect(rowsOf(moved).findIndex((row) => row.id === moved.activeRowId)).toBe(1);
    // Typing re-ranks the list, and the highlight returns to the top.
    const view = search.typeQuery("nigeria");
    expect(view.activeRowId).toBe(rowsOf(view)[0].id);
    expect(highlightedIn(view)).toBe("NG");
  });
});

describe("the search's controller, through countrySearchOf", () => {
  it("typing draws the ranked rows, highlights the first and counts them in the status", () => {
    const { search, commits } = searchKeepingCommits();
    const view = search.typeQuery("niger");
    expect(rowsOf(view).map((row) => row.value)).toEqual(["NE", "NG"]);
    expect(highlightedIn(view)).toBe("NE");
    expect(view.expanded).toBe(true);
    expect(view.status).toMatch(/^2\b/);
    expect(commits).toEqual([]);
  });

  it("ArrowDown and ArrowUp move the highlight, are handled, and commit nothing", () => {
    const { search, commits, press } = searchKeepingCommits();
    search.typeQuery("niger");
    const down = press("ArrowDown");
    expect(down.handled).toBe(true);
    expect(highlightedIn(down.view!)).toBe("NG");
    expect(down.view!.expanded).toBe(true);
    const up = press("ArrowUp");
    expect(up.handled).toBe(true);
    expect(highlightedIn(up.view!)).toBe("NE");
    expect(commits).toEqual([]);
  });

  it("Home and End go to the first and last rows once a row is highlighted, and are the caret's before", () => {
    const { search, commits, press } = searchKeepingCommits();
    expect(press("Home")).toEqual({ handled: false, view: null });
    expect(press("End")).toEqual({ handled: false, view: null });
    const rows = rowsOf(search.typeQuery("an"));
    expect(press("End").view!.activeRowId).toBe(rows[rows.length - 1].id);
    expect(press("Home").view!.activeRowId).toBe(rows[0].id);
    expect(commits).toEqual([]);
  });

  it("Enter commits the highlighted row with its label, and leaves the view to the next screen", () => {
    const { search, commits, press } = searchKeepingCommits();
    search.typeQuery("niger");
    press("ArrowDown");
    expect(press("Enter")).toEqual({ handled: true, view: null });
    expect(commits).toEqual([{ value: "NG", label: "Nigeria" }]);
  });

  it("Escape closes the list: nothing highlighted, nothing announced, nothing committed", () => {
    const { search, commits, press } = searchKeepingCommits();
    search.typeQuery("germany");
    const escaped = press("Escape");
    expect(escaped.handled).toBe(true);
    expect(escaped.view).toMatchObject({ expanded: false, activeRowId: null, status: "" });
    expect(commits).toEqual([]);
  });

  it("an IME's composing Enter is the IME's: not handled, nothing committed", () => {
    const { search, commits } = searchKeepingCommits();
    search.typeQuery("niger");
    expect(search.pressKey({ key: "Enter", isComposing: true })).toEqual({ handled: false, view: null });
    expect(commits).toEqual([]);
  });

  it("a key that is not the search's is left to the box", () => {
    const { search, press } = searchKeepingCommits();
    search.typeQuery("niger");
    expect(press("a")).toEqual({ handled: false, view: null });
  });

  it("a click commits the clicked row with its label, whatever is highlighted", () => {
    const { search, commits } = searchKeepingCommits();
    search.typeQuery("niger");
    search.clickRow("NG");
    expect(commits).toEqual([{ value: "NG", label: "Nigeria" }]);
  });
});

describe("the search is bounded by length (#25)", () => {
  it("a query is cut to the cap before anything matches it", () => {
    // Past the cap, "zzz" would leave nothing to match; cut, the needle is the
    // name and its padding.
    const overlong = "Germany".padEnd(QUERY_MAX_LENGTH, " ") + "zzz";
    expect(matchOptions(countries, overlong)).toEqual([]);
    const { search } = searchKeepingCommits();
    expect(highlightedIn(search.typeQuery(overlong))).toBe("DE");
  });

  it("the cap still fits every name a country is found by", () => {
    for (const o of countries)
      for (const name of [o.label, ...(o.aliases ?? [])])
        expect(name.length, name).toBeLessThanOrEqual(QUERY_MAX_LENGTH);
  });

  it("the box takes no more than the cap", () => {
    const question = remainingQuestions(dataset, {}).find((q) => q.field === "citizenship")!;
    const html = questionCardHtml({ dataset, question, answers: {}, asked: [], editing: null, total: 12 });
    expect(html).toMatch(new RegExp(`id="cfilter"[^>]*maxlength="${QUERY_MAX_LENGTH}"`));
  });
});
