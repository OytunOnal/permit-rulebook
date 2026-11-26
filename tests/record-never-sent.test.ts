import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { answerWith, skipReason } from "./browser-walk.js";
import { expectNothingLeft } from "./wire.js";
import { InterviewPage } from "../scripts/interview-page/interview-page.mjs";
import {
  PHONE, TRAFFIC_COUNTER_REPORTS, TRAFFIC_COUNTER_SCRIPT, walkSite, type PageOnSite, type SentRequest,
} from "../scripts/browser/browser.mjs";

const dist = fileURLToPath(new URL("../dist", import.meta.url));

/**
 * The one-pager's first non-negotiable: the answers never leave the device.
 *
 * Since 2026-09-08 the pages carry a cookieless traffic counter (Cloudflare Web
 * Analytics, the human's decision), so "nothing leaves" is no longer the same
 * sentence as "no request leaves". Exactly two addresses outside this site are
 * allowed — the counter's script, and the address it reports to — and what the
 * counter SENDS is read back off the wire and checked: the page's address, the
 * browser, the site token, and nothing a reader answered.
 *
 * This used to be checked by reading the page's own source for `fetch`,
 * `sendBeacon` and friends — a surface trace, and this project does not accept
 * those: a bundled dependency, an inlined helper or a renamed call would walk
 * straight past it, and the promise is about what the page DOES. So the page is
 * driven in a real browser with the network watched, and the only thing
 * asserted is what it actually sent (human, 2026-09-08). The walks are served
 * the committed copy of Cloudflare's script, its reports answered inside the
 * browser, so the check runs on Cloudflare's code with no network.
 */
