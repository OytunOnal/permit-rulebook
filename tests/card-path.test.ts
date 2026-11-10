import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { routeStatements, type Dataset, type Profile } from "permit-rulebook-data";
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

/** Persona A of the v1.2.2 critique (W1): a Turkish passport, a German offer,
 * a degree not yet assessed, IT, five years in seven, on the shortage list,
 * €45,934.20–€50,700. */
const PERSONA_A: Profile = {
  destination: "de", situation: "offer", qualification: "degree", citizenship: "TR", recognition_de: "not_assessed",
  experience_5y: "2plus", experience_7y: "5plus", occupation_shortage: "yes", occupation_it: "yes",
  salary_eur_year: "band_5", german: "a1", english: "c1", age_band: "a30to35", funds_eur_month: "unknown",
};

/** The shortage Blue Card: degree or IT, persona A's met route. */
const SHORTAGE = "de-blue-card-shortage";
/** The orientation year: where you studied, with one path-linked item. */
const ORIENTATION = "nl-orientation-year";

/** The "Also required" items a route links to one of its paths, by the path's
 * words, as the dataset writes them; a route with none fails the case. */
function linkedItemsOf(route: string, path: string): string[] {
  const found = ds.countries.flatMap((c) => c.routes).find((r) => r.id === route);
  if (!found) throw new Error(`no route ${route} in the dataset`);
  const items = routeStatements(found).filter((s) => s.path === path).map((s) => s.text);
  if (!items.length) throw new Error(`${route} links no item to ${path}`);
  return items;
}

/** The two items the shortage Blue Card links to its IT-specialist path. */
const IT_PATH_ITEMS = linkedItemsOf(SHORTAGE, "the IT-specialist path");
/** The orientation year's one item for designated foreign institutions. */
const [DESIGNATED_ITEM] = linkedItemsOf(ORIENTATION, "the designated-foreign-institution path");

/** The recognised-degree path's unmet rule for a degree not yet assessed, in the not-yet row's form. */
const RECOGNISED_PATH_UNMET = "The recognised-degree path needs full German recognition — you declared Not assessed yet.";

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
    label: "vocational qualification", subject: "the vocational path",
    criteria: [{ field: "qualification", op: "eq", value: "vocational" }],
  });
  return written;
}

describe("a full card says the path it went through", () => {
  it("persona A, not yet assessed, on the met band: met through the IT-specialist path, the recognised-degree path's unmet rule after it, the two IT items kept", () => {
    const card = cardOn(ds, PERSONA_A, SHORTAGE);
    expect(placed(verdictFor(PERSONA_A), SHORTAGE)?.kind).toBe("open");
    expect(pathLinesOf(card)).toEqual([`Met through the IT-specialist path. ${RECOGNISED_PATH_UNMET}`]);
    for (const item of IT_PATH_ITEMS) expect(alsoRequiredOf(card)).toContain(item);
    // Under the title, ahead of the route's summary.
    expect(card.indexOf('<div class="path">')).toBeGreaterThan(card.indexOf("</h3>"));
    expect(card.indexOf('<div class="path">')).toBeLessThan(card.indexOf('<p class="why">'));
  });

  it("persona A, fully recognised: met through the recognised-degree path, both paths met so one sentence only, the IT items gone", () => {
    const answers = { ...PERSONA_A, recognition_de: "recognized" };
    const card = cardOn(ds, answers, SHORTAGE);
    for (const item of IT_PATH_ITEMS) expect(plainTextOf(card)).not.toContain(item);
    expect(pathLinesOf(card)).toEqual(["Met through the recognised-degree path."]);
  });

  it("persona A on the lowest band, a card short on a figure: \"Through …\", whatever its badge says", () => {
    const answers = { ...PERSONA_A, salary_eur_year: "band_0" };
    const card = cardOn(ds, answers, SHORTAGE);
    expect(placed(verdictFor(answers), SHORTAGE)?.kind).toBe("within-reach");
    expect(pathLinesOf(card)).toEqual([`Through the IT-specialist path. ${RECOGNISED_PATH_UNMET}`]);
  });

  it("a criterion with three paths, on a written dataset: each other path states its unmet rule in turn", () => {
    const card = cardOn(withThirdShortagePath(), PERSONA_A, SHORTAGE);
    expect(pathLinesOf(card)).toEqual([
      `Met through the IT-specialist path. ${RECOGNISED_PATH_UNMET} `
      + "The vocational path needs vocational training of 2+ years — you declared University degree.",
    ]);
  });
});

describe("an \"Also required\" item linked to a path shows only when that path decided", () => {
  it("the orientation year's linked item shows when the designated-foreign-institution path decided, and drops when the Dutch-institution path did", () => {
    const reader: Profile = { destination: "nl", citizenship: "IN", nl_recent_grad: "no", top200_grad: "yes" };
    const dutch = cardOn(ds, { ...reader, nl_recent_grad: "yes" }, ORIENTATION);
    expect(plainTextOf(dutch)).not.toContain(DESIGNATED_ITEM);
    expect(pathLinesOf(dutch)).toEqual(["Met through the Dutch-institution path."]);

    const designated = cardOn(ds, reader, ORIENTATION);
    expect(alsoRequiredOf(designated)).toContain(DESIGNATED_ITEM);
    expect(pathLinesOf(designated)).toEqual([
      "Met through the designated-foreign-institution path. "
      + "The Dutch-institution path needs a degree from a Dutch university or research institution, from the last 3 years — you declared No.",
    ]);
  });

  it("a not-yet row carries no path line, and keeps a path-linked item as written", () => {
    const answers = { ...PERSONA_A, occupation_it: "no" };
    expect(placed(verdictFor(answers), SHORTAGE)?.kind).toBe("not-yet");
    const row = cardOn(ds, answers, SHORTAGE);
    expect(pathLinesOf(row)).toEqual([]);
    for (const item of IT_PATH_ITEMS) expect(alsoRequiredOf(row)).toContain(item);
  });
});
