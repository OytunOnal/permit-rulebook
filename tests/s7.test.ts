import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  evaluate, routeStatements, scopeLine,
  type Dataset, type Profile, type Route, type RouteResult,
} from "permit-rulebook-data";
import { NOT_CHECKED_HEADING, NOT_REQUIRED_FOR_YOUR_PASSPORT, ROUTE_DOOR } from "../src/lib/copy/verdict.js";
import { routePages } from "../src/lib/route-page.js";
import { blocksIn, cardOn, placed, verdictFor, verdictOn, withoutGlosses } from "./verdict-cards.js";

const ds = dataset as unknown as Dataset;

const routeOf = (id: string): Route =>
  ds.countries.flatMap((c) => c.routes).find((r) => r.id === id)!;

const resultOf = (answers: Profile, id: string): RouteResult =>
  evaluate(ds, answers).find((r) => r.route.id === id)!;

/** The rendered route page, by the address a person reads it at. */
const pageAt = (address: string): string =>
  routePages(ds).find((p) => p.path.includes(address))!.html;

/** A statement as the dataset writes it. A card explains a shorthand on its
 * first use on the screen (#156), so the blocks below are read without the
 * explainers. */
const statementText = (route: string, statement: string): string =>
  routeStatements(routeOf(route)).find((s) => s.id === statement)!.text;

const carveOutText = (route: string, statement: string): string =>
  routeStatements(routeOf(route)).find((s) => s.id === statement)!.except!.text;

/** A route's card on the verdict these answers read, on the shipped dataset
 * or on one a test writes. */
const cardFor = (answers: Profile, route: string, data: Dataset = ds): string =>
  cardOn(verdictOn(data, answers), route);
/** What else the card says is required, and what it says the passport is not
 * required to do — each read without the explainers. */
const precondOf = (answers: Profile, route: string): string =>
  withoutGlosses(blocksIn(cardFor(answers, route), "precond", "precond asked"));
const carveOutOf = (answers: Profile, route: string, data: Dataset = ds): string =>
  withoutGlosses(blocksIn(cardFor(answers, route, data), "caveat carveout"));

/**
 * The reader of the scenario: a job offer in the Netherlands, a salary above
 * the highly-skilled-migrant threshold, and everything else the interview asks
 * answered, so the route comes out met and the card is the full one.
 */
const turkish: Profile = {
  destination: "nl", citizenship: "TR", situation: "offer",
  salary_eur_month: "band_6", age_band: "a30to35", nl_recent_grad: "no", top200_grad: "no",
};
const japanese: Profile = { ...turkish, citizenship: "JP" };

/**
 * s7 — the scenario, on the screens a reader actually sees.
 *
 * The product asks which passport a reader would apply with and then scored
 * them against conditions the authority itself sets aside for that passport
 * (human walk on the live site). A condition the IND does not apply to this
 * reader is not one of the conditions stated to them, and the sentence that
 * says so takes its place — carrying its own quote, like every other value.
 */
describe("s7 — a Turkish passport on the Dutch highly skilled migrant route", () => {
  const SPONSOR = statementText("nl-hsm-30plus", "employer-must-be-a-recognised-sponsor");

  it("shows the route as it does today — a carve-out changes what is stated, never what is scored", () => {
    expect(resultOf(turkish, "nl-hsm-30plus").status).toBe("met");
    expect(resultOf(japanese, "nl-hsm-30plus").status).toBe("met");
  });

  it("does not state the recognised-sponsor condition to this reader", () => {
    const html = precondOf(turkish, "nl-hsm-30plus");
    expect(html).not.toContain(SPONSOR);
    // The conditions that DO bind are untouched: a carve-out releases one
    // sentence, never the block it sits in.
    expect(html).toContain(NOT_CHECKED_HEADING);
    expect(html).toMatch(/match what the job normally pays/);
  });

  it("puts the carve-out in its place, with the IND's own sentence and the day it was read", () => {
    const html = carveOutOf(turkish, "nl-hsm-30plus");
    expect(html).toContain(NOT_REQUIRED_FOR_YOUR_PASSPORT);
    expect(html).toContain(carveOutText("nl-hsm-30plus", "employer-must-be-a-recognised-sponsor"));
    // The quote itself goes where every quote on a card goes.
    const quotes = blocksIn(cardFor(turkish, "nl-hsm-30plus"), "srcs");
    expect(quotes).toContain("For employees with Turkish nationality, a recognised sponsor is not required.");
    expect(quotes).toContain("read 2026-09-10");
  });

  it("still tells this reader the application needs a provisional residence permit", () => {
    // Turkey is not among the passports the IND exempts (ten named in the
    // carve-out; the eleventh entry on the IND's list is the EU/EEA class).
    expect(precondOf(turkish, "nl-hsm-30plus")).toContain(statementText("nl-hsm-30plus", "mvv-needed"));
    expect(carveOutOf(turkish, "nl-hsm-30plus")).not.toContain(carveOutText("nl-hsm-30plus", "mvv-needed"));
  });

  it("states the sponsor condition to a Japanese passport, and drops the MVV line", () => {
    expect(precondOf(japanese, "nl-hsm-30plus")).toContain(SPONSOR);
    expect(carveOutOf(japanese, "nl-hsm-30plus"))
      .not.toContain(carveOutText("nl-hsm-30plus", "employer-must-be-a-recognised-sponsor"));
    expect(precondOf(japanese, "nl-hsm-30plus")).not.toContain(statementText("nl-hsm-30plus", "mvv-needed"));
    expect(carveOutOf(japanese, "nl-hsm-30plus")).toContain(carveOutText("nl-hsm-30plus", "mvv-needed"));
  });

  it("does not count a condition that does not bind this reader among the ones stated", () => {
    const route = routeOf("nl-hsm-30plus");
    const line = blocksIn(cardFor(turkish, "nl-hsm-30plus"), "scoped");
    expect(line).toContain(scopeLine(route, { reader: "answered", profile: turkish }));
    expect(line).not.toContain(scopeLine(route, { reader: "answered", profile: {} }));
    // Every card links on to the page that states the rules in full.
    expect(line).toContain(ROUTE_DOOR);
  });

  it("shows both halves on the route page, which has no reader", () => {
    const html = pageAt("highly-skilled-migrant-30-or-older");
    // The condition, as it stands for everybody.
    expect(html).toContain("recognised sponsor");
    expect(html).toContain("This employer is a sponsor recognised by the IND.");
    // And, under it, who it does not bind — its own words, its own quote, its
    // own read date.
    expect(html).toContain("Who this does not bind");
    expect(html).toContain("For employees with Turkish nationality, a recognised sponsor is not required.");
    expect(html).toContain("read 2026-09-10");
  });
});

