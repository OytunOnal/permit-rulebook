import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import {
  COPIED, COPY_ADDRESS_LABEL, COUNTRIES, FEEDBACK, FEEDBACK_DOORS, FEEDBACK_EYEBROW, FEEDBACK_FOOTER_ROW,
  FEEDBACK_GITHUB_HEADING, FEEDBACK_GITHUB_LINE, FEEDBACK_LEDE, FEEDBACK_NOTE, FEEDBACK_OWN_APP,
  FEEDBACK_OWN_APP_LEAD,
  RESULT_FEEDBACK_ASK, TRACKER_NEW_NEED, TRACKER_WRONG_VALUE,
  feedbackTemplateLine, resultFeedbackLine,
} from "../src/lib/copy.js";
import {
  FEEDBACK_ADDRESS, GMAIL_COMPOSE_URL, NEW_NEED_URL, SPONSOR_URL, TRACKER_URL, absolute, url,
} from "../src/lib/site.js";
import { FEEDBACK_PATH, MENU_SCRIPT, siteFooter, siteHeader } from "../src/lib/identity.js";
import { FIRST_PAINT_SCRIPT } from "../src/lib/first-paint.js";
import { COPY_SCRIPT } from "../src/lib/clipboard.js";
import { feedbackGmail, feedbackMailto, feedbackPage } from "../src/lib/feedback-page.js";
import { countryLinks, footerFacts, navCountries } from "../src/lib/country-page.js";
import { indexedPaths, sitemapXml } from "../src/lib/sitemap.js";
import { serialize } from "../src/lib/record.js";
import type { Dataset, Profile } from "permit-rulebook-data";

/**
 * s13 — the feedback door.
 *
 * A reader may want to say something without anything being wrong, and the only
 * door the product had needed a GitHub account (site #7) on a tracker whose
 * blank issues are switched off. The door becomes an address, and it moves to
 * where it can be seen: one word, *Feedback*, in the header, under the verdict
 * and in the footer, all leading to `/feedback/`.
 *
 * The bound this slice exists to keep is the one in point 2 of the scenario:
 * the mail carries nothing the reader declared. It holds here by construction —
 * every `mailto:` is a function of the copy and one address, and of nothing
 * else — and the cases below assert the construction, not the care.
 */

const ds = dataset as unknown as Dataset;
const dist = fileURLToPath(new URL("../dist", import.meta.url));
const root = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const read = (p: string): string => readFileSync(root(p), "utf8").split("\r\n").join("\n");

const page = feedbackPage(ds);
/**
 * Every `mailto:` the page emits, in the order it emits them and in the form a
 * browser hands back from `getAttribute` — an `&` between two parameters is
 * `&amp;` in the attribute and an `&` to everything that reads it.
 */
const mailtos = (html: string): string[] =>
  [...html.matchAll(/href="(mailto:[^"]*)"/g)].map((m) => m[1]!.split("&amp;").join("&"));
/** And every Gmail link, the same way. */
const gmails = (html: string): string[] =>
  [...html.matchAll(/href="(https:\/\/mail\.google\.com\/[^"]*)"/g)].map((m) => m[1]!.split("&amp;").join("&"));

