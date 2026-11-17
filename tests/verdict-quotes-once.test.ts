import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { deriveBands, routeProvenance, type Dataset, type Profile } from "permit-rulebook-data";
import { esc } from "../src/lib/reason.js";
import { DOES_NOT_APPLY_TO_YOU } from "../src/lib/copy/verdict.js";
import {
  ALGERIAN, DENIZ, DUTCH_GRADUATE, DUTCH_OFFER_ON_FOUR, PERSONA_A, PERSONA_C, PRIYA, PRIYA_EXPLORING_ALL,
} from "./personas.js";
import { routeOf } from "./route-of.js";
import { blocksIn, drawnRouteOn, everyDrawnRouteIn, verdictFor } from "./verdict-cards.js";

/**
 * A card reads each sentence once, and its first quotes are the ones its
 * route was met through (#423; rulings 3, 4 and 5 on #420).
 */

const ds = dataset as unknown as Dataset;

/** A qualified offer in France on a Turkish passport: the talent permit's
 * salarié qualifié card is open. */
const FRENCH_QUALIFIED_OFFER: Profile = {
  destination: "fr", citizenship: "TR", situation: "offer", situation_country: "fr", qualification: "degree",
  fr_degree: "yes", fr_innovative_employer: "no", fr_local_contract: "no", experience_5y: "2plus",
  experience_7y: "5plus", salary_eur_year: deriveBands(ds, "salary_eur_year").at(-1)!.id,
};

/** Persona A with a recognised degree: the shortage Blue Card is met through the recognised-degree path. */
const RECOGNISED_A: Profile = { ...PERSONA_A, recognition_de: "recognized" };

/** The readers the verdict cases use, and a reader with no answers. */
const READERS: [string, Profile][] = [
  ["no answers", {}], ["persona A", PERSONA_A], ["persona A, recognised", RECOGNISED_A], ["persona C", PERSONA_C],
  ["Priya", PRIYA], ["Priya, all four", PRIYA_EXPLORING_ALL], ["Deniz", DENIZ], ["the Dutch graduate", DUTCH_GRADUATE],
  ["the Dutch offer on four", DUTCH_OFFER_ON_FOUR], ["the Algerian", ALGERIAN], ["the French qualified offer", FRENCH_QUALIFIED_OFFER],
];

/** One quote line a card prints: its markup, the sentence it quotes, whole,
 * as markup, and the page it links to. */
interface PrintedQuote {
  html: string;
  sentence: string;
  href: string;
}

/** The quote lines of a card's source list, in order. */
function printedQuotesOf(card: string): PrintedQuote[] {
  const sources = blocksIn(card, "srcs");
  return [...sources.matchAll(/<div class="src(?: (?!nosrc)[^"]*)?"[^>]*>[\s\S]*?<\/div>/g)].map((m) => {
    const html = m[0];
    const title = /^<div[^>]*\btitle="([^"]*)"/.exec(html)?.[1];
    const shown = /<q\b[^>]*>([\s\S]*?)<\/q>/.exec(html)?.[1];
    const href = /<a\b[^>]*\bhref="([^"]*)"/.exec(html)?.[1];
    if (shown === undefined || href === undefined) throw new Error(`a quote line with no quote or link: ${html.slice(0, 160)}`);
    return { html, sentence: title ?? shown, href };
  });
}

/** Each drawn route of every reader, named for a failure. */
const everyCard = (): { where: string; quotes: PrintedQuote[] }[] =>
  READERS.flatMap(([name, answers]) =>
    everyDrawnRouteIn(verdictFor(answers)).map((d) => ({ where: `${name}: ${d.route}`, quotes: printedQuotesOf(d.html) })));

