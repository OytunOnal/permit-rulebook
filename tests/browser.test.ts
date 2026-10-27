import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { skipReason, warnNotWalked, type BrowserPage } from "./browser-walk.js";

/**
 * The harness's page object (`scripts/browser.mjs`): each wait returns once
 * what it waits for is there, and never before it, since a case reading
 * before then reads an unfinished page. A broken page fails naming what never
 * came.
 */

const dist = fileURLToPath(new URL("../dist", import.meta.url));
const { serve, withBrowser } = await import("../scripts/browser.mjs");

const skipped = skipReason();
if (skipped) warnNotWalked("THE HARNESS'S WAITS", skipped);

/** Long enough that a read made before the interview's script ran finds the build's paint. */
const HELD_JS_MS = 2000;

/** What the interview's page shows: the build's stand-in lines, the cover on `<html>`, question one's label. */
const SCREEN = `JSON.stringify({
  standIns: document.querySelectorAll(".stand-in").length,
  cover: document.documentElement.dataset.cover ?? "",
  question: (document.querySelector("#main .qcard .qlabel")?.textContent ?? "").trim(),
})`;
interface Screen { standIns: number; cover: string; question: string }

/** `run` on a page over the built site, its scripts held back `delayJsMs` when asked. */
async function onSite<T>(run: (page: BrowserPage, url: (path: string) => string) => Promise<T>, delayJsMs = 0): Promise<T> {
  const server = await serve(dist, { delayJsMs });
  try {
    return await withBrowser((page: BrowserPage) => run(page, server.url)) as T;
  } finally {
    server.close();
  }
}

describe("the harness's waits, in a real browser", () => {
  it("never lets a pipeline skip them", () => {
    if (skipped) expect(process.env.CI, `CI cannot skip: ${skipped}`).toBeFalsy();
    else expect(skipped).toBeNull();
  });
});

describe.skipIf(skipped !== null)("the harness's two ways onto a page", () => {
  it("with the scripts held back, goto returns only once the stand-ins are gone", async () => {
    const screen = await onSite(async (page, url) => {
      await page.goto(url("/?country=fr"));
      return JSON.parse(await page.evaluate(SCREEN)) as Screen;
    }, HELD_JS_MS);
    expect(screen.standIns, "goto returned on the build's paint").toBe(0);
    expect(screen.question, "goto returned before the interview drew its question").not.toBe("");
  }, 60000);

  it("with the scripts held back, navigate returns with the cover still on", async () => {
    const screen = await onSite(async (page, url) => {
      await page.navigate(url("/?country=fr"));
      // A document just begun has no element yet to carry a cover.
      await page.waitUntil("document.documentElement?.dataset.cover", "the link arrival's cover never went on");
      return JSON.parse(await page.evaluate(SCREEN)) as Screen;
    }, HELD_JS_MS);
    expect(screen.cover, "navigate waited for the interview's script").toBe("link");
    expect(screen.standIns, "the build's stand-in lines were gone").toBeGreaterThan(0);
  }, 60000);
});

describe.skipIf(skipped !== null)("the harness's waitUntil", () => {
  it("waitUntil returns the condition's value once it holds", async () => {
    const held = await onSite(async (page, url) => {
      await page.goto(url("/404.html"));
      await page.evaluate('setTimeout(() => { window.__arrived = "here"; }, 300), 0');
      return page.waitUntil("window.__arrived", "the value never arrived");
    });
    expect(held).toBe("here");
  }, 60000);

  it("waitUntil throws after the backstop, naming what never came", async () => {
    const failure = await onSite(async (page, url) => {
      await page.goto(url("/404.html"));
      return page.waitUntil("false", "the condition that never holds").then(() => "held", (e: Error) => e.message);
    });
    expect(failure).toContain("the condition that never holds");
  }, 60000);

  it("waitUntil throws at once on an error that is not a replaced page, naming the condition and Chrome's message", async () => {
    const seen = await onSite(async (page, url) => {
      await page.goto(url("/404.html"));
      const failure = await page.waitUntil("(window.__reads = (window.__reads || 0) + 1, notDefinedHere.held)", "a broken condition")
        .then(() => "held", (e: Error) => e.message);
      return { failure, reads: await page.evaluate("window.__reads") };
    });
    expect(seen.failure).toContain("notDefinedHere.held");
    expect(seen.failure).toContain("ReferenceError");
    expect(seen.reads, "the broken condition was asked again").toBe(1);
  }, 60000);
});

