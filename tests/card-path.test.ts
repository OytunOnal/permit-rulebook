import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  fieldOptions, routeStatements, scopeLine, type Dataset, type Profile, type Route, type RouteStatement,
} from "permit-rulebook-data";
import { otherPathNeedsLine, pathTakenLine } from "../src/lib/copy/verdict.js";
import { PERSONA_A } from "./personas.js";
import { plainTextOf } from "./reader-pages.js";
import { blocksIn, drawnRouteOn, placed, verdictFor, verdictOn, withoutGlosses } from "./verdict-cards.js";

/**
 * A result card says the path it went through (#315, seam 1 of #310): one
 * line per criterion whose paths the dataset names, under the title, in the
 * badge's words, then each other path's unmet rules in the not-yet rows' form
 * (rulings 3, 4 and 18 on #187 and #310); and an "Also required" item linked
 * to one path shows only when that path decided (ruling 5).
 */

const ds = dataset as unknown as Dataset;

/** The shortage Blue Card: degree or IT, persona A's met route. */
const SHORTAGE = "de-blue-card-shortage";
/** The orientation year: where you studied, with one path-linked item. */
const ORIENTATION = "nl-orientation-year";

/** A route of the shipped dataset, by its id; one it lacks fails the case. */
function shippedRouteOf(id: string): Route {
  const found = ds.countries.flatMap((c) => c.routes).find((r) => r.id === id);
  if (!found) throw new Error(`no route ${id} in the dataset`);
  return found;
}

/** The statements a route links to one of its paths, by the path's words; a
 * route with none fails the case. */
function linkedStatementsOf(route: string, path: string): RouteStatement[] {
  const linked = routeStatements(shippedRouteOf(route)).filter((s) => s.path === path);
  if (!linked.length) throw new Error(`${route} links no item to ${path}`);
  return linked;
}

/** The "Also required" items a route links to one of its paths, as the dataset writes them. */
const linkedItemsOf = (route: string, path: string): string[] => linkedStatementsOf(route, path).map((s) => s.text);

/** The paths the cases name, by the dataset's words. */
const IT_PATH = "the IT-specialist path";
const RECOGNISED_PATH = "the recognised-degree path";  // the shortage Blue Card's other way in
const DUTCH_PATH = "the Dutch-institution path";  // the orientation year's first way in
const DESIGNATED_PATH = "the designated-foreign-institution path";  // its second
const VOCATIONAL_PATH = "the vocational path";  // the third path a written dataset adds

/** The two items the shortage Blue Card links to its IT-specialist path. */
const IT_PATH_ITEMS = linkedItemsOf(SHORTAGE, IT_PATH);
/** The orientation year's one item for designated foreign institutions. */
const [DESIGNATED_ITEM] = linkedItemsOf(ORIENTATION, DESIGNATED_PATH);

/** An answer's words, from the dataset: its button's label, and its short
 * phrase where it has one. */
function answerOf(field: string, value: string): { label: string; short: string } {
  const option = fieldOptions(ds, field).find((o) => o.value === value);
  if (!option?.short) throw new Error(`${field} has no answer ${value} with a short phrase`);
  return { label: option.label, short: option.short };
}

/** The recognised-degree path's unmet rule for a degree not yet assessed, in the not-yet row's form. */
const RECOGNISED_PATH_UNMET = otherPathNeedsLine(RECOGNISED_PATH, [
  { asks: answerOf("recognition_de", "recognized").short, declared: answerOf("recognition_de", "not_assessed").label },
]);

/** A card's markup, without the abbreviations' explainers. */
const cardOn = (data: Dataset, answers: Profile, route: string): string =>
  withoutGlosses(drawnRouteOn(verdictOn(data, answers), route));

/** The path lines a card draws, as text, one per marked criterion. */
const pathLinesOf = (html: string): string[] =>
  [...html.matchAll(/<div class="path">[\s\S]*?<\/div>/g)].map((m) => plainTextOf(m[0]));

