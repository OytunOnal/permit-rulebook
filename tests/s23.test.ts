import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  SITUATION_FIELD, deriveBands, evaluate, fieldOptions, forEachCriterion, unlockTitleOf, unlocks,
  type Dataset, type Profile, type UnreadSource,
} from "permit-rulebook-data";
import { RECORD_VERSION } from "../src/lib/record.js";
import { EITHER_PATH, dailyCheck } from "../src/lib/copy/route-page.js";
import { SEEK_HINT, WOULD_BE_MET, nearestLine, orAbove, pointsOfNeeded } from "../src/lib/copy/verdict.js";
import { proseProvenanceCounts } from "../src/lib/copy/data-page.js";
import { questionCounter } from "../src/lib/copy/interview.js";
import { glossSection, glossed } from "../src/lib/gloss.js";
import { questionCardHtml } from "../src/lib/question.js";
import { routePage, routePages, routeSourceUrls } from "../src/lib/route-page.js";
import { dataPage } from "../src/lib/data-page.js";
import { lastWatchRun, watchState } from "../src/lib/site.js";
import { routeAddresses } from "../src/lib/slug.js";
import {
  PAINTED_AS_COMPOSED, blocksIn, cardOn, hintsIn, paintedAsComposedScript, placed, stepsIn, verdictFor,
} from "./verdict-cards.js";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));
const textOf = (html: string): string =>
  html.replace(/<[^>]*>/g, " ").split(/\s+/).join(" ").split(String.fromCharCode(160)).join(" ").trim();

const routeOf = (id: string) => ds.countries.flatMap((c) => c.routes).find((r) => r.id === id)!;

/**
 * s23 — the copy pass (v1.1 gate critique, F1, F3, F4, P1–P6).
 *
 * Every case reads a rendered string, because every finding was one: a
 * sentence that contradicted the reader, named what they could not see,
 * repeated itself, or spoke the model's language.
 */

/** Deniz: Turkish engineer with a Berlin offer (persona P1). An offer-holder. */
const DENIZ: Profile = {
  destination: "de", citizenship: "TR", situation: "offer", situation_country: "de", qualification: "degree",
  recognition_de: "unknown", occupation_shortage: "yes", occupation_it: "yes", experience_5y: "lt2", experience_7y: "3to5", german: "a1",
  english: "c1", funds_eur_month: "band_1", salary_eur_year: "band_5", age_band: "a30to35",
};

/** Priya: Indian analyst exploring all four (persona P2). No offer; one point short of the Opportunity Card. */
const PRIYA: Profile = {
  destination: "all", citizenship: "IN", situation: "none", qualification: "degree", recognition_de: "unknown",
  occupation_shortage: "unknown", experience_5y: "2plus", experience_7y: "3to5", german: "none", english: "c1", nl_recent_grad: "no",
  top200_grad: "unknown", funds_eur_month: "band_1", age_band: "u30", de_stay6m: "no", partner_ck: "no",
};

const fieldKind = (id: string) => ds.fields.find((f) => f.id === id)?.kind;

/** A step the verdict offers, with the field the engine's unlock row behind it reads. */
interface OfferedStep { title: string; field: string; html: string }

/**
 * The steps the verdict for these answers offers, in the order drawn, each
 * with the field it reads: the engine's own unlock rows, titled as the data
 * package titles them, a folded ladder titled by its lowest rung.
 */
function stepsOffered(answers: Profile): OfferedStep[] {
  const raw = unlocks(ds, answers);
  return stepsIn(verdictFor(answers)).map((step) => {
    const row = raw.find((u) => [unlockTitleOf(ds, u, answers), orAbove(unlockTitleOf(ds, u, answers))].includes(step.title));
    if (!row) throw new Error(`no unlock row is titled ${step.title}`);
    return { title: step.title, field: row.field, html: step.html };
  });
}

/** The step the verdict's masthead names, where it names one. */
function nearestNamed(answers: Profile): string | undefined {
  const verdict = verdictFor(answers);
  const { subline } = verdict.action.masthead;
  return stepsIn(verdict).map((s) => s.title).find((title) => subline.includes(nearestLine(title)));
}

