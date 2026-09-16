import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset, UnreadSource } from "permit-rulebook-data";
import { dataPage, routeCounts } from "../src/lib/data-page.js";
import { LAST_CHECKED, NEWEST_VALUE_CHANGED, datasetDay } from "../src/lib/copy.js";
import { lastWatchRun, readRange } from "../src/lib/site.js";
import { siteReadDate } from "../src/lib/country-page.js";

/**
 * s12 — two labels that mean what they say.
 *
 * Walking `/data/` the human read "Newest value read 2026-09-10" as "last
 * checked" and asked why the numbers were old (human's walk, 2026-09-15). They
 * were not: that date is the day a value last CHANGED, and the day everything
 * was last CHECKED was the sentence below it — "re-read daily — last run
 * 2026-09-15". Two facts sat side by side and the label told them apart only to
 * someone who already knew this product's meaning of "read". A label the
 * product's own author misreads has not earned its meaning.
 *
 * So the list says both, each under a word that means it. Neither fact is new
 * and neither is computed here: the first is the newest `retrieved_at` among
 * values, the second is the run the freshness sentence already prints, read
 * from the same place so the two cannot drift.
 */

const ds = dataset as unknown as Dataset;
const readerSees = (html: string): string =>
  html.replace(/<[^>]*>/g, "").split(/\s+/).join(" ").split(String.fromCharCode(160)).join(" ").trim();

/**
 * "What it holds today", as the reader meets it: three lists, each of one kind,
 * and each of their rows a term with what stands under it. The rows are the
 * unit this slice moves, so they are the unit it asserts — a substring of the
 * whole page would pass on a label sitting anywhere.
 */
function factLists(html: string): { kind: string; rows: [string, string][] }[] {
  return [...html.matchAll(/<dl class="facts([^"]*)">([\s\S]*?)<\/dl>/g)].map((list) => ({
    kind: list[1]!.trim(),
    rows: [...list[2]!.matchAll(/<dt>(.*?)<\/dt><dd>(.*?)<\/dd>/g)]
      .map((row) => [readerSees(row[1]!), readerSees(row[2]!)] as [string, string]),
  }));
}

/** Every fact on the page, whichever list holds it. */
const facts = (html: string): [string, string][] => factLists(html).flatMap((list) => list.rows);

const termsOf = (html: string): string[] => facts(html).map(([term]) => term);
const under = (html: string, term: string): string | undefined =>
  facts(html).find(([t]) => t === term)?.[1];

/** The date in the RULES READ stamp, which is a different fact from any row. */
const stampedDate = (html: string): string | undefined =>
  /<div class="stamps">[\s\S]*?<time datetime="([^"]*)"/.exec(html)?.[1];

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

  it("prints the newest retrieved_at among the dataset's values", () => {
    expect(under(dataPage(ds).html, NEWEST_VALUE_CHANGED)).toBe(readRange(ds).newest);
  });

  /**
   * The case that holds the decision, on the only dataset that can hold it.
   *
   * The page carries two read dates: the newest `retrieved_at` among VALUES,
   * and the newest `pageStamp` on the site — which folds in the audience notice
   * and a route's own notices. They coincide on the shipped dataset and on the
   * frozen one, so every other case here passes with either date wired to the
   * row, and the choice between them would be a decision no check could see
   * (Spec review, 2026-09-15).
   *
   * So the dataset is bent until they cannot coincide: the EU free-movement
   * notice is re-read three weeks after the newest value. A notice re-read
   * today IS a page read today, so the stamp moves and is right to; no value
   * moved, so the row must not. Both halves are asserted on one render, because
   * the contrast is the thing being proved.
   */
  it("does not follow a notice's read date, though the stamp on the same page does", () => {
    const NOTICE_DAY = "2026-09-30";
    const fake = structuredClone(ds);
    const notice = (fake.notices ?? []).find((n) => n.kind === "no-permit-needed");
    expect(notice, "the dataset no longer carries the notice this case bends").toBeDefined();
    notice!.source.retrieved_at = NOTICE_DAY;

    expect(NOTICE_DAY > readRange(fake).newest, "the bent date is not newer than every value").toBe(true);
    expect(siteReadDate(fake), "the bent notice did not reach the stamp").toBe(NOTICE_DAY);

    const html = dataPage(fake, "2026-09-30", []).html;
    expect(under(html, NEWEST_VALUE_CHANGED), "a re-read notice moved a row about values changing")
      .toBe(readRange(fake).newest);
    expect(stampedDate(html), "the stamp lost the newest date the site published").toBe(NOTICE_DAY);
    expect(under(html, NEWEST_VALUE_CHANGED)).not.toBe(stampedDate(html));
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
   * with the first — which is the defect this slice exists to end (human's
   * walk, 2026-09-15), not to repeat in a new place.
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
   * in a list of one-line facts (s11, 2026-09-15, stands as it is).
   */
  it("states the run and leaves the exception to the sentence that can carry it", () => {
    const html = dataPage(ds, "2026-09-15", [spain]).html;
    expect(under(html, LAST_CHECKED)).toBe("2026-09-15");
    expect(readerSees(html)).toContain("A Spanish source did not answer on the last run");
  });

  /**
   * And a state with no run at all says nothing rather than something empty.
   *
   * `lastWatchRun()` is "" before the watch has ever written, and the freshness
   * sentence has always dropped its clause there. A row is a claim with a date
   * in it; there is no date, so there is no row — and certainly no `datetime=""`
   * for a machine to read as a fact.
   */
  it("prints no row at all when the state has no run", () => {
    const html = dataPage(ds, "", []).html;
    expect(termsOf(html)).not.toContain(LAST_CHECKED);
    expect(html).not.toContain(LAST_CHECKED);
    expect(html, "an empty date is on the page for a machine to read").not.toContain(`datetime=""`);
    expect(readerSees(html)).toContain("Every source is re-read daily.");
  });
});

