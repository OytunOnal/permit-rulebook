import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  evaluate, routeStatements, scopeLine,
  type Dataset, type Profile, type Route, type RouteResult,
} from "permit-rulebook-data";
import { carveOutHtml, caveatHtml, precondHtml, provenanceHtml, scopedHtml } from "../src/lib/card.js";
import { routePages } from "../src/lib/route-page.js";

const ds = dataset as unknown as Dataset;

const routeOf = (id: string): Route =>
  ds.countries.flatMap((c) => c.routes).find((r) => r.id === id)!;

const resultOf = (answers: Profile, id: string): RouteResult =>
  evaluate(ds, answers).find((r) => r.route.id === id)!;

/** The rendered route page, by the address a person reads it at. */
const pageAt = (address: string): string =>
  routePages(ds).find((p) => p.path.includes(address))!.html;

const statementText = (route: string, statement: string): string =>
  routeStatements(routeOf(route)).find((s) => s.id === statement)!.text;

const carveOutText = (route: string, statement: string): string =>
  routeStatements(routeOf(route)).find((s) => s.id === statement)!.except!.text;

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
    const html = precondHtml(routeOf("nl-hsm-30plus"), turkish);
    expect(html).not.toContain(SPONSOR);
    // The conditions that DO bind are untouched: a carve-out releases one
    // sentence, never the block it sits in.
    expect(html).toContain("Also required — not checked here");
    expect(html).toMatch(/match what the job normally pays/);
  });

  it("puts the carve-out in its place, with the IND's own sentence and the day it was read", () => {
    const html = carveOutHtml(routeOf("nl-hsm-30plus"), turkish);
    expect(html).toContain("Not required for your passport");
    expect(html).toContain(carveOutText("nl-hsm-30plus", "employer-must-be-a-recognised-sponsor"));
    // The quote itself goes where every quote on a card goes.
    const quotes = provenanceHtml(ds, resultOf(turkish, "nl-hsm-30plus"), turkish);
    expect(quotes).toContain("For employees with Turkish nationality, a recognised sponsor is not required.");
    expect(quotes).toContain("read 2026-09-10");
  });

  it("still tells this reader the application needs a provisional residence permit", () => {
    // Turkey is not among the passports the IND exempts (ten named in the
    // carve-out; the eleventh entry on the IND's list is the EU/EEA class).
    expect(precondHtml(routeOf("nl-hsm-30plus"), turkish))
      .toContain(statementText("nl-hsm-30plus", "mvv-needed"));
    expect(carveOutHtml(routeOf("nl-hsm-30plus"), turkish))
      .not.toContain(carveOutText("nl-hsm-30plus", "mvv-needed"));
  });

  it("states the sponsor condition to a Japanese passport, and drops the MVV line", () => {
    expect(precondHtml(routeOf("nl-hsm-30plus"), japanese)).toContain(SPONSOR);
    expect(carveOutHtml(routeOf("nl-hsm-30plus"), japanese))
      .not.toContain(carveOutText("nl-hsm-30plus", "employer-must-be-a-recognised-sponsor"));
    expect(precondHtml(routeOf("nl-hsm-30plus"), japanese))
      .not.toContain(statementText("nl-hsm-30plus", "mvv-needed"));
    expect(carveOutHtml(routeOf("nl-hsm-30plus"), japanese))
      .toContain(carveOutText("nl-hsm-30plus", "mvv-needed"));
  });

  it("does not count a condition that does not bind this reader among the ones stated", () => {
    const route = routeOf("nl-hsm-30plus");
    const line = scopedHtml(route, turkish, "/netherlands/highly-skilled-migrant-30-or-older/");
    expect(line).toContain(scopeLine(route, turkish));
    expect(line).not.toContain(scopeLine(route, {}));
    // Every card links on to the page that states the rules in full.
    expect(line).toContain("The rules of this route");
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
    const route = structuredClone(routeOf("nl-hsm-30plus"));
    const sponsor = routeStatements(route).find((s) => s.id === "employer-must-be-a-recognised-sponsor")!;
    sponsor.except!.text = "a & b <em>c</em>";
    expect(carveOutHtml(route, turkish)).toContain("a &amp; b &lt;em&gt;c&lt;/em&gt;");
  });

  it("says nothing where nothing is carved out", () => {
    // A German route names no passport at all, and a reader who has not
    // answered the passport question is bound by everything.
    expect(carveOutHtml(routeOf("de-blue-card-general"), turkish)).toBe("");
    expect(carveOutHtml(routeOf("nl-hsm-30plus"), {})).toBe("");
    expect(precondHtml(routeOf("nl-hsm-30plus"), {}))
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
      expect(precondHtml(routeOf(route), turkish)).not.toContain(condition);
      expect(carveOutHtml(routeOf(route), turkish)).toContain(carveOutText(route, statement));
      expect(precondHtml(routeOf(route), japanese)).toContain(condition);
      expect(carveOutHtml(routeOf(route), japanese)).not.toContain(carveOutText(route, statement));
    });

  it("the results page calls the carve-out block on both card layouts", () => {
    const page = readFileSync(new URL("../src/pages/index.astro", import.meta.url), "utf8");
    expect(page.match(/\$\{carveOutFor\(r\)\}/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("a route page shows who the provisional residence permit does not bind", () => {
    const page = routePages(ds).find((p) => p.path.includes("/netherlands/") && p.path.includes("researcher"));
    expect(page, "no Dutch researcher page was built").toBeDefined();
    expect(page!.html).toContain("Who this does not bind");
    expect(page!.html).toContain(carveOutText("nl-researcher", "mvv-needed"));
    expect(page!.html).toContain(carveOutText("nl-researcher", "the-institute-must-be-a-recognised-sponsor"));
  });
});
