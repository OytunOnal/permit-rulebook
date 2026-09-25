import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { RECORD_VERSION, STORAGE_KEY } from "../src/lib/record.js";

/**
 * s37 — Back on a restored record.
 *
 * A tab visits `/data/`, the record holds three answers, the reader opens `/`:
 * the interview restores to the fourth question and shows "← Back". The page
 * had rebuilt a list of four screens and stood on the last, but the browser
 * held one entry of the interview — the screen it opened on — and the
 * screen's Back, as `history.back()`, went to `/data/` (measured 2026-09-25).
 * The screen's Back now asks the browser only for entries it holds; the
 * browser's own Back is left alone.
 */

const ds = dataset as unknown as Dataset;
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
    `  !! BACK ON A RESTORED RECORD WAS NOT WALKED: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join("\n"));

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
}
/** A second tab on the same browser, and bringing a tab to the front. */
interface Tabs {
  openTab(): Promise<BrowserPage & Tabs>;
  front(): Promise<void>;
}

/** The question each field asks, in the dataset's own words. */
const asks = (field: string) => ds.fields.find((f) => f.id === field)!.label;

/** Three answers, in the order they were given: the scenario's record. */
const RECORD = { destination: "de", citizenship: "IN", situation: "offer" };
const seed = `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify({
  version: RECORD_VERSION, answers: RECORD, history: Object.keys(RECORD),
}))})`;
const CLEAR = `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`;

/** Answer whatever the current question offers, whichever kind it is. */
const ANSWER = `(() => {
  const opt = document.querySelector(".qcard .opts .opt");
  if (opt) { opt.click(); return "opt"; }
  const row = document.querySelector(".clist [role=option]");
  if (row) { row.click(); return "row"; }
  return "none";
})()`;
const SCREEN_BACK = 'document.getElementById("back").click()';
const BROWSER_BACK = "history.back()";

interface Where { path: string; question: string; length: number; step: number | null }
const WHERE = 'JSON.stringify({ path: location.pathname,'
  + ' question: ((document.querySelector(".qlabel") || {}).textContent || "").trim(),'
  + ' length: history.length, step: (history.state || {}).step ?? null })';

const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * How long each kind of gesture is given before the tab is read — one wait
 * per kind, whichever walk makes it. Measured on the built site in headless
 * Chrome, 2026-09-25, eight runs alone on the machine: an answer or a Back
 * that stays on the page drew in at most 14 ms, opening `/` or reloading it
 * in at most 82 ms, and a Back off the site to `/data/` in at most 230 ms.
 * The suite drives several browsers side by side, so each wait is many times
 * the slowest reading of its kind.
 */
const SETTLE = {
  /** An answer, or a Back that lands on a question of this page. */
  onPage: 450,
  /** A gesture that loads a document: opening `/`, a reload, a Back or Forward across pages. */
  newDocument: 1200,
  /** `/data/`, opened only to be left: nothing on it is waited for, so the
   * harness's own `goto` default (400 ms, scripts/browser.mjs). */
  offInterview: 400,
};

/** A read that lands while a new document is still loading is asked again:
 * four more times, `SETTLE.offInterview` apart — 1.6 s past the gesture's own
 * wait, several times the slowest document load measured above. */
const READ_RETRIES = 4;

/** A walk: `at()` reads where the tab stands, `openFromOutside()` opens `/`
 * onto the seeded record from `/data/` — an outside entry, `live(n)` answers n questions in the tab. */
function walker(page: BrowserPage, url: (path: string) => string) {
  // A Back that leaves the site is a new document: a read that lands while it
  // is still loading is asked again rather than failing the walk on timing.
  const at = async (): Promise<Where> => {
    for (let tries = 0; ; tries++) {
      try { return JSON.parse(await page.evaluate(WHERE)) as Where; } catch (e) {
        if (tries >= READ_RETRIES) throw e;
        await settle(SETTLE.offInterview);
      }
    }
  };
  // The gesture runs on the page's next task, so the evaluation has returned
  // before a Back that leaves the site tears the document down.
  const act = async (expression: string, ms = SETTLE.onPage) => {
    await page.evaluate(`setTimeout(() => { ${expression}; }, 0), 0`);
    await settle(ms);
    return at();
  };
  return {
    at, act,
    async openFromOutside() {
      await page.goto(url("/data/"), SETTLE.offInterview);
      await page.evaluate(seed);
      await page.goto(url("/"), SETTLE.newDocument);
      return at();
    },
    async live(n: number) {
      await page.goto(url("/data/"), SETTLE.offInterview);
      await page.evaluate(CLEAR);
      await page.goto(url("/"), SETTLE.newDocument);
      const seen = [await at()];
      for (let i = 0; i < n; i++) seen.push(await act(ANSWER));
      return seen;
    },
  };
}

type Viewport = { viewport: { width: number; height: number }; mobile: boolean };
/** The scenario's two sizes: the desktop the fault was measured at, and the
 * phone width its proof list asks for. */
const WIDE: Viewport = { viewport: { width: 1100, height: 900 }, mobile: false };
const PHONE: Viewport = { viewport: { width: 390, height: 844 }, mobile: true };

/** The first proof: three screen Backs from the outside entry, each a question back,
 * none of them off the site. */
async function threeScreenBacks(size: Viewport) {
  const server = await serve(dist);
  try {
    return await withBrowser(async (page: BrowserPage) => {
      const w = walker(page, server.url);
      const opened = await w.openFromOutside();
      const backs: Where[] = [];
      for (let i = 0; i < 3; i++) backs.push(await w.act(SCREEN_BACK));
      return { opened, backs };
    }, size) as { opened: Where; backs: Where[] };
  } finally {
    server.close();
  }
}

function expectThreeStepsBack(seen: { opened: Where; backs: Where[] }, where: string) {
  expect(seen.opened.path).toBe("/");
  expect(seen.opened.question, `${where}: the record did not restore to the fourth question`)
    .toBe(asks("qualification"));
  const expected = ["situation", "citizenship", "destination"].map(asks);
  seen.backs.forEach((screen, i) => {
    expect(screen.path, `${where}: tap ${i + 1} of the screen's Back left the site`).toBe("/");
    expect(screen.question, `${where}: tap ${i + 1} is not the question before`).toBe(expected[i]);
    // Stepping back in place pushes nothing: the browser's history stays the
    // length the reader walked it (point 2).
    expect(screen.length, `${where}: tap ${i + 1} changed the browser's history`).toBe(seen.opened.length);
  });
}