describe("F1a — the job-search sentence reaches only a reader without an offer", () => {
  const seekOpen = (answers: Profile) =>
    evaluate(ds, answers).some((r) => r.route.kind === "seek" && r.status !== "hold");

  it("an explorer with an open job-search permit is told it is exactly for this", () => {
    // Priya, with the two unknowns answered her way, opens the Opportunity Card.
    const explorer: Profile = { ...PRIYA, recognition_de: "recognized", occupation_shortage: "yes" };
    expect(seekOpen(explorer), "the profile no longer opens a job-search route").toBe(true);
    const html = hintsIn(verdictFor(explorer));
    expect(html).toContain(SEEK_HINT);
    expect(SEEK_HINT).toContain("job-search permit above");
  });

  it("an offer-holder, a transferee and a researcher never see it — whatever their cards say", () => {
    const explorer: Profile = { ...PRIYA, recognition_de: "recognized", occupation_shortage: "yes" };
    for (const situation of fieldOptions(ds, SITUATION_FIELD).filter((o) => !o.is_fallback && !o.is_unknown)) {
      const declared = { ...explorer, [SITUATION_FIELD]: situation.value };
      expect(hintsIn(verdictFor(declared)), situation.value).toBe("");
    }
    // Derived from the option the dataset marks as the fallback, not from a typed "none".
    expect(fieldOptions(ds, SITUATION_FIELD).find((o) => o.is_fallback)?.value).toBe(PRIYA[SITUATION_FIELD]);
  });

  it("and not without a step to take, nor without an open job-search permit", () => {
    const explorer: Profile = { ...PRIYA, recognition_de: "recognized", occupation_shortage: "yes" };
    // The sentence stands under a section's steps, so a section that offers
    // none carries none, and only the section that holds the open job-search
    // permit carries it.
    const { layout } = verdictFor(explorer);
    if (layout.kind !== "countries") throw new Error("the explorer of all four drew no country sections");
    for (const section of layout.sections) {
      const steps = section.groups.find((g) => g.kind === "steps");
      const hint = steps?.kind === "steps" ? steps.hint : "";
      const seeks = evaluate(ds, explorer).some((r) => r.route.kind === "seek" && r.status !== "hold"
        && ds.countries.find((c) => c.code === r.country)!.name === section.name);
      if (!steps || !seeks) expect(hint, section.name).toBe("");
    }
    expect(hintsIn(verdictFor(PRIYA))).toBe("");
  });
});

describe("F1b — unlock steps ordered by what the reader can do", () => {
  it("a change of situation the reader can make comes after the steps within their own situation", () => {
    // Deniz as a transferee: a job offer is a path step he can take, and it
    // ranks after the improvable ones (recognition, language) — the key is
    // the field's own kind. An arranged answer is no step at all (#175).
    const transferee: Profile = { ...DENIZ, situation: "ict" };
    const steps = stepsOffered(transferee);
    expect(steps.length).toBeGreaterThan(2);
    const kinds = steps.map((s) => fieldKind(s.field));
    const firstPath = kinds.indexOf("path");
    expect(firstPath).toBeGreaterThan(0);
    expect(kinds.slice(firstPath).every((k) => k === "path")).toBe(true);
    expect(kinds.slice(0, firstPath).every((k) => k === "improvable")).toBe(true);
    // An offer-holder has no path step left to take.
    expect(stepsOffered(DENIZ).map((s) => fieldKind(s.field))).not.toContain("path");
  });

  it("Nearest names the first step the reader can take — never a situation they did not declare", () => {
    // The headline names a step where nothing is open: Priya's. Deniz has
    // routes open, so his headline names none, and his first step is the one
    // it would name.
    const nearest = nearestNamed(PRIYA)!;
    expect(nearest).toBeDefined();
    expect(stepsOffered(PRIYA).find((s) => s.title === nearest)!.field).not.toBe(SITUATION_FIELD);
    expect(nearest).not.toMatch(/transfer|hosting agreement/);
    expect(nearestNamed(DENIZ)).toBeUndefined();
    const first = stepsOffered(DENIZ)[0]!;
    expect(first.field).not.toBe(SITUATION_FIELD);
    expect(first.title).not.toMatch(/transfer|hosting agreement/);
  });

  it("within a group, a step that meets a route beats one that only brings routes within reach, then breadth", () => {
    const steps = stepsOffered(DENIZ);
    const rank = (s: OfferedStep) =>
      (s.html.includes(WOULD_BE_MET) ? 1 : 0) * 1000 + (s.html.match(/<li>/g) ?? []).length;
    const improvable = steps.filter((s) => fieldKind(s.field) === "improvable");
    expect(improvable.length).toBeGreaterThan(1);
    for (let i = 1; i < improvable.length; i++)
      expect(rank(improvable[i - 1]!)).toBeGreaterThanOrEqual(rank(improvable[i]!));
  });

  it("a reader whom only arranged answers would open more for is offered no step", () => {
    // Deniz with everything else answered his way: a transfer and a hosting
    // agreement are all that would open more, and neither is his to take
    // (#175): they are said apart, never as steps.
    const settled: Profile = {
      ...DENIZ, recognition_de: "recognized", experience_5y: "2plus", experience_7y: "5plus", german: "b2plus",
      salary_eur_year: deriveBands(ds, "salary_eur_year").at(-1)!.id,
    };
    const raw = unlocks(ds, settled);
    expect(raw.length).toBeGreaterThan(0);
    expect(raw.every((u) => u.field === SITUATION_FIELD && u.option.is_arranged)).toBe(true);
    expect(stepsOffered(settled)).toEqual([]);
    // A verdict with no step to take names none: France, no offer and no qualification.
    const stuck: Profile = { destination: "fr", citizenship: "TR", situation: "none", qualification: "none" };
    expect(unlocks(ds, stuck)).toEqual([]);
    expect(stepsIn(verdictFor(stuck))).toEqual([]);
    expect(nearestNamed(stuck)).toBeUndefined();
  });
});