describe("the page, and the three doors on it", () => {
  it("is a built page at /feedback/, in the words copy.ts holds", () => {
    expect(page.path).toBe(FEEDBACK_PATH);
    // Each of the page's own sentences is the copy's, to the character: the
    // eyebrow, the h1, the lede and the note are read back from the markup
    // that carries them, not merely searched for (Standards review, s13).
    expect(/<p class="label">([^<]*)<\/p>/.exec(page.html)?.[1]).toBe(FEEDBACK_EYEBROW);
    expect(/<h1>([^<]*)<\/h1>/.exec(page.html)?.[1]).toBe(FEEDBACK);
    expect(/<p class="lede">([^<]*)<\/p>/.exec(page.html)?.[1]).toBe(FEEDBACK_LEDE);
    expect(/<p class="note">([^<]*)<\/p>/.exec(page.html)?.[1]).toBe(FEEDBACK_NOTE);
  });

  it("offers the three doors in order, each with its own heading, line and button", () => {
    expect(FEEDBACK_DOORS.map((d) => d.heading))
      .toEqual(["Something is wrong", "Something is missing", "Anything else"]);
    let at = -1;
    for (const door of FEEDBACK_DOORS) {
      const here = page.html.indexOf(door.heading);
      expect(here, `${door.heading} is not on the page`).toBeGreaterThan(at);
      at = here;
      expect(page.html).toContain(door.line);
      expect(page.html).toContain(`>${door.button}</a>`);
      // What the mail will carry, said under the button — derived from the
      // door, so the line and the link cannot disagree.
      expect(page.html).toContain(feedbackTemplateLine(door));
    }
  });

  it("each door's button opens Gmail, new tab, with the exact subject and body headings", () => {
    // The button's link since the human's walk (2026-09-16): every mailto:
    // opened nothing on their desktop. Same address, same subject, same
    // headings, in Gmail's query.
    const wanted = FEEDBACK_DOORS.map(feedbackGmail);
    expect(gmails(page.html)).toEqual(wanted);
    const body = (lines: string) => encodeURIComponent(lines);
    expect(wanted[0]).toBe(
      `${GMAIL_COMPOSE_URL}?view=cm&fs=1&to=${encodeURIComponent(FEEDBACK_ADDRESS)}&su=Wrong%20information&body=${
        body("Page:\nWhat it says:\nWhat the source says:\nWhere (link):")}`,
    );
    expect(wanted[1]).toBe(
      `${GMAIL_COMPOSE_URL}?view=cm&fs=1&to=${encodeURIComponent(FEEDBACK_ADDRESS)}&su=Missing&body=${
        body("What:\nWhere you looked for it:")}`,
    );
    expect(wanted[2]).toBe(`${GMAIL_COMPOSE_URL}?view=cm&fs=1&to=${encodeURIComponent(FEEDBACK_ADDRESS)}&su=Feedback`);
    // Each button is the door's own, in order, and leaves the site the way
    // every outbound link does.
    for (const [i, door] of FEEDBACK_DOORS.entries()) {
      const tag = `<a class="act out tap-min" href="${wanted[i]!.split("&").join("&amp;")
        }" target="_blank" rel="noopener">${door.button}</a>`;
      expect(page.html, `${door.heading}: the button is not the Gmail link`).toContain(tag);
    }
  });

  it("under each button, one small line opens the same mail in the reader's own app", () => {
    const wanted = FEEDBACK_DOORS.map(feedbackMailto);
    expect(mailtos(page.html).slice(0, 3)).toEqual(wanted);
    expect(wanted[0]).toBe(
      `mailto:${FEEDBACK_ADDRESS}?subject=Wrong%20information&body=${
        encodeURIComponent("Page:\nWhat it says:\nWhat the source says:\nWhere (link):")}`,
    );
    expect(wanted[1]).toBe(
      `mailto:${FEEDBACK_ADDRESS}?subject=Missing&body=${
        encodeURIComponent("What:\nWhere you looked for it:")}`,
    );
    // A note of any length opens on a blank sheet: a subject and nothing else.
    expect(wanted[2]).toBe(`mailto:${FEEDBACK_ADDRESS}?subject=Feedback`);
    // The line's words are the copy's, and the link is the whole of the rest.
    for (const [i] of FEEDBACK_DOORS.entries()) {
      const own = `<p class="own">${FEEDBACK_OWN_APP_LEAD} <a class="tap" href="${
        wanted[i]!.split("&").join("&amp;")}">${FEEDBACK_OWN_APP}</a></p>`;
      expect(page.html, `door ${i + 1}: no own-app line`).toContain(own);
    }
    // Each door: the button, then the line, then the template — in that order.
    for (const [i, door] of FEEDBACK_DOORS.entries()) {
      const at = page.html.indexOf(door.heading);
      const button = page.html.indexOf(`>${door.button}</a>`, at);
      const line = page.html.indexOf(FEEDBACK_OWN_APP, at);
      const tmpl = page.html.indexOf(feedbackTemplateLine(door), at);
      expect(button > at && line > button && tmpl > line, `${door.heading}: button ${button}, line ${line}, template ${tmpl}`).toBe(true);
    }
  });

  it("prints the address on a line of its own, as a button that copies itself, with a copy glyph", () => {
    // Not a link any more: as a mailto: it opened nothing on the human's
    // desktop (2026-09-16). The address is the button; the glyph beside it is
    // decorative; the accessible name is the copy's; the "done" word rides on
    // the button as data-done so the script names no string; and no visible
    // "Copy" word is on the page at all.
    const line = /<p class="addr">([\s\S]*?)<\/p>/.exec(page.html)?.[1] ?? "";
    expect(line, "no address line").not.toBe("");
    const button = /<button[^>]*>([\s\S]*?)<\/button>/.exec(line);
    expect(button, "no button on the address line").toBeTruthy();
    const [tag, inside] = [button![0].slice(0, button![0].indexOf(">") + 1), button![1]!];
    expect(tag).toContain('type="button"');
    expect(tag).toContain('data-copy');
    expect(tag).toContain('aria-controls="feedback-address"');
    expect(tag).toContain(`data-done="${COPIED}"`);
    expect(tag).toContain(`aria-label="${COPY_ADDRESS_LABEL}"`);
    expect(inside.startsWith(`<span class="address" id="feedback-address">${FEEDBACK_ADDRESS}</span>`)).toBe(true);
    expect(inside).toMatch(/<svg [^>]*aria-hidden="true"[^>]*>[\s\S]*<\/svg>$/);
    expect((inside.match(/<rect /g) ?? []).length, "the glyph is two rectangles").toBe(2);
    // The word's place, empty at rest, right after the button.
    expect(line.endsWith('</button><span class="done" aria-live="polite"></span>')).toBe(true);
    expect(line.includes("mailto:"), "the address line is a link").toBe(false);
    // What a reader sees: the markup without its stylesheet and scripts.
    const seen = page.html.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/g, " ").replace(/<[^>]*>/g, " ");
    expect(seen.match(/\bCopy\b/), "a visible Copy word").toBeNull();
    // The page's mailto: links are the three doors' second links, and no other.
    expect(mailtos(page.html)).toEqual(FEEDBACK_DOORS.map(feedbackMailto));
    // And the page runs the script that makes the button work.
    expect(page.html).toContain(`<script>${COPY_SCRIPT}</script>`);
  });

  it("every control on it claims a tap rule written in --tap-min, as on every other page", () => {
    // The rule route-page.test.ts and site-index.test.ts hold every other
    // built page to: a control's height is a token, and the class says so.
    for (const m of page.html.matchAll(/<(?:a|button)\b([^>]*)>/g)) {
      const classes = (/class="([^"]*)"/.exec(m[1]!)?.[1] ?? "").split(/\s+/).filter(Boolean);
      expect(classes.filter((c) => c === "tap" || c === "tap-min").length, `<a ${m[1]}>`).toBe(1);
    }
  });

  it("says what happens to a mail, once", () => {
    const text = page.html.replace(/<[^>]*>/g, " ").split(/\s+/).join(" ");
    expect(text.split(FEEDBACK_NOTE).length - 1, "the note is said more than once").toBe(1);
  });

  it("puts the tracker beneath, under its own heading, leaving the site", () => {
    const at = page.html.indexOf(FEEDBACK_GITHUB_HEADING);
    expect(at, "the GitHub heading is missing").toBeGreaterThan(page.html.indexOf(FEEDBACK_NOTE.slice(0, 30)));
    expect(page.html).toContain(FEEDBACK_GITHUB_LINE);
    for (const [href, label] of [[TRACKER_URL, TRACKER_WRONG_VALUE], [NEW_NEED_URL, TRACKER_NEW_NEED]] as const) {
      const tag = new RegExp(`<a[^>]*href="${href.replace(/[?.]/g, "\\$&")}"[^>]*>${label}</a>`);
      expect(page.html, `${label} does not link the tracker`).toMatch(tag);
    }
    // Every link that leaves the site — the tracker's two, and each door's
    // Gmail button — opens a new tab, cannot reach back, and says it leaves.
    for (const tag of [...page.html.matchAll(/<a [^>]*href="https?:[^"]*"[^>]*>/g)].map((m) => m[0])) {
      expect(tag, tag).toContain('target="_blank"');
      expect(tag, tag).toContain('rel="noopener"');
      expect(tag, tag).toMatch(/class="[^"]*\bout\b/);
    }
  });
});

