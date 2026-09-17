import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  SITUATION_FIELD, evaluate, fieldOptions, unlockTitleOf, unlocks,
  type Dataset, type Profile, type UnreadSource,
} from "permit-rulebook-data";
import { RECORD_VERSION } from "../src/lib/record.js";
import {
  ANY_OF, SECTION_EXPLAINER, SEEK_HINT, dailyCheck, orAbove, proseProvenanceCounts, questionCounter,
} from "../src/lib/copy.js";
import { learnBoxHtml, pointsLineHtml, provenanceHtml } from "../src/lib/card.js";
import { glossSection, glossed } from "../src/lib/gloss.js";
import { questionCardHtml } from "../src/lib/question.js";
import { routePage, routePages, routeSourceUrls } from "../src/lib/route-page.js";
import { dataPage } from "../src/lib/data-page.js";
import { arrangeSteps, isLadder, nearestStep, seekHintHtml } from "../src/lib/steps.js";
import { lastWatchRun, watchState } from "../src/lib/site.js";
import { routeAddresses } from "../src/lib/slug.js";

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

describe("F1a — the job-search sentence reaches only a reader without an offer", () => {
  const seekOpen = (answers: Profile) =>
    evaluate(ds, answers).some((r) => r.route.kind === "seek" && r.status !== "hold");

  it("an explorer with an open job-search permit is told it is exactly for this", () => {
    // Priya, with the two unknowns answered her way, opens the Opportunity Card.
    const explorer: Profile = { ...PRIYA, recognition_de: "recognized", occupation_shortage: "yes" };
    expect(seekOpen(explorer), "the profile no longer opens a job-search route").toBe(true);
    const html = seekHintHtml(ds, evaluate(ds, explorer), explorer, true);
    expect(html).toContain(SEEK_HINT);
    expect(SEEK_HINT).toContain("job-search permit above");
  });

  it("an offer-holder, a transferee and a researcher never see it — whatever their cards say", () => {
    const explorer: Profile = { ...PRIYA, recognition_de: "recognized", occupation_shortage: "yes" };
    for (const situation of fieldOptions(ds, SITUATION_FIELD).filter((o) => !o.is_fallback && !o.is_unknown)) {
      const declared = { ...explorer, [SITUATION_FIELD]: situation.value };
      expect(seekHintHtml(ds, evaluate(ds, declared), declared, true), situation.value).toBe("");
    }
    // Derived from the option the dataset marks as the fallback, not from a typed "none".
    expect(fieldOptions(ds, SITUATION_FIELD).find((o) => o.is_fallback)?.value).toBe(PRIYA[SITUATION_FIELD]);
  });

  it("and not without a step to take, nor without an open job-search permit", () => {
    const explorer: Profile = { ...PRIYA, recognition_de: "recognized", occupation_shortage: "yes" };
    expect(seekHintHtml(ds, evaluate(ds, explorer), explorer, false)).toBe("");
    expect(seekHintHtml(ds, evaluate(ds, PRIYA), PRIYA, true)).toBe("");
  });
});

describe("F1b — unlock steps ordered by what the reader can do", () => {
  it("an offer-holder's steps put a change of situation last", () => {
    const steps = arrangeSteps(ds, unlocks(ds, DENIZ), DENIZ);
    expect(steps.length).toBeGreaterThan(2);
    const kinds = steps.map((s) => fieldKind(s.unlock.field));
    // The key is the field's own kind: a path step (a transfer, a hosting
    // agreement) ranks after an improvable one (recognition, funds).
    const firstPath = kinds.indexOf("path");
    expect(firstPath).toBeGreaterThan(0);
    expect(kinds.slice(firstPath).every((k) => k === "path")).toBe(true);
    expect(kinds.slice(0, firstPath).every((k) => k === "improvable")).toBe(true);
    // Today's first step was the transfer; it is not any more.
    expect(steps[0]!.unlock.field).not.toBe(SITUATION_FIELD);
  });

  it("Nearest names the first step the reader can take — never a situation they did not declare", () => {
    for (const reader of [DENIZ, PRIYA]) {
      const steps = arrangeSteps(ds, unlocks(ds, reader), reader);
      const nearest = nearestStep(steps)!;
      expect(nearest).toBe(steps[0]);
      expect(nearest.unlock.field).not.toBe(SITUATION_FIELD);
      expect(nearest.title).not.toMatch(/transfer|hosting agreement/);
    }
  });

  it("within a group, a step that meets a route beats one that only brings routes within reach, then breadth", () => {
    const steps = arrangeSteps(ds, unlocks(ds, DENIZ), DENIZ);
    const rank = (s: (typeof steps)[number]) =>
      (s.unlock.routes.some((r) => r.status === "met") ? 1 : 0) * 1000 + s.unlock.routes.length;
    const improvable = steps.filter((s) => fieldKind(s.unlock.field) === "improvable");
    for (let i = 1; i < improvable.length; i++)
      expect(rank(improvable[i - 1]!)).toBeGreaterThanOrEqual(rank(improvable[i]!));
  });

  it("a reader with situation steps only still gets them, in the engine's order", () => {
    const only = arrangeSteps(ds, unlocks(ds, DENIZ).filter((u) => u.field === SITUATION_FIELD), DENIZ);
    expect(only.length).toBeGreaterThan(0);
    expect(nearestStep(only)!.unlock.field).toBe(SITUATION_FIELD);
    expect(nearestStep([])).toBeUndefined();
  });
});