describe("s7 — every card block reads the reader's passport", () => {
  it("escapes what it prints, like every other block", () => {
    const altered = structuredClone(ds);
    const route = altered.countries.flatMap((c) => c.routes).find((r) => r.id === "nl-hsm-30plus")!;
    const sponsor = routeStatements(route).find((s) => s.id === "employer-must-be-a-recognised-sponsor")!;
    sponsor.except!.text = "a & b <em>c</em>";
    expect(carveOutOf(turkish, "nl-hsm-30plus", altered)).toContain("a &amp; b &lt;em&gt;c&lt;/em&gt;");
  });

  it("says nothing where nothing is carved out", () => {
    // A German route names no passport at all, and a reader who has not
    // answered the passport question is bound by everything.
    expect(carveOutOf({ ...turkish, destination: "de" }, "de-blue-card-general")).toBe("");
    expect(carveOutOf({}, "nl-hsm-30plus")).toBe("");
    expect(precondOf({}, "nl-hsm-30plus"))
      .toContain(statementText("nl-hsm-30plus", "employer-must-be-a-recognised-sponsor"));
  });
});

/**
 * The spec named three routes and the page, and the tests above walked one
 * route through the card's helpers (Spec review, 2026-09-10: S2, N8). A block
 * the page forgets to call is a block that does not exist — the repository's
 * own idiom from s5e — so the page is read for the call, on both card layouts;
 * and the two routes the first walk did not touch get the same walk.
 */
describe("s7 — the other two permits the IND names, and the page that calls the block", () => {
  const SPONSORED: [string, string][] = [
    ["nl-hsm-30plus", "employer-must-be-a-recognised-sponsor"],
    ["nl-hsm-under30", "employer-must-be-a-recognised-sponsor"],
    ["nl-researcher", "the-institute-must-be-a-recognised-sponsor"],
  ];

  for (const [route, statement] of SPONSORED)
    it(`${route}: a Turkish passport is released from the sponsor condition, a Japanese one is not`, () => {
      const condition = statementText(route, statement);
      expect(precondOf(turkish, route)).not.toContain(condition);
      expect(carveOutOf(turkish, route)).toContain(carveOutText(route, statement));
      expect(precondOf(japanese, route)).toContain(condition);
      expect(carveOutOf(japanese, route)).not.toContain(carveOutText(route, statement));
    });

  it("the results page calls the carve-out block on both card layouts", () => {
    // The Turkish reader's open card for 30 or older and not-yet row for
    // under 30 both say what the IND releases them from.
    const verdict = verdictFor(turkish);
    const card = placed(verdict, "nl-hsm-30plus");
    const row = placed(verdict, "nl-hsm-under30");
    expect(card?.kind).toBe("open");
    expect(row?.kind).toBe("not-yet");
    for (const { html } of [card!, row!]) expect(html).toContain('<div class="caveat carveout">');
  });

  it("a route page shows who the provisional residence permit does not bind", () => {
    const page = routePages(ds).find((p) => p.path.includes("/netherlands/") && p.path.includes("researcher"));
    expect(page, "no Dutch researcher page was built").toBeDefined();
    expect(page!.html).toContain("Who this does not bind");
    // Its own words, after the condition above it has explained the MVV.
    const said = (statement: string): string =>
      routeStatements(routeOf("nl-researcher")).find((s) => s.id === statement)!.except!.text;
    expect(page!.html).toContain(said("mvv-needed"));
    expect(page!.html).toContain(said("the-institute-must-be-a-recognised-sponsor"));
  });
});
