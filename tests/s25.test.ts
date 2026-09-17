import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import {
  deriveQuestions, evaluate, fieldOptions, remainingQuestions, unlocks, unlockTitleOf,
  type Dataset, type Profile,
} from "permit-rulebook-data";
import { RECORD_VERSION, restore, serialize } from "../src/lib/record.js";
import { orAbove, resumedLine } from "../src/lib/copy.js";
import { pointsLineHtml } from "../src/lib/card.js";
import { declarationHtml, questionCardHtml } from "../src/lib/question.js";
import { arrangeSteps, isLadder } from "../src/lib/steps.js";
import { replayRecord } from "../src/lib/scope.js";

const ds = rawDataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));
const src = fileURLToPath(new URL("../src", import.meta.url));
const textOf = (html: string): string =>
  html.replace(/<[^>]*>/g, " ").split(/\s+/).join(" ").split(String.fromCharCode(160)).join(" ").trim();

/**
 * s25 — the experience ladder is two questions (v1.1 critique F2).
 *
 * One question with four rungs and a false implication (`y3in7 ⇒ y2in5`)
 * became two: how much related experience in the last five years, and how
 * much in the last seven. The site asks the two as it asks every other
 * question, reads the points table's two-field item through the package's
 * row helpers, and carries no literal of the old answers. A record written
 * before this slice loses its experience answers and is asked again; the
 * resumed line counts what was kept.
 */

const FIVE = "experience_5y";
const SEVEN = "experience_7y";

/**
 * The critique's reader, made concrete: a Turkish vocational worker with a
 * German offer whose qualification is not yet recognised — so the Opportunity
 * Card counts its points (a fully recognised qualification takes the direct
 * path and counts nothing, s23) and the experience rows show in the tally.
 * The experienced-worker route never reads recognition.
 */
const OFFER: Profile = {
  destination: "de", situation: "offer", situation_country: "de", citizenship: "TR", qualification: "vocational",
  recognition_de: "not_yet", occupation_shortage: "yes", occupation_it: "no", salary_eur_year: "band_4",
  german: "a1", english: "none", funds_eur_month: "band_1", age_band: "a30to35", de_stay6m: "no", partner_ck: "no",
};
const withExperience = (five: string, seven: string): Profile => ({ ...OFFER, [FIVE]: five, [SEVEN]: seven });
const resultOf = (profile: Profile, id: string) => evaluate(ds, profile).find((r) => r.route.id === id)!;

describe("no literal of the old ladder survives in the site", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|astro|mjs|css)$/.test(name)) files.push(path);
    }
  };
  walk(src);

  it("src/ names neither y2in5, y3in7, y5in7 nor the retired `experience` field", () => {
    expect(files.length).toBeGreaterThan(10);
    const offenders: string[] = [];
    for (const path of files) {
      const text = readFileSync(path, "utf8");
      if (/\by[235]in[57]\b/.test(text)) offenders.push(`${path}: an old rung`);
      if (/["'`]experience["'`]/.test(text)) offenders.push(`${path}: the retired field id`);
    }
    expect(offenders).toEqual([]);
  });

  it("the dataset itself carries the two fields and not the old one", () => {
    expect(ds.fields.map((f) => f.id)).not.toContain("experience");
    expect(fieldOptions(ds, FIVE).map((o) => o.value)).toEqual(["lt2", "2plus"]);
    expect(fieldOptions(ds, SEVEN).map((o) => o.value)).toEqual(["lt3", "3to5", "5plus"]);
  });
});

describe("the two questions are asked from the dataset, in order, after recognition", () => {
  it("derive right after recognition_de, five years then seven", () => {
    const order = deriveQuestions(ds).map((q) => q.field);
    const at = order.indexOf("recognition_de");
    expect(at).toBeGreaterThan(-1);
    expect(order.slice(at, at + 3)).toEqual(["recognition_de", FIVE, SEVEN]);
  });

  it("and the interview asks them back to back once recognition is answered", () => {
    // The greedy order agrees with the dataset's here: with recognition not
    // yet, the five-year answer is the next thing that changes a verdict, and
    // the seven-year answer the thing after it.
    const asked = ["destination", "situation", "qualification", "citizenship", "recognition_de"];
    const partial: Profile = Object.fromEntries(asked.map((f) => [f, OFFER[f]!]));
    expect(remainingQuestions(ds, partial)[0]!.field).toBe(FIVE);
    expect(remainingQuestions(ds, { ...partial, [FIVE]: "2plus" })[0]!.field).toBe(SEVEN);
  });

  it("each renders its label and its options as the dataset wrote them", () => {
    for (const field of [FIVE, SEVEN]) {
      const def = ds.fields.find((f) => f.id === field)!;
      const question = deriveQuestions(ds).find((q) => q.field === field)!;
      const html = questionCardHtml({
        dataset: ds, question, answers: {}, asked: [], editing: null, total: 10,
      });
      expect(html).toContain(`<h2 class="qlabel">${def.label}</h2>`);
      const buttons = [...html.matchAll(/<button class="opt" data-value="([^"]+)"[^>]*><span class="opt-label">([^<]+)</g)]
        .map((m) => [m[1], m[2]]);
      expect(buttons).toEqual(def.options!.map((o) => [o.value, o.label]));
    }
  });

  it("the declared rows carry the short labels and the chosen labels", () => {
    const answers = withExperience("2plus", "3to5");
    const html = declarationHtml(ds, answers, [FIVE, SEVEN], null);
    expect(textOf(html)).toContain("Experience (last 5 years) 2 years or more");
    expect(textOf(html)).toContain("Experience (last 7 years) 3 to under 5 years");
  });
});

