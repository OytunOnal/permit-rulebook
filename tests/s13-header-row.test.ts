import { describe, expect, it } from "vitest";
import { CHECK_YOURS, COUNTRIES, FEEDBACK, THE_DATA } from "../src/lib/copy/frame.js";
import { WIDE_FROM_PX } from "../src/lib/first-paint.js";
import { countryLinks } from "../src/lib/slug.js";
import { withSite } from "./browser-walk.js";
import { FALLBACK_STACK } from "./fallback-stack.js";
import { ds, skipped, warnFeedbackDoorNotWalked } from "./s13-feedback-door.js";
import type { BrowserPage } from "../scripts/browser/browser.mjs";

/**
 * s13 — the feedback door: the header that carries the word *Feedback*,
 * measured rather than assumed.
 *
 * The 2026-09-08 measurement warned that six items filled 94% of the row on
 * CI's fonts. The countries are under one word now and the row holds four
 * items — but "fewer items" is an argument, not a measurement, so the row is
 * measured with the generic stack forced, and the opened list is measured
 * against every other item's box.
 *
 * NOT at 761 px, the width first named for it. Below 960 px the header
 * folds behind Menu, since the row is too wide to sit beside the wordmark
 * there even on the wide side, so at 761 there is no row to measure — every item's box is 0 by 0, and the first draft of this
 * case passed on exactly that. The row is measured at the narrowest width it
 * IS a row, 960 px, where the header's container is at its tightest; 761 is
 * asserted for what it actually is there, the folded header.
 */

const { PHONE } = await import("../scripts/browser/browser.mjs");

warnFeedbackDoorNotWalked();

/** In the page: the row's own items, the disclosure's word and the three links beside it, with how many rows they
 * stand on, and the width the header has and the wordmark and nav need, as JSON. */
function readRowInPage(): string {
  const nav = document.querySelector(".site-head .nav")!;
  const items = [...nav.querySelectorAll(":scope > a, :scope > details > summary")];
  const readItem = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { text: el.textContent!.trim(), left: Math.round(r.left), right: Math.round(r.right),
      top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width) };
  };
  const head = document.querySelector(".site-head")!.getBoundingClientRect();
  const mark = document.querySelector(".site-head .wordmark")!.getBoundingClientRect();
  return JSON.stringify({ items: items.map(readItem), rows: new Set(items.map((el) => Math.round(el.getBoundingClientRect().top))).size,
    have: Math.round(head.width), need: Math.round(mark.width + nav.getBoundingClientRect().width) });
}
/** The row's own items, read in the page. */
const ROW = `(${readRowInPage})()`;

/** In the page: the opened list's box, against every other item on the row, as JSON. */
function readOpenListInPage(): string {
  const nav = document.querySelector(".site-head .nav")!;
  const d = nav.querySelector("details")!;
  const list = d.querySelector(".list")!.getBoundingClientRect();
  const roundBox = (r: DOMRect) => [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)];
  // The separator too: the list ran 45 px under it on the shortest word
  // before the disclosure was given its margin (the human's walk, 2026-09-16).
  const hits = [...nav.querySelectorAll(":scope > a, :scope > .sep")].map((a) => {
    const r = a.getBoundingClientRect();
    const overlap = !(r.right <= list.left || r.left >= list.right || r.bottom <= list.top || r.top >= list.bottom);
    return { text: a.textContent!.trim() || "separator", overlap, box: roundBox(r) };
  });
  const sep = nav.querySelector(":scope > .sep")!.getBoundingClientRect();
  return JSON.stringify({ open: d.open, word: d.querySelector("summary")!.textContent!.trim(),
    summary: roundBox(d.querySelector("summary")!.getBoundingClientRect()),
    list: roundBox(list), clearance: Math.round(sep.left - list.right), hits });
}
/** The opened list's box, read in the page. */
const OPEN_LIST = `(${readOpenListInPage})()`;

/** What `OPEN_LIST` hands back. */
interface Opened {
  open: boolean; word: string; summary: number[]; list: number[]; clearance: number;
  hits: { text: string; overlap: boolean; box: number[] }[];
}

/** The list opened, closed on Escape, reopened and closed by a tap outside, and opened on every word the summary can be. */
interface OpenedListSeen { opened: Opened; escaped: Opened; again: Opened; outside: Opened; words: Record<string, Opened> }

/** What `ROW` hands back, as the cases read it. */
interface RowSeen { items: { text: string; width: number }[]; rows: number; have: number; need: number }

