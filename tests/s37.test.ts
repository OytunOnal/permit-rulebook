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
  /** What this tab has thrown or logged as an error since its last `goto`. */
  problems(): string[];
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
/** The record's first `n` answers, stored; the scenario's three by default. */
const seed = (n = 3) => {
  const answers = Object.fromEntries(Object.entries(RECORD).slice(0, n));
  return `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify({
    version: RECORD_VERSION, answers, history: Object.keys(answers),
  }))})`;
};
const CLEAR = `localStorage.removeItem(${JSON.stringify(STORAGE_KEY)})`;

/** Answer whatever the current question offers, whichever kind it is. A
 * search list shows no rows until something is typed, and a walk that grew
 * the record by two stood still on it: one letter draws them. */
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
/** Whether the screen offers its "← Back" — the first question does not. */
const HAS_BACK = 'document.getElementById("back") !== null';
const START_OVER = 'document.getElementById("restart").click()';
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

/** A walk: `at()` reads where the tab stands, `openFromOutside(n)` opens `/`
 * onto a record of n answers seeded from `/data/` — an outside entrance — and
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
  return {
    at, act,
    async openFromOutside(answers = 3) {
      await page.goto(url("/data/"), SETTLE.offInterview);
      await page.evaluate(seed(answers));
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

/** The first proof: three screen Backs from the outside entrance, each a
 * question back, none of them off the site. */
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

/** A record changed in another tab under the entry tab A stands on. */
interface Change {
  /** Tab A opened `/` from outside onto this many stored answers, or walked
   * live from the first question. */
  opened: number | "live";
  /** Tab A's answers in the tab after that. */
  walked: number;
  /** Whether tab B pressed "Start over" before answering. */
  restart: boolean;
  /** Tab B's answers. */
  answers: number;
}
/** Tab A's walk, tab B's, tab A's reload and the Backs tapped after it. */
interface Walked {
  walked: Where[]; inB: Where[]; reloaded: Where; backs: Where[]; problems: Record<"a" | "b", string[]>;
}

/** The step the list tab A rebuilds on reload stands on: one per answer on the record. */
const topAfter = (c: Change) =>
  c.restart ? c.answers : (c.opened === "live" ? 0 : c.opened) + c.walked + c.answers;

/**
 * Walk `change` — tab A, then tab B on the record the two share, then a
 * reload in tab A — and tap `gesture` in tab A for as long as it keeps the tab
 * on the interview and, for the screen's Back, is offered: at most two more
 * taps than the two tabs made screens, so a Back that never ends still does.
 */
async function changedThenBack(
  page: BrowserPage & Tabs, url: (path: string) => string, change: Change, gesture: string,
): Promise<Walked> {
  const a = walker(page, url);
  const walked = change.opened === "live" ? await a.live(change.walked) : [await a.openFromOutside(change.opened)];
  if (change.opened !== "live") for (let i = 0; i < change.walked; i++) walked.push(await a.act(ANSWER));
  const tabB = await page.openTab();
  await tabB.front();
  const b = walker(tabB, url);
  await tabB.goto(url("/"), SETTLE.newDocument);
  const inB = [await b.at()];
  if (change.restart) inB.push(await b.act(START_OVER));
  for (let i = 0; i < change.answers; i++) inB.push(await b.act(ANSWER));
  await page.front();
  const reloaded = await a.act("location.reload()", SETTLE.newDocument);
  const backs: Where[] = [];
  while (backs.length < walked.length + inB.length + 2) {
    if ((backs.at(-1) ?? reloaded).path !== "/") break;
    if (gesture === SCREEN_BACK && !JSON.parse(await page.evaluate(HAS_BACK))) break;
    backs.push(await a.act(gesture, SETTLE.newDocument));
  }
  return { walked, inB, reloaded, backs, problems: { a: page.problems(), b: tabB.problems() } };
}

