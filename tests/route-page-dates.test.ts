import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { forEachCriterion, formatEUR, isScored, type Dataset, type UnreadSource } from "permit-rulebook-data";
import { audienceNotice, routeFigure, routePage, routePages } from "../src/lib/route-page/route-page.js";
import { countryAddresses, countryPages } from "../src/lib/country-page.js";
import { dataPage } from "../src/lib/data-page.js";
import { feedbackPage } from "../src/lib/feedback-page.js";
import { notFoundPage } from "../src/lib/not-found.js";
import { datasetLd } from "../src/lib/dataset-ld.js";
import { sitemapEntries } from "../src/lib/sitemap.js";
import { ANSWER_SOURCED, dailyCheck } from "../src/lib/copy/route-page.js";
import { datasetDay } from "../src/lib/copy/frame.js";
import { DATA_PATH, FEEDBACK_PATH } from "../src/lib/site.js";
import { esc } from "../src/lib/reason.js";
import { routeAddresses } from "../src/lib/slug.js";
import { textOf } from "./text-of.js";

/**
 * The dates a route page prints: its stamp, each figure's reading, the
 * dataset's version, and the daily check's line.
 */

const ds = dataset as unknown as Dataset;
const pages = routePages(ds);

/** The read dates of the quotes a page prints, in page order. */
const quoteDatesOf = (html: string): string[] =>
  [...html.matchAll(/<div class="src">[\s\S]*?<\/div>/g)]
    .flatMap((m) => [...m[0].matchAll(/datetime="([^"]+)"/g)].map((d) => d[1]));

/** The panel a route page opens on: the figure it asks for, and the day it was read. */
const answerOf = (html: string): string => /<section class="answer"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";

describe("s6 — one page per route, generated from the dataset", () => {
  it("the stamp is the newest date among the quotes the page prints, and every date is ISO", () => {
    for (const address of routeAddresses(ds)) {
      const page = routePage(ds, address);
      expect(page.readDate, page.path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(page.readDate, page.path).toBe(quoteDatesOf(page.html).sort().at(-1));
      // Never a second date format beside it.
      expect(textOf(page.html), page.path).not.toMatch(/\d{2}\s*·\s*\d{2}\s*·\s*\d{4}/);
      expect(textOf(page.html), page.path).not.toMatch(/\d{4}\.\d{2}\.\d{2}/);
    }
  });

  /**
   * R11 — one guarded formatter for the dataset's version.
   */
  it("prints the dataset version as a date and the schema version as a version", () => {
    expect(datasetDay("2026.09.07")).toBe("2026-09-07");
    expect(datasetDay("0.5.0")).toBe("0.5.0");
    // Every page states the dataset's version in the shared footer, in the
    // version's own form; the schema version moved to the data page, where a
    // reader who wants it is standing (human, 2026-09-08).
    for (const page of pages) {
      const text = textOf(page.html);
      expect(text, page.path).toContain(`dataset ${datasetDay(ds.dataset_version)}`);
      expect(text, page.path).not.toContain(`schema ${ds.schema_version}`);
    }
  });
});

// The title these cases have always sat under; every block below repeats it, so each case keeps its id.
const DATES_WHAT_IT_PRINTS = "a route page dates what it prints";

/**
 * A page dates only what it prints (#76). The audience notice carries more
 * sentences than a route page prints: its `sources` stand on the results card,
 * and on a route page the citizenship card quotes only its `source`. So the
 * dataset is bent until a date reaches the notice and nothing printed: a
 * stamp read from the notice's whole list shows it, a stamp read from the page
 * cannot.
 */

// Newer than every read the dataset carries, so only the bent sources can
// put it on a stamp: the dataset's newest read is 2026-10-21 since the
// German Blue Card's IT path was read (#134), past the 2026-09-30 used before.
const NEVER_PRINTED = "2026-11-30";
const bent = structuredClone(ds);
const audience = (bent.notices ?? []).find((n) => n.kind === "no-permit-needed");
for (const value of audience?.sources ?? []) value.retrieved_at = NEVER_PRINTED;
const bentPages = routeAddresses(bent).map((a) => ({ route: a.route, page: routePage(bent, a) }));

describe(DATES_WHAT_IT_PRINTS, () => {
  it("draws the stamp from no source the page leaves out", () => {
    expect(audience?.sources?.length, "the notice no longer carries a source the page leaves out").toBeTruthy();
    for (const { page } of bentPages) {
      expect(page.readDate, page.path).toBe(quoteDatesOf(page.html).sort().at(-1));
      expect(page.html, page.path).not.toContain(NEVER_PRINTED);
    }
    for (const page of countryPages(bent)) expect(page.html, page.path).not.toContain(NEVER_PRINTED);
  });

  it("a site-wide page dates the whole dataset, the sentences only the results card prints included", () => {
    const stampOf = (html: string): string | undefined =>
      /<div class="stamps">[\s\S]*?<time datetime="([^"]*)"/.exec(html)?.[1];
    expect(stampOf(dataPage(bent).html), "/data/").toBe(NEVER_PRINTED);
    expect(stampOf(feedbackPage(bent).html), "/feedback/").toBe(NEVER_PRINTED);
    expect(stampOf(notFoundPage(bent).html), "404").toBe(NEVER_PRINTED);
    expect(JSON.parse(datasetLd(bent, DATA_PATH)).dateModified, "Dataset JSON-LD").toBe(NEVER_PRINTED);
    const lastmod = new Map(sitemapEntries(bent).map((e) => [e.path, e.lastmod]));
    for (const path of ["/", DATA_PATH, FEEDBACK_PATH]) expect(lastmod.get(path), path).toBe(NEVER_PRINTED);
    // A route page and a country page still date only what they print.
    for (const address of [...routeAddresses(bent), ...countryAddresses(bent)])
      expect(lastmod.get(address.path), address.path).not.toBe(NEVER_PRINTED);
    for (const page of countryPages(bent)) expect(stampOf(page.html), page.path).not.toBe(NEVER_PRINTED);
  });

  it("a panel with no figure promises no sentence below it and dates nothing", () => {
    const without = bentPages.filter(({ route }) => isScored(route) && !routeFigure(bent, route).value);
    expect(without.length, "no scored route is left without a figure").toBeGreaterThan(0);
    for (const { page } of without) {
      expect(answerOf(page.html), page.path).not.toContain(ANSWER_SOURCED);
      expect(answerOf(page.html), page.path).not.toContain("<time");
    }
    for (const { route, page } of bentPages)
      if (routeFigure(bent, route).value) expect(answerOf(page.html), page.path).toContain(ANSWER_SOURCED);
  });
});

