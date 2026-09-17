import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  SITUATION_FIELD, deriveBands, evaluate, fieldOptions, forEachCriterion, isScored, remainingQuestions,
  situationsAsked, type Dataset, type Profile, type Route,
} from "permit-rulebook-data";
import { RECORD_VERSION } from "../src/lib/record.js";
import { questionCardHtml } from "../src/lib/question.js";
import { notScoredFor, notScoredMarkHtml, unscoredVerdict } from "../src/lib/situations.js";
import { precondHtml } from "../src/lib/card.js";
import { NOT_CHECKED_HEADING, READ_ITS_RULES, READ_IT_HERE, notScoredLine, notScoredQuotedLine } from "../src/lib/copy.js";
import { mastheadFor } from "../src/lib/screen.js";
import { countryAddresses, countryPage } from "../src/lib/country-page.js";
import { dataPage } from "../src/lib/data-page.js";
import { routePages } from "../src/lib/route-page.js";
import { url } from "../src/lib/site.js";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

const textOf = (html: string): string =>
  html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ").trim();

const situationQuestion = () => remainingQuestions(ds, { destination: "fr" }).find((q) => q.field === SITUATION_FIELD)!;

/** The situation screen, drawn by the one renderer, for a reader who declared this destination. */
const situationScreen = (destination: string): string =>
  questionCardHtml({
    dataset: ds, question: situationQuestion(), answers: { destination }, asked: ["destination"],
    editing: null, total: 12,
  });

/** The marks on a drawn situation screen, keyed by the option they sit under.
 * The mark carries an id since s21 (its button is described by it); what is
 * read here is the mark, whatever else it carries. */
function marksOn(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<small class="opt-mark"[^>]*data-for="([^"]+)"[^>]*>([\s\S]*?)<\/small>/g;
  for (let m = re.exec(html); m; m = re.exec(html)) out[m[1]!] = m[2]!;
  return out;
}

/**
 * s19 — a situation no scored route asks.
 *
 * A researcher with a French hosting agreement chose France, then the
 * research answer, and read "Nothing open on these answers" — for a route that
 * was merely absent (v1.1 gate critique B1). The fact was derivable and nothing
 * derived it: France's five scored routes gate on offer or ict, and the
 * interview offered research anyway.
 */
describe("s19 — the interview knows which situations a destination's scored routes ask", () => {
  it("derives the France mark from the dataset, and links the quoted route that would have asked", () => {
    const mark = notScoredFor(ds, "fr", "research");
    expect(mark).not.toBeNull();
    expect(mark!.country).toBe("France");
    expect(mark!.route?.name).toBe("Talent — researcher (chercheur)");
    expect(mark!.route?.path).toBe("/france/talent-researcher");
    // The route is the dataset's own: quoted, not scored, and carrying the answer it would have asked about.
    const route = ds.countries.find((c) => c.code === "FR")!.routes.find((r) => r.id === "fr-talent-chercheur")!;
    expect(isScored(route)).toBe(false);
    expect(route.situations).toEqual(["research"]);
  });

  it("marks nothing a scored route takes, and never the fallback — every country lacking a seek route lacks `none`", () => {
    const asked = situationsAsked(ds);
    expect(asked.get("fr")!.has("none")).toBe(false);
    expect(asked.get("es")!.has("none")).toBe(false);
    for (const destination of ["de", "fr", "es", "nl", "all"])
      for (const o of fieldOptions(ds, SITUATION_FIELD)) {
        const mark = notScoredFor(ds, destination, o.value);
        if (o.is_fallback || asked.get(destination)!.has(o.value)) expect(mark, `${destination}:${o.value}`).toBeNull();
        else expect(mark, `${destination}:${o.value}`).not.toBeNull();
      }
    // Which leaves exactly one marked answer in the whole dataset today.
    const marked = ["de", "fr", "es", "nl", "all"].flatMap((d) =>
      fieldOptions(ds, SITUATION_FIELD).filter((o) => notScoredFor(ds, d, o.value)).map((o) => `${d}:${o.value}`));
    expect(marked).toEqual(["fr:research"]);
    // And no mark before the destination is known.
    expect(notScoredFor(ds, undefined, "research")).toBeNull();
  });

  it("question 2 for France draws the mark under research only, with the link, and the option stays a button", () => {
    const html = situationScreen("fr");
    const marks = marksOn(html);
    expect(Object.keys(marks)).toEqual(["research"]);
    const country = ds.countries.find((c) => c.code === "FR")!;
    const route = country.routes.find((r) => r.id === "fr-talent-chercheur")!;
    expect(marks.research!.replace(/<[^>]+>/g, "")).toBe(notScoredQuotedLine(country.name, route.name));
    expect(marks.research).toContain(`<a href="${url("/france/talent-researcher")}">${READ_IT_HERE}</a>`);
    // The mark sits after its button, never inside it: a link inside a button is not a link.
    expect(html).toMatch(/<button class="opt" data-value="research"[^>]*>[\s\S]*?<\/button><small class="opt-mark"[^>]*data-for="research">/);
    expect(html).not.toMatch(/<button[^>]*>[^<]*(?:<(?!\/button)[^<]*)*<small class="opt-mark"/);
    // Selectable: the same button every other option is.
    expect(html.match(/<button class="opt"/g)!.length).toBe(4);
  });

  it("question 2 for Germany, Spain, the Netherlands and all four draws no mark", () => {
    for (const destination of ["de", "es", "nl", "all"])
      expect(marksOn(situationScreen(destination)), destination).toEqual({});
  });

  it("the plain line, where no quoted route carries the situation", () => {
    expect(notScoredLine("France")).toBe("Not scored for France yet.");
    expect(notScoredMarkHtml({ country: "France" })).toBe("Not scored for France yet.");
    expect(notScoredQuotedLine("France", "Talent — researcher (chercheur)"))
      .toBe("Not scored for France yet — Talent — researcher (chercheur) is quoted, not scored: read it here.");
  });

  it("escapes the names it prints", () => {
    const html = notScoredMarkHtml({ country: "A & B", route: { name: "<x>", path: "/a/b?c=d&e" } });
    expect(html).toContain("A &amp; B");
    expect(html).toContain("&lt;x&gt;");
    // Through `url`, like every internal link: the page's slash, then the query.
    expect(html).toContain('href="/a/b/?c=d&amp;e"');
  });
});

