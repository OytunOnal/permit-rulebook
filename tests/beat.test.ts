import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { STORAGE_KEY } from "../src/lib/record.js";

/**
 * #86 — a fast second click answers the next question.
 *
 * Every question's options sit in the same spot, so a second click lands on an
 * answer to a question nobody has read yet.
 *
 * So a question card a gesture draws is drawn with a *beat* (GLOSSARY.md): it
 * fades in, and for the beat nothing on it commits an answer — a click on an
 * option or a row, Enter on a focused option, Enter in the search box — the
 * same with or without motion. The gestures are an answer, a correction (✎),
 * ← Back, Keep this answer, Start over and the browser's Back. The beat's
 * length is the token `--motion-beat`, read from the page here only to wait it
 * out; no case types it. The first paint has no beat.
 *
 * The clicks and keys are the platform's own, at a point of the viewport or on
 * the focused element, so whatever the new card has drawn under that point is
 * what the second one lands on.
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
  type(text: string): Promise<void>;
  back(): Promise<void>;
  problems(): string[];
}

const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The desktop, where the card sits beside the ledger and nothing scrolls
 * after an answer: the next question's options are drawn where the last
 * one's were (#86's screens). */
const DESK = { viewport: { width: 1280, height: 900 }, mobile: false };

/** Where the reader is: how many answers the record holds, the question on
 * the screen, whether it is the search, whether the focus is on its first
 * option, and how many animations the question card is running. */
const WHERE = `JSON.stringify((() => {
  const raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
  const card = document.querySelector("#main .qcard");
  const first = card && card.querySelector(".opt");
  return {
    answers: raw ? Object.keys(JSON.parse(raw).answers).length : 0,
    question: card ? (card.querySelector(".qlabel")?.textContent || "").trim() : "",
    search: !!card && !!card.querySelector("#cfilter"),
    focusOnFirst: !!first && document.activeElement === first,
    cardAnimations: card ? card.getAnimations({ subtree: true }).length : 0,
  };
})())`;

interface Where { answers: number; question: string; search: boolean; focusOnFirst: boolean; cardAnimations: number }

const where = async (page: BrowserPage): Promise<Where> => JSON.parse(await page.evaluate(WHERE)) as Where;

type Point = { x: number; y: number };

/** The centre of the first element a selector finds, in viewport pixels. */
const centreOf = (selector: string) => `JSON.stringify((() => {
  const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
})())`;

const FIRST_OPTION = "#main .qcard .opt";

const pointOf = async (page: BrowserPage, selector: string): Promise<Point> =>
  JSON.parse(await page.evaluate(centreOf(selector))) as Point;

async function clickOn(page: BrowserPage, selector: string): Promise<void> {
  const at = await pointOf(page, selector);
  await page.clickAt(at.x, at.y);
}

/** The beat in milliseconds, as the built stylesheet carries it, in either
 * unit (`tokens.css` says why). */
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

/** The screen once a gesture has drawn a question other than `before`, read
 * the moment it is there: a history move draws on the browser's turn, not
 * the gesture's. */
async function drawnAfter(page: BrowserPage, before: string): Promise<Where> {
  for (let tries = 0; tries < 200; tries++) {
    const now = await where(page);
    if (now.question && now.question !== before) return now;
    await settle(5);
  }
  throw new Error(`no question replaced "${before}"`);
}

async function coldStart(page: BrowserPage, origin: (p: string) => string): Promise<Point> {
  await page.goto(origin("/404.html"), 300);
  await page.evaluate("localStorage.clear()");
  await page.goto(origin("/"), 1200);
  return pointOf(page, FIRST_OPTION);
}

/** Answers `count` questions with the first option each, a beat apart. */
async function answerFirstOptions(page: BrowserPage, count: number): Promise<Where> {
  for (let i = 0; i < count; i++) {
    await clickOn(page, FIRST_OPTION);
    await waitOutTheBeat(page);
  }
  return where(page);
}

/** The first option clicked at once on the card a gesture drew, then again
 * after the beat, at the same point. */