/**
 * Point 2 of the scenario, which is the promise the whole slice turns on.
 * `record.test.ts` holds the other half: answers never leave the device.
 */
describe("the mail carries nothing the reader declared", () => {
  it("a mailto is a function of the copy and the address, and of nothing else", () => {
    for (const door of FEEDBACK_DOORS) {
      const href = feedbackMailto(door);
      // Built twice, identical: there is no state it could read.
      expect(feedbackMailto(door)).toBe(href);
      expect(href.startsWith(`mailto:${FEEDBACK_ADDRESS}?subject=`)).toBe(true);
      const params = new URL(href).search;
      const keys = [...new URLSearchParams(params.slice(1)).keys()];
      expect(keys.every((k) => k === "subject" || k === "body"), keys.join(",")).toBe(true);
      const decoded = decodeURIComponent(href);
      expect(decoded).toContain(door.subject);
      for (const heading of door.body) expect(decoded).toContain(heading);
    }
  });

  it("and so is the Gmail link: one origin, five query keys, the copy's values", () => {
    for (const door of FEEDBACK_DOORS) {
      const href = feedbackGmail(door);
      expect(feedbackGmail(door)).toBe(href);
      const parsed = new URL(href);
      // Exactly Google's mail origin — not a look-alike, not a redirector.
      expect(parsed.origin).toBe("https://mail.google.com");
      expect(`${parsed.origin}${parsed.pathname}`).toBe(GMAIL_COMPOSE_URL);
      const q = parsed.searchParams;
      const keys = [...q.keys()];
      expect(keys.every((k) => ["view", "fs", "to", "su", "body"].includes(k)), keys.join(",")).toBe(true);
      expect(new Set(keys).size, "a key is repeated").toBe(keys.length);
      expect(q.get("view")).toBe("cm");
      expect(q.get("fs")).toBe("1");
      expect(q.get("to")).toBe(FEEDBACK_ADDRESS);
      expect(q.get("su")).toBe(door.subject);
      // The headings, one per line, and nothing when the door has none.
      expect(q.get("body")).toBe(door.body.length ? door.body.join("\n") : null);
    }
  });

  it("no mailto or Gmail link on the page names a country, a route or a field the interview asks", () => {
    const fields = new Set(ds.countries.flatMap((c) => c.routes.map((r) => r.id)));
    expect(gmails(page.html).length, "no Gmail links on the page").toBe(FEEDBACK_DOORS.length);
    for (const href of [...mailtos(page.html), ...gmails(page.html)]) {
      const decoded = decodeURIComponent(href).toLowerCase();
      for (const link of countryLinks(ds))
        expect(decoded.includes(link.name.toLowerCase()), `${href} names ${link.name}`).toBe(false);
      for (const id of fields)
        expect(decoded.includes(id.toLowerCase()), `${href} names ${id}`).toBe(false);
      expect(decoded.includes("?route="), href).toBe(false);
      expect(decoded.includes("?country="), href).toBe(false);
    }
  });

  it("nothing on the page is remembered, and nothing is sent", () => {
    for (const word of ["localStorage", "sessionStorage", "document.cookie", "fetch(", "XMLHttpRequest", "<form"])
      expect(page.html.includes(word), `/feedback/ carries ${word}`).toBe(false);
  });
});