describe("how the two rows are built", () => {
  it("both are dates, marked up as dates, like the rows around them", () => {
    const html = dataPage(ds, "2026-09-15", []).html;
    const newest = readRange(ds).newest;
    expect(html).toContain(`<dt>${NEWEST_VALUE_CHANGED}</dt><dd><time datetime="${newest}">${newest}</time></dd>`);
    expect(html).toContain(`<dt>${LAST_CHECKED}</dt><dd><time datetime="2026-09-15">2026-09-15</time></dd>`);
  });

  /**
   * The words live in copy.ts, like every other label on this site: each label
   * is on the page once, and it is the constant's own text — which is what a
   * second copy typed into the template would break.
   */
  it("says each label once, in the words copy.ts holds", () => {
    const html = dataPage(ds, "2026-09-15", []).html;
    for (const label of [NEWEST_VALUE_CHANGED, LAST_CHECKED])
      expect(html.split(label).length - 1, label).toBe(1);
  });
});

describe("how the list is grouped, after the human read it on the live page", () => {
  /**
   * The grouping is the decision, so the grouping is what is asserted.
   *
   * Seven cells in one auto-fit grid came out 3 + 3 + 1 with a row of one
   * orphaned at the end, a middle row of 84px against 46px neighbours, and
   * dates interleaved with counts in no order a reader could name. The human
   * chose three rows, by kind: the dates, the counts, the Routes sentence
   * (2026-09-15, after seeing it live). Which fact is in which list is that
   * choice, and a page that regrouped them would still pass every other case
   * here.
   */
  it("holds the seven facts in three lists, each of one kind", () => {
    expect(factLists(dataPage(ds).html).map((list) => [list.kind, list.rows.map(([term]) => term)]))
      .toEqual([
        ["facts-dates", ["Dataset version", "Schema version", NEWEST_VALUE_CHANGED, LAST_CHECKED]],
        ["facts-counts", ["Quoted values", "Sentences of ours"]],
        ["facts-wide", ["Routes"]],
      ]);
  });

  /**
   * Routes is alone in the last list because its sentence needs the width: it
   * wrapped to three lines in a third of the page and now says itself in one.
   * The wording it kept is the point of giving it the room, so the wording is
   * read off the dataset and compared, not eyeballed.
   */
  it("leaves the Routes sentence its full wording, alone on its row", () => {
    const counts = routeCounts(ds);
    expect(under(dataPage(ds).html, "Routes")).toBe(
      `${counts.scored} scored, ${counts.quotedOnly} quoted and dated but not scored, in ${
        ds.countries.length} countries`);
  });

  /**
   * Decision 12: one date format on a page. The version is stamped 2026.09.10
   * in the dataset and was printed with its dots among four dates written with
   * dashes — the third format the route-page mock was made to drop (critique
   * F3). The visible text takes the day form the `datetime` attribute and the
   * footer have always taken; the dataset's own string is not rewritten.
   */
  it("prints the dataset version as a day, like every other date beside it", () => {
    const day = datasetDay(ds.dataset_version);
    const html = dataPage(ds).html;
    expect(under(html, "Dataset version")).toBe(day);
    expect(under(html, "Dataset version"), "dots among dashes").not.toContain(".");
    expect(ds.dataset_version, "the dataset's own version string was rewritten").toContain(".");
    expect(html).toContain(`<dt>Dataset version</dt><dd><time datetime="${day}">${day}</time></dd>`);
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
    expect(stampedDate(html)).toBe(siteReadDate(ds));
  });

  /** And every fact that was in the list is still in it, once. */
  it("carries the same seven facts, none lost and none said twice", () => {
    const terms = termsOf(dataPage(ds).html);
    expect(terms).toEqual([
      "Dataset version", "Schema version", NEWEST_VALUE_CHANGED, LAST_CHECKED,
      "Quoted values", "Sentences of ours", "Routes",
    ]);
    expect(terms, "a fact is on the page twice").toEqual([...new Set(terms)]);
  });
});
