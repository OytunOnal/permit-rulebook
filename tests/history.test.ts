import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  backFor, clampStep, emptyHistory, entryState, firstHeldStep, historyFor, readEntry, recordScreen, screenAt,
} from "../src/lib/screen.js";

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
 * itself wherever the browser holds a step of ours behind the reader, so there
 * the two gestures cannot land on different screens. Where it holds none — the
 * screen a stored record was opened onto — the screen's Back steps back in
 * place and the browser's leaves (s37).
 */

describe("a reloaded page rebuilds the entries the browser kept", () => {
  it("one entry per answered question, then the one on screen", () => {
    const h = historyFor(["destination", "situation", "qualification"], "citizenship");
    expect(h.entries.map((e) => e.field))
      .toEqual(["destination", "situation", "qualification", "citizenship"]);
    // Standing on the last one, which is what the browser is showing.
    expect(h.current).toBe(3);
  });

  it("a fresh interview rebuilds to the one screen it is showing", () => {
    const h = historyFor([], "destination");
    expect(h.entries).toEqual([{ field: "destination" }]);
    expect(h.current).toBe(0);
  });

  it("a step the rebuilt list is shorter than lands on the nearest question", () => {
    const h = historyFor(["destination", "situation"], "qualification");
    // The browser kept an entry for a question the record no longer holds.
    expect(clampStep(h, 7)).toBe(2);
    expect(clampStep(h, -1)).toBe(0);
    expect(clampStep(h, 1)).toBe(1);
    expect(clampStep(emptyHistory(), 3)).toBe(0);
  });
});

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

/**
 * s37: a reader who opens the site onto a stored record is shown the question
 * the record left them on, with the page's list rebuilt behind it — but the
 * browser holds one entry of this interview, the arrival, and "← Back" as
 * `history.back()` took them off the site (measured 2026-09-25). The screen's
 * Back hands the browser only steps it holds.
 */
describe("the screen's Back asks the browser only for entries it holds", () => {
  const arrived = (state: unknown, navigation: string | undefined) => {
    const h = historyFor(["destination", "citizenship", "situation"], "qualification");
    h.firstHeld = firstHeldStep({ state, navigation }, h.current);
    return h;
  };

  it("a fresh arrival onto a stored record holds nothing behind the arrival screen", () => {
    const h = arrived(null, "navigate");
    expect(h.current).toBe(3);
    expect(h.firstHeld).toBe(3);
    expect(backFor(h)).toBe("in-place");
  });

  it("a navigation type the page cannot read counts as an arrival", () => {
    expect(arrived(null, undefined).firstHeld).toBe(3);
    expect(arrived(null, "prerender").firstHeld).toBe(3);
    // A reload of an entry nothing of ours ever wrote: nothing of ours behind it.
    expect(arrived(null, "reload").firstHeld).toBe(3);
  });

  it("an entry that says how many held steps stand behind it is believed, whatever the navigation", () => {
    // Walked live in this tab, then reloaded: every step is held.
    const live = emptyHistory();
    for (const [field, advance] of [
      ["destination", false], ["citizenship", true], ["situation", true], ["qualification", true],
    ] as const) recordScreen(live, field, advance);
    expect(arrived(entryState(live), "reload").firstHeld).toBe(0);
    expect(backFor(arrived(entryState(live), "reload"))).toBe("browser");
    // Opened onto the record, then reloaded or left and returned to: the
    // browser still holds only the screen it opened on, and the entry says so.
    const opened = arrived(null, "navigate");
    expect(arrived(entryState(opened), "reload").firstHeld).toBe(3);
    expect(arrived(entryState(opened), "back_forward").firstHeld).toBe(3);
    // More held behind the entry than the rebuilt list has steps: all of them.
    const longer = historyFor(["destination", "citizenship", "situation", "qualification", "occupation_it"], null);
    expect(arrived(entryState(longer), "reload").firstHeld).toBe(0);
  });

  it("an entry written before the rule, reloaded or returned to, holds every step", () => {
    // The earlier slice's reload repair: entries then carried only their step.
    expect(arrived({ step: 3 }, "reload").firstHeld).toBe(0);
    expect(arrived({ step: 3 }, "back_forward").firstHeld).toBe(0);
    expect(arrived({ step: 3 }, "navigate").firstHeld).toBe(3);
  });

  it("an answer after the arrival is held, and the arrival screen is still the edge", () => {
    const h = arrived(null, "navigate");
    expect(recordScreen(h, "occupation_it", true)).toEqual({ how: "push", step: 4 });
    // One entry of ours behind: the browser can go back onto it.
    expect(backFor(h)).toBe("browser");
    // Back on the arrival screen, nothing of ours is behind again.
    h.current = 3;
    expect(backFor(h)).toBe("in-place");
    // Stepping back in place rewrites the entry; it never moves the edge.
    expect(recordScreen(h, "situation", false)).toEqual({ how: "replace", step: 3 });
    expect(h.firstHeld).toBe(3);
    expect(backFor(h)).toBe("in-place");
  });

  it("starting over stands on a held entry: the edge goes back to the first step", () => {
    const h = arrived(null, "navigate");
    // "Start over" empties the list; its first screen rewrites the entry the
    // reader is standing on, which the browser holds.
    h.entries.length = 0;
    h.current = -1;
    recordScreen(h, "destination", false);
    expect(h.firstHeld).toBe(0);
    recordScreen(h, "citizenship", true);
    expect(backFor(h)).toBe("browser");
  });

  it("a live walk from the first question holds every step", () => {
    const h = emptyHistory();
    recordScreen(h, "destination", false);
    expect(backFor(h)).toBe("in-place");
    recordScreen(h, "citizenship", true);
    expect(h.firstHeld).toBe(0);
    expect(backFor(h)).toBe("browser");
  });
});

