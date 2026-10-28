import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PHONE, walkSite } from "../scripts/browser/browser.mjs";
import { skipReason, warnNotWalked } from "./browser-walk.js";
import { MOVES_EARLY_AND_ON_A_TAP, tapAndWaitUntilAtRest, waitUntilItsEarlyMoveIsReported } from "./layout-shifts.js";

/**
 * The browser walk (`walkSite`, from `scripts/browser/browser.mjs`), over
 * fixture pages served from a temporary folder: what a walker sees of the
 * width it was promised, of the pages' errors, and of the shifts of the page
 * it ends on.
 */

const skipped = skipReason();
if (skipped) warnNotWalked("THE BROWSER WALK", skipped);

/** A phone's viewport, as every fixture page but one declares it. */
const VIEWPORT_META = '<meta name="viewport" content="width=device-width, initial-scale=1">';

/** What a page that throws throws, so the walk's errors can be looked for it. */
const THROWN = "thrown by the first page";

/** What a walker that gives up throws, so the walk's failure can be looked for it. */
const WALKER_GAVE_UP = "the walker gave up";

/** The fixture pages, by file name, and the icon Chrome asks every site for, so its absence is no error. */
const PAGES = {
  "favicon.ico": "",
  "no-viewport-meta.html": "<!doctype html><html><head></head><body><p>no viewport meta</p></body></html>",
  "throws.html": `<!doctype html><html><head>${VIEWPORT_META}</head><body><script>throw new Error(${JSON.stringify(THROWN)});</script></body></html>`,
  "quiet.html": `<!doctype html><html><head>${VIEWPORT_META}</head><body><p>nothing happens here</p></body></html>`,
  "moves.html": MOVES_EARLY_AND_ON_A_TAP,
};

let folder = "";
beforeAll(() => {
  folder = mkdtempSync(join(tmpdir(), "permit-rulebook-walk-"));
  for (const [name, html] of Object.entries(PAGES)) writeFileSync(join(folder, name), html);
});
afterAll(() => { rmSync(folder, { recursive: true, force: true }); });

/** The message a walk failed with, or "" when it did not fail. */
const failureOf = (walked: Promise<unknown>): Promise<string> => walked.then(() => "", (e: Error) => e.message);

/** A walker that opens one fixture page and returns once it has drawn. */
const opening = (path: string): Parameters<typeof walkSite>[1] => async ({ page, url }) => { await page.goto(url(path)); };

describe.skipIf(skipped !== null)("the browser walk's width check", () => {
  it("a phone walk over a page with no viewport meta fails, naming the screen's width and the page's", async () => {
    const failure = await failureOf(walkSite({ site: { folder }, screen: PHONE }, opening("/no-viewport-meta.html")));
    expect(failure).toContain("390");
    expect(failure).toContain("980");
  }, 60000);
});

describe.skipIf(skipped !== null)("the browser walk's errors", () => {
  it("a page that throws fails the walk with the error listed, and with errors expected the walk returns it", async () => {
    const failure = await failureOf(walkSite({ site: { folder }, screen: PHONE }, opening("/throws.html")));
    expect(failure).toContain(THROWN);
    const { errors } = await walkSite({ site: { folder }, screen: PHONE, errorsExpected: true }, opening("/throws.html"));
    expect(errors.map((e) => e.message).join("\n")).toContain(THROWN);
  }, 60000);

  it("a walker that throws fails the walk with the pages' errors listed under its own failure, each with its address", async () => {
    const failure = await failureOf(walkSite({ site: { folder }, screen: PHONE }, async ({ page, url }) => {
      await page.goto(url("/throws.html"));
      throw new Error(WALKER_GAVE_UP);
    }));
    expect(failure).toContain(WALKER_GAVE_UP);
    expect(failure).toContain(`/throws.html: exception: Error: ${THROWN}`);
  }, 60000);

  it("an error on the first page is still in the walk's errors after it navigates to a second", async () => {
    const walked = await walkSite({ site: { folder }, screen: PHONE, errorsExpected: true }, async ({ page, url }) => {
      await page.goto(url("/throws.html"));
      await page.goto(url("/quiet.html"));
      return { problemsOfTheSecond: page.problems() };
    });
    expect(walked.returned.problemsOfTheSecond, "the second page's own problems hold the first page's").toEqual([]);
    const thrown = walked.errors.filter((e) => e.message.includes(THROWN));
    expect(thrown.map((e) => new URL(e.address).pathname)).toEqual(["/throws.html"]);
  }, 60000);
});

describe.skipIf(skipped !== null)("the browser walk's shifts", () => {
  it("a page that shifts without input returns that shift, labelled with its address, and a shift after a real tap is not counted", async () => {
    let address = "";
    const { shifts } = await walkSite({ site: { folder }, screen: PHONE }, async ({ page, url }) => {
      address = url("/moves.html");
      await page.goto(address);
      await waitUntilItsEarlyMoveIsReported(page);
      await tapAndWaitUntilAtRest(page, () => page.tapOn("#below"));
    });
    expect(shifts.address).toBe(address);
    expect(shifts.reported.length, `the tap moved nothing: ${JSON.stringify(shifts.reported)}`).toBe(2);
    expect(shifts.counted.map((s) => s.value), "the shifts counted are not the page's own first move")
      .toEqual([shifts.reported[0]!.value]);
  }, 60000);
});