describe("the header: four countries under one word", () => {
  const headerOf = (html: string): string => {
    const start = html.indexOf('<header class="site-head">');
    return start < 0 ? "" : html.slice(start, html.indexOf("</header>", start));
  };

  it("on a page that belongs to no country the word is Countries, and the list is closed", () => {
    const header = siteHeader(navCountries(ds));
    expect(header).toContain(`<summary class="tap-min">${COUNTRIES}</summary>`);
    expect(header).not.toContain("<details open");
    // The four are in the list, and the row itself holds four items.
    for (const link of countryLinks(ds)) expect(header).toContain(`href="${url(link.path)}"`);
    // The row's own items: the disclosure's word, and the links beside it. The
    // four countries live INSIDE the disclosure and are not items of the row.
    const row = [...header.replace(/<div class="list">[\s\S]*?<\/div>/, "")
      .matchAll(/<(?:summary|a) class="tap-min[^"]*"[^>]*>([^<]*)</g)].map((m) => m[1]);
    expect(row.slice(0, 4)).toEqual([COUNTRIES, "Check yours", "The data", FEEDBACK]);
  });

  it("on a country's page the word is that country, and its row is marked", () => {
    const france = countryLinks(ds).find((l) => l.name === "France")!;
    const header = siteHeader(navCountries(ds), { countryPath: france.path, current: "page" });
    expect(header).toContain(`<summary class="tap-min">France</summary>`);
    expect(header).toContain(`href="${url(france.path)}" aria-current="page"`);
    // And only that one.
    expect([...header.matchAll(/aria-current="([^"]*)"/g)].map((m) => m[1])).toEqual(["page"]);
  });

  it("on /feedback/ the word Feedback is the marked item", () => {
    const header = headerOf(page.html);
    expect(header).toContain(`href="${url(FEEDBACK_PATH)}" aria-current="page">${FEEDBACK}</a>`);
    expect(header).toContain(`<summary class="tap-min">${COUNTRIES}</summary>`);
  });

  it("the phone menu groups the four under a small Countries heading, then the three", () => {
    const header = siteHeader(navCountries(ds));
    // The heading is markup the phone shows and the desktop hides: one nav,
    // one set of links, no second copy of a country name anywhere.
    expect(header).toContain(`<span class="group">${COUNTRIES}</span>`);
    const order = [...header.matchAll(/<(?:span class="group"|summary|a)[^>]*>([^<]+)</g)].map((m) => m[1]);
    const after = order.slice(order.lastIndexOf("Netherlands") + 1);
    expect(after).toEqual(["Check yours", "The data", FEEDBACK]);
  });

  it("no country name enters any inline script, and the scripts remember nothing", () => {
    for (const script of [MENU_SCRIPT, FIRST_PAINT_SCRIPT, COPY_SCRIPT])
      for (const link of countryLinks(ds))
        expect(script.includes(link.name), `an inline script names ${link.name}`).toBe(false);
    // The disclosure is not remembered: no storage key mentions it, and the
    // menu script writes nothing at all. The copy script likewise — and it
    // names no address either: the text it copies is the page's, read at the
    // click, and its "done" word is the button's own attribute.
    for (const script of [MENU_SCRIPT, COPY_SCRIPT]) {
      expect(script).not.toContain("localStorage");
      expect(script).not.toContain("sessionStorage");
      expect(script).not.toContain("cookie");
    }
    expect(COPY_SCRIPT.includes("@"), "the copy script names an address").toBe(false);
    expect(COPY_SCRIPT.includes(COPIED), "the copy script names the done word").toBe(false);
    expect(COPY_SCRIPT.includes("fetch("), "the copy script sends something").toBe(false);
  });
});

describe("the footer's Feedback column", () => {
  const footer = siteFooter(navCountries(ds), footerFacts(ds));

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
    const map = read("docs/spine/design/site-map.md");
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
    expect(siteHeader(navCountries(ds))).toContain(`href="${url(FEEDBACK_PATH)}"`);
  });
});

/** The line under the verdict, and where it may never appear. */
describe("the results line", () => {
  it("is built from copy.ts", () => {
    // The one source assertion this suite makes: the words live in copy.ts and
    // the template takes them from there. Where the line sits, and what it
    // says, the browser cases below read off the screen.
    expect(read("src/pages/index.astro")).toContain("resultFeedbackLine(");
  });

  it("is nowhere in the built first paint: a cold / is a question, not a result", () => {
    if (!existsSync(`${dist}/index.html`)) return;
    const built = readFileSync(`${dist}/index.html`, "utf8");
    const main = /<main id="main">([\s\S]*?)<\/main>/.exec(built)?.[1] ?? "";
    expect(main, "the cold first paint offers the feedback line").not.toContain(url(FEEDBACK_PATH));
    expect(main).not.toContain(RESULT_FEEDBACK_ASK);
  });
});

/**
 * The two seeds the browser cases below walk with, each ANSWERED THROUGH: a
 * record with a question still open is a question screen, and the line under
 * the verdict is the results screen's own.
 *
 * `frRecord` is already where the arrival points, which is the only way a
 * `?country=` arrival reaches a results screen at all — naming a country
 * re-scopes a record for another one, and a re-scoped record has the new
 * country's questions still to answer ("arriving where the record already is
 * changes nothing at all", arrival.test.ts). That is also why the four-country
 * layout below is not reached through an arrival: an arrival names ONE country
 * and a screen scoped to one country is the flat layout by definition.
 */
const frRecord: Profile = {
  destination: "fr", situation: "offer", qualification: "none", experience: "lt2",
  fr_innovative_employer: "yes", citizenship: "AF", salary_eur_year: "band_0",
};
const allRecord: Profile = {
  destination: "all", situation: "offer", situation_country: "de", qualification: "none",
  occupation_it: "yes", citizenship: "AF", experience: "lt2", salary_eur_year: "band_0",
  nl_recent_grad: "yes",
};
const seed = (profile: Profile): string =>
  `localStorage.setItem("permit-rulebook.record.v1", ${
    JSON.stringify(serialize(profile, Object.keys(profile)))})`;

const { chromePath } = await import("../scripts/chrome.mjs");
const { serve, withBrowser } = await import("../scripts/browser.mjs");

function why(): string | null {
  try { chromePath(); } catch (e) { return (e as Error).message; }
  if (!existsSync(dist)) return "no dist/ — run npm run build first";
  return null;
}
const skipped = why();
if (skipped)
  process.stderr.write([
    "",
    `  !! THE FEEDBACK DOOR WAS NOT WALKED IN A BROWSER: ${skipped}.`,
    "     Run: npm run build && npm test",
    "",
    "",
  ].join(String.fromCharCode(10)));

interface BrowserPage {
  goto(url: string, settleMs?: number): Promise<void>;
  evaluate(expression: string): Promise<string>;
}