describe("the ladder fold reads a two-field points item through its rows", () => {
  it("both experience fields are ladders now: every rule reads a tail, the table climbs", () => {
    expect(isLadder(ds, FIVE)).toBe(true);
    expect(isLadder(ds, SEVEN)).toBe(true);
    // The fields the fold knew before still read the same.
    expect(isLadder(ds, "german")).toBe(true);
    expect(isLadder(ds, "recognition_de")).toBe(false);
  });

  it("a rows item whose rows do not climb the field breaks the ladder — the rows are read, not skipped", () => {
    // A field two rules read as a tail, and a points item written in the rows
    // form that pays the bottom rung more than the top: not a ladder. The
    // one-field form of the same table already said so; the rows form must
    // say the same, or a two-field item hides a descending table.
    const synthetic = {
      schema_version: "0.8.1", dataset_version: "2026.01.01", notices: [], contradictions: [],
      fields: [{
        id: "x", label: "x?", short_label: "X", type: "enum", kind: "improvable",
        options: [{ value: "a", label: "a" }, { value: "b", label: "b" }, { value: "c", label: "c" }],
      }],
      countries: [{
        code: "ZZ", name: "Nowhere", routes: [{
          id: "zz-one", name: "One", kind: "work", info_url: "https://example.invalid/", criteria: [
            { field: "x", op: "in", values: ["b", "c"] },
            {
              op: "points", required: { value: 1, unit: "points", source_url: "https://example.invalid/", quote: "q", retrieved_at: "2026-01-01" },
              table: { source_url: "https://example.invalid/", quote: "q", retrieved_at: "2026-01-01", items: [
                { rows: [{ field: "x", value: "a", points: 3 }, { field: "y", value: "n", points: 1 }, { field: "x", value: "c", points: 1 }] },
              ] },
            },
          ],
        }],
      }],
    } as unknown as Dataset;
    expect(isLadder(synthetic, "x")).toBe(false);
    // The same rows, climbing: a ladder.
    const climbing = JSON.parse(JSON.stringify(synthetic)) as Dataset;
    const item = climbing.countries[0]!.routes[0]!.criteria[1] as { table: { items: { rows: { points: number }[] }[] } };
    item.table.items[0]!.rows[0]!.points = 1;
    item.table.items[0]!.rows[2]!.points = 3;
    expect(isLadder(climbing, "x")).toBe(true);
  });

  it("a higher rung that opens a route the lower one does not keeps its own step", () => {
    // Spain, no qualification: three years opens the highly-qualified permit;
    // five opens the Blue Card as well — two steps, neither titled "or above".
    const spain: Profile = {
      destination: "es", situation: "offer", situation_country: "es", citizenship: "TR", qualification: "none",
      [FIVE]: "lt2", [SEVEN]: "lt3", salary_eur_year: "band_7", salary_eur_month: "band_7", age_band: "a30to35",
      occupation_it: "no",
    };
    const raw = unlocks(ds, spain);
    expect(raw.filter((u) => u.field === SEVEN).map((u) => u.option.value)).toEqual(["3to5", "5plus"]);
    const steps = arrangeSteps(ds, raw, spain).filter((s) => s.unlock.field === SEVEN);
    expect(steps).toHaveLength(2);
    for (const s of steps) {
      expect(s.folded).toEqual([]);
      expect(s.title).toBe(unlockTitleOf(ds, s.unlock, spain));
      expect(s.title).not.toBe(orAbove(unlockTitleOf(ds, s.unlock, spain)));
    }
  });
});

