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
 * browser holds one entry of this interview, the screen it opened on — an
 * outside entrance — and "← Back" as `history.back()` took them off the site
 * (measured 2026-09-25). The screen's Back hands the browser only steps it
 * holds.
 */
/** The nine held counts the Security axis measured (s37 round 1): none of them
 * a count the page could have written. */
const NOT_A_COUNT: unknown[] = ["5", {}, -1, -Infinity, 1e308, Infinity, NaN, 2.5, null];

describe("the screen's Back asks the browser only for entries it holds", () => {
  /** The page rebuilt onto three answers, opened onto an entry whose state is `state`. */
  const openedOnto = (state: unknown) => {
    const h = historyFor(["destination", "citizenship", "situation"], "qualification");
    h.firstHeld = firstHeldStep(state, h.current);
    return h;
  };
  const OUTSIDE = 3;

  it("an outside entrance onto a stored record holds nothing behind the screen it opened on", () => {
    const h = openedOnto(null);
    expect(h.current).toBe(3);
    expect(h.firstHeld).toBe(OUTSIDE);
    expect(backFor(h)).toBe("in-place");
  });

  it("an entry that says how many held steps stand behind it is believed, however the page was opened", () => {
    // Walked live in this tab, then reloaded: every step is held.
    const live = emptyHistory();
    for (const [field, advance] of [
      ["destination", false], ["citizenship", true], ["situation", true], ["qualification", true],
    ] as const) recordScreen(live, field, advance);
    expect(openedOnto(entryState(live)).firstHeld).toBe(0);
    expect(backFor(openedOnto(entryState(live)))).toBe("browser");
    // An outside entrance, then reloaded or left and returned to: the browser
    // still holds only the screen it opened on, and the entry says so.
    const opened = openedOnto(null);
    expect(openedOnto(entryState(opened)).firstHeld).toBe(OUTSIDE);
  });

  /**
   * The record shrunk under the entry — another tab started over and answered
   * one. The entry says five held steps stand behind it, the rebuilt list has
   * three before the screen on show: the entries behind name steps this list
   * no longer has, and each clamps onto the question already on screen, where
   * the screen offers no Back (measured in headless Chrome, s37 delta 2).
   * None of them is believed held, and the screen's Back steps back in place.
   */
  it("more held behind the entry than the list has steps before it: none of them", () => {
    const longer = historyFor(["destination", "citizenship", "situation", "qualification", "occupation_it"], null);
    const h = openedOnto(entryState(longer));
    expect(h.firstHeld).toBe(OUTSIDE);
    expect(backFor(h)).toBe("in-place");
    // Exactly as many as the list has: all of them.
    expect(firstHeldStep({ step: 5, held: 3 }, 3)).toBe(0);
    // A popped entry is read the same way: a stale step clamped onto the
    // list's last screen, three held behind it where the list has one.
    expect(firstHeldStep({ step: 5, held: 3 }, 1)).toBe(1);
    expect(firstHeldStep({ step: 5, held: 1 }, 1)).toBe(0);
  });

  /**
   * Only a count the page could have written is believed: a non-negative
   * integer a history could hold. Anything else is read as an outside
   * entrance, because stepping back in place never leaves the site and
   * `history.back()` onto nothing does. The shapes are the nine the Security axis measured
   * (s37 round 1) against the round-0 code, which kept the first held step as
   * a step number and read it as `max(0, min(value, current))`: there -1 and
   * -Infinity read as every step held, NaN stuck as NaN, 2.5 as half a step,
   * 1e308 and Infinity as the screen on show only because the clamp caught
   * them, and "5", {} and null fell to the navigation's type.
   */
  it("a held count that is not a non-negative integer is an outside entrance", () => {
    for (const held of NOT_A_COUNT) {
      const h = openedOnto({ step: 3, held });
      expect(h.firstHeld, `held: ${String(held)}`).toBe(OUTSIDE);
      expect(backFor(h), `held: ${String(held)}`).toBe("in-place");
    }
    // Missing altogether, or no state at all.
    expect(openedOnto({ step: 3 }).firstHeld).toBe(OUTSIDE);
    for (const state of [undefined, "5", 5, []]) expect(openedOnto(state).firstHeld).toBe(OUTSIDE);
    // 0 is a count the page writes — on an outside entrance — and is
    // believed as one.
    expect(readEntry({ step: 3, held: 0 }).held).toBe(0);
    expect(openedOnto({ step: 3, held: 0 }).firstHeld).toBe(OUTSIDE);
    // And a count it could have written is believed.
    expect(openedOnto({ step: 3, held: 2 }).firstHeld).toBe(1);
  });

  /**
   * The build before s37 wrote `{ step }` alone, so a tab left open across
   * the deploy reloads onto an entry that says nothing about what is held.
   * It is read as an outside entrance. For a tab that had walked its
   * questions live, the two Backs then disagree once — the screen's steps in
   * place, the browser's goes back — and that is the smaller harm: read the
   * other way, a tab that had opened onto a stored record would be sent off
   * the site.
   */
  it("an entry written before the held count is an outside entrance, however it was reached", () => {
    expect(openedOnto({ step: 3 }).firstHeld).toBe(OUTSIDE);
    expect(readEntry({ step: 3 }).step).toBe(3);
  });

  it("an answer after an outside entrance is held, and the screen it opened on is still the edge", () => {
    const h = openedOnto(null);
    expect(recordScreen(h, "occupation_it", true)).toEqual({ how: "push", step: 4 });
    // One entry of ours behind: the browser can go back onto it.
    expect(backFor(h)).toBe("browser");
    // Back on the screen it opened on, nothing of ours is behind again.
    h.current = 3;
    expect(backFor(h)).toBe("in-place");
    // Stepping back in place rewrites the entry; it never moves the edge.
    expect(recordScreen(h, "situation", false)).toEqual({ how: "replace", step: 3 });
    expect(h.firstHeld).toBe(3);
    expect(backFor(h)).toBe("in-place");
  });

  it("starting over stands on a held entry: the edge goes back to the first step", () => {
    const h = openedOnto(null);
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
    reloaded.firstHeld = firstHeldStep(entryState(h), reloaded.current);
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
    tabA.firstHeld = firstHeldStep(null, tabA.current);
    const grown = ["destination", "citizenship", "situation", "qualification", "occupation_it"];
    const reloaded = historyFor(grown, "salary");
    reloaded.firstHeld = firstHeldStep(entryState(tabA), reloaded.current);
    expect(reloaded.firstHeld).toBe(reloaded.current);
    expect(backFor(reloaded)).toBe("in-place");

    // Walked live from the first question, then grown: every step walked is
    // still held behind the entry, and only those.
    const live = emptyHistory();
    for (const [field, advance] of [
      ["destination", false], ["citizenship", true], ["situation", true], ["qualification", true],
    ] as const) recordScreen(live, field, advance);
    const again = historyFor(grown, "salary");
    again.firstHeld = firstHeldStep(entryState(live), again.current);
    expect(again.current - again.firstHeld).toBe(3);
  });

  it("a state nothing of ours wrote names no step and holds nothing", () => {
    for (const state of [null, undefined, "2", 2, { step: "2" }, { step: -1 }, { step: NaN }, { step: 1.5 }]) {
      expect(readEntry(state).step, JSON.stringify(state)).toBeUndefined();
      expect(readEntry(state).held, JSON.stringify(state)).toBe(0);
    }
  });

  it("the reader believes a held count only where the builder could have written it", () => {
    // The same nine shapes the Security axis measured (s37 round 1).
    for (const held of NOT_A_COUNT)
      expect(readEntry({ step: 3, held }).held, `held: ${String(held)}`).toBe(0);
    expect(readEntry({ step: 3 }).held).toBe(0);
    for (const held of [0, 1, 3]) expect(readEntry({ step: 3, held }).held).toBe(held);
  });

  /**
   * The page writes `held` as `current - firstHeld` with `firstHeld` never
   * below 0, so an entry it wrote never holds more steps than the one it
   * names. A larger count is not one the page wrote: `{ step: 3, held:
   * 2^53 - 1 }` gave a first held step of 0 and sent the screen's Back to the
   * browser (Security review, s37 delta round 1). It is read as an outside
   * entrance.
   */
  it("a held count larger than the step it stands on is an outside entrance", () => {
    for (const held of [4, 100, Number.MAX_SAFE_INTEGER]) {
      expect(readEntry({ step: 3, held }).held, `held: ${held}`).toBe(0);
      expect(firstHeldStep({ step: 3, held }, 3), `held: ${held}`).toBe(3);
    }
    // A step it cannot read believes no count at all.
    expect(readEntry({ held: 2 }).held).toBe(0);
    // Up to the step itself, the count is one the page writes.
    for (const held of [0, 2, 3]) expect(readEntry({ step: 3, held }).held).toBe(held);
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