describe("F4 — the not-yet Opportunity Card prints its tally, and the CEFR rungs are one step", () => {
  it("the not-yet card carries the same tally line the open card does, from the same scorer", () => {
    const notYet = evaluate(ds, PRIYA).find((r) => r.route.id === "de-chancenkarte")!;
    expect(notYet.status).toBe("hold");
    expect(textOf(pointsLineHtml(ds, notYet))).toContain("5 points — 6 needed");
    // A count, not a verdict: the not-yet tally never wears the met colour.
    expect(pointsLineHtml(ds, notYet)).toContain('class="ptsline short"');
    // Open through the points path: a partial recognition scores, where a
    // full one takes the direct path and counts nothing.
    const open = evaluate(ds, { ...PRIYA, recognition_de: "partial", occupation_shortage: "yes" }).find((r) => r.route.id === "de-chancenkarte")!;
    expect(open.status).toBe("met");
    expect(textOf(pointsLineHtml(ds, open))).toMatch(/^\d+ points — 6 needed · /);
    expect(pointsLineHtml(ds, open)).toContain('class="ptsline met"');
    // A route that scores no points has no line.
    expect(pointsLineHtml(ds, evaluate(ds, DENIZ).find((r) => r.route.id === "de-experienced-worker")!)).toBe("");
  });

  it("a ladder is an enum every rule reads as 'this rung or above'", () => {
    // The CEFR fields: every `in` names a tail of the options and the points
    // table climbs them in order.
    expect(isLadder(ds, "german")).toBe(true);
    expect(isLadder(ds, "english")).toBe(true);
    // Recognition is a choice of answers, not rungs: its rules name a head of the list.
    expect(isLadder(ds, "recognition_de")).toBe(false);
    // The experience ladders are two questions now, each read as rungs (F2, s25).
    expect(isLadder(ds, "experience_5y")).toBe(true);
    expect(isLadder(ds, "experience_7y")).toBe(true);
    // A path is not a ladder, nor is a number.
    expect(isLadder(ds, SITUATION_FIELD)).toBe(false);
    expect(isLadder(ds, "salary_eur_year")).toBe(false);
  });

  it("the unlock list collapses A2 / B1 / B2 into 'German at A2 … or above'", () => {
    const raw = unlocks(ds, PRIYA);
    expect(raw.filter((u) => u.field === "german").map((u) => u.option.value)).toEqual(["a2", "b1", "b2plus"]);
    const steps = arrangeSteps(ds, raw, PRIYA);
    const german = steps.filter((s) => s.unlock.field === "german");
    expect(german).toHaveLength(1);
    expect(german[0]!.unlock.option.value).toBe("a2");
    expect(german[0]!.title).toBe(orAbove(unlockTitleOf(ds, german[0]!.unlock, PRIYA)));
    expect(german[0]!.title).toMatch(/^German at A2 .*or above$/);
    expect(german[0]!.folded.map((u) => u.option.value)).toEqual(["b1", "b2plus"]);
    // The two recognition answers are two steps still: not a ladder.
    expect(steps.filter((s) => s.unlock.field === "recognition_de")).toHaveLength(2);
    for (const s of steps) if (s.unlock.field !== "german") expect(s.title).not.toContain("or above");
  });

  it("a rung that opens something the lower rung does not keeps its own step", () => {
    const raw = unlocks(ds, PRIYA);
    const a2 = raw.find((u) => u.field === "german" && u.option.value === "a2")!;
    const b2 = raw.find((u) => u.field === "german" && u.option.value === "b2plus")!;
    const extra = { ...b2, routes: [...b2.routes, evaluate(ds, DENIZ)[0]!] };
    const steps = arrangeSteps(ds, [a2, extra], PRIYA);
    const german = steps.filter((s) => s.unlock.field === "german");
    // Two steps — the wider one first, by the rank every step is ordered on.
    expect(german.map((s) => s.unlock.option.value)).toEqual(["b2plus", "a2"]);
    for (const s of german) {
      expect(s.folded).toEqual([]);
      expect(s.title).not.toContain("or above");
    }
  });
});