/** What the results screen says about feedback, and what it carries. */
const SAY = 'JSON.stringify((() => {'
  + ' const main = document.getElementById("main");'
  + ' const say = main.querySelector(".say");'
  + ' const link = say && say.querySelector("a");'
  + ' return { present: !!say,'
  // The end of the body: both layouts write it last into main, after the
  // last section and after the last country's details.
  + '   isLast: !!(say && main.lastElementChild === say),'
  + '   text: say ? say.textContent.split(/\\s+/).join(" ").trim() : "",'
  + '   href: link ? link.getAttribute("href") : "",'
  + '   height: link ? Math.round(link.getBoundingClientRect().height) : 0,'
  + '   sections: main.querySelectorAll(".country-sec").length,'
  + '   mailtos: [...document.querySelectorAll("a[href^=\'mailto:\']")].map((a) => a.getAttribute("href")),'
  + '   mainMailtos: [...main.querySelectorAll("a[href^=\'mailto:\']")].map((a) => a.getAttribute("href")) };'
  + '})())';

describe.skipIf(skipped !== null)("the walk: a record, a results screen, the line", () => {
  for (const [name, profile, arrival, sections] of [
    // A saved record and an arrival that names the country it is already for:
    // the flat, one-country layout, which has no country sections at all.
    ["one country", frRecord, "/?country=fr", 0],
    // And the multi-country layout, which an arrival cannot produce: one
    // <details class="country-sec"> per country shown.
    ["four countries", allRecord, "/", 4],
  ] as const)
    it(`the line is under the strip on the ${name} layout, and its link is the page`, async () => {
      const server = await serve(dist);
      try {
        const seen = JSON.parse(await withBrowser(async (page_: BrowserPage) => {
          await page_.goto(server.url("/"), 500);
          await page_.evaluate(seed(profile));
          await page_.goto(server.url(arrival), 1600);
          return page_.evaluate(SAY);
        }, { viewport: { width: 1100, height: 1000 }, mobile: false }) as string) as {
          present: boolean; isLast: boolean; text: string; href: string;
          height: number; sections: number; mailtos: string[]; mainMailtos: string[];
        };

        // The layout this case is named for is the one that rendered.
        expect(seen.sections, `${name}: ${seen.sections} country sections`).toBe(sections);
        expect(seen.present, "no feedback line on the results screen").toBe(true);
        expect(seen.isLast, "the line is not the last thing in the results body").toBe(true);
        // The sentence is the copy's, whole, full stop included: the question
        // and the one word that answers it.
        expect(seen.text).toBe(resultFeedbackLine(FEEDBACK));
        expect(seen.text).toBe(`${RESULT_FEEDBACK_ASK} ${FEEDBACK}.`);
        expect(seen.href).toBe(url(FEEDBACK_PATH));
        expect(seen.height, `the link is ${seen.height} px`).toBeGreaterThanOrEqual(44);
        // No mailto: anywhere on a results screen: the door in the body is a
        // link to a page, and the footer stopped carrying the address on the
        // s13 walk. Nothing here could carry the record into a mail.
        expect(seen.mailtos, "a mailto: on the results screen").toEqual([]);
        expect(seen.mainMailtos, "a mailto: inside the results body").toEqual([]);
      } finally {
        server.close();
      }
    }, 180000);

  it("and on /feedback/ reached from that screen the hrefs are the constants, byte for byte", async () => {
    const server = await serve(dist);
    try {
      const seen = JSON.parse(await withBrowser(async (page_: BrowserPage) => {
        await page_.goto(server.url("/"), 500);
        await page_.evaluate(seed(frRecord));
        await page_.goto(server.url("/?country=fr"), 1600);
        await page_.evaluate('document.querySelector(".say a").click()');
        await new Promise((r) => setTimeout(r, 900));
        return page_.evaluate(
          'JSON.stringify({ path: location.pathname,'
          + ' mailtos: [...document.querySelectorAll("a[href^=\'mailto:\']")].map((a) => a.getAttribute("href")),'
          + ' gmails: [...document.querySelectorAll("a[href^=\'https://mail.google.com/\']")]'
          + '   .map((a) => a.getAttribute("href")),'
          + ' search: location.search })',
        );
      }, { viewport: { width: 1100, height: 1000 }, mobile: false }) as string) as
        { path: string; mailtos: string[]; gmails: string[]; search: string };

      expect(seen.path).toBe(url(FEEDBACK_PATH));
      // The line links the page and nothing else: no query travels with it.
      expect(seen.search, "the results line carried a query to /feedback/").toBe("");
      // Both links of every door, and every one of them the build-time
      // constant to the byte: a record on the device and a screen just left,
      // and nothing of either reached any of them. (Neither the footer nor the
      // address line links a mail now, so the doors are the whole list.)
      expect(seen.gmails).toEqual(FEEDBACK_DOORS.map(feedbackGmail));
      expect(seen.mailtos).toEqual(FEEDBACK_DOORS.map(feedbackMailto));
    } finally {
      server.close();
    }
  }, 180000);

  it("no question screen carries it", async () => {
    const server = await serve(dist);
    try {
      const seen = JSON.parse(await withBrowser(async (page_: BrowserPage) => {
        await page_.goto(server.url("/"), 900);
        const first = await page_.evaluate(SAY);
        // One answer in, still a question screen.
        await page_.evaluate('document.querySelector(".qcard .opt").click()');
        await new Promise((r) => setTimeout(r, 700));
        const second = await page_.evaluate(SAY);
        return JSON.stringify({ first: JSON.parse(first), second: JSON.parse(second) });
      }, { viewport: { width: 1100, height: 1000 }, mobile: false }) as string) as
        { first: { present: boolean }; second: { present: boolean } };

      expect(seen.first.present, "question one offers a line about a result").toBe(false);
      expect(seen.second.present, "question two offers a line about a result").toBe(false);
    } finally {
      server.close();
    }
  }, 180000);
});