describe("Back on a restored record, in a real browser", () => {
  it("never lets a pipeline skip the walk", () => {
    if (skipped) expect(process.env.CI, `CI cannot skip: ${skipped}`).toBeFalsy();
    else expect(skipped).toBeNull();
  });
});

describe.skipIf(skipped !== null)("Back on a restored record", () => {
  it("the screen's Back walks back through every answered question and never leaves the site", async () => {
    expectThreeStepsBack(await threeScreenBacks(WIDE), "1100 × 900");
  }, 180000);

  it("the same walk on a phone, where the rule this bends was written", async () => {
    expectThreeStepsBack(await threeScreenBacks(PHONE), "390 × 844");
  }, 180000);

  it("from the screen an outside entry opened on, the browser's Back still leaves to the page before", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const w = walker(page, server.url);
        const opened = await w.openFromOutside();
        return { opened, back: await w.act(BROWSER_BACK, SETTLE.newDocument) };
      }, WIDE) as { opened: Where; back: Where };
      expect(seen.opened.question).toBe(asks("qualification"));
      expect(seen.back.path, "the browser's Back was held on the site").toBe("/data/");
    } finally {
      server.close();
    }
  }, 180000);

  it("an answer after an outside entry is held, and the screen it opened on is still the edge", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const w = walker(page, server.url);
        const opened = await w.openFromOutside();
        const advanced = await w.act(ANSWER);
        const back1 = await w.act(SCREEN_BACK);
        const back2 = await w.act(SCREEN_BACK);
        // From there nothing of ours is behind in the browser, so its Back leaves.
        const browserBack = await w.act(BROWSER_BACK, SETTLE.newDocument);
        return { opened, advanced, back1, back2, browserBack };
      }, PHONE) as Record<"opened" | "advanced" | "back1" | "back2" | "browserBack", Where>;

      expect(seen.advanced.question).not.toBe(seen.opened.question);
      expect(seen.advanced.step).toBe((seen.opened.step ?? NaN) + 1);
      expect(seen.advanced.length, "an answer is one entry").toBe(seen.opened.length + 1);
      // The first Back goes onto the entry the answer pushed: the screen it opened on.
      expect(seen.back1.path).toBe("/");
      expect(seen.back1.question).toBe(asks("qualification"));
      expect(seen.back1.step).toBe(seen.opened.step);
      // The second is behind the first held step: in place, not off the site.
      expect(seen.back2.path, "the second Back left the site").toBe("/");
      expect(seen.back2.question).toBe(asks("situation"));
      expect(seen.browserBack.path).toBe("/data/");
    } finally {
      server.close();
    }
  }, 180000);

  /**
   * The navigation's type cannot carry this: an outside entry that is then
   * reloaded reads `reload`, and one left and returned to reads
   * `back_forward`, while the browser still holds only the screen it opened
   * on (headless Chrome, 2026-09-25). The entry's own state says how many
   * held steps stand behind it.
   */
  it("an outside entry reloaded, or left and returned to, still steps back in place", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const w = walker(page, server.url);
        await w.openFromOutside();
        const reloaded = await w.act("location.reload()", SETTLE.newDocument);
        const afterReload = await w.act(SCREEN_BACK);
        await w.openFromOutside();
        const left = await w.act(BROWSER_BACK, SETTLE.newDocument);
        const returned = await w.act("history.forward()", SETTLE.newDocument);
        const afterReturn = await w.act(SCREEN_BACK);
        return { reloaded, afterReload, left, returned, afterReturn };
      }, WIDE) as Record<"reloaded" | "afterReload" | "left" | "returned" | "afterReturn", Where>;

      expect(seen.reloaded.question).toBe(asks("qualification"));
      expect(seen.afterReload.path, "after a reload the screen's Back left the site").toBe("/");
      expect(seen.afterReload.question).toBe(asks("situation"));
      expect(seen.left.path).toBe("/data/");
      expect(seen.returned.question).toBe(asks("qualification"));
      expect(seen.afterReturn.path, "after a return the screen's Back left the site").toBe("/");
      expect(seen.afterReturn.question).toBe(asks("situation"));
    } finally {
      server.close();
    }
  }, 180000);

  /**
   * Two tabs on one origin share the record and nothing else. Tab A opens `/`
   * onto three answers; tab B answers two more; tab A reloads and rebuilds a
   * list two steps longer than the one its entry was written against. An edge
   * kept as a step number then stood behind the reader, and the screen's Back
   * went to `/data/` (Security review, s37 round 1, at both shas).
   */
  it("a record grown in another tab, then a reload, still steps back in place", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage & Tabs) => {
        const a = walker(page, server.url);
        const opened = await a.openFromOutside();
        const tabB = await page.openTab();
        await tabB.front();
        const b = walker(tabB, server.url);
        await tabB.goto(server.url("/"), SETTLE.newDocument);
        const inB = [await b.at(), await b.act(ANSWER), await b.act(ANSWER)];
        await page.front();
        const reloaded = await a.act("location.reload()", SETTLE.newDocument);
        const back = await a.act(SCREEN_BACK);
        return { opened, inB, reloaded, back };
      }, WIDE) as { opened: Where; inB: Where[]; reloaded: Where; back: Where };

      // Tab B opened on the same record, and each answer moved it on.
      expect(seen.inB[0]!.question).toBe(seen.opened.question);
      expect(new Set(seen.inB.map((s) => s.question)).size).toBe(3);
      // The reload restores what tab B left: two questions further on.
      expect(seen.reloaded.question).toBe(seen.inB[2]!.question);
      expect(seen.back.path, "the screen's Back left the site").toBe("/");
      expect(seen.back.question).toBe(seen.inB[1]!.question);
      expect(seen.back.length, "stepping back in place pushed an entry").toBe(seen.reloaded.length);
    } finally {
      server.close();
    }
  }, 180000);

  /**
   * Point 3 after an outside entry: a screen reached by answering in this tab
   * is one the two Backs agree on — straight after the entry, and after a step
   * back in place first. The Spec axis probed both by hand (s37 round 1); these
   * are those walks, each Back from its own fresh walk.
   */
  it("after an outside entry, the two Backs agree on every screen reached by answering", async () => {
    const server = await serve(dist);
    try {
      type Walk = { answeredOn: Where; answered: Where; back: Where };
      const seen = await withBrowser(async (page: BrowserPage) => {
        const w = walker(page, server.url);
        const walk = async (inPlaceFirst: boolean, goBack: string): Promise<Walk> => {
          let answeredOn = await w.openFromOutside();
          if (inPlaceFirst) answeredOn = await w.act(SCREEN_BACK);
          const answered = await w.act(ANSWER);
          return { answeredOn, answered, back: await w.act(goBack) };
        };
        return {
          straight: { screen: await walk(false, SCREEN_BACK), browser: await walk(false, BROWSER_BACK) },
          inPlaceFirst: { screen: await walk(true, SCREEN_BACK), browser: await walk(true, BROWSER_BACK) },
        };
      }, PHONE) as Record<"straight" | "inPlaceFirst", Record<"screen" | "browser", Walk>>;

      // The screen answered on: the one opened on, or the one a Back in place showed.
      expect(seen.straight.screen.answeredOn.question).toBe(asks("qualification"));
      expect(seen.inPlaceFirst.screen.answeredOn.question).toBe(asks("situation"));
      for (const [how, { screen, browser }] of Object.entries(seen)) {
        expect(screen.answered.question, `${how}: the two walks answered differently`).toBe(browser.answered.question);
        expect(screen.answered.question, `${how}: the answer did not move on`).not.toBe(screen.answeredOn.question);
        for (const back of [screen.back, browser.back]) expect(back.path, `${how}: a Back left the site`).toBe("/");
        expect(screen.back.question, `${how}: the two Backs disagree`).toBe(browser.back.question);
        expect(screen.back.step).toBe(browser.back.step);
        // And both land on the screen the answer was given on.
        expect(screen.back.question).toBe(screen.answeredOn.question);
      }
    } finally {
      server.close();
    }
  }, 180000);

  it("the reload path stays mended: three answered live, a reload, then step 3 → 2 → 1", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const w = walker(page, server.url);
        const live = await w.live(3);
        const reloaded = await w.act("location.reload()", SETTLE.newDocument);
        const screenBack = await w.act(SCREEN_BACK);
        const browserBack = await w.act(BROWSER_BACK);
        return { live, reloaded, screenBack, browserBack };
      }, PHONE) as { live: Where[]; reloaded: Where; screenBack: Where; browserBack: Where };

      const questions = seen.live.map((s) => s.question);
      expect(new Set(questions).size, questions.join(" | ")).toBe(4);
      expect(seen.reloaded.step).toBe(3);
      expect(seen.reloaded.question).toBe(questions[3]);
      expect(seen.screenBack.step).toBe(2);
      expect(seen.screenBack.question).toBe(questions[2]);
      expect(seen.browserBack.step).toBe(1);
      expect(seen.browserBack.question).toBe(questions[1]);
      for (const s of [seen.screenBack, seen.browserBack]) expect(s.path).toBe("/");
    } finally {
      server.close();
    }
  }, 180000);

  it("mid-interview, the screen's Back and the browser's land on the same question", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const w = walker(page, server.url);
        const walk = async (goBack: string) => {
          const live = await w.live(2);
          return { live, back: await w.act(goBack) };
        };
        return { screen: await walk(SCREEN_BACK), browser: await walk(BROWSER_BACK) };
      }, PHONE) as Record<"screen" | "browser", { live: Where[]; back: Where }>;

      expect(seen.screen.live.map((s) => s.question)).toEqual(seen.browser.live.map((s) => s.question));
      expect(seen.screen.back.question, "the two Backs disagree").toBe(seen.browser.back.question);
      expect(seen.screen.back.step).toBe(seen.browser.back.step);
      expect(seen.screen.back.question).toBe(seen.screen.live[1]!.question);
      expect(seen.screen.back.step).toBe(1);
    } finally {
      server.close();
    }
  }, 180000);
});
