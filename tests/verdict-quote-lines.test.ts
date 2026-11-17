import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  closedBy, deriveBands, evaluate, noticeSources, notices, resultProvenance,
  type Dataset, type Notice, type Profile,
} from "permit-rulebook-data";
import { esc, escAttr } from "../src/lib/reason.js";
import { glossedLearnLinkText, linkLabelOf } from "../src/lib/quote.js";
import { APPLIES_TO_YOU, DOES_NOT_APPLY_TO_YOU, perPeriod } from "../src/lib/copy/verdict.js";
import { authorityRoutePageLinksIn } from "./authority-route-page-links.js";
import { ALGERIAN, DUTCH_GRADUATE, PRIYA_EXPLORING_ALL } from "./personas.js";
import { blocksIn, drawnRouteOn, everyDrawnRouteIn, verdictFor } from "./verdict-cards.js";
import { routeOf } from "./route-of.js";

const ds = dataset as unknown as Dataset;

/**
 * Every quote on the results screen leads to the page it came from, as every
 * quote on a route page does: on a card, under a notice and under a closed
 * route's row, each quote line carries its own source link (#387; rulings 3,
 * 4, 11 and 12 on #323).
 */

/** A quoted sentence as the dataset holds it: its words and the page it is on. */
interface Quoted {
  quote: string;
  source_url: string;
}

/** One quote line as the screen draws it: its markup, and the link it carries, if any. */
interface QuoteLine {
  html: string;
  href: string | null;
  text: string | null;
}

/** Every line of a block that prints a quote, in order: the line that says a
 * route has no threshold quotes nothing and is left out. */
function quoteLinesIn(html: string): QuoteLine[] {
  return [...html.matchAll(/<div class="src(?! nosrc)[^"]*"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => {
    const link = /<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/.exec(m[0]);
    return { html: m[0], href: link?.[1] ?? null, text: link?.[2] ?? null };
  });
}

/** The quoted sentence a line prints: the longest of `candidates` whose words
 * the line shows, whole or, where a long one is trimmed, on its title. */
function quotedOn(line: QuoteLine, candidates: Quoted[]): Quoted {
  const printed = candidates
    .filter((c) => line.html.includes(esc(c.quote)) || line.html.includes(`title="${escAttr(c.quote)}"`))
    .sort((a, b) => b.quote.length - a.quote.length);
  if (!printed.length) throw new Error(`no candidate quote is printed on ${line.html.slice(0, 160)}`);
  return printed[0]!;
}

/** Each line that does not carry a link to its own quote's source, named. */
function linesWithoutTheirSource(html: string, candidates: Quoted[], where: string): string[] {
  return quoteLinesIn(html).flatMap((line) => {
    const { source_url } = quotedOn(line, candidates);
    const linksItsSource = line.href === escAttr(source_url) && line.text === `${esc(linkLabelOf(source_url))} &#8599;`;
    return linksItsSource ? [] : [`${where}: ${source_url} has ${line.href ?? "no link"}`];
  });
}

const topBand = (field: string): string => deriveBands(ds, field).at(-1)!.id;

/** The Algerian reader moved to France by their group: the transfer permit is closed to them (s8). */
const TRANSFERRED_ALGERIAN: Profile = {
  ...ALGERIAN, situation: "ict", salary_eur_month: topBand("salary_eur_month"),
};

/** A reader on the shipped dataset, every route on every card drawn for no one
 * in particular, and a reader exploring all four countries. */
const CARD_READERS: [string, Profile][] = [["no answers", {}], ["Priya, all four", PRIYA_EXPLORING_ALL]];

// The titles these cases sit under; each block below repeats one, so a block stays a short function.
const LINKED = "every quote line on the results screen links to its own source";
// The guards' title: what the line kept when it took its source link.
const KEPT = "what a results screen's quote line keeps beside its source link";