/** The "Also required" blocks of a card, as text. */
const alsoRequiredOf = (html: string): string => plainTextOf(blocksIn(html, "precond", "precond asked"));

/** The shipped dataset with a third path on the shortage Blue Card's degree-or-IT criterion. */
function withThirdShortagePath(): Dataset {
  const written = structuredClone(ds);
  const route = written.countries.flatMap((c) => c.routes).find((r) => r.id === SHORTAGE)!;
  const marked = route.criteria.find((c) => c.op === "any" && c.paths.some((p) => p.subject !== undefined));
  if (marked?.op !== "any") throw new Error("the shortage Blue Card has no marked criterion");
  marked.paths.push({
    label: "vocational qualification", subject: VOCATIONAL_PATH,
    criteria: [{ field: "qualification", op: "eq", value: "vocational" }],
  });
  return written;
}

/** The shipped dataset with the open question the Algerian talent routes
 * carry put over the shortage Blue Card for persona A's Turkish passport. */
function withOpenQuestionOverShortage(): Dataset {
  const written = structuredClone(ds);
  const shipped = written.notices?.find((n) => n.kind === "open-question");
  if (!shipped) throw new Error("the dataset carries no open question to copy");
  written.notices?.push({
    ...structuredClone(shipped), id: "written-open-question",
    when: { field: "citizenship", op: "eq", value: "TR" }, routes: [SHORTAGE],
  });
  return written;
}

describe("a card under \"unsettled for your passport\" names its path in the badge's words", () => {
  it("an open question over the shortage Blue Card, on a written dataset: \"Rules met through …\"", () => {
    const written = withOpenQuestionOverShortage();
    expect(placed(verdictOn(written, PERSONA_A), SHORTAGE)?.kind).toBe("unsettled");
    expect(pathLinesOf(cardOn(written, PERSONA_A, SHORTAGE))).toEqual([
      `${pathTakenLine("rules-met", IT_PATH)} ${RECOGNISED_PATH_UNMET}`,
    ]);
  });
});

describe("a full card says the path it went through", () => {
  it("persona A, not yet assessed, on the met band: met through the IT-specialist path, the recognised-degree path's unmet rule after it, the two IT items kept", () => {
    const card = cardOn(ds, PERSONA_A, SHORTAGE);
    expect(placed(verdictFor(PERSONA_A), SHORTAGE)?.kind).toBe("open");
    expect(pathLinesOf(card)).toEqual([`${pathTakenLine("met", IT_PATH)} ${RECOGNISED_PATH_UNMET}`]);
    for (const item of IT_PATH_ITEMS) expect(alsoRequiredOf(card)).toContain(item);
    // Under the title, ahead of the route's summary.
    expect(card.indexOf('<div class="path">')).toBeGreaterThan(card.indexOf("</h3>"));
    expect(card.indexOf('<div class="path">')).toBeLessThan(card.indexOf('<p class="why">'));
  });

  it("persona A, fully recognised: met through the recognised-degree path, both paths met so one sentence only, the IT items gone", () => {
    const answers = { ...PERSONA_A, recognition_de: "recognized" };
    const card = cardOn(ds, answers, SHORTAGE);
    for (const item of IT_PATH_ITEMS) expect(plainTextOf(card)).not.toContain(item);
    expect(pathLinesOf(card)).toEqual([pathTakenLine("met", RECOGNISED_PATH)]);
  });

  it("persona A on the lowest band, a card short on a figure: \"Through …\", whatever its badge says", () => {
    const answers = { ...PERSONA_A, salary_eur_year: "band_0" };
    const card = cardOn(ds, answers, SHORTAGE);
    expect(placed(verdictFor(answers), SHORTAGE)?.kind).toBe("within-reach");
    expect(pathLinesOf(card)).toEqual([`${pathTakenLine("short", IT_PATH)} ${RECOGNISED_PATH_UNMET}`]);
  });

  it("a criterion with three paths, on a written dataset: each other path states its unmet rule in turn", () => {
    const card = cardOn(withThirdShortagePath(), PERSONA_A, SHORTAGE);
    const vocationalUnmet = otherPathNeedsLine(VOCATIONAL_PATH, [
      { asks: answerOf("qualification", "vocational").short, declared: answerOf("qualification", "degree").label },
    ]);
    expect(pathLinesOf(card)).toEqual([`${pathTakenLine("met", IT_PATH)} ${RECOGNISED_PATH_UNMET} ${vocationalUnmet}`]);
  });
});