describe("the Opportunity Card's tally names the winning row's field", () => {
  it("2 years or more / 3 to under 5: experienced worker met, +2 for the five-year row", () => {
    const profile = withExperience("2plus", "3to5");
    expect(resultOf(profile, "de-experienced-worker").status).toBe("met");
    const line = textOf(pointsLineHtml(ds, resultOf(profile, "de-chancenkarte")));
    expect(line).toContain("5 points — 6 needed");
    expect(line).toContain("Experience (last 5 years) +2");
    expect(line).not.toContain("last 7 years");
  });

  it("under 2 years / 3 to under 5: experienced worker not yet, no experience in the tally", () => {
    const profile = withExperience("lt2", "3to5");
    expect(resultOf(profile, "de-experienced-worker").status).toBe("hold");
    const line = textOf(pointsLineHtml(ds, resultOf(profile, "de-chancenkarte")));
    expect(line).toContain("3 points — 6 needed");
    expect(line).not.toContain("Experience");
  });

  it("2 years or more / 5 years or more: +3 for the seven-year row, never 2 + 3", () => {
    const profile = withExperience("2plus", "5plus");
    expect(resultOf(profile, "de-experienced-worker").status).toBe("met");
    const line = textOf(pointsLineHtml(ds, resultOf(profile, "de-chancenkarte")));
    expect(line).toContain("6 points — 6 needed");
    expect(line).toContain("Experience (last 7 years) +3");
    expect(line).not.toContain("last 5 years");
  });
});

describe("a record from before this slice loses its experience answers", () => {
  const old = {
    destination: "de", situation: "offer", qualification: "vocational", citizenship: "TR",
    recognition_de: "not_yet", experience: "y3in7", experience_7y: "yes",
  };
  const known = deriveQuestions(ds);

  it("the retired field is dropped, and so is the retired answer on the field that stayed", () => {
    const kept = restore(serialize(old, Object.keys(old)), known);
    expect(kept.answers).toEqual({
      destination: "de", situation: "offer", qualification: "vocational", citizenship: "TR", recognition_de: "not_yet",
    });
    expect(kept.history).toEqual(["destination", "situation", "qualification", "citizenship", "recognition_de"]);
  });

  it("the interview asks the two questions again, and the resumed line counts the kept answers", () => {
    const kept = restore(serialize(old, Object.keys(old)), known);
    const replayed = replayRecord(ds, kept.answers, kept.history);
    expect(replayed.order).toHaveLength(5);
    expect(resumedLine(replayed.order.length)).toBe("Continuing where you left off — 5 answers kept.");
    expect(remainingQuestions(ds, replayed.answers)[0]!.field).toBe(FIVE);
  });
});

/**
 * The browser: the two questions answered three ways, and what each way reads.
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
  process.stderr.write(`\n  !! THE S25 WALK WAS NOT SEEN IN A BROWSER: ${skipped}.\n     Run: npm run build && npm test\n\n`);

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  problems(): string[];
}

const seed = (answers: Record<string, string>) =>
  `localStorage.setItem("permit-rulebook.record.v1", ${JSON.stringify(JSON.stringify({
    version: RECORD_VERSION, answers, history: Object.keys(answers),
  }))})`;
const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));
const QLABEL = '(() => { const h = document.querySelector(".qcard .qlabel"); return h ? h.textContent.trim() : ""; })()';
const STATE = 'document.getElementById("app").dataset.state';
// Quoted: a rung like 2plus is not a bare CSS identifier.
const tap = (value: string) => `document.querySelector(".qcard .opt[data-value='${value}']").click()`;
// A card wears its verdict as a badge; a not-yet row stands under the heading
// that says so, so its status is the last group heading above it.
const CARDS = 'JSON.stringify([...document.querySelectorAll("#main .route, #main .route-hold")].map((el) => ({'
  + ' name: el.querySelector("h3, .hold-name").textContent.trim(),'
  + ' status: el.querySelector(".st") ? el.querySelector(".st").textContent.trim()'
  + '   : [...document.querySelectorAll("#main .ghead")].filter((h) => h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).pop().textContent.trim(),'
  + ' tally: el.querySelector(".ptsline") ? el.querySelector(".ptsline").textContent.trim() : null,'
  + ' text: el.textContent })))';
const RESUMED = '(() => { const p = document.querySelector("#main .resumed"); return p ? p.textContent.trim() : ""; })()';

interface Card { name: string; status: string; tally: string | null; text: string }

/** Answer whatever question is on the screen from the profile, until the verdict. */
async function walk(page: BrowserPage, profile: Profile): Promise<{ asked: string[]; cards: Card[]; problems: string[] }> {
  const byLabel = new Map(ds.fields.map((f) => [f.label, f.id]));
  const asked: string[] = [];
  for (let i = 0; i < 24; i++) {
    if ((await page.evaluate(STATE)) === "results") break;
    const label = await page.evaluate(QLABEL);
    const field = byLabel.get(label);
    if (!field) throw new Error(`no field for the question "${label}"`);
    asked.push(field);
    await page.evaluate(tap(profile[field]!));
    // The next screen, not a fixed sleep: the page advances the masthead
    // before it draws the question, and a tap read too early reads the
    // question it just answered.
    for (let waited = 0; waited < 4000; waited += 100) {
      await settle(100);
      if ((await page.evaluate(STATE)) === "results" || (await page.evaluate(QLABEL)) !== label) break;
    }
  }
  await settle(600);
  return { asked, cards: JSON.parse(await page.evaluate(CARDS)) as Card[], problems: page.problems() };
}

