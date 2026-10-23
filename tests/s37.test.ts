import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { RECORD_VERSION, STORAGE_KEY } from "../src/lib/record.js";

/**
 * s37 — Back on a restored record, and the Back gesture, in a real browser:
 * what a browser alone does. Its real Back and Forward and the moves they
 * hand the page, a reload that keeps the entries and their states, and a
 * Back that leaves the site. Where the browser's history and the page's list
 * part — a second tab, an outside entrance, an entry another tab's record no
 * longer matches — is walked in Node, through the history's entry
 * (`history-corners.test.ts`, `history.test.ts`).
 */

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

const { chromePath } = await import("../scripts/chrome.mjs");
const { GOTO_SETTLE_MS, serve, withBrowser } = await import("../scripts/browser.mjs");

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

/** The question each field asks, in the dataset's own words. */
const asks = (field: string) => ds.fields.find((f) => f.id === field)!.label;

/** Three answers, in the order they were given. */
const RECORD = { destination: "de", citizenship: "IN", situation: "offer" };
/** The record's three answers, stored. */
const SEED = `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify({
  version: RECORD_VERSION, answers: RECORD, history: Object.keys(RECORD),
}))})`;
const CLEAR = `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`;

/** Answer whatever the current question offers, whichever kind it is. A
 * search list shows no rows until something is typed: one letter draws them. */
const ANSWER = `(() => {
  const opt = document.querySelector(".qcard .opts .opt");
  if (opt) { opt.click(); return "opt"; }
  const input = document.getElementById("cfilter");
  if (input && !document.querySelector(".clist [role=option]")) {
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
  const row = document.querySelector(".clist [role=option]");
  if (row) { row.click(); return "row"; }
  return "none";
})()`;
const SCREEN_BACK = 'document.getElementById("back").click()';
const BROWSER_BACK = "history.back()";
const BROWSER_FORWARD = "history.forward()";

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
 * the slowest reading of its kind; the factor is given on each.
 */
const SETTLE = {
  /** An answer, or a Back that lands on a question of this page: 450 ms,
   * about 32 times the 14 ms measured. */
  onPage: 450,
  /** A gesture that loads a document — opening `/`, a reload, a Back or
   * Forward across pages: 1200 ms, about 15 times the 82 ms measured for `/`
   * and about 5 times the 230 ms for a Back off the site. */
  newDocument: 1200,
  /** `/data/`, opened only for its origin and left: nothing on it is waited
   * for and nothing was measured, so the harness's own `goto` default. */
  offInterview: GOTO_SETTLE_MS,
};

/**
 * A read that lands while a new document is still loading is asked again,
 * up to four more times, 400 ms apart: 1.6 s past the gesture's own wait,
 * about 7 times the slowest document load measured above (230 ms).
 */
const READ_RETRY = { times: 4, everyMs: 400 };

/** A walk: `at()` reads where the tab stands, `openFromOutside()` opens `/`
 * onto the three answers seeded from `/data/` — an outside entrance — and
 * `live(n)` answers n questions in the tab. */
