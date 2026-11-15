import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  fieldOptions, forEachCriterion,
  type Dataset, type Profile,
} from "permit-rulebook-data";
import { EITHER_PATH, dailyCheck } from "../src/lib/copy/route-page.js";
import { proseProvenanceCounts } from "../src/lib/copy/data-page.js";
import { questionCounter } from "../src/lib/copy/interview.js";
import { glossSection, glossed } from "../src/lib/gloss.js";
import { questionCardHtml } from "../src/lib/question.js";
import { routePage, routePages } from "../src/lib/route-page/route-page.js";
import { dataPage } from "../src/lib/data-page.js";
import { watchState } from "../src/lib/site.js";
import { watchStateAt } from "./watch-state-at.js";
import { reckonDatasetFacts, routeFactsOf } from "../src/lib/dataset-facts/reckon-dataset-facts.js";
import { routeAddresses } from "../src/lib/slug.js";
import { blocksIn, drawnRouteOn, verdictFor } from "./verdict-cards.js";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));
const textOf = (html: string): string =>
  html.replace(/<[^>]*>/g, " ").split(/\s+/).join(" ").split(String.fromCharCode(160)).join(" ").trim();

const routeOf = (id: string) => ds.countries.flatMap((c) => c.routes).find((r) => r.id === id)!;

/**
 * s23 — the copy pass (v1.1 gate critique, F1, F3, F4, P1–P6), on the pages:
 * the route page's liveness line, citations, a rule's limbs, the curator's
 * note, `/data/`'s provenance line and the question counter. The result
 * screen's half is `s23-result-copy.test.ts`.
 *
 * Every case reads a rendered string, because every finding was one: a
 * sentence that contradicted the reader, named what they could not see,
 * repeated itself, or spoke the model's language.
 */

/** Priya: Indian analyst exploring all four (persona P2). No offer; one point short of the Opportunity Card. */
const PRIYA: Profile = {
  destination: "all", citizenship: "IN", situation: "none", qualification: "degree", recognition_de: "unknown",
  occupation_shortage: "unknown", experience_5y: "2plus", experience_7y: "3to5", german: "none", english: "c1", nl_recent_grad: "no",
  top200_grad: "unknown", funds_eur_month: "band_1", age_band: "u30", de_stay6m: "no", partner_ck: "no",
};

describe("the route page's liveness line names its own source or stays silent", () => {
  const run = reckonDatasetFacts(ds, watchState).watchRun.lastRun;
  const address = (id: string) => routeAddresses(ds).find((a) => a.route.id === id)!;
  /**
   * An unread source of the Opportunity Card's own: its points table's page.
   * Named through the criterion, since the page's first source is the
   * citizenship card's, which every scored page prints.
   */
  const pointsTables: string[] = [];
  forEachCriterion(routeOf("de-chancenkarte").criteria, (c) => {
    if (c.op === "points") pointsTables.push(c.required.source_url);
  });
  const ownUrl = pointsTables[0]!;
  // As the watchlist names it, so the state's own reading of it stands behind the page.
  const own = { id: "buzer-anlage-aufenthg", url: ownUrl };
  const other = {
    id: "es-uge-umbral-pdf",
    url: "https://www.inclusion.gob.es/documents/d/unidadgrandesempresas/umbral-salarial.pdf",
  };

  it("a route whose own source went unread says so, and says the values still show their read day", () => {
    const html = routePage(ds, address("de-chancenkarte"), watchStateAt(run, [own])).html;
    expect(textOf(html)).toContain(
      "a daily check re-reads every source; the last run did not reach one of this route's sources; "
      + "its values still show the day they were read.");
    expect(dailyCheck(1)).toBe(
      "a daily check re-reads every source; the last run did not reach one of this route's sources; "
      + "its values still show the day they were read");
    expect(dailyCheck(2)).toContain("two of this route's sources; their values");
    // No country in the sentence.
    expect(dailyCheck(1)).not.toMatch(/German|Spanish|French|Dutch/);
  });

  it("a route none of whose sources went unread prints the plain line, whatever went unread elsewhere", () => {
    const html = routePage(ds, address("fr-talent-blue-card"), watchStateAt(run, [own, other])).html;
    expect(textOf(html)).toContain("a daily check re-reads every source. ");
    expect(textOf(html)).not.toContain("did not reach");
    expect(dailyCheck(0)).toBe("a daily check re-reads every source");
  });

  it("the footer's short form still counts every unread source the reader is looking at (s11)", () => {
    const html = routePage(ds, address("fr-talent-blue-card"), watchStateAt(run, [own, other])).html;
    expect(textOf(html)).toContain(`re-read daily (last run ${run} · 2 sources unread)`);
  });

  it("over every route: only the pages citing the unread source carry the clause", () => {
    const state = watchStateAt(run, [own]);
    const pages = routePages(ds, state);
    const facts = reckonDatasetFacts(ds, state);
    const citing = new Set(routeAddresses(ds).filter((a) => routeFactsOf(facts, a.route).unread.length).map((a) => a.path));
    expect(citing.size).toBeGreaterThan(0);
    expect(citing.size).toBeLessThan(pages.length);
    for (const page of pages)
      expect(textOf(page.html).includes("did not reach one of this route's sources"), page.path).toBe(citing.has(page.path));
  });

  it("/data/ keeps s11's sentence", () => {
    const html = dataPage(ds, watchStateAt(run, [own])).html;
    const since = watchState.entries[own.id]!.retrieved_at;
    expect(textOf(html)).toContain(`A German source did not answer on the last run; the values it backs were read on ${since}`);
  });
});

