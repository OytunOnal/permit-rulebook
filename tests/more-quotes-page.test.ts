import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { PHONE, type BrowserPage, type PageOnSite } from "../scripts/browser/browser.mjs";
import { moreQuotes } from "../src/lib/copy/verdict.js";
import { STORAGE_KEY, serialize } from "../src/lib/record.js";
import { skipReason, warnNotWalked, withSite } from "./browser-walk.js";
import { RECOGNISED_A } from "./personas.js";
import { routeOf } from "./route-of.js";
import { distanceBetween, inksOnGroundIn, type InkOnGround, type TextBox } from "./screenshot-ink.js";

/**
 * More quotes on the page (#425; rulings 6 and 14 on #420): at 390 px, in the
 * light and the dark scheme each set explicitly, a screenshot's pixels show a
 * route's card drawing two quote lines and hiding the rest, one tap on
 * its control drawing them all, and a quote of a path not taken drawn dimmed.
 */

const ds = dataset as unknown as Dataset;

/** The script expression for the result's full card of the shortage Blue
 * Card, found by its title as the reader finds it; undefined where none. */
const SHORTAGE_CARD = `[...document.querySelectorAll("#main article.route")]
  .find((a) => (a.querySelector("h3")?.textContent ?? "").startsWith(${JSON.stringify(routeOf(ds, "de-blue-card-shortage").name)}))`;

/** The two colour schemes a reader's device may ask for, each set explicitly.
 * The site has no dark palette, so dark draws the light page; both run so a
 * dark palette is checked here once the site has one. */
const COLOUR_SCHEMES = ["light", "dark"] as const;
type ColourScheme = (typeof COLOUR_SCHEMES)[number];

/** How far, in RGB, a box's ink must be from its ground for text to be drawn
 * there: well above the blending at a glyph's edge, well under any text. */
const TEXT_CONTRAST_AT_LEAST = 100;
/** How far, in RGB, a box's ink may be from its ground and still be blank:
 * room for a dotted rule's blending, far under any text. */
const BLANK_CONTRAST_AT_MOST = 40;
/** How much nearer its ground, in RGB, a dimmed quote is drawn than the
 * faintest quote of the reader's own path: more than a screenshot's
 * antialiasing moves a reading, less than the dimming takes away. */
const DIMMED_BY_AT_LEAST = 20;

const skipped = skipReason();
if (skipped) warnNotWalked("MORE QUOTES ON THE PAGE", skipped);

/** One quote line of the card as the page lays it out: its quote's text box,
 * empty where nothing is drawn, and whether it is a path not taken's. */
interface LaidOutLine {
  quote: TextBox;
  isNotTaken: boolean;
}

/** A card's More quotes control as laid out: its words, its text box, and the
 * box between it and the card's inner foot edge. */
interface LaidOutControl {
  words: string;
  text: TextBox;
  under: TextBox;
}

/** The shortage card's quote lines and its More quotes control, as laid out
 * now; null for a card that draws no control. */
interface LaidOutCard {
  lines: LaidOutLine[];
  control: LaidOutControl | null;
}

/** Reads, in the page, the shortage card's layout (`LaidOutCard`), or null
 * where the result draws no such card. */
const LAID_OUT_CARD = `JSON.stringify((() => {
  const card = ${SHORTAGE_CARD};
  if (!card) return null;
  const summary = card.querySelector("details.more-quotes > summary");
  const textBox = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const { left, top, width, height } = range.getBoundingClientRect();
    return { left, top, width, height };
  };
  const lines = [...card.querySelectorAll(".srcs .src:not(.nosrc)")].map((line) => {
    const quote = line.querySelector("q");
    // A closed fold's content keeps a box but is not rendered: Chrome hides
    // it by content-visibility, which checkVisibility reads.
    const box = quote.getBoundingClientRect();
    const drawn = quote.checkVisibility() && box.width > 0 && box.height > 0;
    return { quote: drawn ? textBox(quote) : { left: 0, top: 0, width: 0, height: 0 }, isNotTaken: line.classList.contains("unapplied") };
  });
  if (!summary) return { lines, control: null };
  const control = summary.getBoundingClientRect();
  const cardBox = card.getBoundingClientRect();
  const edge = card.clientLeft;
  return {
    lines,
    control: {
      words: summary.textContent.trim(),
      text: textBox(summary),
      under: { left: cardBox.left + edge + 1, top: control.bottom + 1, width: cardBox.width - 2 * edge - 2,
        height: cardBox.bottom - edge - control.bottom - 2 },
    },
  };
})())`;

/** The card as laid out now; throws where the page draws no such card. */
async function laidOutCard(page: BrowserPage): Promise<LaidOutCard> {
  const card = JSON.parse(await page.evaluate(LAID_OUT_CARD)) as LaidOutCard | null;
  if (!card) throw new Error("the result draws no shortage Blue Card");
  return card;
}

const isDrawn = (box: TextBox): boolean => box.width > 0 && box.height > 0;

/** A quote's ink on its ground, and whether it is a path not taken's. */
interface QuoteInk {
  ink: InkOnGround;
  isNotTaken: boolean;
}

/** Each quote's ink on its ground, each read with its line scrolled to the screen's middle. */
async function quoteInksOf(page: BrowserPage, count: number): Promise<QuoteInk[]> {
  const read: QuoteInk[] = [];
  for (let i = 0; i < count; i++) {
    await page.evaluate(`${SHORTAGE_CARD}.querySelectorAll(".srcs .src:not(.nosrc) q")[${i}].scrollIntoView({ block: "center" })`);
    await page.waitUntilAtRest();
    const line = (await laidOutCard(page)).lines[i]!;
    const [ink] = await inksOnGroundIn(page, [line.quote]);
    read.push({ ink: ink!, isNotTaken: line.isNotTaken });
  }
  return read;
}

