import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  closedBy, deriveBands, evaluate, noticeSources, notices, resultProvenance,
  type Dataset, type Notice, type Profile,
} from "permit-rulebook-data";
import { esc, escAttr } from "../src/lib/reason.js";
import { linkLabelOf } from "../src/lib/quote.js";
import { APPLIES_TO_YOU, DOES_NOT_APPLY_TO_YOU, perPeriod } from "../src/lib/copy/verdict.js";
import { ALGERIAN, PRIYA_EXPLORING_ALL } from "./personas.js";
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
    const own = line.href === escAttr(source_url) && line.text === `${esc(linkLabelOf(source_url))} &#8599;`;
    return own ? [] : [`${where}: ${source_url} has ${line.href ?? "no link"}`];
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

/** The Dutch graduate whose card settles one of two amounts (card.test.ts). */
const DUTCH_GRADUATE: Profile = {
  destination: "nl", citizenship: "TR", situation: "offer", qualification: "degree",
  age_band: "u30", nl_recent_grad: "yes", top200_grad: "no", occupation_it: "no",
  salary_eur_month: deriveBands(ds, "salary_eur_month").find((b) => (b.min ?? 0) <= 3500 && 3500 < (b.max ?? Infinity))!.id,
};

/** The line on the graduate's under-30 card that quotes this amount. */
function graduateLineQuoting(amount: string): QuoteLine {
  const lines = quoteLinesIn(blocksIn(drawnRouteOn(verdictFor(DUTCH_GRADUATE), "nl-hsm-under30"), "srcs"));
  const line = lines.find((l) => l.html.includes(amount));
  if (!line) throw new Error(`no line quotes ${amount}`);
  return line;
}

describe(KEPT, () => {
  it("a card keeps its link to the permit's official page at its foot", () => {
    for (const [name, answers] of CARD_READERS)
      for (const drawn of everyDrawnRouteIn(verdictFor(answers))) {
        const route = ds.countries.flatMap((c) => c.routes).find((r) => r.id === drawn.route)!;
        const foot = /<div class="foot">[\s\S]*<\/div>(\s*<a class="next" href="([^"]*)")/.exec(drawn.html);
        expect(foot?.[2], `${name}: ${drawn.route}`).toBe(escAttr(route.info_url));
      }
  });

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
