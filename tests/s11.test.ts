import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import dataset from "permit-rulebook-data/data/dataset.json";
import { unreadSources, type Dataset, type UnreadSource, type WatchState } from "permit-rulebook-data";
import { dataPage } from "../src/lib/data-page.js";
import { footerFacts, navCountries } from "../src/lib/country-page.js";
import { siteFooter } from "../src/lib/identity.js";
import { routePages } from "../src/lib/route-page.js";
import { lastWatchRun, watchState } from "../src/lib/site.js";

/**
 * s11 — a partial run says so.
 *
 * The watch failed on five consecutive days on the same two Spanish sources,
 * and the state it commits before the failure is what the site prints from. So
 * `/data/` said "Every source is re-read daily — last run 2026-09-15" while two
 * of them had not been read since 2026-09-07 and were still backing values on
 * live pages. The claim was true of 42 sources and false of two.
 *
 * The qualification appears only on a day something went unread, and disappears
 * on every other — which is why the clean day is checked here as hard as the
 * partial one.
 */

const ds = dataset as unknown as Dataset;
const readerSees = (html: string): string =>
  html.replace(/<[^>]*>/g, "").split(/\s+/).join(" ").split(String.fromCharCode(160)).join(" ").trim();

/** Spain's salary-threshold PDF: five dataset values rest on it. */
const UMBRAL = "https://www.inclusion.gob.es/documents/d/unidadgrandesempresas/umbral-salarial.pdf";
/** The UGE requirements page: a sentinel, cited by no dataset value. */
const UGE_INDEX = "https://www.inclusion.gob.es/web/unidadgrandesempresas/autorizaciones-y-requisitos";
const ORIENTATION = "https://ind.nl/en/residence-permits/work/residence-permit-for-orientation-year";

const spain: UnreadSource = {
  id: "es-uge-umbral-pdf", url: UMBRAL, last_read: "2026-09-07", countries: ["ES"],
};
const netherlands: UnreadSource = {
  id: "nl-ind-orientation-year", url: ORIENTATION, last_read: "2026-09-11", countries: ["NL"],
};

describe("what /data/ says on a day something went unread", () => {
  it("carries the qualification, in the human's words", () => {
    const html = dataPage(ds, "2026-09-15", [spain]).html;
    expect(readerSees(html)).toContain(
      "Every source is re-read daily — last run 2026-09-15. "
      + "A Spanish source did not answer on the last run; the values it backs were read on 2026-09-07.");
  });

  it("names the countries, never our own ids, and never the run's own date as the stale one", () => {
    const html = dataPage(ds, "2026-09-15", [spain, netherlands]).html;
    const seen = readerSees(html);
    expect(seen).toContain("A Spanish and a Dutch source did not answer on the last run; the values they back were read on 2026-09-07");
    expect(seen).not.toContain("es-uge-umbral-pdf");
    expect(seen).not.toContain("were read on 2026-09-15");
  });

  /**
   * The case that would have caught the defect, on the two sources that caused
   * it: the ids and pages the run of 2026-09-11 to 2026-09-15 could not read.
   *
   * It names ONE source and not two, and that is the rule working rather than
   * failing: `es-uge-index` is a sentinel — an edition index watched so a person
   * notices a new PDF — and no dataset value cites it. The reader is told about
   * values, so the sentence is about the PDF, and its date, 2026-09-07, is the
   * date the scenario's own sentence gives.
   */
  it("the run of 2026-09-15, as it would now be recorded", () => {
    const unread = unreadSources(ds, {
      entries: {
        "es-uge-umbral-pdf": { hash: "h", retrieved_at: "2026-09-07", history: [] },
        "es-uge-index": { hash: "h", retrieved_at: "2026-09-02", history: [] },
      },
      last_run: "2026-09-15",
      unread: [{ id: "es-uge-umbral-pdf", url: UMBRAL }, { id: "es-uge-index", url: UGE_INDEX }],
    });
    expect(unread.map((u) => u.id)).toEqual(["es-uge-umbral-pdf"]);
    expect(readerSees(dataPage(ds, "2026-09-15", unread).html)).toContain(
      "A Spanish source did not answer on the last run; the values it backs were read on 2026-09-07.");
  });

  it("and on a clean day says exactly what it says today, with nothing added", () => {
    const clean = dataPage(ds, lastWatchRun(), []).html;
    expect(clean).toBe(dataPage(ds).html);
    expect(readerSees(clean)).toContain(`Every source is re-read daily — last run ${lastWatchRun()}.`);
    expect(clean).not.toContain("did not answer on the last run");
  });
});

describe("the footer's short form", () => {
  it("names the count beside the run, in figures, inside the same parenthesis", () => {
    const footer = siteFooter(navCountries(ds), footerFacts(ds, "2026-09-15", [spain, netherlands]));
    expect(readerSees(footer)).toContain("re-read daily (last run 2026-09-15 · 2 sources unread)");
  });

  it("counts one in the singular", () => {
    const footer = siteFooter(navCountries(ds), footerFacts(ds, "2026-09-15", [spain]));
    expect(readerSees(footer)).toContain("re-read daily (last run 2026-09-15 · 1 source unread)");
  });

  it("says nothing at all when every source answered", () => {
    const footer = siteFooter(navCountries(ds), footerFacts(ds, lastWatchRun(), []));
    expect(readerSees(footer)).toContain(`re-read daily (last run ${lastWatchRun()})`);
    expect(footer).not.toContain("unread");
    expect(footer).toBe(siteFooter(navCountries(ds), footerFacts(ds)));
  });
});