describe.skipIf(skipped !== null)("s25 — in the browser", () => {
  const seeded = { destination: "de", situation: "offer", qualification: "vocational", citizenship: "TR", recognition_de: "not_yet" };
  const cardNamed = (cards: Card[], word: string) => cards.find((c) => c.name.includes(word))!;
  const FIVE_YEAR_QUOTE = (() => {
    const route = ds.countries.flatMap((c) => c.routes).find((r) => r.id === "de-experienced-worker")!;
    const rule = route.criteria.find((c) => "field" in c && c.field === FIVE) as { source?: { quote: string } };
    return rule.source!.quote;
  })();

  for (const [five, seven, expected] of [
    ["2plus", "3to5", { worker: "Criteria met", tally: "Experience (last 5 years) +2" }],
    ["lt2", "3to5", { worker: "Not yet", tally: null }],
    ["2plus", "5plus", { worker: "Criteria met", tally: "Experience (last 7 years) +3" }],
  ] as const)
    it(`${five} / ${seven}: the experienced worker reads ${expected.worker}, the card's tally ${expected.tally ?? "names no experience"}`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => {
          await page.goto(server.url("/"), 300);
          await page.evaluate(seed(seeded));
          await page.goto(server.url("/"), 900);
          const resumed = await page.evaluate(RESUMED);
          const first = await page.evaluate(QLABEL);
          const walked = await walk(page, withExperience(five, seven));
          return { resumed, first, ...walked };
        }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as
          { resumed: string; first: string; asked: string[]; cards: Card[]; problems: string[] };
        expect(seen.problems).toEqual([]);
        expect(seen.resumed).toContain(resumedLine(Object.keys(seeded).length));
        expect(seen.first).toBe(ds.fields.find((f) => f.id === FIVE)!.label);
        expect(seen.asked.slice(0, 2)).toEqual([FIVE, SEVEN]);

        const worker = cardNamed(seen.cards, "Experienced worker");
        expect(worker.status).toContain(expected.worker);
        // The § 6 BeschV sentence the rule quotes — "innerhalb der letzten fünf
        // Jahren … mindestens zweijährige einschlägige Berufserfahrung" — on
        // the met card, verbatim from the dataset.
        if (expected.worker === "Criteria met") {
          expect(worker.text).toContain("Innerhalb der letzten fünf Jahren");
          expect(worker.text).toContain(FIVE_YEAR_QUOTE);
        }

        const card = cardNamed(seen.cards, "Opportunity Card");
        expect(card.tally, "the Opportunity Card has no tally").not.toBeNull();
        if (expected.tally) expect(card.tally).toContain(expected.tally);
        else expect(card.tally).not.toContain("Experience");
      } finally {
        server.close();
      }
    }, 120_000);

  it("an old record with y3in7 restores without it and says how many answers were kept", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"), 300);
        await page.evaluate(seed({ ...seeded, experience: "y3in7", experience_7y: "yes" }));
        await page.goto(server.url("/"), 900);
        return {
          resumed: await page.evaluate(RESUMED),
          first: await page.evaluate(QLABEL),
          rows: await page.evaluate('[...document.querySelectorAll("#decl-list [data-field]")].map((r) => r.dataset.field).join(",")'),
          problems: page.problems(),
        };
      }, { viewport: { width: 1100, height: 1200 }, mobile: false }) as
        { resumed: string; first: string; rows: string; problems: string[] };
      expect(seen.problems).toEqual([]);
      expect(seen.resumed).toContain(resumedLine(5));
      expect(seen.first).toBe(ds.fields.find((f) => f.id === FIVE)!.label);
      expect(seen.rows.split(",")).toEqual(Object.keys(seeded));
    } finally {
      server.close();
    }
  }, 120_000);
});
