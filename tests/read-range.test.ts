import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import { noticeSources, routeProvenance, type Dataset } from "permit-rulebook-data";
import { dataPage, statusAlias } from "../src/lib/data-page.js";
import { countryPage } from "../src/lib/country-page.js";
import { feedbackPage } from "../src/lib/feedback-page.js";
import { notFoundPage } from "../src/lib/not-found.js";
import { sitemapEntries } from "../src/lib/sitemap.js";
import { interviewFrameOf } from "../src/lib/frame/framed-page.js";
import { routePage } from "../src/lib/route-page/route-page.js";
import { reckonDatasetFacts } from "../src/lib/dataset-facts/reckon-dataset-facts.js";
import { NEWEST_VALUE_CHANGED } from "../src/lib/copy/data-page.js";
import { readRangeHtml } from "../src/lib/copy/frame.js";
import { DATA_PATH, FEEDBACK_PATH } from "../src/lib/site.js";
import { countryAddresses, routeAddresses } from "../src/lib/slug.js";
import { footerIn } from "./frame-alone.js";
import { watchStateAt } from "./watch-state-at.js";

/**
 * The read range counts every sentence the site quotes, values and notices
 * alike (#323, rulings 1 and 6).
 *
 * The footer's range counted values only while `/data/`'s "Rules read" stamp
 * counted notices too, so the first time only a notice's source was re-read,
 * `/data/` would have printed two newest days. Today's dataset reads its
 * notices inside its values' span, so no case on it can hold the rule: each
 * case reads a copy of the dataset with one notice's `retrieved_at` moved
 * past every other sentence's, at one end or the other.
 */

const ds = dataset as unknown as Dataset;

/** A fixed run, so no case reads the watch's live state. */
const RUN = watchStateAt("2026-09-30");

/** Every day a value was read on, oldest first. */
const valueDays = (d: Dataset): string[] =>
  d.countries.flatMap((c) => c.routes.flatMap((r) => routeProvenance(r).map((e) => e.value.retrieved_at))).sort();

/** Every day a quoted sentence was read on, values and notices alike, oldest first. */
const quotedDays = (d: Dataset): string[] =>
  [...valueDays(d), ...(d.notices ?? []).flatMap((n) => noticeSources(n).map((v) => v.retrieved_at))].sort();

/** The day `days` days from `day`. */
const shifted = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** A copy of the dataset with its first notice's leading sentence read on `day`. */
function withNoticeReadOn(day: string): Dataset {
  const copy = structuredClone(ds);
  const notice = copy.notices?.[0];
  if (!notice) throw new Error("the dataset carries no notice to re-read");
  notice.source.retrieved_at = day;
  return copy;
}

/** The footer's read range as the copy words it, each day's `<time>` captured. */
const READ_RANGE = new RegExp(readRangeHtml("1001", "1002").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  .replace("1001", '<b><time datetime="([^"]*)">[\\s\\S]*?</b>').replace("1002", '<b><time datetime="([^"]*)">'));

/** The two days of the footer's read range. Throws where the footer prints none. */
function footerRange(html: string): { oldest: string; newest: string } {
  const range = READ_RANGE.exec(footerIn(html));
  if (!range) throw new Error("the footer prints no read range");
  return { oldest: range[1]!, newest: range[2]! };
}

/** The day in the page's "Rules read" stamp. Throws where it has none. */
function stampedDay(html: string): string {
  const stamp = /<div class="stamps">[\s\S]*?<time datetime="([^"]*)"/.exec(html);
  if (!stamp) throw new Error("the page carries no stamp");
  return stamp[1]!;
}

/** The day under a term in `/data/`'s facts. Throws where the term is missing. */
function dayUnder(html: string, term: string): string {
  const row = new RegExp(`<dt>${term}</dt><dd><time datetime="([^"]*)">`).exec(html);
  if (!row) throw new Error(`the page has no row ${term}`);
  return row[1]!;
}