describe(DATES_WHAT_IT_PRINTS, () => {
  /**
   * The liveness line and the stamp read one set of this page's sources. The
   * citizenship card prints the audience notice's `source`, so a run that
   * could not read it is a run that missed one of this page's sources.
   */
  it("qualifies its daily-check line when the run missed a sentence the page prints", () => {
    const notice = audienceNotice(ds)!;
    const unread: UnreadSource[] = [
      { id: "audience", url: notice.source.source_url, last_read: notice.source.retrieved_at, countries: [] },
    ];
    const prints = (html: string): boolean => html.includes(esc(notice.source.quote));
    const pagesWith = routeAddresses(ds).map((a) => routePage(ds, a, { lastRun: "2026-09-30", unread }));
    expect(pagesWith.filter((p) => prints(p.html)).length, "no route page prints the notice's sentence")
      .toBeGreaterThan(0);
    for (const page of pagesWith)
      expect(page.html.includes(esc(dailyCheck(1))), page.path).toBe(prints(page.html));
  });
});

describe(DATES_WHAT_IT_PRINTS, () => {
  it("dates each headline figure by its own reading, the date its quote prints", () => {
    const moved = structuredClone(ds);
    const spain = moved.countries.find((c) => c.code === "ES")!;
    const route = spain.routes.find((r) => r.id === "es-blue-card")!;
    // Two figures, each read on a day nothing else on the page was read.
    const days = ["2026-08-21", "2026-08-22"];
    const figures: { amount: number; day: string }[] = [];
    forEachCriterion(route.criteria, (c) => {
      if (c.op !== "gte") return;
      const day = days[figures.length]!;
      c.threshold.retrieved_at = day;
      figures.push({ amount: c.threshold.amount, day });
    });
    expect(figures.length, "the route no longer carries two figures").toBe(2);
    const page = routePage(moved, routeAddresses(moved).find((a) => a.route.id === route.id)!);
    const lines = answerOf(page.html).split("<br>");
    for (const { amount, day } of figures) {
      const line = lines.find((l) => l.includes(formatEUR(amount)));
      expect(line, `${formatEUR(amount)} is not in the panel`).toBeDefined();
      expect([...line!.matchAll(/datetime="([^"]+)"/g)].map((d) => d[1])).toEqual([day]);
      expect(quoteDatesOf(page.html), `${day} is not the date a quote prints`).toContain(day);
    }
    expect(answerOf(page.html)).not.toContain(`datetime="${page.readDate}"`);
  });
});
