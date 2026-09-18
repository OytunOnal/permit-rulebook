import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  answerLabel, evaluate, forEachCriterion, provenancedValuesOf, routeStatements,
  type Dataset, type Profile, type Route, type RouteStatement,
} from "permit-rulebook-data";
import { precondHtml } from "../src/lib/card.js";
import { NOT_CHECKED_HEADING, askedHeading } from "../src/lib/copy.js";
import { esc } from "../src/lib/reason.js";
import { STORAGE_KEY, serialize } from "../src/lib/record.js";

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));
const clone = (): Dataset => JSON.parse(JSON.stringify(dataset)) as Dataset;
const routeOf = (d: Dataset, id: string): Route => d.countries.flatMap((c) => c.routes).find((r) => r.id === id)!;
const statementOf = (d: Dataset, route: string, id: string): RouteStatement =>
  routeStatements(routeOf(d, route)).find((s) => s.id === id)!;

/** The blocks a card's precondition markup draws: the not-checked list and
 * every asked block, each as its text. */
function blocksOf(html: string): { notChecked: string | null; asked: string[] } {
  const notChecked = html.match(new RegExp(`<div class="precond"><b>${NOT_CHECKED_HEADING}</b>([\\s\\S]*?)</div>`))?.[1] ?? null;
  const asked: string[] = [];
  const re = /<div class="precond asked"><b>([\s\S]*?)<\/b>([\s\S]*?)<\/div>/g;
  for (let m = re.exec(html); m; m = re.exec(html)) asked.push(`${m[1]} ${m[2]}`);
  return { notChecked, asked };
}

/** The eleven the scenario decides, by id: the nine that name their question
 * and the two tenures that name none. What the sweep below holds the cards
 * to, so the test does not read the implementation's own key back. */
const DECIDED: { route: string; statement: string; field?: string }[] = [
  { route: "fr-talent-qualifie", statement: "employment-contract-of-more-than-three-months", field: "situation" },
  { route: "fr-talent-blue-card", statement: "employment-contract-of-at-least-six-months", field: "situation" },
  { route: "fr-talent-innovante", statement: "work-tied-to-the-research-and-development-project", field: "situation" },
  { route: "fr-talent-innovante", statement: "a-young-innovative-company-or-one-the-ministry-recognises", field: "fr_innovative_employer" },
  { route: "fr-talent-mission", statement: "a-move-inside-one-company-or-group", field: "situation" },
  { route: "es-researcher", statement: "hosting-agreement-or-contract-with-the-research-body", field: "situation" },
  { route: "nl-blue-card", statement: "employment-contract-valid-for-six-months", field: "situation" },
  { route: "nl-ict", statement: "three-months-with-the-company-outside-the-union", field: "situation" },
  { route: "de-researcher", statement: "hosting-agreement-with-a-research-facility", field: "situation" },
  { route: "de-ict-card", statement: "six-months-with-the-company-before-the-transfer" },
  { route: "fr-ict", statement: "six-months-with-the-group-already" },
];

/** Three readers, one per changed card: a researcher in Germany, a transferee
 * in Germany, a transferee in France. */
const RESEARCHER_DE: Profile = { destination: "de", situation: "research", citizenship: "TR" };
const TRANSFEREE_DE: Profile = { destination: "de", situation: "ict", citizenship: "TR" };
const TRANSFEREE_FR: Profile = { destination: "fr", situation: "ict", citizenship: "TR" };

/**
 * s32 — a statement names the question that asks it.
 *
 * s19 read "asked" off a shared sentence: a precondition whose quote a
 * criterion of the same route quoted verbatim was rendered as answered. Three
 * more shared a sentence by containment, and the sentence would have decided
 * two of them wrongly — de-ict-card's six months with the company wraps the
 * situation gate's own quote, and a tenure is not what the situation question
 * asks. The dataset now types the decision on the statement (`field`), and
 * the card reads that and nothing else.
 */
