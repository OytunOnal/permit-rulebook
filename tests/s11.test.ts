import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { unreadSources, type Dataset, type UnreadSource } from "permit-rulebook-data";
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
      + "A Spanish source has not answered since 2026-09-07; the values it backs still show that date.");
  });

  it("names the countries, never our own ids, and never the run's own date as the stale one", () => {
    const html = dataPage(ds, "2026-09-15", [spain, netherlands]).html;
    const seen = readerSees(html);
    expect(seen).toContain("A Spanish and a Dutch source have not answered since 2026-09-07");
    expect(seen).not.toContain("es-uge-umbral-pdf");
    expect(seen).not.toContain("not answered since 2026-09-15");
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
      "A Spanish source has not answered since 2026-09-07; the values it backs still show that date.");
  });

  it("and on a clean day says exactly what it says today, with nothing added", () => {
    const clean = dataPage(ds, lastWatchRun(), []).html;
    expect(clean).toBe(dataPage(ds).html);
    expect(readerSees(clean)).toContain(`Every source is re-read daily — last run ${lastWatchRun()}.`);
    expect(clean).not.toContain("not answered since");
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
  it("the page says what the state says, and the state is what the run wrote", () => {
    const derived = unreadSources(ds, watchState);
    const seen = readerSees(dataPage(ds).html);
    expect(seen.includes("has not answered since") || seen.includes("have not answered since"))
      .toBe(derived.length > 0);
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
});
