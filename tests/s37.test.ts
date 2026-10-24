import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { RECORD_VERSION, STORAGE_KEY } from "../src/lib/record.js";

/**
 * s37 — Back on a restored record, and the Back gesture, in a real browser:
 * what a browser alone does. Its real Back and Forward and the moves they
 * hand the page, a reload that keeps the entries and their states, a Back
 * that leaves the site, two real tabs on one stored record, a phone's width,
 * and no tab throwing. Where the browser's history and the page's list part —
 * a second tab, an outside entrance, an entry another tab's record no longer
 * matches — every corner is walked in Node, through the history's entry
 * (`history-corners.test.ts`, `history.test.ts`).
 */

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));

const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

/** Why the walk cannot run here: no Chrome, or no build. Null when it can. */
function walkSkipReason(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}

/** A tab, as `scripts/browser.mjs` hands it over. */
interface TabPage {
  /** Opens `url` and returns once its document has drawn. */
  goto(url: string): Promise<void>;
  evaluate(expression: string): Promise<string>;
  waitUntil(condition: string, what: string): Promise<unknown>;
  waitUntilAtRest(): Promise<void>;
  /** After a gesture that loads a document: once a document other than the one left has drawn. */
  waitUntilNewDocumentDrawn(): Promise<void>;
  /** What this tab has thrown or logged as an error since its last `goto`. */
  problems(): string[];
  /** A second tab on the same browser: the same origin's storage, a history of its own. */
  openTab(): Promise<TabPage>;
  front(): Promise<void>;
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
const RELOAD = "location.reload()";

interface Where { path: string; question: string; length: number; step: number | null }
const WHERE = 'JSON.stringify({ path: location.pathname,'
  + ' question: ((document.querySelector(".qlabel") || {}).textContent || "").trim(),'
  + ' length: history.length, step: (history.state || {}).step ?? null })';

const whereOf = async (page: TabPage): Promise<Where> => JSON.parse(await page.evaluate(WHERE)) as Where;

/** Whether the tab stands anywhere other than `before`, a reading of WHERE. A
 * history move draws on the browser's turn, not the gesture's, so a gesture
 * that stays on the page is waited on until the screen it leaves is gone. */
const movedFrom = (before: string) => `${WHERE} !== ${JSON.stringify(before)}`;

/**
 * Answers whatever the question on the screen offers, until the tab stands
 * anywhere other than `before`. For its beat a card refuses an answer, and
 * nothing on the page says when the beat lifts, so an answer the beat refused
 * is given again on the next read; one that takes moves the screen in the
 * same task, and is never given twice.
 */
const answeredFrom = (before: string) => `(() => {
  if (${movedFrom(before)}) return true;
  ${ANSWER};
  return ${movedFrom(before)};
})()`;

/** Where the tab stands once the question on its screen is answered and the page is at rest. */
async function answerOn(page: TabPage): Promise<Where> {
  const before = await page.evaluate(WHERE);
  await page.waitUntil(answeredFrom(before), "no answer moved the screen on");
  await page.waitUntilAtRest();
  return whereOf(page);
}

/** A walk: `at()` reads where the tab stands, `act` makes a gesture that stays
 * on the page and `actAcross` one that loads a document, `answer()` answers
 * the question on the screen, `openFromOutside()` opens `/` onto the three
 * answers seeded from `/data/` — an outside entrance — and `live(n)` answers
 * n questions in the tab. */
function walker(page: TabPage, url: (path: string) => string) {
  const at = () => whereOf(page);
  // The gesture runs on the page's next task, so the evaluation has returned
  // before a Back that leaves the site tears the document down.
  const gesture = (expression: string) => page.evaluate(`setTimeout(() => { ${expression}; }, 0), 0`);
  const act = async (expression: string) => {
    const before = await page.evaluate(WHERE);
    await gesture(expression);
    await page.waitUntil(movedFrom(before), `${expression} moved nothing`);
    await page.waitUntilAtRest();
    return at();
  };
  const actAcross = async (expression: string) => {
    await gesture(expression);
    await page.waitUntilNewDocumentDrawn();
    return at();
  };
  const openOnto = async (path: string) => {
    await page.goto(url(path));
    return at();
  };
  const outside = async (seed: string) => {
    await page.goto(url("/data/"));
    await page.evaluate(seed);
    return openOnto("/");
  };
  return {
    at, act, actAcross, openOnto,
    answer: () => answerOn(page),
    openFromOutside: () => outside(SEED),
    async live(n: number) {
      const seen = [await outside(CLEAR)];
      for (let i = 0; i < n; i++) seen.push(await answerOn(page));
      return seen;
    },
  };
}
type Walker = ReturnType<typeof walker>;

type Viewport = { viewport: { width: number; height: number }; mobile: boolean };
/** Two sizes: the desktop the fault was measured at, and a phone's width. */
const WIDE: Viewport = { viewport: { width: 1100, height: 900 }, mobile: false };
const PHONE: Viewport = { viewport: { width: 390, height: 844 }, mobile: true };

/** The tab a walk is handed, and the site's addresses, for a second tab of its own. */
interface Site { page: TabPage; url: (path: string) => string }

/** `walk` in a fresh browser of `size` over the built site. */
async function walkInBrowser<T>(size: Viewport, walk: (w: Walker, site: Site) => Promise<T>): Promise<T> {
  const server = await serve(dist);
  try {
    return await withBrowser((page: TabPage) => walk(walker(page, server.url), { page, url: server.url }), size) as T;
  } finally {
    server.close();
  }
}

const skipped = walkSkipReason();
if (skipped)
  process.stderr.write([
    "",
    `  !! BACK ON A RESTORED RECORD WAS NOT WALKED: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join("\n"));

describe("Back on a restored record, in a real browser", () => {
  it("never lets a pipeline skip the walk", () => {
    if (skipped) expect(process.env.CI, `CI cannot skip: ${skipped}`).toBeFalsy();
    else expect(skipped).toBeNull();
  });
});

describe.skipIf(skipped !== null)("Back on a restored record", () => {
  it("from the screen an outside entrance opened on, the browser's Back still leaves to the page before", async () => {
    const seen = await walkInBrowser(WIDE, async (w) => {
      const entrance = await w.openFromOutside();
      return { entrance, back: await w.actAcross(BROWSER_BACK) };
    });
    expect(seen.entrance.question).toBe(asks("qualification"));
    expect(seen.back.path, "the browser's Back was held on the site").toBe("/data/");
  }, 180000);

  /** At a phone's width, where the rule this bends was written: three screen Backs from an
   * outside entrance, each a question back, none of them off the site, and nothing thrown. */
  it("the same walk on a phone, where the rule this bends was written", async () => {
    const seen = await walkInBrowser(PHONE, async (w, { page }) => {
      const entrance = await w.openFromOutside();
      const backs: Where[] = [];
      for (let i = 0; i < 3; i++) backs.push(await w.act(SCREEN_BACK));
      return { entrance, backs, problems: page.problems() };
    });
    expect(seen.problems, "a tab threw").toEqual([]);
    expect(seen.entrance.question, "the record did not restore to the fourth question").toBe(asks("qualification"));
    expect(seen.backs.map((s) => s.question), "a tap is not the question before")
      .toEqual(["situation", "citizenship", "destination"].map(asks));
    for (const back of seen.backs)
      expect([back.path, back.length], "a tap left the site or changed the browser's history")
        .toEqual(["/", seen.entrance.length]);
  }, 180000);

  /** Two real tabs share the stored record and nothing else: tab B answers two more, tab A
   * reloads onto the longer record, and its screen's Back steps back in place. */
  it("two real tabs on one stored record: grown in tab B, tab A reloads and steps back in place, and no tab threw", async () => {
    const seen = await walkInBrowser(WIDE, async (a, { page, url }) => {
      const entrance = await a.openFromOutside();
      const tabB = await page.openTab();
      await tabB.front();
      const b = walker(tabB, url);
      const inB = [await b.openOnto("/"), await b.answer(), await b.answer()];
      await page.front();
      const reloaded = await a.actAcross(RELOAD);
      const back = await a.act(SCREEN_BACK);
      return { entrance, inB, reloaded, back, problems: { a: page.problems(), b: tabB.problems() } };
    });
    expect(seen.problems, "a tab threw").toEqual({ a: [], b: [] });
    expect(seen.inB[0]!.question, "tab B did not open on the stored record").toBe(seen.entrance.question);
    expect(new Set(seen.inB.map((s) => s.question)).size, "tab B's answers did not move it on").toBe(3);
    expect(seen.reloaded.question, "the reload did not restore what tab B left").toBe(seen.inB[2]!.question);
    expect([seen.back.path, seen.back.question], "the screen's Back left the site, or stayed").toEqual(["/", seen.inB[1]!.question]);
    expect(seen.back.length, "stepping back in place pushed an entry").toBe(seen.reloaded.length);
  }, 180000);

  it("the reload path stays mended: three answered live, a reload, then step 3 → 2 → 1", async () => {
    const seen = await walkInBrowser(PHONE, async (w) => {
      const live = await w.live(3);
      const reloaded = await w.actAcross(RELOAD);
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
    const seen = await walkInBrowser(PHONE, async (w) => {
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
    const seen = await walkInBrowser(PHONE, async (w) => {
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
    const seen = await walkInBrowser(PHONE, async (w) => {
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
    const seen = await walkInBrowser(PHONE, async (w) => {
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
    const seen = await walkInBrowser(PHONE, async (w) => {
      const walk = async (goBack: string) => {
        const live = await w.live(4);
        const reloaded = await w.actAcross(RELOAD);
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
