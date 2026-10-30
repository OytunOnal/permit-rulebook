import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  SITUATION_FIELD, deriveBands, evaluate, fieldOptions, isScored, phraseAtStartOf, remainingQuestions, scopeWords,
  situationsAsked, type Dataset, type Profile,
} from "permit-rulebook-data";
import { esc } from "../src/lib/reason.js";
import { RECORD_VERSION } from "../src/lib/record.js";
import { questionCardHtml } from "../src/lib/question.js";
import { notScoredFor, notScoredMarkHtml } from "../src/lib/situations.js";
import { NOT_CHECKED_HEADING, READ_ITS_RULES, STATUS_LABEL } from "../src/lib/copy/verdict.js";
import { READ_IT_HERE, notCheckedLine, notCheckedQuotedLine } from "../src/lib/copy/interview.js";
import { countryHeadline } from "../src/lib/copy/country-page.js";
import { verdictHtml, verdictOf } from "../src/lib/verdict/index.js";
import { countryAddresses, countryPage } from "../src/lib/country-page.js";
import { dataPage } from "../src/lib/data-page.js";
import { routePages } from "../src/lib/route-page/route-page.js";
import { url } from "../src/lib/site.js";
import {
  PAINTED_AS_COMPOSED, blocksIn, drawnRouteOn, everyDrawnRouteIn, groupsIn, paintedAsComposedScript, placed, verdictFor,
} from "./verdict-cards.js";
import { answerWith, openAtRest, withSite } from "./browser-walk.js";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

const textOf = (html: string): string =>
  html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ").trim();

/** The written state as a reader meets it: the headline, the subline as
 * text, and the words of the subline that are its door, with where it goes. */
interface WrittenState {
  headline: string;
  subline: string;
  door?: { text: string; href: string };
}

/**
 * The written state the verdict for these answers reads, where it reads one:
 * its masthead is the only one whose subline is drawn in markup, for the door
 * in it.
 */
function unscoredOf(answers: Profile): WrittenState | undefined {
  const m = verdictFor(answers).action.masthead;
  if (m.sublineHtml === undefined) return undefined;
  const door = /<a href="([^"]*)">([^<]*)<\/a>/.exec(m.sublineHtml);
  return { headline: m.announced, subline: m.subline, ...(door ? { door: { text: door[2]!, href: door[1]! } } : {}) };
}

/** What else a route's card on the verdict for these answers says is required. */
const precondFor = (answers: Profile, route: string): string =>
  blocksIn(drawnRouteOn(verdictFor(answers), route), "precond", "precond asked");

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
    expect(marks.research!.replace(/<[^>]+>/g, "")).toBe(notCheckedQuotedLine(country.name, route.name));
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
    expect(notCheckedLine("France")).toBe("Not checked for France yet.");
    expect(notScoredMarkHtml({ country: "France" })).toBe("Not checked for France yet.");
    expect(notCheckedQuotedLine("France", "Talent — researcher (chercheur)"))
      .toBe("Not checked for France yet — Talent — researcher (chercheur) is quoted, not checked: read it here.");
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
    const v = unscoredOf({ destination: "fr", situation: "research" });
    expect(v).toBeDefined();
    expect(v!.headline).toBe("No route we check in France takes a research hosting agreement.");
    expect(v!.subline).toBe(
      "France's route for a research hosting agreement — Talent — researcher (chercheur) — is quoted here but not checked: "
      + "read its rules. The routes below need a job offer or an intra-corporate transfer.",
    );
    expect(v!.door).toEqual({ text: READ_ITS_RULES, href: url("/france/talent-researcher") });
  });

  it("is only for a marked situation: every other destination and answer leaves the verdicts as they were", () => {
    expect(unscoredOf({ destination: "es", situation: "research" })).toBeUndefined();
    expect(unscoredOf({ destination: "fr", situation: "offer" })).toBeUndefined();
    expect(unscoredOf({ destination: "fr", situation: "none" })).toBeUndefined();
    expect(unscoredOf({ destination: "all", situation: "research" })).toBeUndefined();
    expect(unscoredOf({ situation: "research" })).toBeUndefined();
  });

  it("the masthead carries it with the door as the only markup, and announces the words", () => {
    const answers: Profile = { destination: "fr", situation: "research" };
    const m = verdictOf(ds, answers, { cameFrom: null, answered: 2 }).action.masthead;
    const headline = "No route we check in France takes a research hosting agreement.";
    expect(m.headline).toBe(headline);
    expect(m.subline).toBe(
      "France's route for a research hosting agreement — Talent — researcher (chercheur) — is quoted here but not checked: "
      + "read its rules. The routes below need a job offer or an intra-corporate transfer.",
    );
    expect(m.announced).toBe(headline);
    expect(m.sublineHtml).toBe(
      `France's route for a research hosting agreement — Talent — researcher (chercheur) — is quoted here but not checked: `
      + `<a href="${url("/france/talent-researcher")}">read its rules</a>. `
      + "The routes below need a job offer or an intra-corporate transfer.",
    );
    // Without it, the subline is text and text only, as it always was.
    const spain: Profile = { destination: "es", situation: "research" };
    expect(verdictOf(ds, spain, { cameFrom: null, answered: 2 }).action.masthead.sublineHtml).toBeUndefined();
  });
});