describe.skipIf(skipped !== null)("the harness's waitUntilAtRest", () => {
  it("waitUntilAtRest waits through a running transition", async () => {
    const ended = await onSite(async (page, url) => {
      await page.goto(url("/404.html"));
      await page.evaluate(`(() => {
        const box = document.createElement("div");
        box.style.cssText = "width:40px;height:40px;background:#888;transition:opacity 1s linear;opacity:1";
        document.body.append(box);
        box.getBoundingClientRect();
        box.addEventListener("transitionend", () => { window.__ended = "ended"; });
        box.style.opacity = "0";
        return "started";
      })()`);
      await page.waitUntilAtRest();
      return page.evaluate('window.__ended ?? "still running"');
    });
    expect(ended).toBe("ended");
  }, 60000);
});

/** A paragraph 3000 px down a tall page, and a note of the scroll's own end, `scrollend`. */
const MARK_FAR_DOWN = `(() => {
  const mark = Object.assign(document.createElement("p"), { id: "mark", textContent: "where the scroll ends" });
  mark.style.cssText = "margin:3000px 0 6000px";
  document.body.append(mark);
  addEventListener("scrollend", () => { window.__scrollEnded = true; });
  return "marked";
})()`;
/** Where the page stands once at rest: whether the scroll said it ended, and how far it stands from its end. */
const reportWhereTheScrollStands = (offEnd: string) => `JSON.stringify({ ended: window.__scrollEnded === true, scrollY, offEnd: ${offEnd} })`;
interface AfterScroll { ended: boolean; scrollY: number; offEnd: number }
/**
 * A gesture that asks for `scroll` and then works on for 100 ms, as a tap's
 * draw does on a loaded machine. Chrome then runs the frames it owes back to
 * back, sharing one timestamp, before the scroll has moved: two frames that
 * read the same scroll.
 */
const askThenWorkOn = (scroll: string) => `(() => {
  ${scroll};
  const done = performance.now() + 100;
  while (performance.now() < done);
  return "asked for";
})()`;
/**
 * `scroll`, a scroll asked for on a Chrome without scroll promises, played on
 * this one: while it runs, the native `scrollTo`, as the harness's watch of
 * smooth scrolls calls it (through `apply`: Chrome keeps the native on the
 * window itself, where the watch has put its own), scrolls and gives back
 * nothing. What the call returned, by `typeof`.
 */
const withoutTheScrollPromise = (scroll: string) => `(() => {
  const apply = Function.prototype.apply;
  Function.prototype.apply = function (self, args) {
    const returned = Reflect.apply(apply, this, [self, args]);
    return this.name === "scrollTo" ? undefined : returned;
  };
  try { return typeof ${scroll}; } finally { Function.prototype.apply = apply; }
})()`;

describe.skipIf(skipped !== null)("the harness's waitUntilAtRest, after a smooth scroll", () => {
  // Two frames reading the same scroll is not a smooth scroll's end: its
  // first frames barely move, or not at all. Each is asked for the way the
  // interview asks: `scrollTo` lands a card, `scrollIntoView` reveals the
  // masthead; the wait has begun its look when the gesture asks.
  for (const [how, start, offEnd] of [
    ["scrollTo", 'scrollTo({ top: 3000, behavior: "smooth" })', "scrollY - 3000"],
    ["scrollIntoView", 'document.getElementById("mark").scrollIntoView({ block: "start", behavior: "smooth" })',
      'document.getElementById("mark").getBoundingClientRect().top'],
  ] as const)
    it(`waitUntilAtRest returns only once a smooth ${how} just begun has ended`, async () => {
      const seen = await onSite(async (page, url) => {
        await page.goto(url("/404.html"));
        await page.evaluate(MARK_FAR_DOWN);
        // Its loading over first, so the next look sees nothing but the scroll.
        await page.waitUntilAtRest();
        const atRest = page.waitUntilAtRest();
        await page.evaluate(askThenWorkOn(start));
        await atRest;
        return JSON.parse(await page.evaluate(reportWhereTheScrollStands(offEnd))) as AfterScroll;
      });
      expect(seen.ended, `at rest returned mid-scroll, at scrollY ${seen.scrollY}`).toBe(true);
      expect(Math.abs(seen.offEnd), `at rest returned ${seen.offEnd} px from the scroll's end`).toBeLessThan(1);
    }, 60000);

  it("waitUntilAtRest returns after a smooth scrollIntoView with nowhere to go, which fires no scrollend", async () => {
    const failure = await onSite(async (page, url) => {
      await page.goto(url("/404.html"));
      await page.evaluate(MARK_FAR_DOWN);
      await page.evaluate('(document.getElementById("mark").scrollIntoView({ block: "start" }), "there")');
      await page.waitUntilAtRest();
      await page.evaluate('(document.getElementById("mark").scrollIntoView({ block: "start", behavior: "smooth" }), "asked for")');
      return page.waitUntilAtRest().then(() => "", (e: Error) => e.message);
    });
    expect(failure).toBe("");
  }, 60000);
});

