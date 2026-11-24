import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PHONE, TRAFFIC_COUNTER_REPORTS, TRAFFIC_COUNTER_SCRIPT, walkSite } from "../scripts/browser/browser.mjs";
import * as site from "../src/lib/site.js";
import { skipReason, warnNotWalked } from "./browser-walk.js";
import { MOVES_EARLY_AND_ON_A_TAP, tapAndWaitUntilAtRest, waitUntilItsEarlyMoveIsReported } from "./layout-shifts.js";

/**
 * The browser walk (`walkSite`, from `scripts/browser/browser.mjs`), over
 * fixture pages served from a temporary folder: what a walker sees of the
 * width it was promised, of the pages' errors, of the requests it answers or
 * refuses, and of the shifts of the page it ends on.
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
  .filter((e) => e.name === ${JSON.stringify(site.TRAFFIC_COUNTER_REPORTS)}).map((e) => e.responseStatus))`;

/** How many requests a page aborts on each path to its own origin and the counter: the race between a page dropping a request and the walk answering it showed in 114 of 300. */
const ABORTED = 300;
/** How many it aborts to another origin: each refusal is an error, so few enough that every error is kept, under the walk's 100. */
const ABORTED_OUTSIDE = 30;

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
  "counted.html": `<!doctype html><html><head>${VIEWPORT_META}</head><body><p>counted</p>${site.renderTrafficCounterTag()}</body></html>`,
  "aborts.html": `<!doctype html><html><head>${VIEWPORT_META}</head><body><p>aborts its requests</p><script>
const sent = [];
const abortSoon = (address, init) => {
  const controller = new AbortController();
  sent.push(fetch(address, { ...init, signal: controller.signal }).catch(() => {}));
  setTimeout(() => controller.abort(), 0);
};
const outside = new URLSearchParams(location.search).get("outside");
for (let i = 0; i < (outside ? ${ABORTED_OUTSIDE} : ${ABORTED}); i++) {
  if (outside) abortSoon(outside + "?n=" + i, { mode: "no-cors" });
  else {
    abortSoon("/quiet.html?n=" + i, {});
    abortSoon(${JSON.stringify(site.TRAFFIC_COUNTER_REPORTS)} + "?n=" + i, { method: "POST", body: "{}" });
  }
}
Promise.all(sent).then(() => { window.__aborted = true; });
</script></body></html>`,
  "opens-outside.html": `<!doctype html><html><head>${VIEWPORT_META}</head><body><button id="open">open</button><script>
document.getElementById("open").addEventListener("click", () => {
  window.__opened = window.open(new URLSearchParams(location.search).get("open"));
});
</script></body></html>`,
  // A tap on the frame lands in the frame's document, so the page around it never reports a first input.
  "opens-from-a-frame.html": `<!doctype html><html><head>${VIEWPORT_META}</head><body><iframe id="frame" style="width:300px;height:200px;border:0" srcdoc="<button id=open style='position:fixed;inset:0;width:100%;height:100%'>open</button><script>
document.getElementById('open').addEventListener('click', () => { top.__opened = open('/quiet.html'); });
</script>"></iframe></body></html>`,
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
const moveToAnotherOrigin = (inSite: string): string => {
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
  });

  it("a page loading the counter, walked with Cloudflare's copy and its requests kept, shows the copy's report POST for this site, answered inside the browser", async () => {
    const walk = { site: { folder }, screen: PHONE, network: true, trafficCounter: "cloudflare's copy" } as const;
    const { returned } = await walkSite(walk, async ({ page, url }) => {
      await page.goto(url("/counted.html"));
      await page.waitUntilAtRest();
      const answers = JSON.parse(await page.evaluate(REPORT_ANSWERS)) as number[];
      return { ran: await page.evaluate(COUNTER_RAN), answers, sent: page.requests() };
    });
    expect(returned.ran, "the copy of Cloudflare's script did not run").toBe(true);
    const reports = returned.sent.filter((r) => r.url === site.TRAFFIC_COUNTER_REPORTS && r.method === "POST");
    expect(reports.length, "the copy sent no report").toBeGreaterThan(0);
    const report = JSON.parse(reports[0]!.postData) as { siteToken?: unknown };
    expect(report.siteToken, "the report does not count this site").toBe(site.TRAFFIC_COUNTER_TOKEN);
    expect(returned.answers, "the report was not answered inside the browser").toContain(204);
  });
});