async function clicksAroundTheBeat(page: BrowserPage, before: string): Promise<{ drawn: Where; within: Where; after: Where }> {
  const drawn = await drawnAfter(page, before);
  const at = await pointOf(page, FIRST_OPTION);
  await page.clickAt(at.x, at.y);
  await waitOutTheBeat(page);
  const within = await where(page);
  await page.clickAt(at.x, at.y);
  await waitOutTheBeat(page);
  return { drawn, within, after: await where(page) };
}

/** What a gesture's beat must hold: the click inside it answers nothing,
 * and the click after it answers. */
function expectTheBeatHeld(seen: { drawn: Where; within: Where; after: Where }): void {
  expect(seen.within.question, "a click inside the beat answered the card the gesture drew").toBe(seen.drawn.question);
  expect(seen.within.answers).toBe(seen.drawn.answers);
  expect(seen.after.question, "the guard did not lift after the beat").not.toBe(seen.drawn.question);
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

  it("Enter in the search box ← Back has drawn commits nothing within the beat, and commits after it", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await coldStart(page, server.url);
        let now = await where(page);
        for (let i = 0; i < 10 && !now.search; i++) now = await answerFirstOptions(page, 1);
        const search = now;
        await page.type("a");
        await page.pressEnter();
        await waitOutTheBeat(page);
        const past = await where(page);
        await clickOn(page, "#back");
        const drawn = await drawnAfter(page, past.question);
        await page.pressEnter();
        await waitOutTheBeat(page);
        const within = await where(page);
        await page.pressEnter();
        await waitOutTheBeat(page);
        return { search, past, drawn, within, after: await where(page), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expect(seen.search.search, "the walk never reached the search").toBe(true);
      expect(seen.past.question, "Enter in the search did not commit").not.toBe(seen.search.question);
      expect(seen.drawn.search, "← Back did not draw the search").toBe(true);
      expect(seen.within.question, "Enter inside the beat committed the search's row").toBe(seen.drawn.question);
      expect(seen.after.question, "Enter after the beat did not commit").not.toBe(seen.drawn.question);
    } finally {
      server.close();
    }
  }, 120000);

  it("← Back draws its card with a beat", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await coldStart(page, server.url);
        const now = await answerFirstOptions(page, 2);
        await clickOn(page, "#back");
        return { ...(await clicksAroundTheBeat(page, now.question)), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expectTheBeatHeld(seen);
    } finally {
      server.close();
    }
  }, 120000);

  it("✎, a correction, draws its card with a beat", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await coldStart(page, server.url);
        const now = await answerFirstOptions(page, 2);
        await clickOn(page, "[data-field]");
        return { ...(await clicksAroundTheBeat(page, now.question)), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expectTheBeatHeld(seen);
    } finally {
      server.close();
    }
  }, 120000);

  it("Keep this answer draws its card with a beat", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await coldStart(page, server.url);
        await answerFirstOptions(page, 2);
        await clickOn(page, "[data-field]");
        await waitOutTheBeat(page);
        const editing = await where(page);
        await clickOn(page, "#done");
        return { ...(await clicksAroundTheBeat(page, editing.question)), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expectTheBeatHeld(seen);
    } finally {
      server.close();
    }
  }, 120000);

  it("Start over draws its card with a beat", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await coldStart(page, server.url);
        await answerFirstOptions(page, 2);
        // The resumed line carries "Start over" while a question is on the table.
        await page.goto(server.url("/"), 1200);
        const resumed = await where(page);
        await clickOn(page, "#restart");
        return { ...(await clicksAroundTheBeat(page, resumed.question)), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expect(seen.drawn.answers, "Start over did not clear the record").toBe(0);
      expectTheBeatHeld(seen);
    } finally {
      server.close();
    }
  }, 120000);

  it("the browser's Back draws its card with a beat", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await coldStart(page, server.url);
        const now = await answerFirstOptions(page, 2);
        await page.back();
        return { ...(await clicksAroundTheBeat(page, now.question)), problems: page.problems() };
      }, DESK);
      expect(seen.problems).toEqual([]);
      expectTheBeatHeld(seen);
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
      expect(seen.drawn.cardAnimations, "the card animated for a reader who asked for no motion").toBe(0);
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
