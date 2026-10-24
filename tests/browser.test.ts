import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { skipReason, warnNotWalked } from "./browser-walk.js";

/**
 * The harness's page object (`scripts/browser.mjs`): each wait returns once
 * what it waits for is there, and never before it, which is the bug a fixed
 * sleep had (#224). A broken page fails naming what never came.
 */

const dist = fileURLToPath(new URL("../dist", import.meta.url));
const { serve, withBrowser } = await import("../scripts/browser.mjs");

/** The page object, as much of it as these cases drive. */
interface HarnessPage {
  goto(url: string): Promise<void>;
  navigate(url: string): Promise<void>;
  evaluate(expression: string): Promise<string>;
  waitUntil(condition: string, what: string): Promise<unknown>;
  waitUntilAtRest(): Promise<void>;
}

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
async function onSite<T>(run: (page: HarnessPage, url: (path: string) => string) => Promise<T>, delayJsMs = 0): Promise<T> {
  const server = await serve(dist, { delayJsMs });
  try {
    return await withBrowser((page: HarnessPage) => run(page, server.url)) as T;
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