/** The addresses of `errors`, each with how many errors it holds. */
const errorsByAddress = (errors: { address: string }[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const { address } of errors) counts.set(address, (counts.get(address) ?? 0) + 1);
  return counts;
};

describe.skipIf(skipped !== null)("the browser walk's outside requests", () => {
  it("a page fetching an address on another origin fails its walk: one of its errors, under that address", async () => {
    let outside = "";
    const walked = await walkSite({ site: { folder }, screen: PHONE, errorsExpected: true }, async ({ page, url }) => {
      const inSite = url("/quiet.html");
      outside = moveToAnotherOrigin(inSite);
      expect(new URL(outside).origin, "the outside address is on the site's own origin").not.toBe(new URL(inSite).origin);
      await page.goto(`${url("/fetches-outside.html")}?fetch=${encodeURIComponent(outside)}`);
      await page.waitUntil("window.__fetched === true", "the page's fetch never settled");
    });
    expect(errorsByAddress(walked.errors).get(outside), JSON.stringify(walked.errors)).toBe(1);
  });

  it("a page opening an address on another origin in a new tab fails its walk: one of its errors, under that address", async () => {
    let outside = "";
    const walked = await walkSite({ site: { folder }, screen: PHONE, errorsExpected: true }, async ({ page, url }) => {
      outside = moveToAnotherOrigin(url("/quiet.html"));
      await page.goto(`${url("/opens-outside.html")}?open=${encodeURIComponent(outside)}`);
      await page.tapOn("#open");
      // The new tab's page is readable from here until another origin's, or
      // the error page of a refused load, stands in it.
      await page.waitUntil("(() => { try { window.__opened.location.href; return false; } catch { return true; } })()",
        "the new tab never left its blank page");
    });
    expect(errorsByAddress(walked.errors).get(outside), JSON.stringify(walked.errors)).toBe(1);
  });
});

describe.skipIf(skipped !== null)("the browser walk's gestures", () => {
  it("a tap that opens a tab returns though the page never reports its first input", async () => {
    const { returned } = await walkSite({ site: { folder }, screen: PHONE }, async ({ page, url }) => {
      await page.goto(url("/opens-from-a-frame.html"));
      await page.waitUntil('document.getElementById("frame").contentDocument?.getElementById("open") != null',
        "the frame's button never drew");
      // The page reports no first input and keeps its document, so only the tab the tap opens can end the tap's wait.
      await page.tapOn("#frame");
      await page.waitUntil('window.__opened?.location.pathname === "/quiet.html"', "the new tab never opened its page");
      return page.evaluate('performance.getEntriesByType("first-input").length');
    });
    expect(returned, "the page reported a first input: the tap did not land in the frame").toBe(0);
  });
});

describe.skipIf(skipped !== null)("the browser walk's requests a page drops", () => {
  it("a page aborting its requests to its own origin and to the counter before the walk answers them returns no error", async () => {
    const { errors } = await walkSite({ site: { folder }, screen: PHONE, errorsExpected: true }, async ({ page, url }) => {
      await page.goto(url("/aborts.html"));
      await page.waitUntil("window.__aborted === true", "the page's aborted requests never settled");
    });
    expect(errors, JSON.stringify(errors.slice(0, 3))).toEqual([]);
  });

  it("a page aborting its requests to another origin has each refused at most once, under its address", async () => {
    const walked = await walkSite({ site: { folder }, screen: PHONE, errorsExpected: true }, async ({ page, url }) => {
      const outside = moveToAnotherOrigin(url("/quiet.html"));
      await page.goto(`${url("/aborts.html")}?outside=${encodeURIComponent(outside)}`);
      await page.waitUntil("window.__aborted === true", "the page's aborted requests never settled");
      return outside;
    });
    expect(walked.errorsLeftOut, "the walk left errors out, which may hide a second line under an address").toBe(0);
    const counts = errorsByAddress(walked.errors.filter((e) => e.address.startsWith(walked.returned)));
    expect(counts.size, "no outside request reached the walk to be refused").toBeGreaterThan(0);
    expect([...counts.values()].filter((count) => count > 1), JSON.stringify(walked.errors)).toEqual([]);
  });
});

describe("the traffic counter's addresses", () => {
  it("the harness answers the same two addresses every page loads the counter from and reports to", () => {
    expect(TRAFFIC_COUNTER_SCRIPT).toBe(site.TRAFFIC_COUNTER_SCRIPT);
    expect(TRAFFIC_COUNTER_REPORTS).toBe(site.TRAFFIC_COUNTER_REPORTS);
  });
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
