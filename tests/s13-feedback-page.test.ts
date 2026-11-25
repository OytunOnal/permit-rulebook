import { describe, expect, it } from "vitest";
import {
  COPIED, COPY_ADDRESS_LABEL, FEEDBACK_DOORS, FEEDBACK_EYEBROW, FEEDBACK_GITHUB_HEADING, FEEDBACK_GITHUB_LINE,
  FEEDBACK_LEDE, FEEDBACK_NOTE, FEEDBACK_OWN_APP, FEEDBACK_OWN_APP_LEAD, TRACKER_NEW_NEED, TRACKER_WRONG_VALUE,
  feedbackTemplateLine,
} from "../src/lib/copy/feedback.js";
import { FEEDBACK } from "../src/lib/copy/frame.js";
import {
  FEEDBACK_ADDRESS, FEEDBACK_PATH, GMAIL_COMPOSE_URL, NEW_NEED_URL, TRACKER_URL,
} from "../src/lib/site.js";
import { COPY_SCRIPT } from "../src/lib/clipboard.js";
import { feedbackGmail, feedbackMailto } from "../src/lib/feedback-page.js";
import { countryLinks } from "../src/lib/slug.js";
import { ds, page } from "./s13-feedback-door.js";

/**
 * s13 — the feedback door: the page itself, and what its mail carries.
 *
 * A reader may want to say something without anything being wrong, and the only
 * door the product had needed a GitHub account (site #7) on a tracker whose
 * blank issues are switched off. The door becomes an address, and it moves to
 * where it can be seen: one word, *Feedback*, in the header, under the verdict
 * and in the footer, all leading to `/feedback/`.
 *
 * The bound this slice exists to keep: the mail carries nothing the reader
 * declared. It holds here by construction —
 * every `mailto:` is a function of the copy and one address, and of nothing
 * else — and the cases below assert the construction, not the care.
 */

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

/** Checks the page sits at /feedback/ and its own sentences are the copy's. */
function expectPageInCopyWords(): void {
  expect(page.path).toBe(FEEDBACK_PATH);
  // Each of the page's own sentences is the copy's, to the character: the
  // eyebrow, the h1, the lede and the note are read back from the markup
  // that carries them, not merely searched for (Standards review, s13).
  expect(/<p class="label">([^<]*)<\/p>/.exec(page.html)?.[1]).toBe(FEEDBACK_EYEBROW);
  expect(/<h1>([^<]*)<\/h1>/.exec(page.html)?.[1]).toBe(FEEDBACK);
  expect(/<p class="lede">([^<]*)<\/p>/.exec(page.html)?.[1]).toBe(FEEDBACK_LEDE);
  expect(/<p class="note">([^<]*)<\/p>/.exec(page.html)?.[1]).toBe(FEEDBACK_NOTE);
}

/** Checks the three doors come in order, each with its heading, line, button and template. */
function expectThreeDoorsInOrder(): void {
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
}

/** Checks each door's button is its exact Gmail link, opened in a new tab. */
function expectButtonsOpenGmail(): void {
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
}

/** Checks each door's own-app line is its exact mailto, after the button and before the template. */
function expectOwnAppLineUnderEachButton(): void {
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
  for (const door of FEEDBACK_DOORS) {
    const at = page.html.indexOf(door.heading);
    const button = page.html.indexOf(`>${door.button}</a>`, at);
    const line = page.html.indexOf(FEEDBACK_OWN_APP, at);
    const tmpl = page.html.indexOf(feedbackTemplateLine(door), at);
    expect(button > at && line > button && tmpl > line, `${door.heading}: button ${button}, line ${line}, template ${tmpl}`).toBe(true);
  }
}

/** Checks the address line is a copy button with a glyph, and no link and no visible Copy word. */
function expectAddressIsCopyButton(): void {
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
}

/** Checks every control on the page claims exactly one tap rule. */
function expectEveryControlClaimsTapRule(): void {
  // The rule route-page-frame.test.ts and site-index.test.ts hold every other
  // built page to: a control's height is a token, and the class says so.
  for (const m of page.html.matchAll(/<(?:a|button)\b([^>]*)>/g)) {
    const classes = (/class="([^"]*)"/.exec(m[1]!)?.[1] ?? "").split(/\s+/).filter(Boolean);
    expect(classes.filter((c) => c === "tap" || c === "tap-min").length, `<a ${m[1]}>`).toBe(1);
  }
}

/** Checks the tracker sits under its own heading after the note, and every outbound link leaves the site. */
function expectTrackerBeneathLeavingSite(): void {
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
}

describe("the page, and the three doors on it", () => {
  it("is a built page at /feedback/, in the words the copy module holds", () => expectPageInCopyWords());

  it("offers the three doors in order, each with its own heading, line and button", () => expectThreeDoorsInOrder());

  it("each door's button opens Gmail, new tab, with the exact subject and body headings", () => expectButtonsOpenGmail());

  it("under each button, one small line opens the same mail in the reader's own app",
    () => expectOwnAppLineUnderEachButton());

  it("prints the address on a line of its own, as a button that copies itself, with a copy glyph",
    () => expectAddressIsCopyButton());

  it("every control on it claims a tap rule written in --tap-min, as on every other page",
    () => expectEveryControlClaimsTapRule());

  it("says what happens to a mail, once", () => {
    const text = page.html.replace(/<[^>]*>/g, " ").split(/\s+/).join(" ");
    expect(text.split(FEEDBACK_NOTE).length - 1, "the note is said more than once").toBe(1);
  });

  it("puts the tracker beneath, under its own heading, leaving the site", () => expectTrackerBeneathLeavingSite());
});

/** Checks each door's mailto is the same twice and carries only the copy's subject and body. */
function expectMailtoIsCopyAndAddressOnly(): void {
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
}

/** Checks each door's Gmail link is Google's origin with the five keys, each the copy's value. */
function expectGmailIsCopyAndAddressOnly(): void {
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
}

/** Checks no mail link on the page names a country, a route id or an arrival query. */
function expectNoMailLinkNamesAnAnswer(): void {
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
}

/**
 * The promise the whole slice turns on.
 * `record.test.ts` holds the other half: answers never leave the device.
 */
describe("the mail carries nothing the reader declared", () => {
  it("a mailto is a function of the copy and the address, and of nothing else",
    () => expectMailtoIsCopyAndAddressOnly());

  it("and so is the Gmail link: one origin, five query keys, the copy's values",
    () => expectGmailIsCopyAndAddressOnly());

  it("no mailto or Gmail link on the page names a country, a route or a field the interview asks",
    () => expectNoMailLinkNamesAnAnswer());

  it("nothing on the page is remembered, and nothing is sent", () => {
    for (const word of ["localStorage", "sessionStorage", "document.cookie", "fetch(", "XMLHttpRequest", "<form"])
      expect(page.html.includes(word), `/feedback/ carries ${word}`).toBe(false);
  });
});