describe("s32 — the card reads the statement's field, not its sentence", () => {
  it("de-researcher: the hosting agreement moves into the asked block, beside the research answer", () => {
    const route = routeOf(ds, "de-researcher");
    const hosting = statementOf(ds, "de-researcher", "hosting-agreement-with-a-research-facility");
    expect(hosting.field).toBe("situation");
    const { notChecked, asked } = blocksOf(precondHtml(ds, route, RESEARCHER_DE));
    expect(asked).toHaveLength(1);
    expect(asked[0]).toContain(askedHeading(answerLabel(ds, "situation", "research")));
    expect(asked[0]).toContain(hosting.text);
    // Nothing else is stated on the route, so the not-checked list is gone.
    expect(notChecked).toBeNull();
  });

  it("de-ict-card: the tenure stays under not checked here for a transferee — the situation question asks a transfer, not the tenure", () => {
    const route = routeOf(ds, "de-ict-card");
    const tenure = statementOf(ds, "de-ict-card", "six-months-with-the-company-before-the-transfer");
    expect(tenure.field).toBeUndefined();
    const { notChecked, asked } = blocksOf(precondHtml(ds, route, TRANSFEREE_DE));
    expect(asked).toEqual([]);
    expect(notChecked).toContain(tenure.text);
    expect(notChecked).toContain(statementOf(ds, "de-ict-card", "transfer-longer-than-ninety-days").text);
  });

  it("fr-ict: likewise", () => {
    const route = routeOf(ds, "fr-ict");
    const tenure = statementOf(ds, "fr-ict", "six-months-with-the-group-already");
    expect(tenure.field).toBeUndefined();
    const { notChecked, asked } = blocksOf(precondHtml(ds, route, TRANSFEREE_FR));
    expect(asked).toEqual([]);
    expect(notChecked).toContain(tenure.text);
  });

  it("the field decides, whatever the sentences do", () => {
    // The quote struck: still asked, because the field says so.
    const reworded = clone();
    const es = statementOf(reworded, "es-researcher", "hosting-agreement-or-contract-with-the-research-body");
    es.source!.quote = "a sentence no criterion quotes";
    const esHtml = precondHtml(reworded, routeOf(reworded, "es-researcher"), { destination: "es", situation: "research", citizenship: "TR" });
    expect(blocksOf(esHtml).asked).toHaveLength(1);
    expect(blocksOf(esHtml).notChecked).toBeNull();
    // The field struck: not asked, though the criterion quotes the very sentence — the old key.
    const unfielded = clone();
    const nl = statementOf(unfielded, "nl-blue-card", "employment-contract-valid-for-six-months");
    let verbatim = false;
    forEachCriterion(routeOf(unfielded, "nl-blue-card").criteria, (c) => {
      for (const p of provenancedValuesOf(c)) if (p.value.quote === nl.source!.quote) verbatim = true;
    });
    expect(verbatim).toBe(true);
    delete nl.field;
    const nlHtml = precondHtml(unfielded, routeOf(unfielded, "nl-blue-card"), { destination: "nl", situation: "offer", citizenship: "TR" });
    expect(blocksOf(nlHtml).asked).toEqual([]);
    expect(blocksOf(nlHtml).notChecked).toContain(nl.text);
  });

  it("a field the reader has not declared is not asked of them — the heading that says so stays", () => {
    const route = routeOf(ds, "de-researcher");
    const hosting = statementOf(ds, "de-researcher", "hosting-agreement-with-a-research-facility");
    for (const answers of [{}, { destination: "de", citizenship: "TR" }] as Profile[]) {
      const { notChecked, asked } = blocksOf(precondHtml(ds, route, answers));
      expect(asked).toEqual([]);
      expect(notChecked).toContain(hosting.text);
    }
  });

  it("nothing else moves: every scored route draws exactly the asked blocks the eleven give it, and no other", () => {
    // Held to the list above, not to the dataset's fields: a reader who has
    // declared a situation, and nothing the employer question could cover.
    const answers: Profile = { destination: "all", citizenship: "TR", situation: "offer", situation_country: "de" };
    for (const r of evaluate(ds, answers)) {
      const decided = DECIDED.filter((d) => d.route === r.route.id && d.field !== undefined && answers[d.field] !== undefined);
      const { asked } = blocksOf(precondHtml(ds, r.route, answers));
      expect(asked.length, r.route.id).toBe(new Set(decided.map((d) => d.field)).size);
      for (const d of decided)
        expect(asked.join(" "), `${r.route.id}: ${d.statement}`).toContain(esc(statementOf(ds, d.route, d.statement).text));
    }
  });
});

/**
 * The browser: a transferee in Germany reads the ICT card at 390×844 with the
 * tenure under "not checked here", and nothing on the card called answered.
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
  process.stderr.write(`\n  !! THE S32 WALK WAS NOT SEEN IN A BROWSER: ${skipped}.\n     Run: npm run build && npm test\n\n`);

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  problems(): string[];
}

/** A transferee in Germany, every question the interview puts to them
 * answered, so the record restores straight to the verdict (s22). */
const transferee: Record<string, string> = { ...TRANSFEREE_DE, qualification: "none" } as Record<string, string>;
const SEED = `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${
  JSON.stringify(serialize(transferee, Object.keys(transferee), true))})`;

/** The ICT card as the reader sees it: its status, and the text of each
 * precondition block on it. The card is found by its official-page door,
 * which is the route's own URL — the heading is glossed on the way in. */
const ICT_CARD = `JSON.stringify((() => {
  const card = [...document.querySelectorAll("article.route")].find((a) => a.querySelector("a.next").getAttribute("href") === ${JSON.stringify(routeOf(ds, "de-ict-card").info_url)});
  if (!card) return null;
  return {
    status: card.querySelector(".st").textContent.trim(),
    notChecked: [...card.querySelectorAll(".precond:not(.asked)")].map((b) => b.textContent.trim()),
    asked: [...card.querySelectorAll(".precond.asked")].map((b) => b.textContent.trim()),
  };
})())`;

describe.skipIf(skipped !== null)("s32 — in the browser", () => {
  it("a transferee in Germany reads the tenure under not checked here on the ICT card at 390×844", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/404.html"), 300);
        await page.evaluate(SEED);
        await page.goto(server.url("/"), 1600);
        return {
          state: await page.evaluate('document.getElementById("app").dataset.state'),
          card: JSON.parse(await page.evaluate(ICT_CARD)),
          problems: page.problems(),
        };
      }, { viewport: { width: 390, height: 844 }, mobile: true }) as {
        state: string; card: { status: string; notChecked: string[]; asked: string[] } | null; problems: string[];
      };
      expect(seen.problems).toEqual([]);
      expect(seen.state).toBe("results");
      expect(seen.card).not.toBeNull();
      expect(seen.card!.status).toBe("Criteria met");
      const tenure = statementOf(ds, "de-ict-card", "six-months-with-the-company-before-the-transfer").text;
      expect(seen.card!.notChecked).toHaveLength(1);
      expect(seen.card!.notChecked[0]).toContain(NOT_CHECKED_HEADING);
      expect(seen.card!.notChecked[0]).toContain(tenure);
      expect(seen.card!.asked).toEqual([]);
    } finally { server.close(); }
  }, 120_000);
});