describe("F4 — the not-yet Opportunity Card prints its tally, and the CEFR rungs are one step", () => {
  /** The points tally on the Opportunity Card the verdict for these answers draws. */
  const tallyFor = (answers: Profile): string =>
    blocksIn(cardOn(verdictFor(answers), "de-chancenkarte"), "ptsline met", "ptsline short");

  it("the not-yet card carries the same tally line the open card does, from the same scorer", () => {
    expect(evaluate(ds, PRIYA).find((r) => r.route.id === "de-chancenkarte")!.status).toBe("hold");
    expect(textOf(tallyFor(PRIYA))).toContain(pointsOfNeeded(5, 6));
    // A count, not a verdict: the not-yet tally never wears the met colour.
    expect(tallyFor(PRIYA)).toContain('class="ptsline short"');
    // Open through the points path: a partial recognition scores, where a
    // full one takes the direct path and counts nothing.
    const partial: Profile = { ...PRIYA, recognition_de: "partial", occupation_shortage: "yes" };
    const card = evaluate(ds, partial).find((r) => r.route.id === "de-chancenkarte")!;
    expect(card.status).toBe("met");
    expect(textOf(tallyFor(partial)).startsWith(`${pointsOfNeeded(card.points!.scored, 6)} · `)).toBe(true);
    expect(tallyFor(partial)).toContain('class="ptsline met"');
    // A route that scores no points has no line.
    expect(blocksIn(cardOn(verdictFor(DENIZ), "de-experienced-worker"), "ptsline met", "ptsline short")).toBe("");
  });

  it("a ladder is an enum every rule reads as 'this rung or above'", () => {
    // Read where the verdict shows it: the rungs of a ladder fold into the
    // lowest one that changes a verdict, titled "… or above".
    const steps = stepsOffered(PRIYA);
    // The CEFR fields: every `in` names a tail of the options and the points
    // table climbs them in order.
    expect(steps.filter((s) => s.field === "german").map((s) => s.title.endsWith(orAbove("")))).toEqual([true]);
    // Recognition is a choice of answers, not rungs: its rules name a head of the list.
    expect(steps.filter((s) => s.field === "recognition_de")).toHaveLength(2);
    // A path is not a ladder, nor is a number.
    for (const s of steps.filter((x) => x.field === SITUATION_FIELD || x.field === "salary_eur_year"))
      expect(s.title).not.toContain("or above");
    // English and the experience ladders fold nowhere on these answers:
    // Priya's English is at the top rung, and no answer makes two experience
    // rungs open the same routes (s25 holds the rows form).
  });

  it("the unlock list collapses A2 / B1 / B2 into 'German at A2 … or above'", () => {
    const raw = unlocks(ds, PRIYA);
    const rungs = raw.filter((u) => u.field === "german");
    expect(rungs.map((u) => u.option.value)).toEqual(["a2", "b1", "b2plus"]);
    const steps = stepsOffered(PRIYA);
    const german = steps.filter((s) => s.field === "german");
    expect(german).toHaveLength(1);
    expect(german[0]!.title).toBe(orAbove(unlockTitleOf(ds, rungs[0]!, PRIYA)));
    expect(german[0]!.title).toMatch(/^German at A2 .*or above$/);
    // The rungs above it are folded into it: no step of their own.
    for (const u of rungs.slice(1)) expect(steps.map((s) => s.title)).not.toContain(unlockTitleOf(ds, u, PRIYA));
    // The two recognition answers are two steps still: not a ladder.
    expect(steps.filter((s) => s.field === "recognition_de")).toHaveLength(2);
    for (const s of steps) if (s.field !== "german") expect(s.title).not.toContain("or above");
  });

  it("a rung that opens something the lower rung does not keeps its own step", () => {
    // Spain, no qualification: three years in seven opens the highly-qualified
    // permit, five opens the Blue Card as well — two steps, neither titled
    // "or above".
    const spain: Profile = {
      destination: "es", situation: "offer", situation_country: "es", citizenship: "TR", qualification: "none",
      experience_5y: "lt2", experience_7y: "lt3", salary_eur_year: "band_7", salary_eur_month: "band_7",
      age_band: "a30to35", occupation_it: "no",
    };
    const rungs = unlocks(ds, spain).filter((u) => u.field === "experience_7y");
    expect(rungs.map((u) => u.option.value)).toEqual(["3to5", "5plus"]);
    const steps = stepsOffered(spain).filter((s) => s.field === "experience_7y");
    // Two steps — the wider one first, by the rank every step is ordered on.
    expect(steps.map((s) => s.title)).toEqual([...rungs].reverse().map((u) => unlockTitleOf(ds, u, spain)));
    for (const s of steps) expect(s.title).not.toContain("or above");
  });
});