describe("a citation never restates its number, and the sign carries no explainer", () => {
  it("restates no number, and explains the act alone where the citation names one", () => {
    // A citation never restates its own number, and the act it names is said
    // once, in the citation's own bracket; the sign is read as a reader reads
    // it, with no words of its own.
    expect(glossSection("Opportunity Card (Chancenkarte, § 20a)", new Set()))
      .toBe("Opportunity Card (Chancenkarte, § 20a)");
    expect(glossSection("Experienced worker (§ 19c / § 6 BeschV)", new Set()))
      .toBe("Experienced worker (§ 19c / § 6 BeschV)");
    expect(glossSection("§ 18d states it", new Set())).toBe("§ 18d states it");
    expect(glossed("§ 18g AufenthG", new Set())).toBe("§ 18g AufenthG (the Residence Act)");
    expect(glossed("§ 6 BeschV", new Set())).toBe("§ 6 BeschV (the Employment Ordinance)");
    // Once per page.
    const seen = new Set<string>();
    glossed("§ 18g AufenthG", seen);
    expect(glossed("§ 18g AufenthG", seen)).toBe("§ 18g AufenthG");
  });

  it("no built page carries the number twice, and none carries the sign's explainer", () => {
    const pages = builtPages();
    expect(pages.length).toBeGreaterThan(30);
    for (const { path, text } of pages) {
      expect(text, path).not.toMatch(/§ ([0-9]+[a-z]?)[,;] sections? \1\b/);
      expect(text, path).not.toMatch(/\(§ [0-9]+[a-z]?, section/);
      expect(text, path).not.toContain("§ = section");
    }
  });
});

describe("a rule with limbs is one sentence", () => {
  it("a rule's limbs open on the copy module's lead-in, never 'Either of these answers this rule:'", () => {
    // The lead-in introduces one line per path: "either" for two paths, and
    // never for three (paths-named.test.ts).
    const html = routePage(ds, routeAddresses(ds).find((a) => a.route.id === "es-blue-card")!).html;
    expect(textOf(html)).toContain(EITHER_PATH);
    expect(textOf(html)).not.toContain("Either of these");
  });
});

describe("the curator's note stays in the data", () => {
  it("no card and no page carries it", () => {
    expect(blocksIn(drawnRouteOn(verdictFor(PRIYA), "de-chancenkarte"), "srcs")).not.toContain("times out");
    for (const { path, text } of builtPages()) expect(text, path).not.toContain("times out");
  });
});

describe("/data/'s provenance line", () => {
  it("counts what stands, and says nothing of a count of none", () => {
    expect(proseProvenanceCounts(41, 12, 0)).toBe("41 sourced, 12 ours");
    expect(proseProvenanceCounts(41, 12, 2)).toBe("41 sourced, 12 ours, 2 kept on a dated reason");
    const html = dataPage(ds).html;
    expect(textOf(html)).not.toContain("standing on a dated reason");
    expect(textOf(html)).not.toMatch(/\b0 kept on a dated reason/);
  });
});

describe("the question counter", () => {
  it("says about, not up to", () => {
    expect(questionCounter(1, 24)).toBe("Question 1 of about 24");
    const html = questionCardHtml({
      dataset: ds, question: { field: "destination", label: "x", options: fieldOptions(ds, "destination") },
      answers: {}, asked: [], editing: null, total: 24,
    });
    expect(textOf(html)).toContain("Question 1 of about 24");
    expect(textOf(html)).not.toContain("of up to");
    // The built first paint too.
    expect(textOf(readFileSync(join(dist, "index.html"), "utf8"))).toContain("of about");
  });
});

/** Every built page's text, for the sweeps above. */
function builtPages(): { path: string; text: string }[] {
  if (!existsSync(dist)) return [];
  const out: { path: string; text: string }[] = [];
  const walk = (dir: string, at: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, `${at}${name}/`);
      else if (name === "index.html") out.push({ path: at, text: textOf(readFileSync(full, "utf8")) });
    }
  };
  walk(dist, "/");
  return out;
}
