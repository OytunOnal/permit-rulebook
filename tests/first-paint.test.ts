import { beforeAll, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { remainingQuestions, type Dataset } from "permit-rulebook-data";
import { NO_SCRIPT_LINE } from "../src/lib/copy.js";
import { questionCardHtml } from "../src/lib/question.js";
import { STORAGE_KEY, serialize } from "../src/lib/record.js";

/**
 * The first paint, measured the way the field measures it.
 *
 * The counter's Core Web Vitals (Cloudflare, read 2026-09-10, bots excluded)
 * put Cumulative Layout Shift poor for 23% of samples while LCP and INP were
 * good for 100%, and named what moves: `#app` at 0.402 and the shared footer
 * at 0.414, against Google's "poor" line of 0.25. The page shipped
 * `<main id="main"></main>` empty and a 220 KB module drew the first question
 * into it afterwards; everything below moved down to make room.
 *
 * No gate here could see it. On a loopback the module arrives with the HTML
 * and Chrome paints once, so CLS reads 0 — the defect only exists when the
 * HTML is on screen before the script lands. So this case asks the server to
 * hold the module back, which is the one thing the reproduction of 2026-09-15
 * had that the suite did not (s10).
 */
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
    `  !! THE FIRST PAINT WAS NOT MEASURED IN A BROWSER: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
}

/**
 * A realistic mobile lag on the module, and the one the table in the scenario
 * was measured at: HTML at once, script 700 ms later.
 */
const DELAY_JS_MS = 700;

/**
 * Google's "good" line for Cumulative Layout Shift, and the bound the scenario
 * approved. Measured on 2026-09-15 the three arrivals that are not cold sit at
 * 0.057, 0.082 and 0.057, all of it one shift with one cause: the masthead's
 * promise is written out in full for a reader who has answered nothing and
 * shortens to a line for one who has, so a reader with a record has a shorter
 * masthead than the build painted and the interview slides up under it. The
 * box itself no longer moves and the footer no longer moves at all.
 */
const GOOD = 0.1;

/**
 * The observer goes in after the load and reads `buffered: true`, so it still
 * sees the shifts that happened before it existed. It is installed rather than
 * awaited because the driver's `evaluate` hands back a value, not a promise —
 * hence the beat between installing and reading.
 */
const INSTALL = `(() => {
  window.__cls = [];
  new PerformanceObserver((l) => window.__cls.push(...l.getEntries()
    .filter((e) => !e.hadRecentInput)
    .map((e) => ({
      value: e.value,
      nodes: (e.sources ?? []).map((s) => !s.node ? "?"
        : s.node.id ? "#" + s.node.id
        : s.node.tagName + (s.node.className ? "." + String(s.node.className).split(" ")[0] : "")).slice(0, 3),
    })))).observe({ type: "layout-shift", buffered: true });
  return "installed";
})()`;

const READ = `JSON.stringify({
  cls: window.__cls.reduce((s, e) => s + e.value, 0),
  shifts: window.__cls.map((e) => ({ value: Math.round(e.value * 1000) / 1000, nodes: e.nodes })),
})`;

interface Measured { cls: number; shifts: { value: number; nodes: string[] }[] }

/** Every way a reader's first screen can differ from the one the build drew. */
const ARRIVALS = [
  { name: "/ cold, with no record", path: "/", record: null },
  {
    name: "/?country=fr — arriving from a country page",
    path: "/?country=fr",
    record: null,
  },
  {
    name: "/ with a saved record",
    path: "/",
    // A reader part-way through: France, a Turkish passport, an offer there.
    record: {
      answers: { destination: "fr", citizenship: "TR", situation: "offer", situation_country: "fr" },
      history: ["destination", "citizenship", "situation", "situation_country"],
    },
  },
  {
    name: "/?route=de-blue-card-general — arriving from a route page",
    path: "/?route=de-blue-card-general",
    record: null,
  },
  {
    // The arrival the scenario's table does not name: a record with nothing
    // left to ask restores straight to the verdict, and 23 route cards go into
    // the box one question was painted in.
    name: "/ with a finished record",
    path: "/",
    record: {
      answers: {
        destination: "de", citizenship: "TR", situation: "offer", situation_country: "de",
        education: "bachelor", age: "30-44", salary_eur_year: "60000",
      },
      history: [
        "destination", "citizenship", "situation", "situation_country",
        "education", "age", "salary_eur_year",
      ],
    },
  },
] as const;

const measured = new Map<string, Measured>();

/** What the shifts read as, for a failure that says which node moved. */
const detail = (m: Measured) =>
  m.shifts.map((s) => `[${s.value} ${s.nodes.join(",")}]`).join(" ") || "(no shift)";

describe.skipIf(skipped !== null)("the page as it first paints is already the page (s10)", () => {
  beforeAll(async () => {
    const server = await serve(dist, { delayJsMs: DELAY_JS_MS });
    try {
      for (const arrival of ARRIVALS)
        await withBrowser(async (page: BrowserPage) => {
          // Storage belongs to the origin, so it is written from a page of
          // this site — 404 is the cheapest one that runs no interview.
          await page.goto(server.url("/404.html"), 300);
          await page.evaluate(arrival.record
            ? `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${
              JSON.stringify(serialize(arrival.record.answers, [...arrival.record.history]))})`
            : "localStorage.clear()");
          await page.goto(server.url(arrival.path), DELAY_JS_MS + 1500);
          await page.evaluate(INSTALL);
          await new Promise((r) => setTimeout(r, 400));
          measured.set(arrival.name, JSON.parse(await page.evaluate(READ)) as Measured);
        });
    } finally {
      server.close();
    }
  }, 180000);

  for (const arrival of ARRIVALS)
    it(`${arrival.name}: nothing the reader did not ask for moves`, () => {
      const m = measured.get(arrival.name)!;
      expect(m.cls, `CLS ${m.cls} — ${detail(m)}`).toBeLessThan(GOOD);
    });

  it("the cold, record-less / paints once: no shift at all", () => {
    // Nothing on it differs from what the build drew, so there is nothing for
    // the module to change — any shift here is a second render of the same
    // screen, and that is the defect, smaller.
    const m = measured.get(ARRIVALS[0].name)!;
    expect(m.cls, `CLS ${m.cls} — ${detail(m)}`).toBe(0);
  });
});

/**
 * The first half of the promise, read off the built page rather than measured:
 * the screen is there before any script is, and it is the renderer's own
 * output — not a second copy of the markup kept in step by hand.
 */
describe.skipIf(!existsSync(dist))("the first question ships in the HTML (s10)", () => {
  const dataset = rawDataset as unknown as Dataset;
  const built = readFileSync(join(dist, "index.html"), "utf8");
  const inMain = /<main id="main">([\s\S]*?)<\/main>/.exec(built)?.[1] ?? "";

  it("is the very markup the renderer draws, drawn by the renderer", () => {
    const questions = remainingQuestions(dataset, {});
    expect(inMain).toBe(questionCardHtml({
      dataset, question: questions[0], answers: {}, asked: [], editing: null,
      total: questions.length, glossary: new Set(),
    }));
  });

  it("carries the question and every answer it offers", () => {
    const first = remainingQuestions(dataset, {})[0];
    expect(inMain).toContain(first.label);
    for (const option of first.options) expect(inMain, option.value).toContain(option.label);
  });

  it("tells a reader with no script why they cannot answer it", () => {
    // Better than an empty box and worse than a sentence was the state before;
    // this is the sentence (s10, point 4).
    expect(inMain).toContain("<noscript>");
    expect(inMain).toContain(NO_SCRIPT_LINE);
  });
});