/** The two walks the browser takes below: France, then the marked answer; and
 * Spain, the same answer and a Turkish passport. */
const FRANCE_RESEARCH: Profile = { destination: "fr", situation: "research" };
const SPAIN_RESEARCH: Profile = { destination: "es", situation: "research", citizenship: "TR" };

describe("s19 — the two walks' results, from the verdict", () => {
  it("France → research is the written state with its door, over the not-yet rows as today", () => {
    const verdict = verdictFor(FRANCE_RESEARCH);
    const m = verdict.action.masthead;
    expect(m.announced).toBe("No route we check in France takes a research hosting agreement.");
    expect(m.subline).toBe(
      "France's route for a research hosting agreement — Talent — researcher (chercheur) — is quoted here but not checked: "
      + "read its rules. The routes below need a job offer or an intra-corporate transfer.",
    );
    expect(/<a href="([^"]*)">([^<]*)<\/a>/.exec(m.sublineHtml ?? "")?.slice(1)).toEqual([url("/france/talent-researcher"), "read its rules"]);
    const body = textOf(verdictHtml(verdict));
    expect(m.announced + m.subline + body).not.toContain("Nothing open");
    // Then the not-yet list as today.
    expect(groupsIn(verdict).some((g) => g.kind === "not-yet")).toBe(true);
    expect(body).toContain("5 routes need a job offer or an intra-corporate transfer");
  });

  it("Spain → research is met, as before: open first, its badge Criteria met, the hosting agreement declared", () => {
    const verdict = verdictFor(SPAIN_RESEARCH);
    expect(verdict.action.masthead.announced).toMatch(/^1 route looks open\./);
    expect(groupsIn(verdict)[0]!.kind).toBe("open");
    expect(placed(verdict, "es-researcher")?.kind).toBe("open");
    expect(drawnRouteOn(verdict, "es-researcher")).toContain(`<span class="st met">${STATUS_LABEL.met}</span>`);
    const body = textOf(verdictHtml(verdict));
    expect(body).not.toContain("not checked here: A hosting agreement");
    expect(body).toContain("you declared “I have (or expect) a hosting agreement with a research institution there”");
  });
});