const skipped = skipReason();
if (skipped)
  process.stderr.write([
    "",
    `  !! THE PRIVACY PROMISE WAS NOT WALKED IN A BROWSER: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));

/** In the page: clicks through whatever the current question offers, whatever kind it is. */
function answerOne(): string {
  const opt = document.querySelector<HTMLElement>(".qcard .opts .opt");
  if (opt) { opt.click(); return "opt"; }
  const row = document.querySelector<HTMLElement>(".clist [role=option]");
  if (row) { row.click(); return "row"; }
  const input = document.querySelector<HTMLInputElement>("#cfilter");
  if (input) { input.value = "Turkey"; input.dispatchEvent(new Event("input", { bubbles: true })); return "typed"; }
  return "none";
}

// Whatever the current question offers, clicked: the walk's one gesture, to the verdict and after it.
const ANSWER_ONE = `(${answerOne})()`;

/** The answers the record on the device holds, by value. */
async function declaredOn(interview: InterviewPage): Promise<string[]> {
  return Object.values((await interview.readRecord())?.answers ?? {});
}

/**
 * The requests a whole walk to the verdict sent, and those an answer changed
 * after it sent, with what was answered and the routes the verdict named.
 */
async function requestsOfWalkThenEdit(site: PageOnSite) {
  const { page, url } = site;
  const interview = new InterviewPage(site);
  await page.goto(url("/"));
  const answered: string[] = [];
  for (let step = 0; step < 25; step++) {
    if ((await interview.readScreen()).screen === "results") break;
    answered.push(await answerWith(page, ANSWER_ONE));
  }
  const reached = (await interview.readScreen()).screen;
  const walk = page.requests();

  // Now the gesture the promise is most easily broken by: changing an
  // answer once a verdict is on the screen.
  page.forgetRequests();
  await page.evaluate('document.querySelector("#app .done").click()');
  await answerWith(page, ANSWER_ONE);
  const afterEdit = page.requests();

  const declared = await declaredOn(interview);
  // Every route the verdict named: none of these may reach the counter
  // either — which of them fit is the reader's business.
  const routes = await page.evaluate(
    'JSON.stringify([...document.querySelectorAll("#app a[href]")]'
    + '.map((a) => a.getAttribute("href")).filter((h) => /^[/][a-z-]+[/][a-z0-9-]+$/.test(h))'
    + '.map((h) => h.split("/").pop()))',
  );
  return {
    answered, reached, walk, afterEdit, origin: new URL(url("/")).origin,
    declared, routes: JSON.parse(routes) as string[],
  };
}

/** Checks the traffic counter ran during the walk, and reported once per page load, not per answer. */
function expectCounterRanOncePerLoad(seen: { walk: SentRequest[]; afterEdit: SentRequest[]; declared: string[] }) {
  // The counter was actually running: a blocked counter would make every
  // assertion above pass by having nothing to check (Security review).
  const fetched = seen.walk.filter((r) => r.url.startsWith(TRAFFIC_COUNTER_SCRIPT));
  const reports = [...seen.walk, ...seen.afterEdit]
    .filter((r) => r.url.startsWith(TRAFFIC_COUNTER_REPORTS) && r.method === "POST");
  expect(fetched.length, "the counter's script was never fetched").toBeGreaterThan(0);
  expect(reports.length, "the counter sent no report at all").toBeGreaterThan(0);
  // One report per page LOAD, not per answered question. Cloudflare's
  // single-page tracking follows every pushState, and this interview pushes
  // one per answer: seven answers sent thirteen reports until `spa: false`
  // (Security review, 2026-09-08).
  expect(reports.length, `${seen.declared.length} answers produced ${reports.length} reports`)
    .toBeLessThanOrEqual(2);
}

/** Checks a whole walk, and an answer changed after it, sent nothing but this page's own files and the counter's report. */
async function expectWalkAndEditSendNoAnswer() {
  const screen = { viewport: { width: 1100, height: 900 }, mobile: false };
  const walk = { site: { folder: dist }, screen, network: true, trafficCounter: "cloudflare's copy" } as const;
  const { returned } = await walkSite(walk, requestsOfWalkThenEdit);
  const seen = returned as {
    answered: string[]; reached: string; walk: SentRequest[]; afterEdit: SentRequest[];
    declared: string[]; routes: string[]; origin: string;
  };

  expect(seen.reached, `the walk never reached a verdict: ${seen.answered.join(", ")}`).toBe("results");
  expect(seen.declared.length, "the walk answered nothing").toBeGreaterThan(5);

  const { origin } = seen;
  // The same assertion the s26 walk makes over its requests (tests/wire.ts).
  for (const [where, sent] of [["the walk", seen.walk], ["the edit", seen.afterEdit]] as const)
    expectNothingLeft(sent, { origin, where, declared: seen.declared, routes: seen.routes });

  expectCounterRanOncePerLoad(seen);

  // The edit repainted the screen without asking THIS SITE anything: the
  // counter reports a view when the history entry changes, which is the
  // page's address and nothing else.
  const ours = seen.afterEdit.filter((r) => r.url.startsWith(origin));
  expect(ours.length, `the edit sent ${ours.length} requests to this site`).toBeLessThan(3);
}

describe.skipIf(skipped !== null)("the one-pager's promise: answers never leave the device", () => {
  it("a whole walk, and an answer changed after it, sends nothing but this page's own files", expectWalkAndEditSendNoAnswer, 180000);
});

/** One request to the counter's endpoint after a pre-scoped walk: its preflight
 * carries nothing, and its report carries an address and no answer. */
function expectReportCarriesNoAnswer(request: SentRequest, declared: string[]): void {
  if (request.method === "OPTIONS") return;
  const raw = String(request.postData ?? "");
  // Origin and path masked; the query string left in to be checked.
  const body = raw.replace(/"location":"([^"?]*)([^"]*)"/g, (_m, _p, query) => `"location":"${query}"`);
  // Measured, not assumed: the counter reports the path only — the
  // query string the reader arrived with never reaches it, so the route
  // id does not either, though it would have been allowed as the page's
  // own address (Security review, 2026-09-08).
  expect(raw).not.toContain("route=de-blue-card-general");
  expect(raw, "the report carries no address at all").toContain('"location"');
  // No answer, anywhere in it — query string included.
  for (const answer of declared) {
    const token = new RegExp(`(^|[^a-z0-9])${
      answer.toLowerCase().replace(/[^a-z0-9]/g, "[^a-z0-9]")}([^a-z0-9]|$)`);
    expect(token.test(body.toLowerCase()), `${answer} reached the counter`).toBe(false);
  }
}

/**
 * The other way in: a route page's call to action lands here with the route in
 * the query string. That id is the page's own address and the counter may carry
 * it — an ANSWER in that query string would be a different matter (Security
 * review, 2026-09-08).
 */
describe.skipIf(skipped !== null)("arriving pre-scoped sends no more than arriving cold", () => {
  it("a walk that starts at /?route=… still sends only the counter's own report", async () => {
    const walk = { site: { folder: dist }, screen: PHONE, network: true, trafficCounter: "cloudflare's copy" } as const;
    const { returned } = await walkSite(walk, async (site) => {
      const { page, url } = site;
      const interview = new InterviewPage(site);
      await page.goto(url("/"));
      await interview.clearRecord();
      await page.goto(`${url("/")}?route=de-blue-card-general`);
      for (let step = 0; step < 4; step++) {
        await answerWith(page, ANSWER_ONE);
      }
      return { sent: page.requests(), declared: await declaredOn(interview), origin: new URL(url("/")).origin };
    });
    const seen = returned as { sent: SentRequest[]; declared: string[]; origin: string };

    const { origin } = seen;
    const reports = seen.sent.filter((r) => r.url.startsWith(TRAFFIC_COUNTER_REPORTS) && r.method === "POST");
    expect(seen.declared.length, "the pre-scoped walk answered nothing").toBeGreaterThan(3);
    expect(reports.length, `${reports.length} reports for one page load`).toBeLessThanOrEqual(2);

    for (const request of seen.sent) {
      if (request.url.startsWith(TRAFFIC_COUNTER_SCRIPT)) continue;
      if (request.url.startsWith(TRAFFIC_COUNTER_REPORTS)) {
        expectReportCarriesNoAnswer(request, seen.declared);
        continue;
      }
      expect(request.url.startsWith(origin), `a request left this origin — ${request.url}`).toBe(true);
      expect(request.method, `${request.method} ${request.url}`).toBe("GET");
    }
  }, 180000);
});
