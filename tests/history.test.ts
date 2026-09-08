import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { emptyHistory, recordScreen, screenAt } from "../src/lib/screen.js";

/**
 * The phone's back gesture, on the human's walk of 2026-09-08.
 *
 * Spain, then a transfer, then a Turkish passport: three answers, and
 * `history.length` had grown by one while the page's own state read
 * `{"step":7}`. The first back gesture jumped three questions to "Where are you
 * looking to go?", and the second went FORWARD to "Which best describes your
 * situation?".
 *
 * Every render pushed an entry — answering, editing, the screen's own "← Back"
 * — so the numbers stopped naming the questions, and a phone that throttles a
 * burst of `pushState` calls dropped the extra entries while the page kept
 * counting. One entry per question screen now, and "← Back" is `history.back()`
 * itself, so the two gestures cannot land on different screens.
 */

describe("one history entry per question", () => {
  it("advancing pushes, everything else replaces where it stands", () => {
    const h = emptyHistory();
    // The first render replaces the page's own entry: pushing there would trap
    // the visitor, because Back would always land on another of our screens.
    expect(recordScreen(h, "destination", false)).toEqual({ how: "replace", step: 0 });
    expect(recordScreen(h, "situation", true)).toEqual({ how: "push", step: 1 });
    expect(recordScreen(h, "citizenship", true)).toEqual({ how: "push", step: 2 });
    // An edit is not a new screen: it rewrites the entry it is standing on.
    expect(recordScreen(h, "citizenship", false)).toEqual({ how: "replace", step: 2 });
    // Three questions answered, three entries — never four, never one.
    expect(h.entries.map((e) => e.field)).toEqual(["destination", "situation", "citizenship"]);
  });

  it("every entry names the question it was showing", () => {
    const h = emptyHistory();
    for (const [field, advance] of [
      ["destination", false], ["situation", true], ["citizenship", true],
    ] as const) recordScreen(h, field, advance);
    expect(screenAt(h, 0)?.field).toBe("destination");
    expect(screenAt(h, 1)?.field).toBe("situation");
    expect(screenAt(h, 2)?.field).toBe("citizenship");
    // The results screen is an entry too, and names no question.
    expect(recordScreen(h, null, true)).toEqual({ how: "push", step: 3 });
    expect(screenAt(h, 3)?.field).toBeNull();
    // An entry nobody wrote restores nothing.
    expect(screenAt(h, 9)).toBeUndefined();
  });

  it("answering after going back drops what was ahead", () => {
    const h = emptyHistory();
    recordScreen(h, "destination", false);
    recordScreen(h, "situation", true);
    recordScreen(h, "citizenship", true);
    // Back to the second question, then a different answer.
    h.current = 1;
    expect(recordScreen(h, "qualification", true)).toEqual({ how: "push", step: 2 });
    expect(h.entries.map((e) => e.field)).toEqual(["destination", "situation", "qualification"]);
  });
});

/** And the gesture itself, in a browser that has a history to walk. */
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
    `  !! THE BACK GESTURE WAS NOT WALKED: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
}

/** Answer whatever the current question offers, whichever kind it is. */
const ANSWER = `(() => {
  const opt = document.querySelector(".qcard .opts .opt");
  if (opt) { opt.click(); return "opt"; }
  const row = document.querySelector(".clist [role=option]");
  if (row) { row.click(); return "row"; }
  const input = document.querySelector("#cfilter");
  if (input) { input.value = "Turkey"; input.dispatchEvent(new Event("input", { bubbles: true })); return "typed"; }
  return "none";
})()`;

const WHERE = 'JSON.stringify({'
  + ' question: (document.querySelector(".qlabel") || {}).textContent || "",'
  + ' length: history.length, step: (history.state || {}).step })';

describe.skipIf(skipped !== null)("back and forward walk the questions", () => {
  it("four answers, back twice and forward once, land on the questions they name", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        await page.goto(server.url("/"), 900);
        const at = async () => JSON.parse(await page.evaluate(WHERE)) as
          { question: string; length: number; step: number };
        const asked = [await at()];
        for (let i = 0; i < 4; i++) {
          await page.evaluate(ANSWER);
          await new Promise((r) => setTimeout(r, 300));
          asked.push(await at());
        }
        await page.evaluate("history.back()");
        await new Promise((r) => setTimeout(r, 450));
        const back1 = await at();
        await page.evaluate("history.back()");
        await new Promise((r) => setTimeout(r, 450));
        const back2 = await at();
        await page.evaluate("history.forward()");
        await new Promise((r) => setTimeout(r, 450));
        const forward = await at();
        return { asked, back1, back2, forward };
      }, { viewport: { width: 390, height: 844 }, mobile: true }) as {
        asked: { question: string; length: number; step: number }[];
        back1: { question: string; step: number };
        back2: { question: string; step: number };
        forward: { question: string; step: number };
      };

      const [first, ...answered] = seen.asked;
      // One entry per answer: the counter and the browser agree, which is the
      // thing that had come apart.
      expect(first!.step).toBe(0);
      answered.forEach((screen, i) => {
        expect(screen.step, `answer ${i + 1} did not add exactly one entry`).toBe(i + 1);
        expect(screen.length - first!.length, `answer ${i + 1}: history grew by ${screen.length - first!.length}`)
          .toBe(i + 1);
      });
      // Four different questions, in order.
      const questions = seen.asked.map((s) => s.question);
      expect(new Set(questions).size, questions.join(" | ")).toBe(questions.length);

      // Back once is the question before the one on screen — not three before.
      expect(seen.back1.question).toBe(questions[questions.length - 2]);
      expect(seen.back1.step).toBe(3);
      // Back twice is the one before that, and never a step forward.
      expect(seen.back2.question).toBe(questions[questions.length - 3]);
      expect(seen.back2.step).toBe(2);
      // Forward is symmetrical: it undoes the last back exactly.
      expect(seen.forward.question).toBe(seen.back1.question);
      expect(seen.forward.step).toBe(3);
    } finally {
      server.close();
    }
  }, 180000);

  it("the screen's own Back and the browser's land on the same question", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const at = async () => JSON.parse(await page.evaluate(WHERE)) as
          { question: string; length: number; step: number };
        const walk = async (howToGoBack: string) => {
          await page.goto(server.url("/"), 900);
          await page.evaluate('localStorage.removeItem("permit-rulebook.record.v1")');
          await page.goto(server.url("/"), 900);
          for (let i = 0; i < 3; i++) {
            await page.evaluate(ANSWER);
            await new Promise((r) => setTimeout(r, 300));
          }
          const before = await at();
          await page.evaluate(howToGoBack);
          await new Promise((r) => setTimeout(r, 450));
          return { before, after: await at() };
        };
        const screenBack = await walk('document.getElementById("back").click()');
        const browserBack = await walk("history.back()");
        return { screenBack, browserBack };
      }, { viewport: { width: 390, height: 844 }, mobile: true }) as Record<
        "screenBack" | "browserBack",
        { before: { question: string; step: number }; after: { question: string; step: number } }
      >;

      expect(seen.screenBack.before.question).toBe(seen.browserBack.before.question);
      // The same gesture, whichever control the reader used.
      expect(seen.screenBack.after.question, "the two Backs disagree")
        .toBe(seen.browserBack.after.question);
      expect(seen.screenBack.after.step).toBe(seen.browserBack.after.step);
      // And it is a step, not a jump.
      expect(seen.screenBack.after.step).toBe(seen.screenBack.before.step - 1);
    } finally {
      server.close();
    }
  }, 180000);
});