describe("a notice re-read after every value", () => {
  const NOTICE_DAY = shifted(quotedDays(ds).at(-1)!, 1);
  const copy = withNoticeReadOn(NOTICE_DAY);
  const html = dataPage(copy, RUN).html;

  it("is the newest read sentence of the copy, and newer than every value", () => {
    expect(quotedDays(copy).at(-1)).toBe(NOTICE_DAY);
    expect(valueDays(copy).at(-1)! < NOTICE_DAY, "a value was read on or after the notice").toBe(true);
  });

  it("is the day /data/'s Rules read stamp and the end of the footer's range both print", () => {
    expect(stampedDay(html), "the stamp").toBe(NOTICE_DAY);
    expect(footerRange(html).newest, "the end of the footer's range").toBe(NOTICE_DAY);
  });

  it("leaves Newest value changed on the newest value's day", () => {
    expect(dayUnder(html, NEWEST_VALUE_CHANGED)).toBe(valueDays(copy).at(-1));
  });

  it("is the Dataset block's dateModified, the stamp's day", () => {
    const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
    expect(ld, "the page carries no Dataset block").not.toBeNull();
    expect((JSON.parse(ld![1]!) as { dateModified: string }).dateModified).toBe(NOTICE_DAY);
  });
});

/**
 * Every other page prints the same newest read day, from the same reckoning
 * (#384; #323, rulings 1 and 7).
 */
describe("a notice re-read after every value, on every other page", () => {
  const NOTICE_DAY = shifted(quotedDays(ds).at(-1)!, 1);
  const copy = withNoticeReadOn(NOTICE_DAY);

  it("is the day the feedback page's, the 404's and /status's Rules read stamps print", () => {
    expect(stampedDay(feedbackPage(copy, RUN).html), "/feedback/").toBe(NOTICE_DAY);
    expect(stampedDay(notFoundPage(copy, RUN).html), "404").toBe(NOTICE_DAY);
    expect(stampedDay(statusAlias(copy, RUN).html), "/status").toBe(NOTICE_DAY);
  });

  it("is the day the sitemap dates the interview, /data/ and /feedback/ by", () => {
    const lastmod = new Map(sitemapEntries(copy, RUN).map((e) => [e.path, e.lastmod]));
    for (const path of ["/", DATA_PATH, FEEDBACK_PATH]) expect(lastmod.get(path), path).toBe(NOTICE_DAY);
  });

  it("is the day the interview page's Rules read stamp prints", () => {
    const stamp = interviewFrameOf(copy, reckonDatasetFacts(copy, RUN)).stamp;
    const day = /<div class="stamps"[\s\S]*?<time id="stamp-time" datetime="([^"]*)"/.exec(stamp);
    expect(day, "the interview's frame draws no live stamp").not.toBeNull();
    expect(day![1]).toBe(NOTICE_DAY);
  });

  it("dates each country page and its sitemap entry by the newest of its route pages' stamps", () => {
    for (const address of countryAddresses(copy)) {
      const routeStamps = routeAddresses(copy).filter((a) => a.country === address.country)
        .map((a) => routePage(copy, a, RUN).readDate);
      const newest = routeStamps.sort().at(-1);
      expect(stampedDay(countryPage(copy, address, RUN).html), address.path).toBe(newest);
      const entry = sitemapEntries(copy, RUN).find((e) => e.path === address.path);
      expect(entry?.lastmod, address.path).toBe(newest);
    }
  });
});

describe("a notice read before every value", () => {
  const NOTICE_DAY = shifted(quotedDays(ds)[0]!, -1);
  const copy = withNoticeReadOn(NOTICE_DAY);

  it("is the oldest read sentence of the copy, and older than every value", () => {
    expect(quotedDays(copy)[0]).toBe(NOTICE_DAY);
    expect(valueDays(copy)[0]! > NOTICE_DAY, "a value was read on or before the notice").toBe(true);
  });

  it("is the day the footer's range starts on", () => {
    expect(footerRange(dataPage(copy, RUN).html).oldest).toBe(NOTICE_DAY);
  });
});
