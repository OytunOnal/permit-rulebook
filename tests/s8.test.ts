import { describe, expect, it } from "vitest";
import { esc, escAttr } from "../src/lib/reason.js";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  closedBy, deriveBands, evaluate, isClosed, noticeSources, notices,
  type Dataset, type Notice, type Profile, type RouteResult,
} from "permit-rulebook-data";
import { closedRowHtml, noticeHtml, quoteForCard } from "../src/lib/card.js";
import { routePages } from "../src/lib/route-page.js";
import {
  NOTHING_OPEN_HEADLINE, RULES_MET, STATUS_LABEL, UNSETTLED_SECTION_LINE, unsettledHeadline,
} from "../src/lib/copy.js";
import type { Verdict, VerdictGroup } from "../src/lib/verdict/index.js";
import { cardsIn, groupsIn, placed, verdictFor } from "./verdict-cards.js";

const ds = dataset as unknown as Dataset;

const noticeOf = (id: string): Notice => ds.notices!.find((n) => n.id === id)!;
const OPEN_QUESTION = noticeOf("fr-dz-talent-open-question");

const topBand = (field: string): string => deriveBands(ds, field).at(-1)!.id;

/** A qualified job offer in France, answered in full. */
const withPassport = (citizenship: string): Profile => ({
  destination: "fr", citizenship, situation: "offer", situation_country: "fr",
  qualification: "degree", fr_degree: "yes", fr_innovative_employer: "no", fr_local_contract: "no",
  experience_5y: "2plus", experience_7y: "5plus", salary_eur_year: topBand("salary_eur_year"),
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
    // Both layouts draw it — a block the verdict forgets to draw is a block
    // that does not exist (s5e) — and the route is filed once, under the
    // heading that tells the truth about it, and never also under one that
    // invites the reader back (Standards review, 2026-09-10).
    for (const answers of [transferring("DZ"), { ...transferring("DZ"), destination: "all" }]) {
      const verdict = verdictFor(answers);
      expect(placed(verdict, "fr-ict")?.kind, answers.destination).toBe("closed");
      const filings = groupsIn(verdict).filter((g) => cardsIn(g).some((c) => c.route === "fr-ict"));
      expect(filings.length, answers.destination).toBe(1);
    }
    const results = evaluate(ds, transferring("DZ"));
    const closed = results.filter(isClosed).map((x) => x.route.id);
    expect(closed, "the transfer card is not filed as closed").toContain("fr-ict");
    // The page draws its three verdict groups from what is left after the
    // closed ones are taken out, so the two partitions must be complementary:
    // a route in both would be told "never yours" and "not yet" on one screen.
    const open = results.filter((x) => !isClosed(x)).map((x) => x.route.id);
    expect(open, "a closed route is still among the ones the page groups").not.toContain("fr-ict");
    expect(open.length + closed.length, "the two partitions do not add up").toBe(results.length);
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
      // A long quote is shown to its first sentence and carried whole on the
      // element (tracker #5, restored by the Standards review 2026-09-10): the
      // evidence stays complete either way, so the card is read for one or the
      // other and never for neither.
      const { shown, trimmed } = quoteForCard(source.quote);
      expect(html(), source.source_url).toContain(esc(shown));
      if (trimmed) expect(html(), `${source.source_url}: the whole passage is not on the element`)
        .toContain(escAttr(source.quote));
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
    expect(verdictFor(withPassport("DZ")).notices).toContain(html());
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
    // The page prints every side of the notice, so a side read after
    // everything else on the page moves the stamp; on a page it is not about,
    // it moves nothing.
    const REREAD = "2026-09-29";
    const bent = structuredClone(ds);
    const notice = (bent.notices ?? []).find((n) => n.id === OPEN_QUESTION.id)!;
    noticeSources(notice).at(-1)!.retrieved_at = REREAD;
    for (const built of routePages(bent))
      expect(built.readDate === REREAD, built.path).toBe(TALENT_PAGES.includes(built.path));
  });
});