describe("s19 — the zero-open result through a marked option is a written state", () => {
  it("the headline names the country and the situation, the subline names the route and what the rest need", () => {
    const v = unscoredVerdict(ds, { destination: "fr", situation: "research" });
    expect(v).not.toBeNull();
    expect(v!.headline).toBe("No scored route in France takes a research hosting agreement.");
    expect(v!.subline).toBe(
      "France's route for a research hosting agreement — Talent — researcher (chercheur) — is quoted here but not scored: "
      + "read its rules. The routes below need a job offer or an intra-corporate transfer.",
    );
    expect(v!.door).toEqual({ text: READ_ITS_RULES, href: url("/france/talent-researcher") });
  });

  it("is only for a marked situation: every other destination and answer leaves the verdicts as they were", () => {
    expect(unscoredVerdict(ds, { destination: "es", situation: "research" })).toBeNull();
    expect(unscoredVerdict(ds, { destination: "fr", situation: "offer" })).toBeNull();
    expect(unscoredVerdict(ds, { destination: "fr", situation: "none" })).toBeNull();
    expect(unscoredVerdict(ds, { destination: "all", situation: "research" })).toBeNull();
    expect(unscoredVerdict(ds, { situation: "research" })).toBeNull();
  });

  it("the masthead carries it with the door as the only markup, and announces the words", () => {
    const v = unscoredVerdict(ds, { destination: "fr", situation: "research" })!;
    const m = mastheadFor({ kind: "results", answered: 2, routes: 5, headline: v.headline, unscored: v });
    expect(m.headline).toBe(v.headline);
    expect(m.subline).toBe(v.subline);
    expect(m.sublineHtml).toBe(
      `France's route for a research hosting agreement — Talent — researcher (chercheur) — is quoted here but not scored: `
      + `<a href="${url("/france/talent-researcher")}">read its rules</a>. `
      + "The routes below need a job offer or an intra-corporate transfer.",
    );
    // Without it, the subline is text and text only, as it always was.
    expect(mastheadFor({ kind: "results", answered: 2, routes: 5, headline: "x" }).sublineHtml).toBeUndefined();
  });
});

/**
 * F8: the Spanish researcher card listed "A hosting agreement …" under "Also
 * required — not checked here" to a reader who had just declared one. A
 * precondition the interview asked — its sentence is the one a criterion on an
 * answered field stands on — renders as answered, in the s5 words.
 */