/**
 * F8: the Spanish researcher card listed "A hosting agreement …" under "Also
 * required — not checked here" to a reader who had just declared one. A
 * precondition the interview asked renders as answered, in the s5 words.
 * "Asked" was its sentence being the one a criterion on an answered field
 * stood on, until s32; it is the question the statement names (`field`)
 * since, and this case reads that key — the decision it holds is unchanged.
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

  it("over every scored route with a full profile", () => {
    // Every country on the screen, so every scored route has its card.
    const answers: Profile = { ...full(), destination: "all" };
    const results = evaluate(ds, answers).filter((r) => isScored(r.route));
    const drawnRoutes = everyDrawnRouteIn(verdictFor(answers));
    expect(drawnRoutes.length).toBe(results.length);
    let moved = 0;
    for (const drawnRoute of drawnRoutes) {
      const r = results.find((x) => x.route.id === drawnRoute.route)!;
      const html = blocksIn(drawnRoute.html, "precond", "precond asked");
      const notChecked = html.match(new RegExp(`<div class="precond"><b>${NOT_CHECKED_HEADING}</b>([\\s\\S]*?)</div>`))?.[1] ?? "";
      for (const s of (r.route.statements ?? []).filter((x) => x.kind === "precondition")) {
        if (s.field === undefined || answers[s.field] === undefined) continue;
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
    const html = precondFor(answers, "es-researcher");
    expect(html).toContain(`Asked in the interview — you declared “I have (or expect) a hosting agreement with a research institution there”:`);
    expect(html).toContain("A hosting agreement — the formal agreement a research institution signs to take you on");
    expect(html).not.toContain(NOT_CHECKED_HEADING);
  });

  it("with no reader, and with an unknown answer, nothing is called answered", () => {
    expect(precondFor({}, "es-researcher")).toContain(NOT_CHECKED_HEADING);
    expect(precondFor({}, "es-researcher")).not.toContain("you declared");
    // A field answered with the door for "none of these fits" is not declared.
    expect(precondFor({ salary_eur_month: "unknown" }, "nl-researcher")).not.toContain("you declared");
  });
});

describe("s19 — the quoted route, the counts and the data page follow", () => {
  it("France's page says 7 routes, the checker asks about 5, and the researcher page renders through the quoted path", () => {
    const address = countryAddresses(ds).find((a) => a.country.code === "FR")!;
    const page = countryPage(ds, address);
    expect(page.html).toContain(`<h1>${esc(countryHeadline(phraseAtStartOf("FR"), 7, 5))}`);
    const researcher = routePages(ds, { lastRun: "2026-09-16" }).find((p) => p.path === "/france/talent-researcher");
    expect(researcher).toBeDefined();
    expect(textOf(researcher!.html))
      .toContain(scopeWords("rules-quoted-nothing-asked", { stated: 0, noted: 0 }, { reader: "not-answered" }));
    expect(textOf(researcher!.html)).toContain("Avoir une convention d'accueil souscrite");
  });

  it("/data/ says schema 0.8.3, and counts 23 scored and 6 quoted", () => {
    // 0.8.0 was s19's (`not_asked`); 0.8.1 is s25's, the points item with
    // rows on two fields; 0.8.2 is s32's, a statement naming its question;
    // 0.8.3 is #169's, an option marked an arranged answer (`is_arranged`).
    const text = textOf(dataPage(ds).html);
    expect(text).toContain("0.8.3");
    expect(text).toContain("2026-09-16");
    expect(text).toContain("23 routes scored against your answers");
    expect(text).toContain("6 more quoted and dated but not scored");
  });
});

/**
 * The browser: the mark where the reader is standing, the written state where
 * the walk ended, and the Spanish researcher still met.
 */
const { chromePath } = await import("../scripts/browser/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write(`\n  !! THE S19 WALK WAS NOT SEEN IN A BROWSER: ${skipped}.\n     Run: npm run build && npm test\n\n`);

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
    const seen = await withSite(async ({ page, url: addressOf }) => {
      const out: Record<string, unknown> = {};
      for (const destination of ["fr", "de", "es", "nl", "all"]) {
        await page.goto(addressOf("/"));
        await page.evaluate(seed({ destination }));
        await openAtRest(page, addressOf("/"));
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
      text: "Not checked for France yet — Talent — researcher (chercheur) is quoted, not checked: read it here.",
      href: url("/france/talent-researcher"),
    }]);
    for (const destination of ["de", "es", "nl", "all"]) expect(seen[destination]!.marks, destination).toEqual([]);
  }, 120_000);

  it("France → research reads the written state; Spain → research is met, as before", async () => {
    const seen = await withSite(async ({ page, url: addressOf }) => {
      // Each screen is read once the page is at rest.
      const read = async (answers: Profile) => ({
        status: await page.evaluate('document.getElementById("cstatus").textContent'),
        painted: JSON.parse(await page.evaluate(paintedAsComposedScript(verdictFor(answers)))),
        state: await page.evaluate('document.getElementById("app").dataset.state'),
        problems: page.problems(),
      });
      // France, by the buttons: the destination on the record, then the marked answer tapped.
      await page.goto(addressOf("/"));
      await page.evaluate(seed({ destination: "fr" }));
      await page.goto(addressOf("/"));
      await answerWith(page, 'document.querySelector(".opt[data-value=research]").click()');
      const france = await read(FRANCE_RESEARCH);
      // Spain, the same two answers — and the passport, which is Spain's third
      // tap (CRITERIA MET in three).
      await page.evaluate(seed(SPAIN_RESEARCH as Record<string, string>));
      await openAtRest(page, addressOf("/"));
      const spain = await read(SPAIN_RESEARCH);
      return { france, spain };
    }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as Record<string, {
      status: string; painted: typeof PAINTED_AS_COMPOSED; state: string; problems: string[];
    }>;

    // What each screen says is the verdict's ("s19 — the two walks' results,
    // from the verdict"); the page paints it, and says France's written state.
    const { france, spain } = seen;
    expect(france!.problems).toEqual([]);
    expect(france!.state).toBe("results");
    expect(france!.status).toBe("No route we check in France takes a research hosting agreement.");
    expect(france!.painted).toEqual(PAINTED_AS_COMPOSED);

    expect(spain!.problems).toEqual([]);
    expect(spain!.painted).toEqual(PAINTED_AS_COMPOSED);
  }, 120_000);
});