describe.skipIf(skipped !== null)("the harness's waitUntilAtRest, on a Chrome without scroll promises", () => {
  it("waitUntilAtRest returns after a smooth scrollTo with nowhere to go, which gives no promise", async () => {
    const seen = await onSite(async (page, url) => {
      await page.goto(url("/404.html"));
      await page.evaluate(MARK_FAR_DOWN);
      await page.evaluate('(document.getElementById("mark").scrollIntoView({ block: "start" }), "there")');
      await page.waitUntilAtRest();
      const returned = await page.evaluate(withoutTheScrollPromise('scrollTo({ top: scrollY, behavior: "smooth" })'));
      return { returned, failure: await page.waitUntilAtRest().then(() => "", (e: Error) => e.message) };
    });
    expect(seen.returned, "scrollTo still gave a promise, so nothing here plays a Chrome without one").toBe("undefined");
    expect(seen.failure).toBe("");
  }, 60000);
});

/** How many first-input entries the page's own timeline holds: one once Chrome has reported a gesture to it. */
const FIRST_INPUTS_REPORTED = 'performance.getEntriesByType("first-input").length';

/** A link over the whole viewport, so a click anywhere loads `/data/`. */
const LINK_OVER_THE_PAGE = `(() => {
  const a = document.createElement("a");
  a.href = "/data/";
  a.style.cssText = "position:fixed;inset:0;display:block;z-index:9";
  document.body.append(a);
  return "placed";
})()`;

/** What each of five documents in one tab has reported right after `gesture` returned on it. */
const reportedAfterEach = (gesture: (page: BrowserPage) => Promise<void>) => onSite(async (page, url) => {
  const counts: unknown[] = [];
  for (let n = 1; n <= 5; n++) {
    await page.goto(url(`/404.html?document=${n}`));
    await gesture(page);
    counts.push(await page.evaluate(FIRST_INPUTS_REPORTED));
  }
  return counts;
});

describe.skipIf(skipped !== null)("the harness's gestures, waited on until the page reports them", () => {
  it("clickAt, on each of five documents in one tab, returns only once that document has reported its first input", async () => {
    const reported = await reportedAfterEach((page) => page.clickAt(100, 100));
    expect(reported, "clickAt returned before the page reported the click").toEqual([1, 1, 1, 1, 1]);
  }, 60000);

  it("pressEnter, on each of five documents in one tab, returns only once that document has reported its first input", async () => {
    const reported = await reportedAfterEach((page) => page.pressEnter());
    expect(reported, "pressEnter returned before the page reported the key").toEqual([1, 1, 1, 1, 1]);
  }, 60000);

  it("a clickAt that loads a document returns once the tab stands on the new one", async () => {
    const path = await onSite(async (page, url) => {
      await page.goto(url("/404.html"));
      await page.evaluate(LINK_OVER_THE_PAGE);
      await page.clickAt(100, 100);
      return page.evaluate("location.pathname");
    });
    expect(path, "clickAt returned on the document the click left").toBe("/data/");
  }, 60000);

  it("waitUntilNewDocumentDrawn after a clickAt that loads a document returns on the new one", async () => {
    const seen = await onSite(async (page, url) => {
      await page.goto(url("/404.html"));
      await page.evaluate(LINK_OVER_THE_PAGE);
      await page.clickAt(100, 100);
      const failure = await page.waitUntilNewDocumentDrawn().then(() => "", (e: Error) => e.message);
      return { failure, path: await page.evaluate("location.pathname") };
    });
    expect(seen.failure, "waitUntilNewDocumentDrawn waited for a document other than the one the click loaded").toBe("");
    expect(seen.path).toBe("/data/");
  }, 60000);
});