describe("F3 — the route page's liveness line names its own source or stays silent", () => {
  const run = lastWatchRun();
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
  const own: UnreadSource = { id: "own", url: ownUrl, last_read: "2026-09-07", countries: ["DE"] };
  const other: UnreadSource = {
    id: "es-uge-umbral-pdf", last_read: "2026-09-07", countries: ["ES"],
    url: "https://www.inclusion.gob.es/documents/d/unidadgrandesempresas/umbral-salarial.pdf",
  };

  it("a route whose own source went unread says so, and says the values still show their read day", () => {
    const html = routePage(ds, address("de-chancenkarte"), run, [own]).html;
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
    const html = routePage(ds, address("fr-talent-blue-card"), run, [own, other]).html;
    expect(textOf(html)).toContain("a daily check re-reads every source. ");
    expect(textOf(html)).not.toContain("did not reach");
    expect(dailyCheck(0)).toBe("a daily check re-reads every source");
  });

  it("the footer's short form still counts every unread source the reader is looking at (s11)", () => {
    const html = routePage(ds, address("fr-talent-blue-card"), run, [own, other]).html;
    expect(textOf(html)).toContain(`re-read daily (last run ${run} · 2 sources unread)`);
  });

  it("over every route: only the pages citing the unread source carry the clause", () => {
    const pages = routePages(ds, run, [own]);
    const citing = new Set(routeAddresses(ds).filter((a) => routeSourceUrls(ds, a.route).has(ownUrl)).map((a) => a.path));
    expect(citing.size).toBeGreaterThan(0);
    expect(citing.size).toBeLessThan(pages.length);
    for (const page of pages)
      expect(textOf(page.html).includes("did not reach one of this route's sources"), page.path).toBe(citing.has(page.path));
  });

  it("/data/ keeps s11's sentence", () => {
    const html = dataPage(ds, watchState.last_run!, [{ ...own, id: "bamf-hochschulabsolvent" }]).html;
    expect(textOf(html)).toContain("A German source did not answer on the last run; the values it backs were read on 2026-09-07");
  });
});