/**
 * The header, measured rather than assumed (scenario point 9).
 *
 * The 2026-09-08 measurement warned that six items filled 94% of the row on
 * CI's fonts. The countries are under one word now and the row holds four
 * items — but "fewer items" is an argument, not a measurement, so the row is
 * measured with the generic stack forced, and the opened list is measured
 * against every other item's box.
 *
 * NOT at 761 px, though the scenario names that width. Below 960 px the header
 * folds behind Menu (identity.css, 2026-09-08: "the band between 761 and
 * 939 px had no state in the first revision of the mock"), so at 761 there is
 * no row to measure — every item's box is 0 by 0, and the first draft of this
 * case passed on exactly that. The row is measured at the narrowest width it
 * IS a row, 960 px, where the header's container is at its tightest; 761 is
 * asserted for what it actually is there, the folded header.
 */
const FALLBACK = '(() => { const s = document.createElement("style");'
  + ' s.textContent = ":root{--font-serif:serif;--font-sans:sans-serif;--font-mono:monospace}";'
  + ' document.head.appendChild(s); return "forced"; })()';

/** The row's own items: the disclosure's word and the three links beside it. */
const ROW = 'JSON.stringify((() => {'
  + ' const nav = document.querySelector(".site-head .nav");'
  + ' const items = [...nav.querySelectorAll(":scope > a, :scope > details > summary")];'
  + ' const box = (el) => { const r = el.getBoundingClientRect();'
  + '   return { text: el.textContent.trim(), left: Math.round(r.left), right: Math.round(r.right),'
  + '     top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width) }; };'
  + ' const head = document.querySelector(".site-head").getBoundingClientRect();'
  + ' const mark = document.querySelector(".site-head .wordmark").getBoundingClientRect();'
  + ' return { items: items.map(box), rows: new Set(items.map((el) =>'
  + '   Math.round(el.getBoundingClientRect().top))).size,'
  + '   have: Math.round(head.width),'
  + '   need: Math.round(mark.width + nav.getBoundingClientRect().width) }; })())';

/** The opened list's box, against every other item on the row. */
const OPEN_LIST = 'JSON.stringify((() => {'
  + ' const nav = document.querySelector(".site-head .nav");'
  + ' const d = nav.querySelector("details");'
  + ' const list = d.querySelector(".list").getBoundingClientRect();'
  + ' const box = (r) => [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)];'
  // The separator too: the list ran 45 px under it on the shortest word
  // before the disclosure was given its margin (the human's walk, 2026-09-16).
  + ' const hits = [...nav.querySelectorAll(":scope > a, :scope > .sep")].map((a) => {'
  + '   const r = a.getBoundingClientRect();'
  + '   const overlap = !(r.right <= list.left || r.left >= list.right'
  + '     || r.bottom <= list.top || r.top >= list.bottom);'
  + '   return { text: a.textContent.trim() || "separator", overlap, box: box(r) }; });'
  + ' const sep = nav.querySelector(":scope > .sep").getBoundingClientRect();'
  + ' return { open: d.open, word: d.querySelector("summary").textContent.trim(),'
  + '   summary: box(d.querySelector("summary").getBoundingClientRect()),'
  + '   list: box(list), clearance: Math.round(sep.left - list.right),'
  + '   hits }; })())';

/** What `OPEN_LIST` hands back. */
interface Opened {
  open: boolean; word: string; summary: number[]; list: number[]; clearance: number;
  hits: { text: string; overlap: boolean; box: number[] }[];
}