describe(LINKED, () => {
  it("on a result card, every quote line carries a link to its own source, on a card whose route quotes several", () => {
    const offenders: string[] = [];
    let severalSources = 0;
    for (const [name, answers] of CARD_READERS) {
      const results = evaluate(ds, answers);
      for (const drawn of everyDrawnRouteIn(verdictFor(answers))) {
        const result = results.find((r) => r.route.id === drawn.route)!;
        const quoted = resultProvenance(result, answers).map((e) => e.value);
        const sources = blocksIn(drawn.html, "srcs");
        if (new Set(quoteLinesIn(sources).map((l) => quotedOn(l, quoted).source_url)).size > 1) severalSources++;
        offenders.push(...linesWithoutTheirSource(sources, quoted, `${name}: ${drawn.route}`));
      }
    }
    expect(severalSources, "precondition: some card quotes more than one source").toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});

/** The readers whose screens draw every notice between them: the open
 * question an Algerian passport raises, on three authorities; the notice that
 * answers a European passport outright; and the rights a Turkish passport
 * adds (the Dutch graduate). */
const NOTICE_READERS: Profile[] = [ALGERIAN, { ...ALGERIAN, citizenship: "eu_eea_ch" }, DUTCH_GRADUATE];

/** The article a verdict draws a notice with, found by its kind; a kind drawn
 * other than once on the screen fails the case. */
function noticeArticleOf(html: string, n: Notice): string {
  const articles = (html.match(/<article class="notice[\s\S]*?<\/article>/g) ?? [])
    .filter((a) => a.startsWith(`<article class="notice ${escAttr(n.kind)}">`));
  if (articles.length !== 1) throw new Error(`${n.id}: ${articles.length} notices of its kind on the screen`);
  return articles[0]!;
}

/** A foot's markup with its quote lines taken out: what it carries beside them. */
const besideQuoteLines = (foot: string): string => foot.replace(blocksIn(foot, "srcs"), "");

/** Each link a notice's foot carries beside its quote lines: its address and its words. */
function footLinksOf(article: string): { href: string; text: string }[] {
  const foot = blocksIn(article, "foot");
  if (!foot) throw new Error(`a notice drawn with no foot: ${article.slice(0, 120)}`);
  return [...besideQuoteLines(foot).matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1]!, text: m[2]! }));
}

/** Every notice the notice readers are shown, each with the article it is drawn in. */
const drawnNotices = (): { n: Notice; article: string }[] =>
  NOTICE_READERS.flatMap((answers) => {
    const html = verdictFor(answers).notices;
    return notices(ds, answers).map((n) => ({ n, article: noticeArticleOf(html, n) }));
  });

describe(LINKED, () => {
  it("under a notice, every quote line carries a link to its own source", () => {
    const offenders: string[] = [];
    let lines = 0;
    const drawn = drawnNotices();
    expect(new Set(drawn.map(({ n }) => n.id)).size, "precondition: the readers draw every notice").toBe(ds.notices!.length);
    for (const { n, article } of drawn) {
      lines += quoteLinesIn(article).length;
      offenders.push(...linesWithoutTheirSource(article, noticeSources(n), `notice ${n.id}`));
    }
    expect(lines, "precondition: the notices print quotes").toBeGreaterThan(3);
    expect(offenders).toEqual([]);
  });

  it("under a closed route's row, every quote line carries a link to its own source", () => {
    const result = evaluate(ds, TRANSFERRED_ALGERIAN).find((r) => r.route.id === "fr-ict")!;
    const quoted = closedBy(result).flatMap((cr) => (cr.criterion.op === "not-in" ? [cr.criterion.source] : []));
    const row = drawnRouteOn(verdictFor(TRANSFERRED_ALGERIAN), "fr-ict");
    expect(quoteLinesIn(row).length, "precondition: the row prints its closing sentence").toBeGreaterThan(0);
    expect(linesWithoutTheirSource(row, quoted, "fr-ict")).toEqual([]);
  });
});

// The title these cases sit under: a notice's first quote line already links its leading source.
const NOTICE_FOOT = "a notice's foot links only to the page it sends the reader to";

describe(NOTICE_FOOT, () => {
  it("a notice with no page of its own to send the reader to carries no foot link", () => {
    const withoutPage = drawnNotices().filter(({ n }) => !n.learn);
    expect(withoutPage.length, "precondition: the readers draw a notice with no page of its own").toBeGreaterThan(0);
    const offenders = withoutPage.flatMap(({ n, article }) => footLinksOf(article).map((l) => `${n.id}: ${l.href}`));
    expect(offenders).toEqual([]);
  });

  it("a notice with a page of its own keeps its one foot link to that page, in the page's own words", () => {
    const withPage = drawnNotices().filter(({ n }) => n.learn);
    expect(withPage.length, "precondition: the readers draw a notice with a page of its own").toBeGreaterThan(0);
    for (const { n, article } of withPage)
      expect(footLinksOf(article), n.id).toEqual([
        { href: escAttr(n.learn!.url), text: esc(glossedLearnLinkText(n.learn!, new Set())) },
      ]);
  });
});

/** The line on the graduate's under-30 card whose quote ends on this amount:
 * the amount's own quote, not a statement that also names it in passing. */
function graduateLineQuoting(amount: string): QuoteLine {
  const lines = quoteLinesIn(blocksIn(drawnRouteOn(verdictFor(DUTCH_GRADUATE), "nl-hsm-under30"), "srcs"));
  const line = lines.find((l) => l.html.includes(`${amount}</q>`));
  if (!line) throw new Error(`no line quotes ${amount}`);
  return line;
}

/** The readers whose screens draw every route shape between them: not-yet
 * rows (the card readers), full cards (the Dutch graduate), and a closed row
 * (the Algerian moved to France by their group). */
const SHAPE_READERS: [string, Profile][] = [
  ...CARD_READERS, ["the Dutch graduate", DUTCH_GRADUATE], ["the transferred Algerian", TRANSFERRED_ALGERIAN],
];

/** The shape a route is drawn in, read off its markup's first tag. */
function shapeOf(html: string): "card" | "not-yet row" | "closed row" {
  const tag = /<(article|details) class="([^"]*)"/.exec(html);
  if (tag?.[2] === "route") return "card";
  if (tag?.[2] === "route-hold") return "not-yet row";
  if (tag?.[2] === "closed") return "closed row";
  throw new Error(`a route drawn in no shape this case knows: ${html.slice(0, 120)}`);
}

