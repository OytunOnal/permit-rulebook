import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { STORAGE_KEY } from "../src/lib/record.js";

/**
 * #86 — a fast second click answers the next question.
 *
 * Every question's options sit in the same spot, so on the v1.2 gate's hostile
 * walk two blind clicks landed on real answers to questions not yet read
 * (offer country France; under 3 years). Nothing marked the change of
 * question for a mouse reader.
 *
 * So a question card a gesture draws arrives with a *beat* (GLOSSARY.md): it
 * fades in, and for the beat its options take no click — Enter on a focused
 * option included, and the same with or without motion. The beat's length is
 * the token `--motion-beat`, read from the page here as the page reads it;
 * no case types it. The first paint has no beat.
 *
 * The clicks are the platform's own, at a point of the viewport, so whatever
 * the new card has drawn under that point is what the second one lands on.
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
    `  !! THE BEAT BETWEEN QUESTIONS WAS NOT WALKED IN A BROWSER: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
  emulateMedia(features: { name: string; value: string }[]): Promise<void>;
  clickAt(x: number, y: number): Promise<void>;
  pressEnter(): Promise<void>;
  problems(): string[];
}

const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The desktop, where the card sits beside the ledger and nothing scrolls
 * after an answer: the next question's options are drawn where the last
 * one's were (#86's screens). */
const DESK = { viewport: { width: 1280, height: 900 }, mobile: false };

/** Where the reader is: how many answers the record holds, the question on
 * the screen, whether the focus is on its first option, and how many
 * animations the page is running. */
const WHERE = `JSON.stringify((() => {
  const raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
  const card = document.querySelector("#main .qcard");
  const first = card && card.querySelector(".opt");
  return {
    answers: raw ? Object.keys(JSON.parse(raw).answers).length : 0,
    question: card ? (card.querySelector(".qlabel")?.textContent || "").trim() : "",
    focusOnFirst: !!first && document.activeElement === first,
    animations: document.getAnimations().length,
  };
})())`;

interface Where { answers: number; question: string; focusOnFirst: boolean; animations: number }

const where = async (page: BrowserPage): Promise<Where> => JSON.parse(await page.evaluate(WHERE)) as Where;

/** The centre of the first option on the screen, in viewport pixels. */
const FIRST_OPTION_AT = `JSON.stringify((() => {
  const r = document.querySelector("#main .qcard .opt").getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
})())`;

/** The beat in milliseconds, as the built stylesheet carries it: the
 * minifier writes the declared 300ms as .3s. */
const BEAT_MS = `(() => {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--motion-beat").trim();
  return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
})()`;

/** Past the beat, with room for a frame or two. A page without the token
 * fails here rather than waiting nothing. */
async function waitOutTheBeat(page: BrowserPage): Promise<void> {
  const ms = Number(await page.evaluate(BEAT_MS));
  if (!(ms > 0)) throw new Error("the page declares no --motion-beat");
  await settle(ms + 150);
}

async function coldStart(page: BrowserPage, origin: (p: string) => string): Promise<{ x: number; y: number }> {
  await page.goto(origin("/404.html"), 300);
  await page.evaluate("localStorage.clear()");
  await page.goto(origin("/"), 1200);
  return JSON.parse(await page.evaluate(FIRST_OPTION_AT)) as { x: number; y: number };
}

/** A layout-shift observer, counting what CLS counts. */
const WATCH_SHIFTS = `(() => {
  window.__cls = 0;
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
  }).observe({ type: "layout-shift", buffered: true });
  return "watching";
})()`;

describe.skipIf(skipped !== null)("a question card a gesture draws takes no click for a beat (#86)", () => {
  it("two clicks at the same point within the beat leave one answer", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const at = await coldStart(page, server.url);
        const cold = await where(page);
        await page.clickAt(at.x, at.y);
        await page.clickAt(at.x, at.y);
        await waitOutTheBeat(page);
        return { cold, after: await where(page), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expect(seen.after.answers, "the second click answered the question it landed on").toBe(1);
      expect(seen.after.question).not.toBe(seen.cold.question);
    } finally {
      server.close();
    }
  }, 120000);

  it("a click after the beat answers", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const at = await coldStart(page, server.url);
        await page.clickAt(at.x, at.y);
        await waitOutTheBeat(page);
        const first = await where(page);
        await page.clickAt(at.x, at.y);
        await waitOutTheBeat(page);
        return { first, second: await where(page), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expect(seen.first.answers).toBe(1);
      expect(seen.second.answers, "the guard did not lift after the beat").toBe(2);
      expect(seen.second.question).not.toBe(seen.first.question);
    } finally {
      server.close();
    }
  }, 120000);

  it("two fast Enters on the focused first option leave one answer", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const at = await coldStart(page, server.url);
        await page.clickAt(at.x, at.y);
        await waitOutTheBeat(page);
        const ready = await where(page);
        await page.pressEnter();
        await page.pressEnter();
        await waitOutTheBeat(page);
        return { ready, after: await where(page), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expect(seen.ready.focusOnFirst, "the focus was not on the first option to press Enter on").toBe(true);
      expect(seen.after.answers, "the second Enter answered the question it landed on").toBe(2);
      expect(seen.after.question).not.toBe(seen.ready.question);
    } finally {
      server.close();
    }
  }, 120000);

  it("after an answer the focus is on the new card's first option, zero Tabs away", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const at = await coldStart(page, server.url);
        await page.clickAt(at.x, at.y);
        await waitOutTheBeat(page);
        return { after: await where(page), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expect(seen.after.answers).toBe(1);
      expect(seen.after.focusOnFirst).toBe(true);
    } finally {
      server.close();
    }
  }, 120000);

  it("with reduced motion the guard holds and the card runs no animation", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.emulateMedia([{ name: "prefers-reduced-motion", value: "reduce" }]);
        const at = await coldStart(page, server.url);
        const reduced = await page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches");
        await page.clickAt(at.x, at.y);
        const drawn = await where(page);
        await page.clickAt(at.x, at.y);
        await waitOutTheBeat(page);
        return { reduced, drawn, after: await where(page), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expect(seen.reduced, "the browser did not take the reduced-motion preference").toBe(true);
      expect(seen.drawn.animations, "the card animated for a reader who asked for no motion").toBe(0);
      expect(seen.after.answers, "without motion the second click answered").toBe(1);
    } finally {
      server.close();
    }
  }, 120000);

  it("nothing on the page shifts across an answer: CLS stays 0", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const at = await coldStart(page, server.url);
        await page.evaluate(WATCH_SHIFTS);
        await page.clickAt(at.x, at.y);
        await waitOutTheBeat(page);
        await page.clickAt(at.x, at.y);
        await waitOutTheBeat(page);
        return { cls: Number(await page.evaluate("window.__cls")), after: await where(page), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expect(seen.after.answers).toBe(2);
      expect(seen.cls).toBe(0);
    } finally {
      server.close();
    }
  }, 120000);

  it("the first paint has no beat: an option answers at once", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const at = await coldStart(page, server.url);
        const cold = await where(page);
        await page.clickAt(at.x, at.y);
        return { cold, after: await where(page), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expect(seen.cold.answers).toBe(0);
      expect(seen.after.answers, "the first paint's option did not answer").toBe(1);
    } finally {
      server.close();
    }
  }, 120000);
});
