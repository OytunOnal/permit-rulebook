import { describe, expect, it } from "vitest";
import { smokeRefusalReportOf, smokeReportOf } from "../scripts/cli-smoke.mjs";
import { CHECKS } from "../scripts/smoke.mjs";
import { PAGE_LOAD_KINDS, SMOKE_REASONS, SmokeRefusal } from "../scripts/smoke-reasons.mjs";

/**
 * Smoke's report, without a browser: hand-made page loads through
 * `smokeReportOf`, the CLI's entry, read back as the lines `npm run smoke`
 * prints. The sentences are the report's own words, so each is pinned
 * verbatim, and the declared lists are walked so a reason or a kind with no
 * words goes red.
 */

/** Each declared reason, the values a failure of it carries, and the sentence the report prints for it. */
const EXPECTED_SENTENCES: Record<string, [Record<string, unknown>, string]> = {
  "no-question": [{}, "no question is on the screen"],
  "no-answers": [{}, "the question has no answers to pick from"],
  "no-declaration-panel": [{}, "the declaration panel is missing"],
  "stamp-not-rules-read-date": [{ stamp: "Rules read soon" }, 'the stamp reads "Rules read soon", not the rules-read date'],
  "stamp-not-a-date": [{ stamp: "" }, 'the rules-read stamp is ""'],
  "too-few-rule-cards": [{ rules: 2 }, "only 2 rule cards rendered"],
  "call-to-action-outside-interview": [
    { cta: "/elsewhere/", interview: "/base/?route=" },
    'the call to action is "/elsewhere/", not a link into the interview at /base/?route=',
  ],
  "header-lacks": [{ label: "Check yours" }, "the header does not offer Check yours"],
  "header-marks-another-country": [{ here: "France" }, 'the header marks "France", not the country you are on'],
  "too-few-route-cards": [{ cards: 7 }, "only 7 route cards rendered"],
  "first-route-unnamed": [{}, "the first route has no name"],
  "heading-not-the-data": [{ heading: "Germany" }, 'the heading is "Germany"'],
  "too-few-facts": [{ facts: 4 }, "only 4 facts about the dataset"],
  "dataset-not-offered": [{}, "the whole dataset is not offered"],
  "header-marks-another-page": [{ marked: ["Germany", "The data"] }, 'the header marks "Germany, The data", not The data'],
  "page-unreadable": [{ message: "Execution context was destroyed" }, "the page could not even be read — Execution context was destroyed"],
  "page-threw": [{ message: "exception: Error: boom" }, "the page threw — exception: Error: boom"],
  "errors-past-the-cap": [{ count: 7 }, "and 7 more errors past the walk's cap, not placed on any page"],
};

/** What the report calls each check's page, by the check's path. */
const EXPECTED_CHECK_PAGE_NAMES: Record<string, string> = {
  "/": "the interview",
  "/germany/eu-blue-card-general/": "a route page",
  "/germany/": "a country page",
  "/data/": "the data page",
};

/** A page load of each kind smoke returns, and the FAIL line the report opens it with. */
const FAIL_LINE_OF_EACH_KIND: Record<string, [{ kind: string; path: string }, string]> = {
  check: [{ kind: "check", path: "/data/" }, "FAIL [dist] /data/ (the data page)"],
  unplaced: [
    { kind: "unplaced", path: "http://127.0.0.1:4321/moved/" },
    "FAIL [dist] http://127.0.0.1:4321/moved/ (an address none of smoke's checks opens)",
  ],
  "past-the-cap": [{ kind: "past-the-cap", path: "*" }, "FAIL [dist] * (errors past the walk's cap)"],
};

/** The summary line of a run of `loads` page loads, `broken` of them broken. */
const summaryLineOf = (loads: number, broken: number) => `\n${loads} page loads in a real browser — ${broken} broken`;

/** A page load on `dist` that read nothing and threw nothing, of `kind` at `path`, failing with `failures`. */
const handMadePageLoadOf = (kind: string, path: string, failures: object[]) =>
  ({ surface: "dist", path, kind, value: {}, thrown: [], failures });

describe("smoke's report", () => {
  it("has words for every declared reason, and for no reason the list does not declare", () => {
    expect([...Object.keys(EXPECTED_SENTENCES), "no-build"].sort()).toEqual(Object.values(SMOKE_REASONS).sort());
  });

  it("words a missing build's refusal with the step that fixes it first, on stderr, and exits 1", () => {
    const report = smokeRefusalReportOf(new SmokeRefusal("no-build", { buildDirectory: "/site/dist" }));
    expect(report).toEqual({ err: ["run npm run build first: no /site/dist to walk"], exitCode: 1 });
  });

  it.each(Object.entries(EXPECTED_SENTENCES))("words the reason %s", (reason, [values, sentence]) => {
    const report = smokeReportOf([handMadePageLoadOf(PAGE_LOAD_KINDS.check, "/", [{ reason, ...values }])]);
    expect(report.out).toEqual(["FAIL [dist] / (the interview)", `     ${sentence}`, summaryLineOf(1, 1)]);
    expect(report.exitCode).toBe(1);
  });

  it("names every check's page, each passing load on one ok line, and exits 0 when none broke", () => {
    expect(Object.keys(EXPECTED_CHECK_PAGE_NAMES).sort()).toEqual(CHECKS.map((check) => check.path).sort());
    const loads = Object.keys(EXPECTED_CHECK_PAGE_NAMES).map((path) => ({ ...handMadePageLoadOf(PAGE_LOAD_KINDS.check, path, []), value: { facts: 6 } }));
    const report = smokeReportOf(loads);
    expect(report.out).toEqual([
      ...Object.entries(EXPECTED_CHECK_PAGE_NAMES).map(([path, name]) => `ok   [dist] ${path} (${name}) — {"facts":6}, 0 console errors`),
      summaryLineOf(4, 0),
    ]);
    expect(report.exitCode).toBe(0);
  });

  it("names every kind of page load", () => {
    expect(Object.keys(FAIL_LINE_OF_EACH_KIND).sort()).toEqual(Object.values(PAGE_LOAD_KINDS).sort());
    const threw = { reason: SMOKE_REASONS.pageThrew, message: "boom" };
    const report = smokeReportOf(Object.values(FAIL_LINE_OF_EACH_KIND).map(([{ kind, path }]) => handMadePageLoadOf(kind, path, [threw])));
    expect(report.out).toEqual([
      ...Object.values(FAIL_LINE_OF_EACH_KIND).flatMap(([, failLine]) => [failLine, "     the page threw — boom"]),
      summaryLineOf(3, 3),
    ]);
  });
});

describe("smoke's refusal to walk", () => {
  it("keeps its own message and name when its values carry a message, and is worded from those values", () => {
    const refusal = new SmokeRefusal("page-threw", { message: "boom", name: "elsewhere" });
    expect([refusal.message, refusal.name]).toEqual(["page-threw", "SmokeRefusal"]);
    expect(smokeRefusalReportOf(refusal)).toEqual({ err: ["the page threw — boom"], exitCode: 1 });
  });
});
