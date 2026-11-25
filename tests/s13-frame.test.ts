import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { COPIED } from "../src/lib/copy/feedback.js";
import { CHECK_YOURS, COUNTRIES, FEEDBACK, FEEDBACK_FOOTER_ROW, THE_DATA } from "../src/lib/copy/frame.js";
import { RESULT_FEEDBACK_ASK, resultFeedbackLine } from "../src/lib/copy/verdict.js";
import { FEEDBACK_PATH, NEW_NEED_URL, SPONSOR_URL, TRACKER_URL, absolute, url } from "../src/lib/site.js";
import { FIRST_PAINT_SCRIPT } from "../src/lib/first-paint.js";
import { COPY_SCRIPT } from "../src/lib/clipboard.js";
import { countryLinks } from "../src/lib/slug.js";
import { indexedPaths, sitemapXml } from "../src/lib/sitemap.js";
import { esc, escAttr } from "../src/lib/reason.js";
import { verdictHtml } from "../src/lib/verdict/verdict.js";
import { verdictFor } from "./verdict-cards.js";
import { footerIn, frameAlone, headerIn, interviewFrameAlone } from "./frame-alone.js";
import { LAYOUTS, allRecord, ds, frRecord, page } from "./s13-feedback-door.js";
import { warnBuildNotTested, whyNoBuild } from "./why-no-build.js";

/**
 * s13 — the feedback door, where the frame and the verdict offer it.
 *
 * The door moves to where it can be seen: one word, *Feedback*, in the header,
 * under the verdict and in the footer, all leading to `/feedback/`. The cases
 * below read the header, the footer, the site map and the results line, built
 * without a browser.
 */

const dist = fileURLToPath(new URL("../dist", import.meta.url));
/** Why the built first paint cannot be read here, or null when it can. */
const noBuild = whyNoBuild("dist/index.html");
if (noBuild) warnBuildNotTested("the results line in the built first paint", noBuild);
const root = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const read = (p: string): string => readFileSync(root(p), "utf8").split("\r\n").join("\n");

/** The site header in `html`, or "" when it has none. */
const headerOf = (html: string): string => {
  const start = html.indexOf('<header class="site-head">');
  return start < 0 ? "" : html.slice(start, html.indexOf("</header>", start));
};