describe("s19 — a condition the interview asked is never \"not checked here\"", () => {
  /** Every question answered with a real answer — the widest walk there is. */
  const full = (): Profile => {
    const p: Profile = {};
    for (const f of ds.fields) {
      if (f.type === "money_band") { p[f.id] = deriveBands(ds, f.id).at(-1)!.id; continue; }
      const real = fieldOptions(ds, f.id).find((o) => !o.is_unknown);
      if (real) p[f.id] = real.value;
    }
    return p;
  };

  /** The sentences a route's answered criteria stand on. */
  const askedQuotes = (route: Route, answers: Profile): Set<string> => {
    const quotes = new Set<string>();
    forEachCriterion(route.criteria, (c) => {
      if ("field" in c && answers[c.field] !== undefined && "source" in c && c.source) quotes.add(c.source.quote);
    });
    return quotes;
  };

  it("over every scored route with a full profile", () => {
    const answers = full();
    let moved = 0;
    for (const r of evaluate(ds, answers)) {
      if (!isScored(r.route)) continue;
      const html = precondHtml(ds, r.route, answers);
      const notChecked = html.match(new RegExp(`<div class="precond"><b>${NOT_CHECKED_HEADING}</b>([\\s\\S]*?)</div>`))?.[1] ?? "";
      const quotes = askedQuotes(r.route, answers);
      for (const s of (r.route.statements ?? []).filter((x) => x.kind === "precondition")) {
        if (!s.source || !quotes.has(s.source.quote)) continue;
        moved++;
        expect(notChecked, `${r.route.id}: ${s.id} is asked and still "not checked here"`).not.toContain(s.text);
        expect(html, `${r.route.id}: ${s.id} is asked and not rendered as answered`).toContain("you declared");
        expect(html, `${r.route.id}: ${s.id} dropped off the card`).toContain(s.text.replace(/&/g, "&amp;"));
      }
    }
    expect(moved).toBeGreaterThan(0);
  });

  it("the Spanish researcher card says what was declared, in the s5 words", () => {
    const answers: Profile = { destination: "es", citizenship: "TR", situation: "research", situation_country: "es" };
    const html = precondHtml(ds, ds.countries.find((c) => c.code === "ES")!.routes.find((r) => r.id === "es-researcher")!, answers);
    expect(html).toContain(`Asked in the interview — you declared “I have (or expect) a hosting agreement with a research institution there”:`);
    expect(html).toContain("A hosting agreement — the formal agreement a research institution signs to take you on");
    expect(html).not.toContain(NOT_CHECKED_HEADING);
  });

  it("with no reader, and with an unknown answer, nothing is called answered", () => {
    const es = ds.countries.find((c) => c.code === "ES")!.routes.find((r) => r.id === "es-researcher")!;
    expect(precondHtml(ds, es, {})).toContain(NOT_CHECKED_HEADING);
    expect(precondHtml(ds, es, {})).not.toContain("you declared");
    // A field answered with the door for "none of these fits" is not declared.
    const nl = ds.countries.find((c) => c.code === "NL")!.routes.find((r) => r.id === "nl-researcher")!;
    expect(precondHtml(ds, nl, { salary_eur_month: "unknown" })).not.toContain("you declared");
  });
});

describe("s19 — the quoted route, the counts and the data page follow", () => {
  it("France's page says 5 routes scored, 2 quoted, and the researcher page renders through the quoted path", () => {
    const address = countryAddresses(ds).find((a) => a.country.code === "FR")!;
    const page = countryPage(ds, address);
    expect(page.html).toMatch(/<h1>[^<]*5 routes scored, 2 quoted/);
    const researcher = routePages(ds, "2026-09-16").find((p) => p.path === "/france/talent-researcher");
    expect(researcher).toBeDefined();
    expect(textOf(researcher!.html)).toContain("quoted and dated · not scored");
    expect(textOf(researcher!.html)).toContain("Avoir une convention d'accueil souscrite");
  });

  it("/data/ says schema 0.8.1 and dataset 2026.09.17, and counts 23 scored and 6 quoted", () => {
    // 0.8.0 was s19's (`not_asked`); 0.8.1 is s25's, the points item with
    // rows on two fields.
    const text = textOf(dataPage(ds).html);
    expect(text).toContain("0.8.1");
    expect(text).toContain("2026-09-16");
    expect(text).toContain("23 routes scored against your answers");
    expect(text).toContain("6 more quoted and dated but not scored");
  });
});

/**
 * The browser: the mark where the reader is standing, the written state where
 * the walk ended, and the Spanish researcher still met.
 */
const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write(`\n  !! THE S19 WALK WAS NOT SEEN IN A BROWSER: ${skipped}.\n     Run: npm run build && npm test\n\n`);

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  problems(): string[];
}

const seed = (answers: Record<string, string>) =>
  `localStorage.setItem("permit-rulebook.record.v1", ${JSON.stringify(JSON.stringify({
    version: RECORD_VERSION, answers, history: Object.keys(answers),
  }))})`;

const MARKS = 'JSON.stringify([...document.querySelectorAll(".qcard .opt-mark")].map((m) => ({'
  + ' under: m.dataset.for, text: m.textContent.trim(), href: m.querySelector("a") ? m.querySelector("a").getAttribute("href") : null })))';