describe.skipIf(skipped !== null)("the header row, measured at the fold", () => {
  it("at 960 px holds its four items on one line with fonts this machine has never seen", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page_: BrowserPage) => {
        const at: Record<string, unknown> = {};
        for (const [name, path] of [
          ["interview", "/"], ["route", "/germany/eu-blue-card-general/"],
          ["country", "/germany/"], ["data", "/data/"], ["feedback", "/feedback/"],
        ] as const) {
          await page_.goto(server.url(path), 500);
          await page_.evaluate(FALLBACK);
          await new Promise((r) => setTimeout(r, 200));
          at[name] = JSON.parse(await page_.evaluate(ROW));
        }
        return at;
      }, { viewport: { width: 960, height: 900 }, mobile: false }) as Record<string, {
        items: { text: string; width: number }[]; rows: number; have: number; need: number;
      }>;

      for (const [name, row] of Object.entries(seen)) {
        expect(row.items.length, `${name}: ${row.items.map((i) => i.text).join(" | ")}`).toBe(4);
        // Every item drawn — a 0-wide item is a hidden one, and a hidden row
        // holds anything.
        for (const item of row.items) expect(item.width, `${name}: "${item.text}" is not drawn`).toBeGreaterThan(20);
        expect(row.rows, `${name}: the row wrapped onto ${row.rows} lines — ${
          row.items.map((i) => `${i.text} ${i.width}px`).join(", ")}`).toBe(1);
        // And room for a stack wider still than this machine's fallback — the
        // same 12% the 1100-px case in identity.test.ts asks for.
        const headroom = (row.have - row.need) / row.have;
        expect(headroom, `${name}: ${row.need} px of row in ${row.have} px — ${
          Math.round(headroom * 100)}% spare`).toBeGreaterThan(0.12);
      }
    } finally {
      server.close();
    }
  }, 180000);

  it("the opened list covers no other item on the row, and closes on Escape and on a tap outside", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page_: BrowserPage) => {
        // Every word the summary can be, because the list is centred on the
        // word and the shortest word overhangs the most: "Spain" ran 45 px
        // under the separator where "Netherlands" ran 15 (measured, 2026-09-16).
        const words: Record<string, unknown> = {};
        for (const path of ["/", ...countryLinks(ds).map((l) => `${l.path}/`)]) {
          await page_.goto(server.url(path), 500);
          await page_.evaluate(FALLBACK);
          await new Promise((r) => setTimeout(r, 200));
          await page_.evaluate('document.querySelector(".site-head .nav details > summary").click()');
          words[path] = JSON.parse(await page_.evaluate(OPEN_LIST));
        }
        await page_.goto(server.url("/germany/"), 500);
        await page_.evaluate(FALLBACK);
        await new Promise((r) => setTimeout(r, 200));
        await page_.evaluate('document.querySelector(".site-head .nav details > summary").click()');
        const opened = JSON.parse(await page_.evaluate(OPEN_LIST));
        await page_.evaluate(
          'document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))',
        );
        const escaped = JSON.parse(await page_.evaluate(OPEN_LIST));
        await page_.evaluate('document.querySelector(".site-head .nav details > summary").click()');
        const again = JSON.parse(await page_.evaluate(OPEN_LIST));
        await page_.evaluate('document.querySelector("h1").click()');
        const outside = JSON.parse(await page_.evaluate(OPEN_LIST));
        return { opened, escaped, again, outside, words };
      }, { viewport: { width: 960, height: 900 }, mobile: false }) as Record<string, {
        open: boolean; list: number[]; hits: { text: string; overlap: boolean; box: number[] }[];
      }> & { words: Record<string, Opened> };

      expect(seen.opened!.open, "the disclosure did not open").toBe(true);
      // The list is drawn, under the row: a box of zeros is a hidden list.
      expect(seen.opened!.list[3]! - seen.opened!.list[1]!, "the open list has no height").toBeGreaterThan(100);
      expect(seen.opened!.list[2]! - seen.opened!.list[0]!, "the open list has no width").toBeGreaterThan(100);
      for (const [path, at] of Object.entries(seen.words)) {
        expect(at.open, `${path}: the disclosure did not open`).toBe(true);
        // Not one item, and not the separator, under any part of the list.
        for (const hit of at.hits)
          expect(hit.overlap, `${path} (${at.word}): the open list ${at.list.join(",")} covers "${
            hit.text}" at ${hit.box.join(",")}`).toBe(false);
        // And clear of the separator by the margin the human asked for.
        expect(at.clearance, `${path} (${at.word}): the list ends ${at.clearance} px before the separator`)
          .toBeGreaterThanOrEqual(12);
      }
      expect(seen.escaped!.open, "Escape left the list open").toBe(false);
      expect(seen.again!.open, "the disclosure would not reopen").toBe(true);
      expect(seen.outside!.open, "a tap outside left the list open").toBe(false);
    } finally {
      server.close();
    }
  }, 180000);

  it("at 1240 px, where the human measured it, the list clears the separator on every word", async () => {
    const server = await serve(dist);
    try {
      const seen = await withBrowser(async (page_: BrowserPage) => {
        const words: Record<string, unknown> = {};
        for (const path of ["/", ...countryLinks(ds).map((l) => `${l.path}/`)]) {
          await page_.goto(server.url(path), 500);
          await page_.evaluate('document.querySelector(".site-head .nav details > summary").click()');
          words[path] = JSON.parse(await page_.evaluate(OPEN_LIST));
        }
        return words;
      }, { viewport: { width: 1240, height: 900 }, mobile: false }) as Record<string, Opened>;

      for (const [path, at] of Object.entries(seen)) {
        for (const hit of at.hits)
          expect(hit.overlap, `${path} (${at.word}): the open list ${at.list.join(",")} covers "${
            hit.text}" at ${hit.box.join(",")}`).toBe(false);
        expect(at.clearance, `${path} (${at.word}): the list ends ${at.clearance} px before the separator`)
          .toBeGreaterThanOrEqual(12);
      }
    } finally {
      server.close();
    }
  }, 180000);

  it("at 761 px the header is folded behind Menu, as it has been since 2026-09-08", async () => {
    const server = await serve(dist);
    try {
      const seen = JSON.parse(await withBrowser(async (page_: BrowserPage) => {
        await page_.goto(server.url("/"), 500);
        await page_.evaluate(FALLBACK);
        await new Promise((r) => setTimeout(r, 200));
        return page_.evaluate(
          'JSON.stringify({ menuShown: getComputedStyle(document.querySelector(".menu")).display !== "none",'
          + ' navShown: getComputedStyle(document.querySelector(".site-head .nav")).display !== "none",'
          + ' overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth })',
        );
      }, { viewport: { width: 761, height: 900 }, mobile: false }) as string) as
        { menuShown: boolean; navShown: boolean; overflow: number };
      expect(seen.menuShown, "no Menu control at 761").toBe(true);
      expect(seen.navShown, "the row is showing at 761, where it folds").toBe(false);
      expect(seen.overflow).toBeLessThanOrEqual(0);
    } finally {
      server.close();
    }
  }, 180000);

  it("at 390 the menu lists the four countries under their heading, then the three", async () => {
    const server = await serve(dist);
    try {
      const seen = JSON.parse(await withBrowser(async (page_: BrowserPage) => {
        await page_.goto(server.url("/france/"), 500);
        await page_.evaluate('document.querySelector(".menu").click()');
        await new Promise((r) => setTimeout(r, 250));
        return page_.evaluate(
          'JSON.stringify((() => {'
          + ' const nav = document.querySelector(".site-head .nav");'
          + ' const shown = (el) => el.getBoundingClientRect().height > 0;'
          + ' const group = nav.querySelector(".group");'
          + ' return { rows: [...nav.querySelectorAll("a")].filter(shown)'
          + '     .map((a) => a.textContent.trim()),'
          + '   heading: group && shown(group) ? group.textContent.trim() : "",'
          + '   summaryShown: shown(nav.querySelector("summary")),'
          + '   taps: [...nav.querySelectorAll("a")].filter(shown)'
          + '     .map((a) => Math.round(a.getBoundingClientRect().height)) }; })())',
        );
      }, { viewport: { width: 390, height: 844 }, mobile: true }) as string) as
        { rows: string[]; heading: string; summaryShown: boolean; taps: number[] };

      expect(seen.heading, "no Countries heading over the rows").toBe(COUNTRIES);
      // The country whose page this is does not become the heading: the phone's
      // heading is always the word (scenario point 4).
      expect(seen.summaryShown, "the disclosure's word is shown twice on the phone").toBe(false);
      expect(seen.rows).toEqual([
        ...countryLinks(ds).map((l) => l.name), "Check yours", "The data", FEEDBACK,
      ]);
      for (const [i, tap] of seen.taps.entries())
        expect(tap, `"${seen.rows[i]}" is ${tap} px`).toBeGreaterThanOrEqual(44);
    } finally {
      server.close();
    }
  }, 180000);
});