describe("a card reads each sentence once", () => {
  it("over every drawn route of the shipped dataset, no card prints a quote line twice", () => {
    const cards = everyCard();
    expect(cards.filter((c) => c.quotes.length > 1).length, "precondition: cards print several quote lines").toBeGreaterThan(20);
    const offenders = cards.flatMap(({ where, quotes }) =>
      quotes.filter((q, i) => quotes.findIndex((o) => o.sentence === q.sentence && o.href === q.href) !== i)
        .map((q) => `${where}: ${q.sentence.slice(0, 80)}`));
    expect(offenders).toEqual([]);
  });

  it("over every drawn route, no quote line's sentence is contained in another quote line from the same page on the same card", () => {
    const cards = everyCard();
    const samePage = cards.filter(({ quotes }) => quotes.some((q, i) => quotes.findIndex((o) => o.href === q.href) !== i));
    expect(samePage.length, "precondition: cards print several quote lines from one page").toBeGreaterThan(20);
    const offenders = cards.flatMap(({ where, quotes }) =>
      quotes.filter((q) => quotes.some((o) => o !== q && o.href === q.href && o.sentence !== q.sentence && o.sentence.includes(q.sentence)))
        .map((q) => `${where}: ${q.sentence.slice(0, 80)}`));
    expect(offenders).toEqual([]);
  });

  it("fr-talent-qualifie's card prints \"Avoir un contrat de travail de plus de 3 mois\" once, inside the salary line", () => {
    const card = drawnRouteOn(verdictFor(FRENCH_QUALIFIED_OFFER), "fr-talent-qualifie");
    const carrying = printedQuotesOf(card).filter((q) => q.sentence.includes(esc("Avoir un contrat de travail de plus de 3 mois")));
    const salary = routeProvenance(routeOf(ds, "fr-talent-qualifie")).find((e) => e.amount !== undefined);
    expect(salary, "precondition: the route quotes its salary threshold").toBeDefined();
    expect(carrying.map((q) => q.sentence)).toEqual([esc(salary!.value.quote)]);
  });
});

/** The shortage Blue Card: degree or IT. */
const SHORTAGE = "de-blue-card-shortage";

/** The sentences the shortage Blue Card's IT-specialist path is decided on, as the dataset writes them. */
function itPathSentences(): string[] {
  const marked = routeOf(ds, SHORTAGE).criteria.find((c) => c.op === "any" && c.paths.some((p) => p.subject === "the IT-specialist path"));
  if (marked?.op !== "any") throw new Error("the shortage Blue Card has no IT-specialist path");
  const it = marked.paths.find((p) => p.subject === "the IT-specialist path")!;
  return routeProvenance({ ...routeOf(ds, SHORTAGE), criteria: it.criteria, statements: [] }).map((e) => e.value.quote);
}

describe("a card's first quotes are the ones its route was met through", () => {
  it("the met shortage Blue Card, recognised-degree path: that path's quotes first, the IT path's after, each dimmed and marked \"does not apply to you\"", () => {
    const quotes = printedQuotesOf(drawnRouteOn(verdictFor(RECOGNISED_A), SHORTAGE));
    const itPath = itPathSentences().map(esc);
    expect(itPath.length, "precondition: the IT path quotes sentences").toBeGreaterThan(0);
    const firstNotTaken = quotes.findIndex((q) => itPath.includes(q.sentence));
    expect(firstNotTaken, "the card prints the IT path's quotes").not.toBe(-1);
    expect(firstNotTaken, "the recognised-degree path's quotes come first").toBeGreaterThan(0);
    const [taken, notTaken] = [quotes.slice(0, firstNotTaken), quotes.slice(firstNotTaken)];
    expect(notTaken.map((q) => q.sentence)).toEqual(itPath);
    for (const q of notTaken) {
      expect(q.html.startsWith('<div class="src unapplied"'), q.sentence).toBe(true);
      expect(q.html, q.sentence).toContain(DOES_NOT_APPLY_TO_YOU);
    }
    for (const q of taken) {
      expect(q.html.startsWith('<div class="src"'), q.sentence).toBe(true);
      expect(q.html, q.sentence).not.toContain(DOES_NOT_APPLY_TO_YOU);
    }
  });
});
