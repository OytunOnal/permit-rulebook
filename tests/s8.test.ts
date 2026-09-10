import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  closedBy, deriveBands, evaluate, isClosed, noticeSources, notices,
  type Dataset, type Notice, type Profile, type RouteResult,
} from "permit-rulebook-data";
import { closedRowHtml, noticeHtml } from "../src/lib/card.js";
import { routePages } from "../src/lib/route-page.js";

const ds = dataset as unknown as Dataset;
const page = readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8");

const noticeOf = (id: string): Notice => ds.notices!.find((n) => n.id === id)!;
const OPEN_QUESTION = noticeOf("fr-dz-talent-open-question");

const topBand = (field: string): string => deriveBands(ds, field).at(-1)!.id;

/** A qualified job offer in France, answered in full. */
const withPassport = (citizenship: string): Profile => ({
  destination: "fr", citizenship, situation: "offer", situation_country: "fr",
  qualification: "degree", fr_degree: "yes", fr_innovative_employer: "no", fr_local_contract: "no",
  experience: "y5in7", salary_eur_year: topBand("salary_eur_year"),
});

/** The same reader, moved to France by their group — the profile fr-ict is for. */
const transferring = (citizenship: string): Profile => ({
  ...withPassport(citizenship), situation: "ict", salary_eur_month: topBand("salary_eur_month"),
});

const resultOf = (answers: Profile, id: string): RouteResult =>
  evaluate(ds, answers).find((r) => r.route.id === id)!;

/** The rendered route page, by the address a person reads it at. */
const pageAt = (address: string): string =>
  routePages(ds).find((p) => p.path.includes(address))!.html;

/** The four French talent pages, by the address a person reads them at. */
const TALENT_PAGES = [
  "/france/talent-qualified-employee",
  "/france/eu-blue-card",
  "/france/talent-employee-of-an-innovative-company",
  "/france/talent-employee-on-assignment",
];
const ICT_PAGE = "/france/ict-seconded-employee";

/**
 * s8 — an Algerian passport, on the screens a reader actually sees.
 *
 * Two failures, and they are not the same failure. The intra-corporate
 * transfer card was offered to a passport its own page shuts out — a reader
 * acts on a route, so that is the heavier one. And on the four talent cards
 * the sources conflict with each other, which is a third thing again: the
 * product must not answer it by hiding the routes, and must not answer it by
 * showing them quietly.
 */