describe("F3 — the route page's liveness line names its own source or stays silent", () => {
  const run = lastWatchRun();
  const address = (id: string) => routeAddresses(ds).find((a) => a.route.id === id)!;
  /** An unread source of the Opportunity Card's own: its points table's page. */
  const ownUrl = [...routeSourceUrls(ds, routeOf("de-chancenkarte"))][0]!;
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

describe("P1 — the statute explainer once, and never a stutter", () => {
  it("explains the sign, not the number again", () => {
    expect(SECTION_EXPLAINER).toBe("§ = section");
    expect(glossSection("Opportunity Card (Chancenkarte, § 20a)", new Set()))
      .toBe("Opportunity Card (Chancenkarte, § 20a; § = section)");
    expect(glossSection("Experienced worker (§ 19c / § 6 BeschV)", new Set()))
      .toBe("Experienced worker (§ 19c / § 6 BeschV; § = section)");
    expect(glossSection("§ 18d states it", new Set())).toBe("§ 18d (§ = section) states it");
    // Where the citation names its act, both are said in one bracket, in the same form.
    expect(glossed("§ 18g AufenthG", new Set())).toBe("§ 18g AufenthG (§ = section; AufenthG = the Residence Act)");
    expect(glossed("§ 6 BeschV", new Set())).toBe("§ 6 BeschV (§ = section; BeschV = the Employment Ordinance)");
    // Once per page.
    const seen = new Set<string>();
    glossSection("Researcher (§ 18d)", seen);
    expect(glossSection("Skilled worker — academic (§ 18b)", seen)).toBe("Skilled worker — academic (§ 18b)");
  });

  it("no built page carries the number twice, and every German page carries the explainer once", () => {
    const pages = builtPages();
    expect(pages.length).toBeGreaterThan(30);
    for (const { path, text } of pages) {
      expect(text, path).not.toMatch(/§ ([0-9]+[a-z]?)[,;] sections? \1\b/);
      expect(text, path).not.toMatch(/\(§ [0-9]+[a-z]?, section/);
      const explained = text.split(SECTION_EXPLAINER).length - 1;
      if (path.startsWith("/germany/")) expect(explained, path).toBe(1);
      else expect(explained, path).toBeLessThanOrEqual(1);
    }
  });
});

describe("P2 — a rule with limbs is one sentence", () => {
  it("'Either of these answers this rule:' became 'Any of these:'", () => {
    expect(ANY_OF).toBe("Any of these:");
    const html = routePage(ds, routeAddresses(ds).find((a) => a.route.id === "es-blue-card")!).html;
    expect(textOf(html)).toContain("Any of these:");
    expect(textOf(html)).not.toContain("Either of these");
  });
});

describe("P3 — the curator's note stays in the data", () => {
  it("no card and no page carries it", () => {
    const priya = evaluate(ds, PRIYA).find((r) => r.route.id === "de-chancenkarte")!;
    expect(provenanceHtml(ds, priya, PRIYA)).not.toContain("times out");
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
    const result = evaluate(ds, DENIZ).find((r) => r.route.id === "de-blue-card-shortage")!;
    const html = learnBoxHtml(ds, result, DENIZ);
    expect(html).toContain("anabin");
    expect(html).toMatch(/<\/a><\/div>$/);
    expect(textOf(html)).not.toMatch(/↗ ?\.$/);
    expect(textOf(html)).not.toMatch(/\.$/);
    // A route with nothing left open has no box.
    expect(learnBoxHtml(ds, evaluate(ds, DENIZ).find((r) => r.route.id === "de-experienced-worker")!, DENIZ)).toBe("");
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

/** And the screen itself: Priya's result, as the browser draws it. */
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
      const seen = JSON.parse(await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"), 300);
        await page.evaluate(seed(PRIYA as Record<string, string>));
        await page.goto(server.url("/"), 1600);
        return page.evaluate(
          'JSON.stringify({'
          + ' state: document.querySelector("#app").dataset.state,'
          + ' hold: [...document.querySelectorAll("details.route-hold")].map((d) => d.innerText),'
          + ' steps: [...document.querySelectorAll("article.unlock h3")].map((h) => h.textContent.trim()),'
          + ' hero: document.querySelector("#subline").textContent,'
          + ' hint: !!document.querySelector(".unlock-hint") })',
        );
      }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as string) as
        { state: string; hold: string[]; steps: string[]; hero: string; hint: boolean };

      expect(seen.state).toBe("results");
      const ck = seen.hold.find((t) => t.includes("Opportunity Card"))!;
      expect(ck, "the not-yet Opportunity Card").toBeTruthy();
      expect(ck).toContain("5 points — 6 needed");
      expect(seen.steps.length).toBeGreaterThan(3);
      expect(seen.steps[0]).not.toMatch(/transfer|hosting agreement/);
      expect(seen.steps.filter((s) => s.includes("German at"))).toHaveLength(1);
      expect(seen.steps.find((s) => s.includes("German at"))).toMatch(/A2 .*or above/);
      const lastOwn = seen.steps.findIndex((s) => /transfer|hosting agreement/.test(s));
      expect(seen.steps.slice(lastOwn).every((s) => /transfer|hosting agreement/.test(s))).toBe(true);
      expect(seen.hero).not.toMatch(/Nearest: an intra-corporate transfer|Nearest: a research hosting agreement/);
      // No offer, no open job-search permit: no hint either way.
      expect(seen.hint).toBe(false);
    } finally {
      server.close();
    }
  }, 180000);
});
