import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import dataset from "permit-rulebook-data/data/dataset.json";
import { evaluate, notices, type Dataset, type Profile } from "permit-rulebook-data";
import { arrivalFrom, arrivalPlan, destinationFor, scopedFirst } from "../src/lib/scope.js";
import { audienceNotice, routePage } from "../src/lib/route-page.js";
import { routeAddresses } from "../src/lib/slug.js";
import { datasetDay, isoDay } from "../src/lib/copy.js";

const ds = dataset as unknown as Dataset;

/**
 * Scenario step 10 — the edge profiles, mandatory.
 *
 * Two readers the route page has to survive: one who does not need a permit at
 * all and lands on a page for a country she can already work in, and one who
 * follows the call to action from a route page and must find that route first
 * in what comes back.
 */
describe("s6 step 10 — the Irish reader on a German page", () => {
  it("the page says who it is for before the first rule, in the authority's words", () => {
    const address = routeAddresses(ds).find((a) => a.route.id === "de-blue-card-general")!;
    const page = routePage(ds, address);
    const notice = audienceNotice(ds)!;
    // The notice is a dataset value like any other: quote, source, read date.
    expect(notice.kind).toBe("no-permit-needed");
    expect(page.html.indexOf("This page is for people who need a permit to work in Germany."))
      .toBeLessThan(page.html.indexOf('<article class="rule">'));
    // And its own sentence, with its quote, is the first rule card — not a
    // footnote at the bottom of seven rules she does not need.
    const firstCard = page.html.slice(
      page.html.indexOf('<article class="rule">'),
      page.html.indexOf("</article>"),
    );
    expect(firstCard).toContain("Who this is for");
    expect(firstCard).toContain(notice.body);
    expect(firstCard).toContain(notice.source.quote);
    expect(firstCard).toContain(notice.source.retrieved_at);
  });

  it("the call to action leads to the notice, not to a rejection", () => {
    const address = routeAddresses(ds).find((a) => a.route.id === "de-blue-card-general")!;
    const page = routePage(ds, address);
    expect(page.html).toContain('href="/?route=de-blue-card-general"');

    // What the interview does with that link for an Irish reader: the
    // destination goes on the record, and the passport answers with a notice
    // that REPLACES the results rather than a screen of closed routes.
    const arrival = arrivalFrom(ds, "?route=de-blue-card-general")!;
    const answers: Profile = {};
    const destination = destinationFor(arrival)!;
    expect(destination).toBe("de");
    answers["destination"] = destination;
    answers["citizenship"] = "IE";

    const replacing = notices(ds, answers).filter((n) => n.kind === "no-permit-needed");
    expect(replacing.length).toBe(1);
    const results = evaluate(ds, answers).filter((r) => r.country === "DE");
    // Nothing open and nothing within reach — which is exactly the screen the
    // notice takes over, so she is told she needs no permit rather than shown
    // eight routes that are shut.
    expect(results.filter((r) => r.status !== "hold").length).toBe(0);
  });
});

describe("s6 step 10 — arriving from a route page's call to action", () => {
  it("puts the route's country on the record and that route first", () => {
    const arrival = arrivalFrom(ds, "?route=nl-orientation-year")!;
    expect(arrival.route.id).toBe("nl-orientation-year");
    expect(arrival.country.code).toBe("NL");
    expect(destinationFor(arrival)).toBe("nl");

    const answers: Profile = { destination: "nl", citizenship: "TR" };
    const results = evaluate(ds, answers).filter((r) => r.country === "NL");
    const ordered = scopedFirst(results, "nl-orientation-year");
    expect(ordered[0].route.id).toBe("nl-orientation-year");
    // And nothing else moved: the rest keep the order the engine gave them.
    expect(ordered.slice(1).map((r) => r.route.id))
      .toEqual(results.filter((r) => r.route.id !== "nl-orientation-year").map((r) => r.route.id));
  });

  it("a link that names a country re-scopes an answer for another one", () => {
    // This used to read the other way — "a declaration outranks a link" — and
    // it left a returning reader pressing "Check yours — France" looking at
    // her German verdicts with France nowhere on the screen (isolated v1-gate
    // critique, 2026-09-08, B2). A reader standing on a country's page,
    // pressing that page's own button, is asking about that country.
    const arrival = arrivalFrom(ds, "?route=de-blue-card-general")!;
    const dutch: Profile = { destination: "nl", citizenship: "TR", qualification: "degree" };
    const plan = arrivalPlan(ds, dutch, Object.keys(dutch), destinationFor(arrival)!);
    expect(plan.changed).toBe(true);
    expect(plan.answers["destination"]).toBe("de");
    // Her own answers travel with her; only where she is asking has changed.
    expect(plan.answers["citizenship"]).toBe("TR");
    expect(plan.answers["qualification"]).toBe("degree");
  });

  it("a route id nothing answers to is ignored, not reported", () => {
    expect(arrivalFrom(ds, "?route=de-does-not-exist")).toBeNull();
    expect(arrivalFrom(ds, "")).toBeNull();
    expect(destinationFor(null)).toBeNull();
    const rows = [{ route: { id: "a" } }, { route: { id: "b" } }];
    expect(scopedFirst(rows, null)).toEqual(rows);
  });
});

/**
 * s6 decision 12 — dates are one format, and it is ISO.
 */
describe("s6 — one date format", () => {
  it("prints a day as ISO, in local time", () => {
    expect(isoDay(new Date(2026, 8, 7))).toBe("2026-09-07");
    expect(isoDay(new Date(2026, 0, 1))).toBe("2026-01-01");
    // Late on the last day of a month in a timezone ahead of UTC, a UTC-based
    // stamp would say tomorrow. The record's date is the reader's day.
    expect(isoDay(new Date(2026, 11, 31, 23, 30))).toBe("2026-12-31");
  });

  it("the results stamp prints today, as an ISO date, on the built page", () => {
    // The behaviour, not the identifier: a page could import the formatter and
    // print nothing (Standards review, 2026-09-07). The element the script
    // fills is on the built page, and the formatter that fills it is pinned
    // against a locale that is ISO by definition.
    const built = new URL("../dist/index.html", import.meta.url);
    if (existsSync(built)) {
      const html = readFileSync(built, "utf8").split("\r\n").join("\n");
      expect(html).toContain('id="stamp-date"');
    }
    expect(isoDay(new Date())).toBe(new Date().toLocaleDateString("sv-SE"));
    expect(isoDay(new Date(2026, 8, 7))).toBe("2026-09-07");
  });

  it("the dataset version prints as a date, and a schema version does not", () => {
    expect(datasetDay("2026.09.07")).toBe("2026-09-07");
    expect(datasetDay("0.5.0")).toBe("0.5.0");
    expect(datasetDay("2026.9.7")).toBe("2026.9.7");
  });
});