describe("an \"Also required\" item linked to a path shows only when that path decided", () => {
  it("the orientation year's linked item shows when the designated-foreign-institution path decided, and drops when the Dutch-institution path did", () => {
    const reader: Profile = { destination: "nl", citizenship: "IN", nl_recent_grad: "no", top200_grad: "yes" };
    const dutch = cardOn(ds, { ...reader, nl_recent_grad: "yes" }, ORIENTATION);
    expect(plainTextOf(dutch)).not.toContain(DESIGNATED_ITEM);
    expect(pathLinesOf(dutch)).toEqual([pathTakenLine("met", DUTCH_PATH)]);

    const designated = cardOn(ds, reader, ORIENTATION);
    expect(alsoRequiredOf(designated)).toContain(DESIGNATED_ITEM);
    const dutchUnmet = otherPathNeedsLine(DUTCH_PATH, [
      { asks: answerOf("nl_recent_grad", "yes").short, declared: answerOf("nl_recent_grad", "no").label },
    ]);
    expect(pathLinesOf(designated)).toEqual([`${pathTakenLine("met", DESIGNATED_PATH)} ${dutchUnmet}`]);
  });

  it("a not-yet row carries no path line, and keeps a path-linked item as written", () => {
    const answers = { ...PERSONA_A, occupation_it: "no" };
    expect(placed(verdictFor(answers), SHORTAGE)?.kind).toBe("not-yet");
    const row = cardOn(ds, answers, SHORTAGE);
    expect(pathLinesOf(row)).toEqual([]);
    for (const item of IT_PATH_ITEMS) expect(alsoRequiredOf(row)).toContain(item);
  });
});

/** A card's scope line, as text. */
const scopeOf = (card: string): string => plainTextOf(blocksIn(card, "scoped"));
/** A card's source list, as text. */
const sourcesOf = (card: string): string => plainTextOf(blocksIn(card, "srcs"));

describe("an item a card drops is gone from its scope line's count and its source list too (ruling 5)", () => {
  const shortage = shippedRouteOf(SHORTAGE);
  const dropped = linkedStatementsOf(SHORTAGE, IT_PATH);
  const quotes = dropped.map((s) => s.source?.quote ?? "");
  /** The shortage Blue Card as a card met through the recognised-degree path states it. */
  const asStated: Route = { ...shortage, statements: routeStatements(shortage).filter((s) => !dropped.includes(s)) };

  it("persona A, not yet assessed: the IT path decided, so its items' count and quotes stand", () => {
    expect(quotes.every((q) => q !== ""), "precondition: each IT item stands on a quote").toBe(true);
    const card = cardOn(ds, PERSONA_A, SHORTAGE);
    expect(scopeOf(card)).toContain(scopeLine(shortage, { reader: "answered", profile: PERSONA_A }));
    for (const quote of quotes) expect(sourcesOf(card)).toContain(quote);
  });

  it("persona A, fully recognised: the scope line does not count the dropped IT items, and the source list carries none of their quotes", () => {
    const recognised = { ...PERSONA_A, recognition_de: "recognized" };
    const counted = scopeLine(asStated, { reader: "answered", profile: recognised });
    expect(counted, "precondition: the IT items are counted on the route")
      .not.toBe(scopeLine(shortage, { reader: "answered", profile: recognised }));
    const card = cardOn(ds, recognised, SHORTAGE);
    expect(scopeOf(card)).toContain(counted);
    for (const quote of quotes) expect(sourcesOf(card)).not.toContain(quote);
  });
});