describe("s8 — a route the authority closes is not a result", () => {
  it("keeps it out of open, within reach and not yet", () => {
    const algerian = transferring("DZ");
    expect(isClosed(resultOf(algerian, "fr-ict"))).toBe(true);
    // Every other French route this reader gets is a result like any other.
    for (const r of evaluate(ds, algerian).filter((x) => x.country === "FR" && x.route.id !== "fr-ict"))
      expect(isClosed(r), r.route.id).toBe(false);
    expect(isClosed(resultOf(transferring("TR"), "fr-ict"))).toBe(false);
  });

  it("says why in the authority's own words, with the sentence and the day it was read", () => {
    const algerian = transferring("DZ");
    const html = closedRowHtml(resultOf(algerian, "fr-ict"));
    const closing = closedBy(resultOf(algerian, "fr-ict"))[0].criterion;
    expect(closing.op).toBe("not-in");
    if (closing.op !== "not-in") throw new Error("unreachable");
    // Our plain English…
    expect(html).toContain(closing.text);
    // …and the page's own sentence under it, tagged as the French it is.
    expect(html).toContain(closing.source.quote);
    expect(html).toContain('lang="fr"');
    expect(html).toContain("read 2026-09-10");
    expect(html).toContain("service-public.gouv.fr");
    // Never a shortfall, and never a promise of "not yet".
    expect(html).not.toContain("Not yet");
    expect(html).not.toContain("Needs ");
  });

  it("escapes what it prints, like every other block", () => {
    const algerian = transferring("DZ");
    const r = structuredClone(resultOf(algerian, "fr-ict"));
    const closing = r.criteria.find((cr) => cr.criterion.op === "not-in")!.criterion;
    if (closing.op !== "not-in") throw new Error("unreachable");
    closing.text = "a & b <em>c</em>";
    expect(closedRowHtml(r)).toContain("a &amp; b &lt;em&gt;c&lt;/em&gt;");
  });

  it("the results page files them apart from the three verdicts, on both card layouts", () => {
    // A block the page forgets to call is a block that does not exist.
    expect(page).toContain("isClosed");
    expect(page).toContain("closedRowHtml");
    expect(page.match(/closedSection\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});

describe("s8 — the notice carries the open question without answering it", () => {
  const html = () => noticeHtml(OPEN_QUESTION);

  it("stands for an Algerian passport and for nobody else", () => {
    expect(notices(ds, withPassport("DZ")).map((n) => n.id)).toContain(OPEN_QUESTION.id);
    for (const passport of ["TR", "JP", "eu_eea_ch"])
      expect(notices(ds, withPassport(passport)).map((n) => n.id), passport).not.toContain(OPEN_QUESTION.id);
  });

  it("prints the question in the dataset's words, and never the page's own", () => {
    expect(html()).toContain(OPEN_QUESTION.title);
    expect(html()).toContain(OPEN_QUESTION.body);
    // It says an authority disagrees with another; it says so as a question.
    expect(html()).toContain('class="notice open-question"');
  });

  it("shows every side, each quote framed with its language, host and read date", () => {
    for (const source of noticeSources(OPEN_QUESTION)) {
      expect(html(), source.source_url).toContain(source.quote);
      expect(html(), source.source_url).toContain(source.legal_basis!);
    }
    // French from a French court, English from EUR-Lex — one voice per quote.
    expect(html()).toContain('lang="fr"');
    expect(html()).toContain('lang="en"');
    expect(html()).toContain("read 2026-09-10");
    expect(html()).toContain("legifrance.gouv.fr");
    expect(html()).toContain("eur-lex.europa.eu");
  });

  it("sends the reader on to the page that is theirs, not to the court", () => {
    expect(html()).toContain(OPEN_QUESTION.learn!.url.replace(/&/g, "&amp;"));
    expect(html()).toContain(OPEN_QUESTION.learn!.label);
  });

  it("the results page still calls the block that renders it", () => {
    expect(page).toContain("noticeHtml(");
  });
});

describe("s8 — a page is never quieter than a card", () => {
  it("states on the transfer card's page who the permit is not open to", () => {
    const html = pageAt(ICT_PAGE);
    expect(html).toContain("Who this is not for");
    expect(html).toContain("Not open to an Algerian passport");
    expect(html).toContain("Vous êtes étranger (sauf Européen ou Algérien)");
    expect(html).toContain("read 2026-09-10");
  });

  it("carries the unsettled question on all four talent pages, in the notice's own words", () => {
    for (const address of TALENT_PAGES) {
      const html = pageAt(address);
      expect(html, address).toContain(OPEN_QUESTION.title);
      expect(html, address).toContain(OPEN_QUESTION.body);
      for (const source of noticeSources(OPEN_QUESTION))
        expect(html, `${address}: ${source.source_url}`).toContain(source.quote);
      expect(html, address).toContain(OPEN_QUESTION.learn!.label);
    }
  });

  it("does not carry it on a page it is not about", () => {
    // The transfer card is settled — its own page says so — and a German page
    // has nothing to do with the Franco-Algerian agreement at all.
    expect(pageAt(ICT_PAGE)).not.toContain(OPEN_QUESTION.title);
    expect(pageAt("/germany/eu-blue-card-general")).not.toContain(OPEN_QUESTION.title);
  });

  it("counts the notice's read dates in the stamp of the pages that carry it", () => {
    for (const address of TALENT_PAGES) {
      const built = routePages(ds).find((p) => p.path === address)!;
      expect(built.readDate, address).toBe("2026-09-10");
    }
  });
});