/**
 * The screen's Back after a reload onto a changed record: one tap per
 * question before the one restored, each the question before — never the one
 * already on screen, which is a dead tap — the "← Back" offered until the
 * first question, the reader on `/` throughout and the browser's history the
 * length it was.
 */
function expectScreenBackWalksTheList(seen: Walked, change: Change) {
  const top = topAfter(change);
  expect(seen.problems, "a tab threw").toEqual({ a: [], b: [] });
  expect(seen.reloaded.question, "the reload did not restore what tab B left").toBe(seen.inB.at(-1)!.question);
  expect(seen.reloaded.step).toBe(top);
  seen.backs.forEach((screen, i) => {
    const before = i === 0 ? seen.reloaded : seen.backs[i - 1]!;
    expect(screen.path, `tap ${i + 1} of the screen's Back left the site`).toBe("/");
    expect(screen.question, `tap ${i + 1} of the screen's Back stayed on the question shown`).not.toBe(before.question);
    expect(screen.length, `tap ${i + 1} changed the browser's history`).toBe(seen.reloaded.length);
  });
  expect(seen.backs.length, "the screen's Back was gone before the first question").toBe(top);
  // A question at a time through the whole list: every one of them seen once.
  const shown = [seen.reloaded, ...seen.backs].map((s) => s.question);
  expect(new Set(shown).size, shown.join(" | ")).toBe(top + 1);
  expect(shown.at(-1)).toBe(asks("destination"));
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

  it("from the screen an outside entrance opened on, the browser's Back still leaves to the page before", async () => {
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

  it("an answer after an outside entrance is held, and the screen it opened on is still the edge", async () => {
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
   * The navigation's type cannot carry this: an outside entrance that is then
   * reloaded reads `reload`, and one left and returned to reads
   * `back_forward`, while the browser still holds only the screen it opened
   * on (headless Chrome, 2026-09-25). The entry's own state says how many
   * held steps stand behind it.
   */
  it("an outside entrance reloaded, or left and returned to, still steps back in place", async () => {
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
        return { opened, inB, reloaded, back, problems: { a: page.problems(), b: tabB.problems() } };
      }, WIDE) as { opened: Where; inB: Where[]; reloaded: Where; back: Where; problems: Record<"a" | "b", string[]> };

      expect(seen.problems, "a tab threw").toEqual({ a: [], b: [] });
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
   * The Security axis's shrinks and the review's own model (s37 delta round
   * 2): tab A opens onto a stored record and answers on, tab B starts over
   * and answers again, tab A reloads. At 01791c7 an entry holding no more
   * steps than the rebuilt list had before it was believed, so the screen's
   * Back popped an entry naming a step past the list, which clamps onto the
   * question already on screen — a dead tap, and the "← Back" gone after it.
   * Its held count is now believed only where the record did not change
   * under it (human, 2026-09-25), and here it did: the screen's Back steps
   * back in place, a question at a time, to the first. The deep shrink is
   * walked below, with the browser's own Back beside it.
   */
  const SHRUNK: (Change & { name: string })[] = [
    { name: "three answers and three more, started over with three — the round's shallow shrink",
      opened: 3, walked: 3, restart: true, answers: 3 },
    { name: "two answers and two more, started over with two", opened: 2, walked: 2, restart: true, answers: 2 },
    { name: "three answers and three more, started over with four", opened: 3, walked: 3, restart: true, answers: 4 },
  ];
  for (const change of SHRUNK) {
    it(`a record shrunk in another tab (${change.name}), then a reload: every screen Back is the question before`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser((page: BrowserPage & Tabs) =>
          changedThenBack(page, server.url, change, SCREEN_BACK), WIDE) as Walked;
        expectScreenBackWalksTheList(seen, change);
      } finally {
        server.close();
      }
    }, 180000);
  }

  /**
   * A record started over in another tab and answered back to the length
   * this tab's entry was written against reads as unchanged — the entry
   * names the step the rebuilt list stands on — and its held count is
   * believed. Every entry behind names a step the list still has, so the
   * screen's Back is the browser's while they last and in place after: the
   * question before each time, never the one on screen, never off the site.
   */
  it("a record restarted in another tab to the same length, then a reload: every screen Back is the question before", async () => {
    const change: Change = { opened: 2, walked: 2, restart: true, answers: 4 };
    const server = await serve(dist);
    try {
      const seen = await withBrowser((page: BrowserPage & Tabs) =>
        changedThenBack(page, server.url, change, SCREEN_BACK), WIDE) as Walked;
      expectScreenBackWalksTheList(seen, change);
    } finally {
      server.close();
    }
  }, 180000);

  /**
   * After a reload onto a record changed in another tab the two Backs part,
   * and each keeps its own promise. The screen's Back steps back through the
   * rebuilt list in place, never dead and never off the site. The browser's
   * own Back is untouched (point 2): it walks the entries this tab wrote, one
   * a gesture, and leaves after the last — over a shrunk list an entry past
   * it shows the question already on screen, over a grown one it skips the
   * questions the other tab added. Point 3 promises agreement on a screen
   * reached by answering in this tab; the screen on show here was reached by
   * the other tab's answers, and the entries behind it were written against
   * a list the page no longer has, so point 3 does not reach these screens.
   *
   * Each Back from its own walk from the same start, since probing both on
   * one screen would need a Forward, and a Forward onto the question being
   * asked restores it without its Back.
   */
  const PARTED: (Change & { name: string })[] = [
    { name: "grown by 1 after a live walk", opened: "live", walked: 3, restart: false, answers: 1 },
    { name: "grown by 2 after a live walk", opened: "live", walked: 3, restart: false, answers: 2 },
    { name: "shrunk deep — three answers and three more, started over with one",
      opened: 3, walked: 3, restart: true, answers: 1 },
  ];
  for (const change of PARTED) {
    it(`a record ${change.name} in another tab, then a reload: the screen's Back walks the list, the browser's its own entries`, async () => {
      const server = await serve(dist);
      try {
        const seen = await withBrowser(async (page: BrowserPage & Tabs) => ({
          screen: await changedThenBack(page, server.url, change, SCREEN_BACK),
          browser: await changedThenBack(page, server.url, change, BROWSER_BACK),
        }), PHONE) as Record<"screen" | "browser", Walked>;

        expectScreenBackWalksTheList(seen.screen, change);

        const { walked, inB, reloaded, backs, problems } = seen.browser;
        expect(reloaded.question, "the reload did not restore what tab B left").toBe(inB.at(-1)!.question);
        expect(problems, "a tab threw").toEqual({ a: [], b: [] });
        // One gesture per entry the tab wrote behind the one it reloaded, in
        // order, each still on the page and none of them added by it...
        const behind = walked.slice(0, -1).map((s) => s.step).reverse();
        expect(backs.slice(0, -1).map((s) => s.step), "the browser's Back did not walk the tab's own entries")
          .toEqual(behind);
        backs.slice(0, -1).forEach((s, i) => {
          expect(s.path, `browser Back ${i + 1} left the site early`).toBe("/");
          expect(s.length, `browser Back ${i + 1}: the page changed the browser's history`).toBe(reloaded.length);
        });
        // ...and after the last, the page the reader came from.
        expect(backs.at(-1)!.path, "the browser's Back was held on the site").toBe("/data/");
      } finally {
        server.close();
      }
    }, 180000);
  }

  /**
   * Point 3 after an outside entrance: a screen reached by answering in this
   * tab is one the two Backs agree on — straight after the entrance, and after
   * a step back in place first. The Spec axis probed both by hand (s37 round 1); these
   * are those walks, each Back from its own fresh walk.
   */
  it("after an outside entrance, the two Backs agree on every screen reached by answering", async () => {
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