describe.skipIf(skipped !== null)("s19 — in the browser", () => {
  it("question 2 is never in the cold HTML; the mark is drawn after the destination answer", () => {
    const cold = readFileSync(`${dist}/index.html`, "utf8");
    expect(cold).not.toContain("opt-mark");
    expect(cold).not.toContain("Which best describes your situation?");
  });

  it("France marks research with the link; Germany, Spain, the Netherlands and all four mark nothing", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const out: Record<string, unknown> = {};
        for (const destination of ["fr", "de", "es", "nl", "all"]) {
          await page.goto(server.url("/"), 300);
          await page.evaluate(seed({ destination }));
          await page.goto(server.url("/"), 900);
          out[destination] = {
            question: await page.evaluate('document.querySelector(".qlabel").textContent.trim()'),
            marks: JSON.parse(await page.evaluate(MARKS)),
            problems: page.problems(),
          };
        }
        return out;
      }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as Record<string,
        { question: string; marks: { under: string; text: string; href: string | null }[]; problems: string[] }>;
      for (const [destination, s] of Object.entries(seen)) {
        expect(s.question, destination).toBe("Which best describes your situation?");
        expect(s.problems, destination).toEqual([]);
      }
      expect(seen.fr!.marks).toEqual([{
        under: "research",
        text: "Not scored for France yet — Talent — researcher (chercheur) is quoted, not scored: read it here.",
        href: url("/france/talent-researcher"),
      }]);
      for (const destination of ["de", "es", "nl", "all"]) expect(seen[destination]!.marks, destination).toEqual([]);
    } finally { server.close(); }
  }, 120_000);

  it("France → research reads the written state; Spain → research is met, as before", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const read = async () => ({
          headline: await page.evaluate('document.getElementById("headline").textContent.trim()'),
          subline: await page.evaluate('document.getElementById("subline").textContent.trim()'),
          door: await page.evaluate('(document.querySelector("#subline a") || {}).getAttribute ? document.querySelector("#subline a").getAttribute("href") : null'),
          doorText: await page.evaluate('document.querySelector("#subline a") ? document.querySelector("#subline a").textContent : null'),
          status: await page.evaluate('document.getElementById("cstatus").textContent'),
          main: await page.evaluate('document.getElementById("main").textContent'),
          heads: JSON.parse(await page.evaluate('JSON.stringify([...document.querySelectorAll(".ghead")].map((h) => h.textContent.trim()))')),
          badges: JSON.parse(await page.evaluate('JSON.stringify([...document.querySelectorAll(".route .st")].map((s) => s.textContent.trim()))')),
          state: await page.evaluate('document.getElementById("app").dataset.state'),
          problems: page.problems(),
        });
        // France, by the buttons: the destination on the record, then the marked answer tapped.
        await page.goto(server.url("/"), 300);
        await page.evaluate(seed({ destination: "fr" }));
        await page.goto(server.url("/"), 900);
        await page.evaluate('document.querySelector(".opt[data-value=research]").click()');
        await new Promise((r) => setTimeout(r, 900));
        const france = await read();
        // Spain, the same two answers — and the passport, which is Spain's third
        // tap (the scenario: CRITERIA MET in three).
        await page.evaluate(seed({ destination: "es", situation: "research", citizenship: "TR" }));
        await page.goto(server.url("/"), 1400);
        const spain = await read();
        return { france, spain };
      }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as Record<string, {
        headline: string; subline: string; door: string | null; doorText: string | null; status: string; main: string;
        heads: string[]; badges: string[]; state: string; problems: string[];
      }>;

      const { france, spain } = seen;
      expect(france!.problems).toEqual([]);
      expect(france!.state).toBe("results");
      expect(france!.headline).toBe("No scored route in France takes a research hosting agreement.");
      expect(france!.subline).toBe(
        "France's route for a research hosting agreement — Talent — researcher (chercheur) — is quoted here but not scored: "
        + "read its rules. The routes below need a job offer or an intra-corporate transfer.",
      );
      expect(france!.doorText).toBe("read its rules");
      expect(france!.door).toBe(url("/france/talent-researcher"));
      expect(france!.status).toBe("No scored route in France takes a research hosting agreement.");
      expect(france!.headline + france!.subline + france!.main).not.toContain("Nothing open");
      // Then the not-yet list as today.
      expect(france!.heads.some((h) => h.startsWith("Not yet"))).toBe(true);
      expect(france!.main).toContain("5 routes need a job offer or an intra-corporate transfer");

      expect(spain!.problems).toEqual([]);
      expect(spain!.headline).toMatch(/^1 route looks open\./);
      expect(spain!.heads[0]).toMatch(/^Open — criteria met/);
      expect(spain!.badges).toContain("Criteria met");
      expect(spain!.main).not.toContain("not checked here: A hosting agreement");
      expect(spain!.main).toContain("you declared “I have (or expect) a hosting agreement with a research institution there”");
    } finally { server.close(); }
  }, 120_000);
});