/** Checks the row at 960 px holds four drawn items on one line, with 12% to spare, on every kind of page. */
async function expectRowHoldsAt960(): Promise<void> {
  const seen = await withSite(async ({ page: tab, url }) => {
    const at: Record<string, unknown> = {};
    for (const [name, path] of [
      ["interview", "/"], ["route", "/germany/eu-blue-card-general/"],
      ["country", "/germany/"], ["data", "/data/"], ["feedback", "/feedback/"],
    ] as const) {
      await tab.goto(url(path));
      await tab.evaluate(FALLBACK_STACK);
      await tab.waitUntilAtRest();
      at[name] = JSON.parse(await tab.evaluate(ROW));
    }
    return at;
  }, { viewport: { width: 960, height: 900 }, mobile: false }) as Record<string, RowSeen>;

  for (const [name, row] of Object.entries(seen)) {
    expect(row.items.length, `${name}: ${row.items.map((i) => i.text).join(" | ")}`).toBe(4);
    // Every item drawn — a 0-wide item is a hidden one, and a hidden row
    // holds anything.
    for (const item of row.items) expect(item.width, `${name}: "${item.text}" is not drawn`).toBeGreaterThan(20);
    expect(row.rows, `${name}: the row wrapped onto ${row.rows} lines — ${
      row.items.map((i) => `${i.text} ${i.width}px`).join(", ")}`).toBe(1);
    // And room for a stack wider still than this machine's fallback — the
    // same 12% the 1100-px case in header.test.ts asks for.
    const headroom = (row.have - row.need) / row.have;
    expect(headroom, `${name}: ${row.need} px of row in ${row.have} px — ${
      Math.round(headroom * 100)}% spare`).toBeGreaterThan(0.12);
  }
}

/** Opens the list on `/germany/`, then closes it on Escape, reopens it and closes it by a tap outside, reading it each time. */
async function openedListThroughCloses(
  tab: BrowserPage, url: (path: string) => string,
): Promise<Omit<OpenedListSeen, "words">> {
  await tab.goto(url("/germany/"));
  await tab.evaluate(FALLBACK_STACK);
  await tab.waitUntilAtRest();
  await tab.evaluate('document.querySelector(".site-head .nav details > summary").click()');
  const opened = JSON.parse(await tab.evaluate(OPEN_LIST));
  await tab.evaluate(
    'document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))',
  );
  const escaped = JSON.parse(await tab.evaluate(OPEN_LIST));
  await tab.evaluate('document.querySelector(".site-head .nav details > summary").click()');
  const again = JSON.parse(await tab.evaluate(OPEN_LIST));
  await tab.evaluate('document.querySelector("h1").click()');
  const outside = JSON.parse(await tab.evaluate(OPEN_LIST));
  return { opened, escaped, again, outside };
}

/** The list opened on every word the summary can be, then opened and closed on `/germany/`, at 960 px. */
function openedListSeen(): Promise<OpenedListSeen> {
  return withSite<OpenedListSeen>(async ({ page: tab, url }) => {
    // Every word the summary can be, because the list is centred on the
    // word and the shortest word overhangs the most: "Spain" ran 45 px
    // under the separator where "Netherlands" ran 15 (measured, 2026-09-16).
    const words: Record<string, Opened> = {};
    for (const path of ["/", ...countryLinks(ds).map((l) => `${l.path}/`)]) {
      await tab.goto(url(path));
      await tab.evaluate(FALLBACK_STACK);
      await tab.waitUntilAtRest();
      await tab.evaluate('document.querySelector(".site-head .nav details > summary").click()');
      words[path] = JSON.parse(await tab.evaluate(OPEN_LIST));
    }
    const { opened, escaped, again, outside } = await openedListThroughCloses(tab, url);
    return { opened, escaped, again, outside, words };
  }, { viewport: { width: 960, height: 900 }, mobile: false });
}

/** Checks no list opened on any word covers an item or the separator, and clears the separator by 12 px. */
function expectListClearsRowOnEveryWord(words: Record<string, Opened>, checkOpen: boolean): void {
  for (const [path, at] of Object.entries(words)) {
    if (checkOpen) expect(at.open, `${path}: the disclosure did not open`).toBe(true);
    // Not one item, and not the separator, under any part of the list.
    for (const hit of at.hits)
      expect(hit.overlap, `${path} (${at.word}): the open list ${at.list.join(",")} covers "${
        hit.text}" at ${hit.box.join(",")}`).toBe(false);
    // And clear of the separator by the margin the human asked for.
    expect(at.clearance, `${path} (${at.word}): the list ends ${at.clearance} px before the separator`)
      .toBeGreaterThanOrEqual(12);
  }
}

/** Checks the opened list is drawn, covers nothing on any word, and closes on Escape and on a tap outside. */
async function expectOpenedListCoversNothingAndCloses(): Promise<void> {
  const seen = await openedListSeen();

  expect(seen.opened.open, "the disclosure did not open").toBe(true);
  // The list is drawn, under the row: a box of zeros is a hidden list.
  expect(seen.opened.list[3]! - seen.opened.list[1]!, "the open list has no height").toBeGreaterThan(100);
  expect(seen.opened.list[2]! - seen.opened.list[0]!, "the open list has no width").toBeGreaterThan(100);
  expectListClearsRowOnEveryWord(seen.words, true);
  expect(seen.escaped.open, "Escape left the list open").toBe(false);
  expect(seen.again.open, "the disclosure would not reopen").toBe(true);
  expect(seen.outside.open, "a tap outside left the list open").toBe(false);
}