/** Checks a page of no country shows the closed Countries word, the four in its list, and the row's four items. */
function expectCountriesWordOffCountry(): void {
  const header = headerIn(frameAlone(ds));
  expect(header).toContain(`<summary class="tap-min">${COUNTRIES}</summary>`);
  expect(header).not.toContain("<details open");
  // The four are in the list, and the row itself holds four items.
  for (const link of countryLinks(ds)) expect(header).toContain(`href="${url(link.path)}"`);
  // The row's own items: the disclosure's word, and the links beside it. The
  // four countries live INSIDE the disclosure and are not items of the row.
  const row = [...header.replace(/<div class="list">[\s\S]*?<\/div>/, "")
    .matchAll(/<(?:summary|a) class="tap-min[^"]*"[^>]*>([^<]*)</g)].map((m) => m[1]);
  expect(row.slice(0, 4)).toEqual([COUNTRIES, CHECK_YOURS, THE_DATA, FEEDBACK]);
}

/** Checks France's page shows France as the word and marks its row, and only that one. */
function expectCountryWordOnItsPage(): void {
  const france = countryLinks(ds).find((l) => l.name === "France")!;
  const header = headerIn(frameAlone(ds, { place: { countryPath: france.path, current: "page" } }));
  expect(header).toContain(`<summary class="tap-min">France</summary>`);
  expect(header).toContain(`href="${url(france.path)}" aria-current="page"`);
  // And only that one.
  expect([...header.matchAll(/aria-current="([^"]*)"/g)].map((m) => m[1])).toEqual(["page"]);
}

/** Checks the phone menu shows the Countries heading, then the three links after the last country. */
function expectPhoneMenuGroupsCountries(): void {
  const header = headerIn(frameAlone(ds));
  // The heading is markup the phone shows and the desktop hides: one nav,
  // one set of links, no second copy of a country name anywhere.
  expect(header).toContain(`<span class="group">${COUNTRIES}</span>`);
  const order = [...header.matchAll(/<(?:span class="group"|summary|a)[^>]*>([^<]+)</g)].map((m) => m[1]);
  const after = order.slice(order.lastIndexOf("Netherlands") + 1);
  expect(after).toEqual([CHECK_YOURS, THE_DATA, FEEDBACK]);
}

/** Checks no inline script names a country, and the menu and copy scripts store, name and send nothing. */
function expectScriptsNameAndRememberNothing(): void {
  for (const script of [interviewFrameAlone(ds).menuScript, FIRST_PAINT_SCRIPT, COPY_SCRIPT])
    for (const link of countryLinks(ds))
      expect(script.includes(link.name), `an inline script names ${link.name}`).toBe(false);
  // The disclosure is not remembered: no storage key mentions it, and the
  // menu script writes nothing at all. The copy script likewise — and it
  // names no address either: the text it copies is the page's, read at the
  // click, and its "done" word is the button's own attribute.
  for (const script of [interviewFrameAlone(ds).menuScript, COPY_SCRIPT]) {
    expect(script).not.toContain("localStorage");
    expect(script).not.toContain("sessionStorage");
    expect(script).not.toContain("cookie");
  }
  expect(COPY_SCRIPT.includes("@"), "the copy script names an address").toBe(false);
  expect(COPY_SCRIPT.includes(COPIED), "the copy script names the done word").toBe(false);
  expect(COPY_SCRIPT.includes("fetch("), "the copy script sends something").toBe(false);
}

describe("the header: four countries under one word", () => {
  it("on a page that belongs to no country the word is Countries, and the list is closed",
    () => expectCountriesWordOffCountry());

  it("on a country's page the word is that country, and its row is marked", () => expectCountryWordOnItsPage());

  it("on /feedback/ the word Feedback is the marked item", () => {
    const header = headerOf(page.html);
    expect(header).toContain(`href="${url(FEEDBACK_PATH)}" aria-current="page">${FEEDBACK}</a>`);
    expect(header).toContain(`<summary class="tap-min">${COUNTRIES}</summary>`);
  });

  it("the phone menu groups the four under a small Countries heading, then the three",
    () => expectPhoneMenuGroupsCountries());

  it("no country name enters any inline script, and the scripts remember nothing",
    () => expectScriptsNameAndRememberNothing());
});

describe("the footer's Feedback column", () => {
  const footer = footerIn(frameAlone(ds));

  it("is exactly two rows: the page, then the sponsorship", () => {
    // The address was a third row for a day; the human took it out on the
    // walk ("kaldir", 2026-09-16). It lives on /feedback/ only.
    const column = /<h3>Feedback<\/h3>\s*<ul>([\s\S]*?)<\/ul>/.exec(footer)?.[1] ?? "";
    expect(column, "no Feedback column").not.toBe("");
    const rows = [...column.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]!.trim());
    expect(rows.length, `the column has ${rows.length} rows`).toBe(2);
    expect(rows[0]).toBe(`<a class="tap-min" href="${url(FEEDBACK_PATH)}">${FEEDBACK_FOOTER_ROW}</a>`);
    expect(rows[1]).toContain(`href="${SPONSOR_URL}"`);
    expect(rows[1]).toContain('target="_blank" rel="noopener"');
    expect(footer.includes("mailto:"), "the footer links a mail address").toBe(false);
    expect(footer.replace(/<[^>]*>/g, "").includes("@"), "the footer prints a mail address").toBe(false);
  });

  it("the tracker's two links have left it — they live on the page, named", () => {
    expect(footer).not.toContain(TRACKER_URL);
    expect(footer).not.toContain(NEW_NEED_URL);
    expect(page.html).toContain(TRACKER_URL);
    expect(page.html).toContain(NEW_NEED_URL);
  });
});

describe("the map and the sitemap", () => {
  it("the sitemap invites a crawler to the page", () => {
    expect(sitemapXml(ds)).toContain(`<loc>${absolute(FEEDBACK_PATH)}</loc>`);
    expect(indexedPaths(ds)).toContain(FEEDBACK_PATH);
  });

  it("the site map's graph has the page as a node, with ways in and ways out", () => {
    // The decision, read off the mermaid graph rather than off the prose: a
    // node whose label names /feedback/, at least two edges into it (the
    // header and the footer are two; the results line is a third) and at
    // least one out of it (the mail app, the tracker). Words in a paragraph
    // could say all of that and draw none of it.
    const map = read("docs/roadkeeper/design/site-map.md");
    const graph = /```mermaid\n([\s\S]*?)```/.exec(map)?.[1] ?? "";
    const nodes = new Map([...graph.matchAll(/^\s*(\w+)\["([^"]*)"\]\s*$/gm)].map((m) => [m[1]!, m[2]!]));
    const node = [...nodes].find(([, label]) => label.includes("/feedback"))?.[0];
    expect(node, "no node on the map names /feedback").toBeDefined();
    const edges = [...graph.matchAll(/^\s*(\w+)\s*-->(?:\|"[^"]*"\|)?\s*(\w+)\s*$/gm)]
      .map((m) => ({ from: m[1]!, to: m[2]! }));
    expect(edges.filter((e) => e.to === node).length, "fewer than two ways in").toBeGreaterThanOrEqual(2);
    expect(edges.filter((e) => e.from === node).length, "no way out").toBeGreaterThanOrEqual(1);
  });

  it("it is reachable from the header on every built page, not only from a footer", () => {
    expect(headerIn(frameAlone(ds))).toContain(`href="${url(FEEDBACK_PATH)}"`);
  });
});

/** The line under the verdict, and where it may never appear. */
describe("the results line", () => {
  it("is built from the copy module", () => {
    // The words live in the copy module and the verdict takes them from
    // there, on both layouts, with the one link and nothing else. Where the
    // line sits, and what it says, the browser cases (s13-feedback-walk) read
    // off the screen.
    const line = resultFeedbackLine(`<a href="${escAttr(url(FEEDBACK_PATH))}">${esc(FEEDBACK)}</a>`);
    for (const record of [frRecord, allRecord])
      expect(verdictHtml(verdictFor(record))).toContain(line);
  });

  it.skipIf(noBuild !== null)("is nowhere in the built first paint: a cold / is a question, not a result", () => {
    const built = readFileSync(`${dist}/index.html`, "utf8");
    const main = /<main id="main">([\s\S]*?)<\/main>/.exec(built)?.[1] ?? "";
    expect(main, "the cold first paint offers the feedback line").not.toContain(url(FEEDBACK_PATH));
    expect(main).not.toContain(RESULT_FEEDBACK_ASK);
  });
});

describe("the results line, from the verdict", () => {
  for (const [name, profile, , sections] of LAYOUTS)
    it(`the line is under the strip on the ${name} layout, and its link is the page`, () => {
      const verdict = verdictFor(profile);
      // The layout this case is named for is the one the verdict composes.
      const drawn = verdict.layout.kind === "countries" ? verdict.layout.sections.length : 0;
      expect(drawn, `${name}: ${drawn} country sections`).toBe(sections);
      // The line is the last thing in the body, after the last section and
      // after the last country's details; the sentence is the copy's, whole,
      // full stop included: the question and the one word that answers it,
      // the word a link to the page.
      const body = verdictHtml(verdict);
      const link = `<a href="${escAttr(url(FEEDBACK_PATH))}">${esc(FEEDBACK)}</a>`;
      expect(body.trimEnd().endsWith(`<p class="say">${resultFeedbackLine(link)}</p>`), "the line is not the last thing in the results body")
        .toBe(true);
      expect(resultFeedbackLine(FEEDBACK)).toBe(`${RESULT_FEEDBACK_ASK} ${FEEDBACK}.`);
      // No mailto: inside the results body: the door in it is a link to a page.
      expect(body, "a mailto: inside the results body").not.toContain("mailto:");
    });
});
