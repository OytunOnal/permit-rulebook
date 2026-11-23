import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PHONE, walkSite } from "../scripts/browser/browser.mjs";
import { analyticsBeacon } from "../src/lib/site.js";
import { skipReason, warnNotWalked } from "./browser-walk.js";
import { MOVES_EARLY_AND_ON_A_TAP, tapAndWaitUntilAtRest, waitUntilItsEarlyMoveIsReported } from "./layout-shifts.js";
import { BEACON_ENDPOINT } from "./wire.js";

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

/** How many errors the walk keeps (ruling 6 on #275). */
const ERRORS_KEPT = 100;
/** How many a page logs: past the cap by half. */
const ERRORS_LOGGED = 150;

/** Whether Cloudflare's script ran on the page: it sets `__cfBeacon` from its tag; an empty script sets nothing. */
const COUNTER_RAN = 'typeof window.__cfBeacon === "object"';

/** The statuses the page's reports to the counter were answered with, as the page's own resource timing reads them. */
const REPORT_ANSWERS = `JSON.stringify(performance.getEntriesByType("resource")
  .filter((e) => e.name === ${JSON.stringify(BEACON_ENDPOINT)}).map((e) => e.responseStatus))`;

/** The fixture pages, by file name, and the icon Chrome asks every site for, so its absence is no error. */
const PAGES = {
  "favicon.ico": "",
  "no-viewport-meta.html": "<!doctype html><html><head></head><body><p>no viewport meta</p></body></html>",
  "throws.html": `<!doctype html><html><head>${VIEWPORT_META}</head><body><script>throw new Error(${JSON.stringify(THROWN)});</script></body></html>`,
  "quiet.html": `<!doctype html><html><head>${VIEWPORT_META}</head><body><p>nothing happens here</p></body></html>`,
  "moves.html": MOVES_EARLY_AND_ON_A_TAP,
  "logs-many.html": `<!doctype html><html><head>${VIEWPORT_META}</head><body><script>
for (let i = 0; i < ${ERRORS_LOGGED}; i++) console.error("logged error " + i);
window.__logged = true;
</script></body></html>`,
  "counted.html": `<!doctype html><html><head>${VIEWPORT_META}</head><body><p>counted</p>${analyticsBeacon()}</body></html>`,
  "fetches-outside.html": `<!doctype html><html><head>${VIEWPORT_META}</head><body><p>fetches the address it is given</p><script>
fetch(new URLSearchParams(location.search).get("fetch"), { mode: "no-cors" })
  .catch(() => {})
  .finally(() => { window.__fetched = true; });
</script></body></html>`,
};

/**
 * An address on another origin than the served folder's `127.0.0.1:<port>`:
 * the same server named `localhost`, so a walk that does not refuse it
 * reaches it without the network.
 */
const onAnotherOrigin = (inSite: string): string => {
  const address = new URL(inSite);
  address.hostname = "localhost";
  return address.href;
};

/** A walker that opens the page logging many errors and returns once it has logged them all. */
const openingTheManyErrors: Parameters<typeof walkSite>[1] = async ({ page, url }) => {
  await page.goto(url("/logs-many.html"));
  await page.waitUntil("window.__logged === true", "the page never finished logging");
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

  it("a phone walk that moves from a page with the viewport meta to one without fails, naming both widths", async () => {
    const failure = await failureOf(walkSite({ site: { folder }, screen: PHONE }, async ({ page, url }) => {
      await page.goto(url("/quiet.html"));
      await page.goto(url("/no-viewport-meta.html"));
    }));
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

  it("the walk keeps the first errors up to its cap and says how many more there were", async () => {
    const leftOut = ERRORS_LOGGED - ERRORS_KEPT;
    const failure = await failureOf(walkSite({ site: { folder }, screen: PHONE }, openingTheManyErrors));
    expect(failure.split("\n").filter((line) => line.includes("logged error")).length).toBe(ERRORS_KEPT);
    expect(failure).toContain(`${leftOut} more`);
    const walked = await walkSite({ site: { folder }, screen: PHONE, errorsExpected: true }, openingTheManyErrors);
    expect(walked.errors.map((e) => e.message)).toEqual(
      Array.from({ length: ERRORS_KEPT }, (_, i) => `console.error: logged error ${i}`));
    expect(walked.errorsLeftOut).toBe(leftOut);
  }, 60000);

  it("a walk that throws on its first page and navigates to a quiet second fails, naming the first page's address and the error", async () => {
    let first = "";
    const failure = await failureOf(walkSite({ site: { folder }, screen: PHONE }, async ({ page, url }) => {
      first = url("/throws.html");
      await page.goto(first);
      await page.goto(url("/quiet.html"));
    }));
    expect(failure).toContain(`${first}: exception: Error: ${THROWN}`);
  }, 60000);
});

describe.skipIf(skipped !== null)("the browser walk's traffic counter", () => {
  it("a page loading the counter, walked with no option, runs an empty script in its place and returns with no error", async () => {
    const { returned, errors } = await walkSite({ site: { folder }, screen: PHONE }, async ({ page, url }) => {
      await page.goto(url("/counted.html"));
      await page.waitUntilAtRest();
      return page.evaluate(COUNTER_RAN);
    });
    expect(returned, "Cloudflare's script ran on a walk that asked for none").toBe(false);
    expect(errors).toEqual([]);
  }, 60000);

  it("a page loading the counter, walked with Cloudflare's copy and its requests kept, shows the copy's report POST, answered inside the browser", async () => {
    const walk = { site: { folder }, screen: PHONE, network: true, trafficCounter: "cloudflare's copy" } as const;
    const { returned } = await walkSite(walk, async ({ page, url }) => {
      await page.goto(url("/counted.html"));
      await page.waitUntilAtRest();
      const answers = JSON.parse(await page.evaluate(REPORT_ANSWERS)) as number[];
      return { ran: await page.evaluate(COUNTER_RAN), answers, sent: page.requests() };
    });
    expect(returned.ran, "the copy of Cloudflare's script did not run").toBe(true);
    const reports = returned.sent.filter((r) => r.url === BEACON_ENDPOINT && r.method === "POST");
    expect(reports.length, "the copy sent no report").toBeGreaterThan(0);
    expect(JSON.parse(reports[0]!.postData), "the report is not the counter's").toHaveProperty("siteToken");
    expect(returned.answers, "the report was not answered inside the browser").toContain(204);
  }, 60000);
});

describe.skipIf(skipped !== null)("the browser walk's outside requests", () => {
  it("a page fetching an address on another origin fails its walk, with one line naming that address", async () => {
    let outside = "";
    const failure = await failureOf(walkSite({ site: { folder }, screen: PHONE }, async ({ page, url }) => {
      const inSite = url("/quiet.html");
      outside = onAnotherOrigin(inSite);
      expect(new URL(outside).origin, "the outside address is on the site's own origin").not.toBe(new URL(inSite).origin);
      await page.goto(`${url("/fetches-outside.html")}?fetch=${encodeURIComponent(outside)}`);
      await page.waitUntil("window.__fetched === true", "the page's fetch never settled");
    }));
    expect(failure, "the walk passed").not.toBe("");
    expect(failure.split("\n").filter((line) => line.startsWith(`  ${outside}: `)), failure).toHaveLength(1);
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