/**
 * The entry's state has one owner: `entryState` is the object every
 * `pushState`/`replaceState` writes, and `readEntry` is what a load or a
 * popstate believes of it. Written in one file and read in another, a rename
 * on either side stayed green (Standards review, s37 round 1).
 */
describe("what an entry carries is written and read in one place", () => {
  it("a state the page wrote reads back as the step it names and where the held steps begin", () => {
    const h = emptyHistory();
    recordScreen(h, "destination", false);
    recordScreen(h, "citizenship", true);
    recordScreen(h, "situation", true);
    const back = readEntry(entryState(h));
    expect(back.step).toBe(2);
    // Reloaded onto that entry, the page's rule gives back the edge it had.
    const reloaded = historyFor(["destination", "citizenship"], "situation");
    reloaded.firstHeld = firstHeldStep({ state: entryState(h), navigation: "reload" }, reloaded.current);
    expect(reloaded.firstHeld).toBe(h.firstHeld);
  });

  /**
   * Tab A opens onto three answers; tab B, same origin, answers two more; tab
   * A reloads onto the entry it wrote. The rebuilt list is two steps longer
   * than the one that entry was written against, so an edge kept as a step
   * number stood behind the reader and the screen's Back left the site
   * (Security review, s37 round 1). What the entry has to carry is how many
   * held steps stand behind it, which a longer list does not move.
   */
  it("a record grown in another tab moves the list, not what the browser holds", () => {
    const tabA = historyFor(["destination", "citizenship", "situation"], "qualification");
    tabA.firstHeld = firstHeldStep({ state: null, navigation: "navigate" }, tabA.current);
    const grown = ["destination", "citizenship", "situation", "qualification", "occupation_it"];
    const reloaded = historyFor(grown, "salary");
    reloaded.firstHeld = firstHeldStep({ state: entryState(tabA), navigation: "reload" }, reloaded.current);
    expect(reloaded.firstHeld).toBe(reloaded.current);
    expect(backFor(reloaded)).toBe("in-place");

    // Walked live from the first question, then grown: every step walked is
    // still held behind the entry, and only those.
    const live = emptyHistory();
    for (const [field, advance] of [
      ["destination", false], ["citizenship", true], ["situation", true], ["qualification", true],
    ] as const) recordScreen(live, field, advance);
    const again = historyFor(grown, "salary");
    again.firstHeld = firstHeldStep({ state: entryState(live), navigation: "reload" }, again.current);
    expect(again.current - again.firstHeld).toBe(3);
  });

  it("a state nothing of ours wrote names no step", () => {
    expect(readEntry(null).step).toBeUndefined();
    expect(readEntry({ step: "2" }).step).toBeUndefined();
    expect(readEntry("2").step).toBeUndefined();
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

  /**
   * The blocker the Spec review found: a mid-interview reload emptied the
   * page's own list while the browser kept every entry it had pushed. `step`
   * restarted at 0 with `history.length` still at 5, so browser Back found no
   * screen to restore and did nothing, and the page's own Back fell through to
   * the edit path — two gestures, two different nothings.
   */
  it("after a reload both Backs still land on the same previous question, and forward returns", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page: BrowserPage) => {
        const at = async () => JSON.parse(await page.evaluate(WHERE)) as
          { question: string; length: number; step: number };
        const walk = async (goBack: string) => {
          await page.goto(server.url("/"), 900);
          await page.evaluate('localStorage.removeItem("permit-rulebook.record.v1")');
          await page.goto(server.url("/"), 900);
          const questions: string[] = [(await at()).question];
          for (let i = 0; i < 4; i++) {
            await page.evaluate(ANSWER);
            await new Promise((r) => setTimeout(r, 300));
            questions.push((await at()).question);
          }
          const before = await at();
          await page.evaluate("location.reload()");
          await new Promise((r) => setTimeout(r, 1200));
          const reloaded = await at();
          await page.evaluate(goBack);
          await new Promise((r) => setTimeout(r, 700));
          const back = await at();
          await page.evaluate("history.forward()");
          await new Promise((r) => setTimeout(r, 700));
          return { questions, before, reloaded, back, forward: await at() };
        };
        return {
          browser: await walk("history.back()"),
          screen: await walk('document.getElementById("back").click()'),
        };
      }, { viewport: { width: 390, height: 844 }, mobile: true }) as Record<"browser" | "screen", {
        questions: string[];
        before: { question: string; length: number; step: number };
        reloaded: { question: string; length: number; step: number };
        back: { question: string; step: number };
        forward: { question: string; step: number };
      }>;

      for (const [how, walk] of Object.entries(seen)) {
        // The reload changes nothing a reader can see, the entry included.
        expect(walk.reloaded.question, `${how}: the reload lost the question`).toBe(walk.before.question);
        expect(walk.reloaded.step, `${how}: the step restarted at ${walk.reloaded.step}`).toBe(walk.before.step);
        expect(walk.reloaded.length, `${how}: the browser's own entries changed`).toBe(walk.before.length);
        // And Back is a step to the previous question, not a dead gesture.
        expect(walk.back.question, `${how}: Back did nothing after a reload`)
          .toBe(walk.questions[walk.questions.length - 2]);
        expect(walk.back.step).toBe(walk.before.step - 1);
        // Forward returns to where the reader was standing.
        expect(walk.forward.question, `${how}: forward did not return`).toBe(walk.before.question);
        expect(walk.forward.step).toBe(walk.before.step);
      }
      // The two gestures agree, which is the whole point of the fix.
      expect(seen.screen.back.question).toBe(seen.browser.back.question);
      expect(seen.screen.back.step).toBe(seen.browser.back.step);
    } finally {
      server.close();
    }
  }, 180000);
});
