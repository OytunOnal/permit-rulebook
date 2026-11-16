import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  closedBy, deriveBands, evaluate, noticeSources, notices, resultProvenance,
  type Dataset, type Notice, type Profile,
} from "permit-rulebook-data";
import { esc, escAttr } from "../src/lib/reason.js";
import { hostOf, linkLabelOf } from "../src/lib/quote.js";
import { thisRouteOn } from "../src/lib/copy/quotes.js";
import { APPLIES_TO_YOU, DOES_NOT_APPLY_TO_YOU, perPeriod } from "../src/lib/copy/verdict.js";
import { ALGERIAN, DUTCH_GRADUATE, PRIYA_EXPLORING_ALL } from "./personas.js";
import { blocksIn, drawnRouteOn, everyDrawnRouteIn, verdictFor } from "./verdict-cards.js";

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

describe(LINKED, () => {
  it("under a notice, every quote line carries a link to its own source", () => {
    const offenders: string[] = [];
    let lines = 0;
    // The open question an Algerian passport raises, on three authorities, and
    // the notice that answers a European passport outright.
    for (const answers of [ALGERIAN, { ...ALGERIAN, citizenship: "eu_eea_ch" }]) {
      const said: Notice[] = notices(ds, answers);
      const quoted = said.flatMap((n) => noticeSources(n));
      const html = verdictFor(answers).notices;
      for (const article of html.match(/<article class="notice[\s\S]*?<\/article>/g) ?? []) {
        lines += quoteLinesIn(article).length;
        offenders.push(...linesWithoutTheirSource(article, quoted, `${answers.citizenship}: notice`));
      }
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

/** The line on the graduate's under-30 card that quotes this amount. */
function graduateLineQuoting(amount: string): QuoteLine {
  const lines = quoteLinesIn(blocksIn(drawnRouteOn(verdictFor(DUTCH_GRADUATE), "nl-hsm-under30"), "srcs"));
  const line = lines.find((l) => l.html.includes(amount));
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

/** Where, in a route's markup, each link to its route's authority's route
 * page starts: a link to `info_url` in the copy module's words. */
function authorityRoutePageLinksIn(html: string, infoUrl: string): number[] {
  const words = `${esc(thisRouteOn(hostOf(infoUrl)))}`;
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([^<]*)<\/a>/g)]
    .filter((m) => m[1] === escAttr(infoUrl) && m[2] === words)
    .map((m) => m.index);
}

/** Where a route's links to its authority's route page sit, said for a
 * failure: none, several, or one placed after the first quote line or before
 * the door (a card and a not-yet row) or the title (a closed row). Empty where
 * it carries exactly one, in its place. */
function misplacedAuthorityLink(html: string, infoUrl: string): string[] {
  const at = authorityRoutePageLinksIn(html, infoUrl);
  if (at.length !== 1) return [`${at.length} links to ${infoUrl}`];
  const firstQuote = html.indexOf('<div class="src');
  const after = shapeOf(html) === "closed row" ? html.indexOf("</h3>") : html.indexOf('class="door');
  const problems: string[] = [];
  if (after < 0 || at[0]! < after) problems.push("before its door or title");
  if (firstQuote >= 0 && at[0]! > firstQuote) problems.push("after its first quote line");
  return problems;
}

// The title these cases sit under; each block below repeats it, so a block stays a short function.
const AUTHORITY = "a route's link to its authority's route page stands apart from its quotes";

describe(AUTHORITY, () => {
  it("every full card, not-yet row and closed row carries one link to its authority's route page, in the copy's words, after its door or title and before its first quote line", () => {
    const offenders: string[] = [];
    const shapes = new Set<string>();
    for (const [name, answers] of SHAPE_READERS)
      for (const drawn of everyDrawnRouteIn(verdictFor(answers))) {
        const route = ds.countries.flatMap((c) => c.routes).find((r) => r.id === drawn.route)!;
        shapes.add(shapeOf(drawn.html));
        offenders.push(...misplacedAuthorityLink(drawn.html, route.info_url).map((p) => `${name}: ${drawn.route}: ${p}`));
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
        const beside = foot.replace(blocksIn(foot, "srcs"), "");
        if (beside.includes("<a ")) offenders.push(`${name}: ${drawn.route}`);
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