/** What one colour scheme showed: whether the page read it as set; the card
 * before a tap, its layout and, from one screenshot, the inks of the quotes drawn,
 * the control and the space under the control; and the card after one tap on
 * the control, its layout and each quote's ink. */
interface SchemeSeen {
  scheme: ColourScheme;
  isSet: boolean;
  beforeTap: LaidOutCard;
  beforeTapInks: InkOnGround[];
  opened: LaidOutCard;
  openedInks: QuoteInk[];
}

/** Opens persona A's result, recognised degree, in `scheme`, reads the card
 * before a tap, taps its control at its centre, and reads it opened. */
async function seenIn({ page, url }: PageOnSite, scheme: ColourScheme): Promise<SchemeSeen> {
  await page.emulateMedia([{ name: "prefers-color-scheme", value: scheme }]);
  await page.goto(url("/404.html"));
  await page.evaluate(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${
    JSON.stringify(serialize(RECOGNISED_A, Object.keys(RECOGNISED_A), true))})`);
  await page.goto(url("/"));
  await page.waitUntilAtRest();
  const isSet = Boolean(await page.evaluate(`matchMedia("(prefers-color-scheme: ${scheme})").matches`));
  await page.evaluate(`${SHORTAGE_CARD}?.querySelector("details.more-quotes > summary")?.scrollIntoView({ block: "center" })`);
  await page.waitUntilAtRest();
  const beforeTap = await laidOutCard(page);
  if (!beforeTap.control) return { scheme, isSet, beforeTap, beforeTapInks: [], opened: beforeTap, openedInks: [] };
  const { text, under } = beforeTap.control;
  const inView = beforeTap.lines.filter((l) => isDrawn(l.quote)).map((l) => l.quote);
  const beforeTapInks = await inksOnGroundIn(page, [...inView, text, under]);
  await page.clickAt(text.left + text.width / 2, text.top + text.height / 2);
  await page.waitUntilAtRest();
  const opened = await laidOutCard(page);
  return { scheme, isSet, beforeTap, beforeTapInks, opened, openedInks: await quoteInksOf(page, opened.lines.length) };
}

const contrastOf = ({ ink, ground }: InkOnGround): number => distanceBetween(ink, ground);

/** Folded: the first two quotes are laid out and drawn, the rest nowhere; the
 * control is drawn, and under it the card's ground is blank to its foot. */
function expectTwoInView({ scheme, beforeTap, beforeTapInks }: SchemeSeen): void {
  expect(beforeTap.lines.map((l) => isDrawn(l.quote)), `${scheme}: which quotes are laid out before a tap`)
    .toEqual(beforeTap.lines.map((_, i) => i < 2));
  const [first, second, control, under] = beforeTapInks;
  for (const [what, ink] of [["the first quote", first!], ["the second quote", second!], ["the control", control!]] as const)
    expect(contrastOf(ink), `${scheme}: ${what} is drawn`).toBeGreaterThan(TEXT_CONTRAST_AT_LEAST);
  expect(contrastOf(under!), `${scheme}: the space under the control is blank`).toBeLessThan(BLANK_CONTRAST_AT_MOST);
}

/** Opened: every quote is laid out and drawn, and each quote of a path not
 * taken is drawn nearer its ground than every quote of the reader's own path. */
function expectOpenedAndDimmed({ scheme, opened, openedInks }: SchemeSeen): void {
  expect(opened.lines.every((l) => isDrawn(l.quote)), `${scheme}: a quote is still hidden after the tap`).toBe(true);
  expect(openedInks.length).toBe(opened.lines.length);
  for (const [i, { ink }] of openedInks.entries())
    expect(contrastOf(ink), `${scheme}: quote ${i + 1} is drawn`).toBeGreaterThan(TEXT_CONTRAST_AT_LEAST);
  const own = openedInks.filter((q) => !q.isNotTaken).map((q) => contrastOf(q.ink));
  const notTaken = openedInks.filter((q) => q.isNotTaken).map((q) => contrastOf(q.ink));
  expect(notTaken.length, `precondition, ${scheme}: the card quotes a path not taken`).toBeGreaterThan(0);
  expect(Math.max(...notTaken), `${scheme}: dimmed ${notTaken.map(Math.round)}, own ${own.map(Math.round)}`)
    .toBeLessThan(Math.min(...own) - DIMMED_BY_AT_LEAST);
}

describe.skipIf(skipped !== null)("More quotes on a phone, read from a screenshot's pixels", () => {
  it("the met shortage Blue Card shows two of its five quote lines under \"3 more quotes\"; one tap shows them all; a quote of a path not taken is dimmed — at 390 px, in the light and the dark scheme", async () => {
    const seen = await withSite(async (site) => {
      const read: SchemeSeen[] = [];
      for (const scheme of COLOUR_SCHEMES) read.push(await seenIn(site, scheme));
      return read;
    }, PHONE);
    expect(seen.map((s) => s.scheme)).toEqual([...COLOUR_SCHEMES]);
    for (const s of seen) {
      expect(s.isSet, `precondition: the ${s.scheme} scheme is set`).toBe(true);
      expect(s.beforeTap.lines.length, `precondition, ${s.scheme}: the card's quote lines`).toBe(5);
      expect(s.beforeTap.control?.words, `${s.scheme}: the card's More quotes control`).toBe(moreQuotes(3));
      expectTwoInView(s);
      expectOpenedAndDimmed(s);
    }
  }, 180000);
});