/**
 * The results screen has two layouts, and a fix applied to one of them is a
 * fix for half the readers.
 *
 * The unsettled partition went into the single-destination layout and not
 * into the grouped one, so a reader looking at more than one country still
 * read "Open — criteria met" over the four French talent routes — the exact
 * screen the partition exists to stop (human's walk, 2026-09-10).
 */
describe("both layouts of the results screen partition the same way", () => {
  /** The Algerian reader with a qualified offer: France alone, and all four. */
  const flat = verdictFor(withPassport("DZ"));
  const several = verdictFor({ ...withPassport("DZ"), destination: "all" });
  const layouts = [["one country", flat], ["four countries", several]] as const;
  const UNSETTLED = ["fr-talent-qualifie", "fr-talent-blue-card"];
  /** The groups France's routes are drawn in, on either layout. */
  const franceGroups = (verdict: Verdict): VerdictGroup[] =>
    verdict.layout.kind === "countries"
      ? verdict.layout.sections.find((s) => s.name === "France")!.groups
      : groupsIn(verdict);

  it("every met section is followed by the unsettled one", () => {
    const ORDER = ["open", "unsettled", "within-reach", "steps", "not-yet", "closed"];
    for (const [name, verdict] of layouts) {
      const kinds = franceGroups(verdict).map((g) => g.kind);
      expect(kinds, name).toContain("unsettled");
      expect(kinds, name).toEqual([...kinds].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)));
      for (const id of UNSETTLED) expect(placed(verdict, id)?.kind, `${name}: ${id}`).toBe("unsettled");
    }
  });

  it("neither layout counts an unsettled route as open", () => {
    for (const [name, verdict] of layouts) {
      for (const group of groupsIn(verdict).filter((g) => g.kind === "open"))
        for (const id of UNSETTLED) expect(cardsIn(group).map((c) => c.route), `${name}: ${id}`).not.toContain(id);
      if (verdict.layout.kind === "one-country") expect(verdict.layout.strip).toMatchObject({ open: 0, unsettled: 2 });
    }
    if (several.layout.kind !== "countries") throw new Error("the four-country reader drew no country sections");
    expect(several.layout.sections.find((s) => s.name === "France")!.tally).toMatchObject({ open: 0, unsettled: 2 });
  });

  it("the card in that section does not wear the met badge", () => {
    // The heading stopped saying "criteria met" and the card went on saying
    // it in a green pill — which is the sentence a reader acts on. Walked and
    // found by the human, an hour after the heading was fixed.
    for (const [name, verdict] of layouts) {
      const html = placed(verdict, UNSETTLED[0])!.html;
      expect(html, name).toContain(`<span class="st unsettled">${RULES_MET}</span>`);
      expect(html, name).not.toContain(STATUS_LABEL.met);
    }
  });

  it("neither the summary nor the headline says nothing is open when one is unsettled", () => {
    // Taking the unsettled routes out of "met" made the screen say "Nothing
    // open on these answers." directly above a section holding one, and left
    // them out of every tally on the page.
    expect(flat.action).toMatchObject({ kind: "compare", headline: unsettledHeadline(2) });
    expect(flat.announced).not.toBe(NOTHING_OPEN_HEADLINE);
    if (flat.layout.kind !== "one-country") throw new Error("the France reader drew country sections");
    expect(flat.layout.strip.unsettled).toBe(2);
    // A closed route is counted on the summary too, apart from the three verdicts.
    const closing = verdictFor(transferring("DZ"));
    if (closing.layout.kind !== "one-country") throw new Error("the France reader drew country sections");
    expect(closing.layout.strip.closed).toBe(1);
  });
  it("the section's own line names no country and no passport", () => {
    for (const word of ["France", "Algeria", "Algerian", "French"])
      expect(UNSETTLED_SECTION_LINE, word).not.toContain(word);
  });
});
