import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { framedPageHtml, interviewFrameOf } from "../src/lib/frame/framed-page.js";
import { countryPages } from "../src/lib/country-page.js";
import { dataPage, statusAlias } from "../src/lib/data-page.js";
import { feedbackPage } from "../src/lib/feedback-page.js";
import { notFoundPage } from "../src/lib/not-found.js";
import { routePage, routePages } from "../src/lib/route-page/route-page.js";
import { DATA_PATH, FEEDBACK_PATH, analyticsBeacon, url } from "../src/lib/site.js";
import { countryPath, routeAddresses } from "../src/lib/slug.js";
import { footerIn, frameAlone, headerIn, styleIn } from "./frame-alone.js";

/**
 * The frame's entry: what every page built as a string wears around its own
 * content, and what the interview page places itself (#142). A page that
 * loses its header, its footer, its menu or its policy fails here, and a
 * page's own head lines, rules and scripts land where the interface puts them.
 */

const ds = dataset as unknown as Dataset;

// The policy is left out under `astro dev`, and a test process is one: the
// cases render as the build does.
beforeEach(() => { vi.stubEnv("DEV", false); });
afterEach(() => { vi.unstubAllEnvs(); });

/** One page of each kind the frame draws, by name. */
const pagesOfEachKind = (): [string, string][] => [
  ["a route page", routePages(ds)[0]!.html],
  ["a country page", countryPages(ds)[0]!.html],
  ["the data page", dataPage(ds).html],
  ["the feedback page", feedbackPage(ds).html],
  ["the 404", notFoundPage(ds).html],
  ["the status page", statusAlias(ds).html],
];

describe("the frame, at its entry", () => {
  it("draws the policy, the icon links, the header, the footer and the menu on every page", () => {
    const frame = interviewFrameOf(ds);
    expect(frame.policy, "precondition: the policy is rendered").toContain('http-equiv="Content-Security-Policy"');
    expect(frame.icons, "precondition: the icon links are rendered").toContain('rel="apple-touch-icon"');
    const pages = pagesOfEachKind();
    expect(pages.length).toBe(6);
    for (const [kind, html] of pages) {
      expect(html, `${kind}: the policy`).toContain(`\n${frame.policy}\n`);
      expect(html, `${kind}: the icon links`).toContain(`\n${frame.icons}\n`);
      expect(headerIn(html), `${kind}: the header`).toContain('<a class="wordmark tap-min"');
      expect(footerIn(html), `${kind}: the footer`).toContain('<p class="disclaimer">');
      expect(html, `${kind}: the menu script`).toContain(`<script>${frame.menuScript}</script>`);
    }
  });

  it("gives the interview the same pieces it draws around a page", () => {
    const frame = interviewFrameOf(ds);
    const html = frameAlone(ds, { place: { here: "/" } });
    expect(headerIn(html)).toBe(frame.header);
    expect(footerIn(html)).toBe(frame.footer);
  });

});

/** An attribute's value on one tag, in whatever order the tag writes its attributes; none where it has no such attribute. */
const attributeOf = (tag: string, name: string): string | undefined =>
  new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

/** The header's links that carry `aria-current`, each as its address and its value. Throws on a marked link with no address. */
const headerMarksOf = (header: string): string[] =>
  [...header.matchAll(/<a\s[^>]*>/g)].flatMap(([tag]) => {
    const mark = attributeOf(tag, "aria-current");
    if (mark === undefined) return [];
    const href = attributeOf(tag, "href");
    if (href === undefined) throw new Error(`a marked header link has no address: ${tag}`);
    return [`${href} ${mark}`];
  });

describe("the header marks the page it is on", () => {
  it("marks each header destination on its own page, a route page's country as its section, and nothing else", () => {
    const address = routeAddresses(ds)[0]!;
    const countries = countryPages(ds);
    expect(countries.length, "precondition: a page for each country").toBe(ds.countries.length);
    const marksOn: [string, string, string[]][] = [
      ["the interview", interviewFrameOf(ds).header, [`${url("/")} page`]],
      ["the data page", headerIn(dataPage(ds).html), [`${url(DATA_PATH)} page`]],
      ["the feedback page", headerIn(feedbackPage(ds).html), [`${url(FEEDBACK_PATH)} page`]],
      ...countries.map((page): [string, string, string[]] => [page.path, headerIn(page.html), [`${url(page.path)} page`]]),
      ["a route page", headerIn(routePage(ds, address).html), [`${url(countryPath(address.country))} true`]],
      ["the 404", headerIn(notFoundPage(ds).html), []],
      ["the status page", headerIn(statusAlias(ds).html), []],
    ];
    for (const [where, header, marks] of marksOn) {
      expect(header, `precondition: ${where} has a header`).toContain('<header class="site-head">');
      expect(headerMarksOf(header), where).toEqual(marks);
    }
  });
});

describe("what a page hands the frame lands where the interface puts it", () => {
  it("puts a page's own head lines right after the policy, before the icon links", () => {
    const frame = interviewFrameOf(ds);
    const html = frameAlone(ds, { headTags: ['<meta name="robots" content="noindex">', '<link rel="x" href="/y">'] });
    expect(html).toContain(`${frame.policy}\n<meta name="robots" content="noindex">\n<link rel="x" href="/y">\n${frame.icons}`);
  });

  it("adds a page's own rules after the frame's, in the one stylesheet", () => {
    const own = "\n.own-rule { color: var(--color-ink); }\n";
    const framed = styleIn(frameAlone(ds, { css: own }));
    const alone = styleIn(frameAlone(ds));
    expect(alone, "precondition: the frame has rules of its own").toContain(".wrap {");
    expect(framed).toBe(`${alone}${own}`);
  });

  it("runs a page's own scripts after the menu and before the counter", () => {
    const frame = interviewFrameOf(ds);
    const html = frameAlone(ds, { scripts: ["window.ownScript = 1;"] });
    expect(html).toContain(`<script>${frame.menuScript}</script>\n<script>window.ownScript = 1;</script>\n${analyticsBeacon()}`);
  });

  it("places the content between the header and the footer", () => {
    const html = frameAlone(ds, { content: '<main id="own-content"></main>' });
    const header = html.indexOf("</header>");
    const content = html.indexOf('<main id="own-content">');
    const footer = html.indexOf('<footer class="site-foot">');
    expect(header, "precondition: a header").toBeGreaterThan(0);
    expect(content).toBeGreaterThan(header);
    expect(footer).toBeGreaterThan(content);
  });

  it("writes a link preview only for a page that hands one over", () => {
    const meta = { description: "A page.", path: "/own", kind: "website" as const };
    expect(frameAlone(ds, { title: "Own" })).not.toContain('property="og:title"');
    expect(framedPageHtml(ds, { title: "Own", meta, content: "" })).toContain('<meta property="og:title" content="Own">');
  });
});