describe("the state this site is built against", () => {
  /**
   * The case named for the real state, and it has to bite on the real state.
   *
   * Its first version asked whether the page said "has not answered" when the
   * derivation was non-empty — and with a shipped state that records no unread
   * list, both sides were false and it passed over a page that still made the
   * unqualified claim (Spec review, 2026-09-15). This one takes the shipped
   * state as it is, with its real snapshots and their real dates, and puts back
   * the one thing the run of 2026-09-15 failed to write down: that it could not
   * read Spain's two UGE sources. Nothing here is typed except the two ids and
   * urls that failed; every date comes off the file.
   */
  const AS_RECORDED: WatchState = {
    ...watchState,
    unread: [{ id: "es-uge-umbral-pdf", url: UMBRAL }, { id: "es-uge-index", url: UGE_INDEX }],
  };

  it("names Spain, on the shipped state's own dates", () => {
    const unread = unreadSources(ds, AS_RECORDED);
    // The sentinel backs no dataset value, so one source is named, not two —
    // and the date is the PDF's, which is the date the approved sentence gives.
    expect(unread.map((u) => u.id)).toEqual(["es-uge-umbral-pdf"]);
    const since = watchState.entries["es-uge-umbral-pdf"]!.retrieved_at;
    expect(since, "the shipped state has lost the reading the sentence dates from").toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(readerSees(dataPage(ds, watchState.last_run!, unread).html)).toContain(
      `A Spanish source did not answer on the last run; the values it backs were read on ${since}.`);
  });

  it("and the date it names is marked up like every other date on the site", () => {
    const unread = unreadSources(ds, AS_RECORDED);
    const since = watchState.entries["es-uge-umbral-pdf"]!.retrieved_at;
    expect(dataPage(ds, watchState.last_run!, unread).html)
      .toContain(`were read on <b><time datetime="${since}">${since}</time></b>.`);
  });

  /**
   * One fact, three surfaces. The route page typed its own copy of the claim
   * and went on making it unqualified on 28 pages while `/data/` and the footer
   * had learned better (Standards review, 2026-09-15). Every surface is asked
   * here, over the state as the failing run would have recorded it.
   */
  it("no surface asserts the unqualified claim while a source is unread", () => {
    const unread = unreadSources(ds, AS_RECORDED);
    const run = watchState.last_run!;
    const pages = [
      ...routePages(ds, run, unread).map((p) => ({ path: p.path, html: p.html })),
      { path: "/data/", html: dataPage(ds, run, unread).html },
    ];
    expect(pages.length).toBeGreaterThan(20);
    for (const page of pages) {
      const seen = readerSees(page.html);
      expect(seen, page.path).not.toContain("a daily check re-reads every source.");
      expect(seen, page.path).toContain("re-read daily (last run " + run + " · 1 source unread)");
    }
    for (const page of routePages(ds, run, unread))
      expect(readerSees(page.html), page.path)
        .toContain("a daily check re-reads every source; the last run did not reach one of them");
  });

  it("and every surface says the plain thing again the moment nothing is unread", () => {
    const run = lastWatchRun();
    for (const page of routePages(ds, run)) {
      const seen = readerSees(page.html);
      expect(seen, page.path).toContain("a daily check re-reads every source.");
      expect(seen, page.path).not.toContain("unread");
    }
    expect(readerSees(dataPage(ds).html)).toContain(`Every source is re-read daily — last run ${run}.`);
  });

  /**
   * The fingerprint's own freeze. A route page renders the footer, and the
   * footer now carries a fact that moves by itself — so the unread list is
   * read for the run the state belongs to and for no other. The frozen
   * fingerprint asks about 1970-01-01, and gets silence whatever today's watch
   * did.
   */
  it("a render asked about another run carries no count, so the frozen build cannot move", () => {
    for (const page of routePages(ds, "1970-01-01")) expect(page.html).not.toContain("unread");
  });

  /**
   * `/data/`'s clean day, pinned against the template that produced it before
   * s11 — not against this build's own output, which is what the first version
   * of this case compared and could never have caught a drift (Spec review,
   * 2026-09-15). The fixture's hash was taken from `src/lib/data-page.ts` at
   * 34fe87c, over the same frozen dataset the route-page fingerprint uses, with
   * the live run date normalised so that a page which is correct on every day
   * does not fail on all but one of them.
   */
  it("a clean day is byte-identical to what the page produced before s11", () => {
    const fixture = JSON.parse(readFileSync(new URL("fixtures/data-page-pre-s11.json", import.meta.url), "utf8")) as
      { run: string; occurrences: number; sha256: string };
    const frozen = JSON.parse(readFileSync(new URL("fixtures/frozen-dataset.json", import.meta.url), "utf8")) as Dataset;
    const html = dataPage(frozen, fixture.run, []).html;
    expect(html.split(fixture.run).length - 1, "the page stopped printing the run where it did").toBe(fixture.occurrences);
    expect(createHash("sha256").update(html).digest("hex"),
      "/data/ changed on a clean day — regenerate the fixture only on purpose").toBe(fixture.sha256);
  });
});