describe("P1 — never a stutter; and, since s32's amendment 6, no explainer for the sign", () => {
  it("restates no number, and explains the act alone where the citation names one", () => {
    // P1 replaced "(§ 20a, section 20a)" with "§ = section" once per page;
    // amendment 6 (the human's walk, 2026-09-18) took the sign's words away
    // — the sign is read as a reader reads it. What stands is the rule: a
    // citation never restates its own number, and the act it names is said
    // once, in the citation's own bracket.
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

describe("P2 — a rule with limbs is one sentence", () => {
  it("a rule's limbs open on the copy module's lead-in, never 'Either of these answers this rule:'", () => {
    // The lead-in introduces one line per path: "either" for two paths, and
    // never for three (paths-named.test.ts).
    const html = routePage(ds, routeAddresses(ds).find((a) => a.route.id === "es-blue-card")!).html;
    expect(textOf(html)).toContain(EITHER_PATH);
    expect(textOf(html)).not.toContain("Either of these");
  });
});

describe("P3 — the curator's note stays in the data", () => {
  it("no card and no page carries it", () => {
    expect(blocksIn(cardOn(verdictFor(PRIYA), "de-chancenkarte"), "srcs")).not.toContain("times out");
    for (const { path, text } of builtPages()) expect(text, path).not.toContain("times out");
  });
});

describe("P4 — /data/ drops the zero", () => {
  it("counts what stands, and says nothing of a count of none", () => {
    expect(proseProvenanceCounts(41, 12, 0)).toBe("41 sourced, 12 ours");
    expect(proseProvenanceCounts(41, 12, 2)).toBe("41 sourced, 12 ours, 2 kept on a dated reason");
    const html = dataPage(ds).html;
    expect(textOf(html)).not.toContain("standing on a dated reason");
    expect(textOf(html)).not.toMatch(/\b0 kept on a dated reason/);
  });
});

describe("P5 — the Anabin link's stray full stop", () => {
  it("the learn box ends on the link: nothing after it can wrap alone", () => {
    // Deniz works in IT with three years in the last seven, so the shortage
    // Blue Card's IT path (#134) meets the card without recognition and no
    // box is left open on it. Out of IT, the degree path's open recognition
    // is the box this case reads.
    const outOfIt: Profile = { ...DENIZ, occupation_it: "no" };
    const html = blocksIn(cardOn(verdictFor(outOfIt), "de-blue-card-shortage"), "learn");
    expect(html).toContain("anabin");
    expect(html).toMatch(/<\/a><\/div>$/);
    expect(textOf(html)).not.toMatch(/↗ ?\.$/);
    expect(textOf(html)).not.toMatch(/\.$/);
    // A route with nothing left open has no box.
    expect(blocksIn(cardOn(verdictFor(DENIZ), "de-experienced-worker"), "learn")).toBe("");
  });
});

describe("P6 — the counter's honest word", () => {
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

describe("the result screen, decided by the verdict", () => {
  it("Priya's not-yet Opportunity Card shows its tally; her steps start with one she can take; the German rungs are one", () => {
    const verdict = verdictFor(PRIYA);
    const ck = placed(verdict, "de-chancenkarte");
    expect(ck?.kind, "the not-yet Opportunity Card").toBe("not-yet");
    expect(textOf(ck!.html)).toContain(pointsOfNeeded(5, 6));
    const steps = stepsIn(verdict).map((s) => s.title);
    expect(steps.length).toBeGreaterThan(3);
    expect(steps[0]).not.toMatch(/transfer|hosting agreement/);
    expect(steps.filter((s) => s.includes("German at"))).toHaveLength(1);
    expect(steps.find((s) => s.includes("German at"))).toMatch(/A2 .*or above/);
    // An arranged answer is never a step card (#175).
    expect(steps.filter((s) => /transfer|hosting agreement/.test(s))).toEqual([]);
    expect(verdict.action.masthead.subline).not.toMatch(/Nearest: an intra-corporate transfer|Nearest: a research hosting agreement/);
    // No offer, no open job-search permit: no hint either way.
    expect(hintsIn(verdict)).toBe("");
  });
});

/** And the screen itself: Priya's result, as the browser paints it. */
const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write(`\n  !! s23's screen was not walked: ${skipped}.\n     Run: npm run build && npm test\n\n`);

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  problems(): string[];
}

const seed = (answers: Record<string, string>) =>
  `localStorage.setItem("permit-rulebook.record.v1", ${JSON.stringify(JSON.stringify({
    version: RECORD_VERSION, answers, history: Object.keys(answers),
  }))})`;

describe.skipIf(skipped !== null)("the result screen, as drawn", () => {
  it("Priya's not-yet Opportunity Card shows its tally; her steps start with one she can take; the German rungs are one", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"), 300);
        await page.evaluate(seed(PRIYA as Record<string, string>));
        await page.goto(server.url("/"), 1600);
        return {
          state: await page.evaluate('document.querySelector("#app").dataset.state'),
          painted: JSON.parse(await page.evaluate(paintedAsComposedScript(verdictFor(PRIYA)))),
        };
      }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as
        { state: string; painted: typeof PAINTED_AS_COMPOSED };

      // What the screen says is the verdict's ("the result screen, decided by
      // the verdict"); the page paints it.
      expect(seen.state).toBe("results");
      expect(seen.painted).toEqual(PAINTED_AS_COMPOSED);
    } finally {
      server.close();
    }
  }, 180000);
});