/** Where a route's links to its authority's route page sit, said for a
 * failure: none, several, or one placed after the first quote line or before
 * the door (a card and a not-yet row) or the title (a closed row). Empty where
 * it carries exactly one, in its place. */
function authorityLinkPlacementProblems(html: string, authorityRoutePageUrl: string): string[] {
  const links = authorityRoutePageLinksIn(html, authorityRoutePageUrl);
  if (links.length !== 1) return [`${links.length} links to ${authorityRoutePageUrl}`];
  const { at } = links[0]!;
  const firstQuote = html.indexOf('<div class="src');
  const after = shapeOf(html) === "closed row" ? html.indexOf("</h3>") : html.indexOf('class="door');
  const problems: string[] = [];
  if (after < 0 || at < after) problems.push("before its door or title");
  if (firstQuote >= 0 && at > firstQuote) problems.push("after its first quote line");
  return problems;
}

// The title these cases sit under; each block below repeats it, so a block stays a short function.
const AUTHORITY_LINK_STANDS_APART ="a route's link to its authority's route page stands apart from its quotes";

describe(AUTHORITY_LINK_STANDS_APART,() => {
  it("every full card, not-yet row and closed row carries one link to its authority's route page, in the copy's words, after its door or title and before its first quote line", () => {
    const offenders: string[] = [];
    const shapes = new Set<string>();
    for (const [name, answers] of SHAPE_READERS)
      for (const drawn of everyDrawnRouteIn(verdictFor(answers))) {
        const route = routeOf(ds, drawn.route);
        shapes.add(shapeOf(drawn.html));
        offenders.push(...authorityLinkPlacementProblems(drawn.html, route.info_url).map((p) => `${name}: ${drawn.route}: ${p}`));
      }
    expect([...shapes].sort(), "precondition: the readers draw every route shape").toEqual(["card", "closed row", "not-yet row"]);
    expect(offenders).toEqual([]);
  });

  it("no route card's foot carries a link beside its quote lines", () => {
    const offenders: string[] = [];
    let feet = 0;
    for (const [name, answers] of SHAPE_READERS)
      for (const drawn of everyDrawnRouteIn(verdictFor(answers))) {
        const foot = blocksIn(drawn.html, "foot");
        if (foot) feet++;
        if (besideQuoteLines(foot).includes("<a ")) offenders.push(`${name}: ${drawn.route}`);
      }
    expect(feet, "precondition: the cards draw a foot").toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});

describe(KEPT, () => {
  it("a card's amount keeps the period it is stated per", () => {
    expect(graduateLineQuoting("€ 3,122.00").html).toContain(` · ${perPeriod("month")}`);
  });

  it("a settled choice keeps its applies-to-you mark, and the ruled-out amount its dimming", () => {
    expect(graduateLineQuoting("€ 3,122.00").html).toContain(APPLIES_TO_YOU);
    expect(graduateLineQuoting("€ 3,122.00").html.startsWith('<div class="src"')).toBe(true);
    expect(graduateLineQuoting("€ 4,357.00").html).toContain(DOES_NOT_APPLY_TO_YOU);
    expect(graduateLineQuoting("€ 4,357.00").html.startsWith('<div class="src unapplied"')).toBe(true);
  });
});

describe(KEPT, () => {
  it("a long quote under a notice is trimmed, its whole text on the line's title", () => {
    const quoted = notices(ds, ALGERIAN).flatMap((n) => noticeSources(n));
    const long = quoted.filter((q) => q.quote.length > 200);
    expect(long.length, "precondition: the Algerian notices quote a long passage").toBeGreaterThan(0);
    const html = verdictFor(ALGERIAN).notices;
    const shown = html.replace(/ title="[^"]*"/g, "");
    for (const q of long) {
      expect(html, q.source_url).toContain(`title="${escAttr(q.quote)}"`);
      expect(shown, q.source_url).toContain(esc(q.quote.slice(0, 40)));
      expect(shown, q.source_url).not.toContain(esc(q.quote));
    }
  });
});
