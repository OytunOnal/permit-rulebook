import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset, UnreadSource } from "permit-rulebook-data";
import { dataPage } from "../src/lib/data-page.js";
import { LAST_CHECKED, NEWEST_VALUE_CHANGED } from "../src/lib/copy.js";
import { lastWatchRun, readRange } from "../src/lib/site.js";

/**
 * s12 — two labels that mean what they say.
 *
 * Walking `/data/` the human read "Newest value read 2026-09-10" as "last
 * checked" and asked why the numbers were old. They were not: that date is the
 * day a value last CHANGED, and the day everything was last CHECKED was the
 * sentence below it — "re-read daily — last run 2026-09-15". Two facts sat side
 * by side and the label told them apart only to someone who already knew this
 * product's meaning of "read". A label the product's own author misreads has
 * not earned its meaning.
 *
 * So the list says both, each under a word that means it. Neither fact is new
 * and neither is computed here: the first is the date the row already printed,
 * the second is the one the freshness sentence already prints, read from the
 * same place so the two cannot drift.
 */

const ds = dataset as unknown as Dataset;
const readerSees = (html: string): string =>
  html.replace(/<[^>]*>/g, "").split(/\s+/).join(" ").split(String.fromCharCode(160)).join(" ").trim();

/**
 * The "What it holds today" list, as its rows: the term and what stands under
 * it. The rows are the unit this slice moves, so they are the unit it asserts —
 * a substring of the whole page would pass on a label sitting anywhere.
 */
function facts(html: string): [string, string][] {
  const list = html.slice(html.indexOf(`<dl class="facts">`), html.indexOf("</dl>"));
  return [...list.matchAll(/<dt>(.*?)<\/dt><dd>(.*?)<\/dd>/g)]
    .map((row) => [readerSees(row[1]!), readerSees(row[2]!)] as [string, string]);
}

const termsOf = (html: string): string[] => facts(html).map(([term]) => term);
const under = (html: string, term: string): string | undefined =>
  facts(html).find(([t]) => t === term)?.[1];

/** Spain's salary-threshold PDF: the source s11's partial run could not read. */
const spain: UnreadSource = {
  id: "es-uge-umbral-pdf",
  url: "https://www.inclusion.gob.es/documents/d/unidadgrandesempresas/umbral-salarial.pdf",
  last_read: "2026-09-07",
  countries: ["ES"],
};

describe("what /data/ says about when a value changed", () => {
  it("says changed, under the word that means it, and never 'read' again", () => {
    const html = dataPage(ds).html;
    expect(NEWEST_VALUE_CHANGED).toBe("Newest value changed");
    expect(termsOf(html)).toContain(NEWEST_VALUE_CHANGED);
    expect(html, "the misread label is still on the page").not.toContain("Newest value read");
  });

  /**
   * The narrow date, on purpose: the newest `retrieved_at` among values. The
   * page's stamp and its footer carry the newest `pageStamp`, which a notice
   * can move — right for a page's read date, wrong under the word "changed".
   */
  it("prints the newest retrieved_at among the dataset's values, and not the stamp's date", () => {
    expect(under(dataPage(ds).html, NEWEST_VALUE_CHANGED)).toBe(readRange(ds).newest);
  });
});

describe("what /data/ says about when everything was last checked", () => {
  it("carries the watch's last run as its own row, directly beneath the one above", () => {
    const terms = termsOf(dataPage(ds).html);
    expect(LAST_CHECKED).toBe("Last checked");
    expect(under(dataPage(ds).html, LAST_CHECKED)).toBe(lastWatchRun());
    expect(terms.indexOf(LAST_CHECKED)).toBe(terms.indexOf(NEWEST_VALUE_CHANGED) + 1);
  });

  /**
   * One fact, one source. The freshness sentence below prints the run too, and
   * a second reading of the state would be a second fact that could disagree
   * with the first — which is the defect this slice exists to end, not to
   * repeat in a new place.
   */
  it("is the run the sentence below it prints, never a second copy", () => {
    for (const run of ["2026-09-15", "1970-01-01"]) {
      const html = dataPage(ds, run, []).html;
      expect(under(html, LAST_CHECKED)).toBe(run);
      expect(readerSees(html)).toContain(`last run ${run}`);
    }
  });

  /**
   * On a day a source went unread the row is still the run's date, flat. The
   * exception belongs to the sentence below, which has the room to say which
   * sources and since when; a row that tried would be that sentence said worse,
   * in a list of one-line facts (s11 stands as it is).
   */
  it("states the run and leaves the exception to the sentence that can carry it", () => {
    const html = dataPage(ds, "2026-09-15", [spain]).html;
    expect(under(html, LAST_CHECKED)).toBe("2026-09-15");
    expect(readerSees(html)).toContain("A Spanish source did not answer on the last run");
  });
});

describe("how the two rows are built", () => {
  it("both are dates, marked up as dates, like the rows around them", () => {
    const html = dataPage(ds, "2026-09-15", []).html;
    const newest = readRange(ds).newest;
    expect(html).toContain(`<dt>${NEWEST_VALUE_CHANGED}</dt><dd><time datetime="${newest}">${newest}</time></dd>`);
    expect(html).toContain(`<dt>${LAST_CHECKED}</dt><dd><time datetime="2026-09-15">2026-09-15</time></dd>`);
  });

  /** The words live in copy.ts, like every other label on this site. */
  it("the template types neither label", () => {
    const template = readFileSync(new URL("../src/lib/data-page.ts", import.meta.url), "utf8");
    const code = template.split(/\/\*\*[\s\S]*?\*\//).join("");
    expect(code).not.toContain(NEWEST_VALUE_CHANGED);
    expect(code).not.toContain(`<dt>${LAST_CHECKED}`);
  });
});

describe("what this slice does not touch", () => {
  /**
   * "Read" still means what it says everywhere it was already right: that
   * sentence was taken from that page on that day.
   */
  it("leaves the stamp, the quote dates and the footer's range alone", () => {
    const html = dataPage(ds).html;
    const seen = readerSees(html);
    expect(seen).toContain("Rules read");
    expect(seen).toContain("values read between");
    expect(html).toContain("<small>read ");
  });

  /** And the rest of the list is the list it was. */
  it("adds one row to 'What it holds today' and renames one, changing no other", () => {
    expect(termsOf(dataPage(ds).html)).toEqual([
      "Dataset version", "Schema version", NEWEST_VALUE_CHANGED, LAST_CHECKED,
      "Routes", "Quoted values", "Sentences of ours",
    ]);
  });
});