/** Checks the list opened on every word at 1240 px clears the separator. */
async function expectListClearsSeparatorAt1240(): Promise<void> {
  const seen = await withSite(async ({ page: tab, url }) => {
    const words: Record<string, unknown> = {};
    for (const path of ["/", ...countryLinks(ds).map((l) => `${l.path}/`)]) {
      await tab.goto(url(path));
      await tab.evaluate('document.querySelector(".site-head .nav details > summary").click()');
      words[path] = JSON.parse(await tab.evaluate(OPEN_LIST));
    }
    return words;
  }, { viewport: { width: 1240, height: 900 }, mobile: false }) as Record<string, Opened>;

  expectListClearsRowOnEveryWord(seen, false);
}

/** Checks at `width` the header shows Menu, hides the row and does not scroll sideways. */
async function expectFoldedBehindMenuAt(width: number): Promise<void> {
  const seen = JSON.parse(await withSite(async ({ page: tab, url }) => {
    await tab.goto(url("/"));
    await tab.evaluate(FALLBACK_STACK);
    await tab.waitUntilAtRest();
    return tab.evaluate(
      'JSON.stringify({ menuShown: getComputedStyle(document.querySelector(".menu")).display !== "none",'
      + ' navShown: getComputedStyle(document.querySelector(".site-head .nav")).display !== "none",'
      + ' overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth })',
    );
  }, { viewport: { width, height: 900 }, mobile: false }) as string) as
    { menuShown: boolean; navShown: boolean; overflow: number };
  expect(seen.menuShown, `no Menu control at ${width}`).toBe(true);
  expect(seen.navShown, `the row is showing at ${width}, where it folds`).toBe(false);
  expect(seen.overflow).toBeLessThanOrEqual(0);
}

/** In the page: the opened phone menu's shown rows, its group heading, whether the disclosure's word is shown, and
 * each shown row's height, as JSON. */
function readPhoneMenuInPage(): string {
  const nav = document.querySelector(".site-head .nav")!;
  const isShown = (el: Element) => el.getBoundingClientRect().height > 0;
  const group = nav.querySelector(".group");
  const rows = [...nav.querySelectorAll("a")].filter(isShown);
  return JSON.stringify({ rows: rows.map((a) => a.textContent!.trim()),
    heading: group && isShown(group) ? group.textContent!.trim() : "",
    summaryShown: isShown(nav.querySelector("summary")!),
    taps: rows.map((a) => Math.round(a.getBoundingClientRect().height)) });
}

/** Checks the phone menu at 390 shows the Countries heading, the four, then the three, each tap-sized. */
async function expectPhoneMenuAt390(): Promise<void> {
  const seen = JSON.parse(await withSite(async ({ page: tab, url }) => {
    await tab.goto(url("/france/"));
    await tab.evaluate('document.querySelector(".menu").click()');
    await tab.waitUntilAtRest();
    return tab.evaluate(`(${readPhoneMenuInPage})()`);
  }, PHONE) as string) as
    { rows: string[]; heading: string; summaryShown: boolean; taps: number[] };

  expect(seen.heading, "no Countries heading over the rows").toBe(COUNTRIES);
  // The country whose page this is does not become the heading: the phone's
  // heading is always the word.
  expect(seen.summaryShown, "the disclosure's word is shown twice on the phone").toBe(false);
  expect(seen.rows).toEqual([
    ...countryLinks(ds).map((l) => l.name), CHECK_YOURS, THE_DATA, FEEDBACK,
  ]);
  for (const [i, tap] of seen.taps.entries())
    expect(tap, `"${seen.rows[i]}" is ${tap} px`).toBeGreaterThanOrEqual(44);
}

describe.skipIf(skipped !== null)("the header row, measured at the fold", () => {
  it("at 960 px holds its four items on one line with fonts this machine has never seen",
    () => expectRowHoldsAt960(), 180000);

  it("the opened list covers no other item on the row, and closes on Escape and on a tap outside",
    () => expectOpenedListCoversNothingAndCloses(), 180000);

  it("at 1240 px, where the human measured it, the list clears the separator on every word",
    () => expectListClearsSeparatorAt1240(), 180000);

  // On both sides of the narrow/wide breakpoint: the header folds below a wider width of its own.
  for (const width of [WIDE_FROM_PX, WIDE_FROM_PX - 1])
  it(`at ${width} px the header is folded behind Menu, as it has been since 2026-09-08`,
    () => expectFoldedBehindMenuAt(width), 180000);

  it("at 390 the menu lists the four countries under their heading, then the three",
    () => expectPhoneMenuAt390(), 180000);
});