describe.skipIf(skipped !== null)("/feedback/ itself, at both widths", () => {
  it("the Copy button puts the address on the clipboard and says so for two seconds", async () => {
    const server = await serve(dist);
    try {
      const seen = JSON.parse(await withBrowser(async (page_: BrowserPage) => {
        await page_.goto(server.url("/feedback/"), 600);
        // Headless Chrome may refuse the clipboard: the write is stood in for
        // by a stub that records what it was handed, which is the fact under
        // test — the script hands the clipboard the page's address and nothing
        // else. The button's own words are read off the screen.
        await page_.evaluate(
          '(() => { window.__copied = []; Object.defineProperty(navigator, "clipboard", { value: {'
          + ' writeText: (t) => { window.__copied.push(t); return Promise.resolve(); } }, configurable: true });'
          + ' return 1; })()',
        );
        const button = 'document.querySelector(".addr button[data-copy]")';
        const word = 'document.querySelector(".addr .done")';
        // The word beside the address, at each moment. Two taps: the glyph's
        // own box, and the address text — both are the one button.
        const before = await page_.evaluate(`${word}.textContent`);
        await page_.evaluate(`${button}.querySelector("svg").dispatchEvent(new MouseEvent("click", { bubbles: true }))`);
        await new Promise((r) => setTimeout(r, 150));
        const afterIcon = await page_.evaluate(`${word}.textContent`);
        await new Promise((r) => setTimeout(r, 2200));
        const later = await page_.evaluate(`${word}.textContent`);
        await page_.evaluate('document.getElementById("feedback-address").dispatchEvent(new MouseEvent("click", { bubbles: true }))');
        await new Promise((r) => setTimeout(r, 150));
        const afterText = await page_.evaluate(`${word}.textContent`);
        return page_.evaluate(
          `JSON.stringify({ copied: window.__copied, before: ${JSON.stringify(before)},`
          + ` afterIcon: ${JSON.stringify(afterIcon)}, later: ${JSON.stringify(later)},`
          + ` afterText: ${JSON.stringify(afterText)},`
          + ` height: Math.round(${button}.getBoundingClientRect().height),`
          // Text-like, not a box; the glyph at the text's size; no visible word.
          + ` borderWidth: getComputedStyle(${button}).borderTopWidth,`
          + ` icon: Math.round(${button}.querySelector("svg").getBoundingClientRect().width),`
          + ` visible: ${button}.textContent.trim(),`
          + ' text: document.getElementById("feedback-address").textContent })',
        );
      }, { viewport: { width: 1000, height: 900 }, mobile: false }) as string) as {
        copied: string[]; before: string; afterIcon: string; later: string; afterText: string;
        height: number; borderWidth: string; icon: number; visible: string; text: string;
      };

      expect(seen.text).toBe(FEEDBACK_ADDRESS);
      // Both taps copied the address and nothing else.
      expect(seen.copied, "the clipboard was handed something other than the address")
        .toEqual([FEEDBACK_ADDRESS, FEEDBACK_ADDRESS]);
      expect(seen.before).toBe("");
      expect(seen.afterIcon, "the glyph did not say it had copied").toBe(COPIED);
      expect(seen.later, "the word did not clear").toBe("");
      expect(seen.afterText, "the address text did not say it had copied").toBe(COPIED);
      expect(seen.height, `the button is ${seen.height} px`).toBeGreaterThanOrEqual(44);
      expect(seen.borderWidth, "the address has a border").toBe("0px");
      expect(seen.icon, `the glyph is ${seen.icon} px`).toBeGreaterThanOrEqual(14);
      // The only visible text of the button is the address itself.
      expect(seen.visible).toBe(FEEDBACK_ADDRESS);
    } finally {
      server.close();
    }
  }, 180000);

  for (const [width, height, mobile] of [[390, 844, true], [1000, 900, false]] as const)
    it(`every button and link reaches the tap floor at ${width} px`, async () => {
      const server = await serve(dist);
      try {
        const seen = JSON.parse(await withBrowser(async (page_: BrowserPage) => {
          await page_.goto(server.url("/feedback/"), 600);
          return page_.evaluate(
            'JSON.stringify({ overflow: document.documentElement.scrollWidth'
            + ' - document.documentElement.clientWidth,'
            + ' targets: [...document.querySelectorAll("main a, main button")].map((el) => ({'
            + '   text: el.textContent.trim().slice(0, 40),'
            + '   height: Math.round(el.getBoundingClientRect().height) })) })',
          );
        }, { viewport: { width, height }, mobile }) as string) as
          { overflow: number; targets: { text: string; height: number }[] };

        expect(seen.targets.length, "the page has no doors on it").toBeGreaterThanOrEqual(6);
        for (const target of seen.targets)
          expect(target.height, `"${target.text}" is ${target.height} px at ${width}`)
            .toBeGreaterThanOrEqual(44);
        expect(seen.overflow, `/feedback/ scrolls sideways by ${seen.overflow} px at ${width}`)
          .toBeLessThanOrEqual(0);
      } finally {
        server.close();
      }
    }, 180000);
});