function walker(page: BrowserPage, url: (path: string) => string) {
  // A Back that leaves the site is a new document: a read that lands while it
  // is still loading is asked again rather than failing the walk on timing.
  const at = async (): Promise<Where> => {
    for (let tries = 0; ; tries++) {
      try { return JSON.parse(await page.evaluate(WHERE)) as Where; } catch (e) {
        if (tries >= READ_RETRY.times) throw e;
        await settle(READ_RETRY.everyMs);
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
  const outside = async (seed: string) => {
    await page.goto(url("/data/"), SETTLE.offInterview);
    await page.evaluate(seed);
    await page.goto(url("/"), SETTLE.newDocument);
    return at();
  };
  return {
    at, act,
    openFromOutside: () => outside(SEED),
    async live(n: number) {
      const seen = [await outside(CLEAR)];
      for (let i = 0; i < n; i++) seen.push(await act(ANSWER));
      return seen;
    },
  };
}
type Walker = ReturnType<typeof walker>;

type Viewport = { viewport: { width: number; height: number }; mobile: boolean };
/** Two sizes: the desktop the fault was measured at, and a phone's width. */
const WIDE: Viewport = { viewport: { width: 1100, height: 900 }, mobile: false };
const PHONE: Viewport = { viewport: { width: 390, height: 844 }, mobile: true };

/** `walk` in a fresh browser of `size` over the built site. */
async function walked<T>(size: Viewport, walk: (w: Walker) => Promise<T>): Promise<T> {
  const server = await serve(dist);
  try {
    return await withBrowser((page: BrowserPage) => walk(walker(page, server.url)), size) as T;
  } finally {
    server.close();
  }
}

describe("Back on a restored record, in a real browser", () => {
  it("never lets a pipeline skip the walk", () => {
    if (skipped) expect(process.env.CI, `CI cannot skip: ${skipped}`).toBeFalsy();
    else expect(skipped).toBeNull();
  });
});

describe.skipIf(skipped !== null)("Back on a restored record", () => {
  it("from the screen an outside entrance opened on, the browser's Back still leaves to the page before", async () => {
    const seen = await walked(WIDE, async (w) => {
      const opened = await w.openFromOutside();
      return { opened, back: await w.act(BROWSER_BACK, SETTLE.newDocument) };
    });
    expect(seen.opened.question).toBe(asks("qualification"));
    expect(seen.back.path, "the browser's Back was held on the site").toBe("/data/");
  }, 180000);

  it("the reload path stays mended: three answered live, a reload, then step 3 → 2 → 1", async () => {
    const seen = await walked(PHONE, async (w) => {
      const live = await w.live(3);
      const reloaded = await w.act("location.reload()", SETTLE.newDocument);
      const screenBack = await w.act(SCREEN_BACK);
      const browserBack = await w.act(BROWSER_BACK);
      return { live, reloaded, screenBack, browserBack };
    });
    const questions = seen.live.map((s) => s.question);
    expect(new Set(questions).size, questions.join(" | ")).toBe(4);
    expect([seen.reloaded.step, seen.reloaded.question]).toEqual([3, questions[3]]);
    expect([seen.screenBack.step, seen.screenBack.question]).toEqual([2, questions[2]]);
    expect([seen.browserBack.step, seen.browserBack.question]).toEqual([1, questions[1]]);
    for (const s of [seen.screenBack, seen.browserBack]) expect(s.path).toBe("/");
  }, 180000);

  it("mid-interview, the screen's Back and the browser's land on the same question", async () => {
    const seen = await walked(PHONE, async (w) => {
      const walk = async (goBack: string) => {
        const live = await w.live(2);
        return { live, back: await w.act(goBack) };
      };
      return { screen: await walk(SCREEN_BACK), browser: await walk(BROWSER_BACK) };
    });
    expect(seen.screen.live.map((s) => s.question)).toEqual(seen.browser.live.map((s) => s.question));
    expect(seen.screen.back.question, "the two Backs disagree").toBe(seen.browser.back.question);
    expect(seen.screen.back.step).toBe(seen.browser.back.step);
    expect(seen.screen.back.question).toBe(seen.screen.live[1]!.question);
    expect(seen.screen.back.step).toBe(1);
  }, 180000);

  /**
   * A browser move reads the entry it lands on against the step it lands at,
   * not against the list's last step. Read against the last, the browser's
   * Back from step 5 lands on step 4 with nothing held, the screen's Back then
   * steps back in place, and the browser's Back after it shows that same
   * question again — a dead Back in a single tab, which no other walk caught.
   */
  it("in one tab, the browser's Back, the screen's, then the browser's: each a question back", async () => {
    const seen = await walked(PHONE, async (w) => {
      const live = await w.live(5);
      const backs: Where[] = [];
      for (const gesture of [BROWSER_BACK, SCREEN_BACK, BROWSER_BACK]) backs.push(await w.act(gesture));
      return { live, backs };
    });
    const questions = seen.live.map((s) => s.question);
    expect(new Set(questions).size, questions.join(" | ")).toBe(6);
    expect(seen.backs.map((s) => s.question), "a Back showed the question already on screen")
      .toEqual([4, 3, 2].map((step) => questions[step]));
    seen.backs.forEach((screen, i) => {
      expect(screen.path, `Back ${i + 1} left the site`).toBe("/");
      expect(screen.step, `Back ${i + 1} is not a step back`).toBe(4 - i);
      expect(screen.length, `Back ${i + 1} changed the browser's history`).toBe(seen.live[5]!.length);
    });
  }, 180000);
});

/**
 * The phone's back gesture, on the human's walk of 2026-09-08: three answers
 * grew `history.length` by one while the page's own state read `{"step":7}`,
 * the first back gesture jumped three questions and the second went FORWARD.
 * One entry per question screen, and both Backs one gesture.
 */
describe.skipIf(skipped !== null)("back and forward walk the questions", () => {
  it("four answers, back twice and forward once, land on the questions they name", async () => {
    const seen = await walked(PHONE, async (w) => {
      const asked = await w.live(4);
      const back1 = await w.act(BROWSER_BACK);
      const back2 = await w.act(BROWSER_BACK);
      return { asked, back1, back2, forward: await w.act(BROWSER_FORWARD) };
    });
    const [first, ...answered] = seen.asked;
    // One entry per answer: the counter and the browser agree, which is the
    // thing that had come apart.
    expect(first!.step).toBe(0);
    answered.forEach((screen, i) => {
      expect(screen.step, `answer ${i + 1} did not add exactly one entry`).toBe(i + 1);
      expect(screen.length - first!.length, `answer ${i + 1}: history grew by ${screen.length - first!.length}`)
        .toBe(i + 1);
    });
    const questions = seen.asked.map((s) => s.question);
    expect(new Set(questions).size, questions.join(" | ")).toBe(questions.length);
    // Back once is the question before the one on screen — not three before;
    // twice is the one before that, and never a step forward.
    expect([seen.back1.question, seen.back1.step]).toEqual([questions[3], 3]);
    expect([seen.back2.question, seen.back2.step]).toEqual([questions[2], 2]);
    // Forward is symmetrical: it undoes the last back exactly.
    expect([seen.forward.question, seen.forward.step]).toEqual([seen.back1.question, 3]);
  }, 180000);

  it("the screen's own Back and the browser's land on the same question", async () => {
    const seen = await walked(PHONE, async (w) => {
      const walk = async (goBack: string) => {
        const live = await w.live(3);
        return { before: live.at(-1)!, after: await w.act(goBack) };
      };
      return { screen: await walk(SCREEN_BACK), browser: await walk(BROWSER_BACK) };
    });
    expect(seen.screen.before.question).toBe(seen.browser.before.question);
    // The same gesture, whichever control the reader used.
    expect(seen.screen.after.question, "the two Backs disagree").toBe(seen.browser.after.question);
    expect(seen.screen.after.step).toBe(seen.browser.after.step);
    // And it is a step, not a jump.
    expect(seen.screen.after.step).toBe(seen.screen.before.step! - 1);
  }, 180000);

  /**
   * A mid-interview reload emptied the page's own list while the browser
   * kept every entry it had pushed: `step` restarted at 0 with
   * `history.length` still at 5, so browser Back found no screen to restore
   * and the page's own Back fell through to the edit path (Spec review,
   * 2026-09-08).
   */
  it("after a reload both Backs still land on the same previous question, and forward returns", async () => {
    const seen = await walked(PHONE, async (w) => {
      const walk = async (goBack: string) => {
        const live = await w.live(4);
        const reloaded = await w.act("location.reload()", SETTLE.newDocument);
        const back = await w.act(goBack);
        const questions = live.map((s) => s.question);
        return { questions, before: live.at(-1)!, reloaded, back, forward: await w.act(BROWSER_FORWARD) };
      };
      return { browser: await walk(BROWSER_BACK), screen: await walk(SCREEN_BACK) };
    });
    for (const [how, walk] of Object.entries(seen)) expectReloadKeptTheWalk(how, walk);
    // The two gestures agree, which is the whole point of the fix.
    expect([seen.screen.back.question, seen.screen.back.step])
      .toEqual([seen.browser.back.question, seen.browser.back.step]);
  }, 180000);
});

/** The reload changed nothing a reader can see, the entry included; Back is a step to the previous
 * question, not a dead gesture; and forward returns to where the reader stood. */
function expectReloadKeptTheWalk(
  how: string, walk: { questions: string[]; before: Where; reloaded: Where; back: Where; forward: Where },
) {
  expect(walk.reloaded.question, `${how}: the reload lost the question`).toBe(walk.before.question);
  expect(walk.reloaded.step, `${how}: the step restarted at ${walk.reloaded.step}`).toBe(walk.before.step);
  expect(walk.reloaded.length, `${how}: the browser's own entries changed`).toBe(walk.before.length);
  expect(walk.back.question, `${how}: Back did nothing after a reload`).toBe(walk.questions.at(-2));
  expect(walk.back.step).toBe(walk.before.step! - 1);
  expect(walk.forward.question, `${how}: forward did not return`).toBe(walk.before.question);
  expect(walk.forward.step).toBe(walk.before.step);
}
