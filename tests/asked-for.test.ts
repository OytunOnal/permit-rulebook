import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { deriveBands, fieldOptions, type Dataset, type Profile } from "permit-rulebook-data";

/**
 * #139 — a question that only some of the reader's open routes read says
 * which: the *asked-for line* (GLOSSARY.md; spec #133, decisions 7 and 11).
 *
 * Walked from a cold start over the built page, answer by answer, until the
 * question under test is on the screen. Each case asserts that question's
 * card is drawn before it reads the line, and reads the line's marks — the
 * route ids it names, the countries it counts and how many — never its words.
 * The routes each walk expects were read off the engine's own reckoning on
 * the real dataset when the walk was chosen, and are written here as facts.
 */
const ds = rawDataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write([
    "",
    `  !! THE ASKED-FOR LINE WAS NOT WALKED IN A BROWSER: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  clickAt(x: number, y: number): Promise<void>;
  problems(): string[];
}

/** The desktop, where the declared panel stands open beside the question. */
const DESK = { viewport: { width: 1280, height: 900 }, mobile: false };
/** A phone. */
const PHONE = { viewport: { width: 390, height: 844 }, mobile: true };

const middleBandOf = (field: string): string => {
  const bands = deriveBands(ds, field);
  return bands[Math.floor(bands.length / 2)]!.id;
};
const topBandOf = (field: string): string => {
  const bands = deriveBands(ds, field);
  return bands[bands.length - 1]!.id;
};

/**
 * An Indian passport, a degree not yet recognised in Germany, a German job
 * offer: the Opportunity Card stays open beside the work routes, so the
 * interview reaches its questions — funds and age among them (F2).
 */
const GERMANY_OFFER: Profile = {
  destination: "de", citizenship: "IN", situation: "offer", qualification: "degree", qualification_recent: "no",
  recognition_de: "not_yet", experience_5y: "2plus", experience_7y: "3to5", occupation_shortage: "yes",
  occupation_it: "no", salary_eur_year: middleBandOf("salary_eur_year"), german: "a1", english: "b2",
  age_band: "a30to35", de_stay6m: "no", partner_ck: "no", funds_eur_month: middleBandOf("funds_eur_month"),
};

/** The "any of these four" path with the offer in Spain: the Dutch
 * orientation year stays open, and its two questions are asked. */
const FOUR_SPAIN: Profile = {
  destination: "all", citizenship: "IN", situation: "offer", situation_country: "es", qualification: "degree",
  qualification_recent: "no", recognition_de: "recognized", experience_5y: "2plus", experience_7y: "3to5",
  occupation_shortage: "yes", occupation_it: "no", salary_eur_year: middleBandOf("salary_eur_year"),
  salary_eur_month: middleBandOf("salary_eur_month"), fr_degree: "no", fr_innovative_employer: "no",
  fr_local_contract: "no", nl_recent_grad: "no", top200_grad: "no", german: "a1", english: "b2",
  age_band: "a30to35", de_stay6m: "no", partner_ck: "no", funds_eur_month: middleBandOf("funds_eur_month"),
};

/** An IT worker with a vocational qualification and no degree, offered a
 * job in Germany: the Blue Card's IT path (#134) and the Opportunity Card
 * both read the seven-year window. */
const IT_NO_DEGREE: Profile = {
  destination: "de", citizenship: "IN", situation: "offer", qualification: "vocational", qualification_recent: "no",
  recognition_de: "not_yet", experience_5y: "2plus", experience_7y: "3to5", occupation_shortage: "unknown",
  occupation_it: "yes", salary_eur_year: topBandOf("salary_eur_year"), german: "a1", english: "b2",
  age_band: "a30to35", de_stay6m: "no", partner_ck: "no", funds_eur_month: middleBandOf("funds_eur_month"),
};

const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

const QLABEL = '(() => { const h = document.querySelector("#main .qcard .qlabel"); return h ? h.textContent.trim() : ""; })()';
const STATE = 'document.getElementById("app").dataset.state';
const labelOf = (field: string): string => ds.fields.find((f) => f.id === field)!.label;

/** The beat in milliseconds, as the built stylesheet carries it (beat.test.ts). */
const BEAT_MS = `(() => {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--motion-beat").trim();
  return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
})()`;

async function waitOutTheBeat(page: BrowserPage): Promise<void> {
  const ms = Number(await page.evaluate(BEAT_MS));
  if (!(ms > 0)) throw new Error("the page declares no --motion-beat");
  await settle(ms + 150);
}

/** Picks `value` on the question on the screen: its button, or — on the
 * search — the row the option's own name finds. */
const pick = (value: string, searchFor: string) => `(() => {
  const opt = document.querySelector(${JSON.stringify(`#main .qcard .opt[data-value='${value}']`)});
  if (opt) { opt.click(); return "opt"; }
  const input = document.querySelector("#cfilter");
  if (!input) return "no option";
  input.value = ${JSON.stringify(searchFor)};
  input.dispatchEvent(new Event("input", { bubbles: true }));
  const row = document.querySelector(${JSON.stringify(`#clist .copt[data-value='${value}']`)});
  if (!row) return "no row";
  row.click();
  return "row";
})()`;

async function answer(page: BrowserPage, field: string, value: string): Promise<void> {
  const name = fieldOptions(ds, field).find((o) => o.value === value)?.label ?? value;
  const how = await page.evaluate(pick(value, name));
  if (how !== "opt" && how !== "row") throw new Error(`${field} = ${value}: ${how}`);
  await waitOutTheBeat(page);
}

/** The field of the question on the screen, from its label. */
async function fieldOnScreen(page: BrowserPage): Promise<string> {
  const label = await page.evaluate(QLABEL);
  const field = ds.fields.find((f) => f.label === label)?.id;
  if (!field) throw new Error(`no field for the question "${label}"`);
  return field;
}

/**
 * From a cold start, answers whatever question is on the screen from the
 * reader's profile until `target` is on the screen, and stops there,
 * unanswered. Hands back the fields answered, in order.
 */
async function walkTo(page: BrowserPage, origin: (p: string) => string, reader: Profile, target: string): Promise<string[]> {
  await page.goto(origin("/404.html"), 300);
  await page.evaluate("localStorage.clear()");
  await page.goto(origin("/"), 1200);
  const asked: string[] = [];
  for (let i = 0; i < 30; i++) {
    if ((await page.evaluate(STATE)) === "results") throw new Error(`the verdict came before ${target}; asked ${asked.join(", ")}`);
    const field = await fieldOnScreen(page);
    if (field === target) return asked;
    const value = reader[field];
    if (value === undefined) throw new Error(`the reader has no answer for ${field}`);
    await answer(page, field, value);
    asked.push(field);
  }
  throw new Error(`${target} was never asked; asked ${asked.join(", ")}`);
}

/** What the line on the question card marks: the routes it names, each with
 * its country, and the count per country where it counts. */
const LINE = `JSON.stringify((() => {
  const card = document.querySelector("#main .qcard");
  const line = card && card.querySelector("[data-asked-for]");
  if (!line) return null;
  return {
    named: [...line.querySelectorAll("[data-route]")].map((el) => ({
      route: el.dataset.route, country: el.dataset.country, text: el.textContent,
    })),
    counted: [...line.querySelectorAll("[data-routes]")].map((el) => ({
      country: el.dataset.country, routes: Number(el.dataset.routes),
    })),
  };
})())`;

interface Line {
  named: { route: string; country: string; text: string }[];
  counted: { country: string; routes: number }[];
}

/** The question on the screen and its line, read together. */
async function screenOf(page: BrowserPage): Promise<{ question: string; line: Line | null }> {
  return { question: await page.evaluate(QLABEL), line: JSON.parse(await page.evaluate(LINE)) as Line | null };
}

/** The card is the question's, and it carries a line. */
function expectTheCardWithALine<T extends { question: string; line: Line | null }>(seen: T, field: string): asserts seen is T & { line: Line } {
  expect(seen.question, `${field}'s card is not on the screen`).toBe(labelOf(field));
  expect(seen.line, `${field}'s card carries no asked-for line`).not.toBeNull();
}

const namedRoutes = (line: Line) => line.named.map((n) => [n.route, n.country]);

describe.skipIf(skipped !== null)("a question says which routes ask it: the asked-for line (#139)", () => {
  for (const field of ["funds_eur_month", "age_band"])
    it(`on a Germany-offer walk, ${field} names the Opportunity Card in Germany`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage) => {
          await walkTo(page, server.url, GERMANY_OFFER, field);
          return { ...(await screenOf(page)), problems: page.problems() };
        }, DESK);
        expect(seen.problems).toEqual([]);
        expectTheCardWithALine(seen, field);
        expect(namedRoutes(seen.line)).toEqual([["de-chancenkarte", "DE"]]);
        expect(seen.line.counted).toEqual([]);
      } finally {
        server.close();
      }
    }, 120_000);

  it("the passport question, which every open route reads, carries no line", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await walkTo(page, server.url, GERMANY_OFFER, "citizenship");
        const passport = await screenOf(page);
        // The question after it, which only some of the open routes read.
        await answer(page, "citizenship", GERMANY_OFFER.citizenship!);
        return { passport, next: await screenOf(page), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expect(seen.passport.question, "the passport question is not on the screen").toBe(labelOf("citizenship"));
      expect(seen.passport.line).toBeNull();
      // A line on the next card, so the passport's has no line of its own
      // making, not because the page draws none.
      expectTheCardWithALine(seen.next, "recognition_de");
    } finally {
      server.close();
    }
  }, 120_000);

  it("on the any-of-four path with the offer in Spain, each Dutch question names its Dutch route", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await walkTo(page, server.url, FOUR_SPAIN, "nl_recent_grad");
        const graduate = await screenOf(page);
        await answer(page, "nl_recent_grad", FOUR_SPAIN.nl_recent_grad!);
        const designated = await screenOf(page);
        return { graduate, designated, problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expectTheCardWithALine(seen.graduate, "nl_recent_grad");
      expect(namedRoutes(seen.graduate.line)).toEqual([["nl-orientation-year", "NL"]]);
      expectTheCardWithALine(seen.designated, "top200_grad");
      expect(namedRoutes(seen.designated.line)).toEqual([["nl-orientation-year", "NL"]]);
    } finally {
      server.close();
    }
  }, 120_000);

  it("a question asked for more than two routes counts them per country", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await walkTo(page, server.url, FOUR_SPAIN, "situation");
        return { ...(await screenOf(page)), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expectTheCardWithALine(seen, "situation");
      // 21 of the 23 open routes read the situation; the Opportunity Card
      // and the orientation year do not.
      expect(seen.line.counted).toEqual([
        { country: "DE", routes: 7 }, { country: "FR", routes: 5 },
        { country: "ES", routes: 4 }, { country: "NL", routes: 5 },
      ]);
      expect(seen.line.named).toEqual([]);
    } finally {
      server.close();
    }
  }, 120_000);

  it("a route name in the line reads as its card names it, through the screen's one-time § expansion", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await walkTo(page, server.url, GERMANY_OFFER, "funds_eur_month");
        const text = await page.evaluate('document.querySelector("#main").innerText');
        return { ...(await screenOf(page)), text, problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expectTheCardWithALine(seen, "funds_eur_month");
      const card = ds.countries.flatMap((c) => c.routes).find((r) => r.id === "de-chancenkarte")!;
      // The name cites no act, so the expansion leaves it as the card prints
      // it (amendment 6: the sign itself carries no explainer).
      expect(seen.line.named.map((n: Line["named"][number]) => n.text)).toEqual([card.name]);
      // And no act is explained twice on the screen.
      for (const act of ["AufenthG =", "BeschV ="])
        expect(seen.text.split(act).length - 1, act).toBeLessThanOrEqual(1);
    } finally {
      server.close();
    }
  }, 120_000);

  it("reopened with the pencil, a question's line names the routes it is asked for without its own answer", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await walkTo(page, server.url, GERMANY_OFFER, "funds_eur_month");
        const at = JSON.parse(await page.evaluate(`JSON.stringify((() => {
          const row = document.querySelector('#decl-list [data-field="experience_5y"]');
          if (!row) return null;
          row.scrollIntoView({ block: "center" });
          const box = row.getBoundingClientRect();
          return { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) };
        })())`)) as { x: number; y: number } | null;
        if (!at) throw new Error("no experience_5y row in the declared panel");
        await page.clickAt(at.x, at.y);
        await waitOutTheBeat(page);
        return { ...(await screenOf(page)), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expectTheCardWithALine(seen, "experience_5y");
      // With its own answer the question decides nothing more and would name
      // no route; without it, the experienced worker and the Opportunity Card.
      expect(namedRoutes(seen.line)).toEqual([["de-experienced-worker", "DE"], ["de-chancenkarte", "DE"]]);
    } finally {
      server.close();
    }
  }, 120_000);

  it("on Germany, the seven-year question names the Blue Card and the Opportunity Card for an IT reader with no degree", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await walkTo(page, server.url, IT_NO_DEGREE, "experience_7y");
        return { ...(await screenOf(page)), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expectTheCardWithALine(seen, "experience_7y");
      expect(namedRoutes(seen.line)).toEqual([["de-blue-card-shortage", "DE"], ["de-chancenkarte", "DE"]]);
    } finally {
      server.close();
    }
  }, 120_000);

  it("at 390 px the line wraps inside the card, every option stays on the card, and nothing shifts", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await walkTo(page, server.url, IT_NO_DEGREE, "experience_5y");
        // What CLS counts from here on: the walk's own scripted answers shifted
        // the page before, and are not this card's.
        await page.evaluate(`(() => {
          window.__cls = 0;
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
          }).observe({ type: "layout-shift" });
        })()`);
        // The answer that draws the seven-year card, by a real tap.
        const at = JSON.parse(await page.evaluate(`JSON.stringify((() => {
          const opt = document.querySelector("#main .qcard .opt[data-value='${IT_NO_DEGREE.experience_5y}']");
          opt.scrollIntoView({ block: "center" });
          const box = opt.getBoundingClientRect();
          return { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) };
        })())`)) as { x: number; y: number };
        await page.clickAt(at.x, at.y);
        await waitOutTheBeat(page);
        await settle(800);
        const geometry = JSON.parse(await page.evaluate(`JSON.stringify((() => {
          const card = document.querySelector("#main .qcard").getBoundingClientRect();
          const el = document.querySelector("#main .qcard [data-asked-for]");
          if (!el) return null;
          const line = el.getBoundingClientRect();
          const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
          const inside = (b) => b.left >= card.left && b.right <= card.right && b.top >= card.top && b.bottom <= card.bottom;
          return {
            lineInside: inside(line),
            lineOverflows: el.scrollWidth > el.clientWidth,
            lines: Math.round(line.height / lineHeight),
            options: [...document.querySelectorAll("#main .qcard .opt")].map((o) => inside(o.getBoundingClientRect())),
            pageOverflows: document.documentElement.scrollWidth > window.innerWidth,
          };
        })())`)) as {
          lineInside: boolean; lineOverflows: boolean; lines: number; options: boolean[]; pageOverflows: boolean;
        } | null;
        return {
          ...(await screenOf(page)), geometry, cls: Number(await page.evaluate("window.__cls")), problems: page.problems(),
        };
      }, PHONE);
      expect(seen.problems).toEqual([]);
      expectTheCardWithALine(seen, "experience_7y");
      expect(namedRoutes(seen.line)).toEqual([["de-blue-card-shortage", "DE"], ["de-chancenkarte", "DE"]]);
      const g = seen.geometry!;
      expect(g, "the line has no box").not.toBeNull();
      process.stdout.write(`  asked-for line at 390 px: ${g.lines} lines, CLS ${seen.cls}\n`);
      expect(g.lines, "the two-route line did not wrap at 390 px").toBeGreaterThan(1);
      expect(g.lineInside, "the line reaches out of the card").toBe(true);
      expect(g.lineOverflows, "the line's text overflows its box").toBe(false);
      expect(g.options.length, "the card does not draw the question's options").toBe(fieldOptions(ds, "experience_7y").length);
      expect(g.options.every(Boolean), "an option is off the card").toBe(true);
      expect(g.pageOverflows, "the page scrolls sideways").toBe(false);
      expect(seen.cls).toBe(0);
    } finally {
      server.close();
    }
  }, 120_000);
});
