import { describe, expect, it } from "vitest";
import { DESK, type PageOnSite } from "../scripts/browser/browser.mjs";
import { skipReason, warnNotWalked, withSite } from "./browser-walk.js";
import { openWithRecord, resultsWhere, walks } from "./reader-pages.js";

/**
 * A full result card's door ("Read the rules of this route") is a box of the
 * tap's height whose label sits in its vertical middle, by the padding and
 * line height of `.route-link` (#401, rulings 24 and 28).
 */

/** The first full card's door. */
const CARD_DOOR = "#main article.route .scoped .door";

/** How far, in px, the label's middle may sit from the box's and still read as centred. */
const CENTRING_TOLERANCE = 2;

/** Reads, in the page, the door's box and its label's lines: the box's top,
 * height and the tap height it is held to, and the top of the label's first
 * line and the bottom of its last, from a Range over each of its text nodes.
 * Null where the page draws no door. */
const DOOR_LAID_OUT = `(() => {
  const door = document.querySelector(${JSON.stringify(CARD_DOOR)});
  if (!door) return "null";
  const box = door.getBoundingClientRect();
  const rects = [];
  const texts = document.createTreeWalker(door, NodeFilter.SHOW_TEXT);
  for (let text = texts.nextNode(); text; text = texts.nextNode()) {
    const range = document.createRange();
    range.selectNodeContents(text);
    rects.push(...[...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0));
  }
  return JSON.stringify({
    label: door.textContent.trim(),
    boxTop: box.top, boxHeight: box.height, tapMin: parseFloat(getComputedStyle(door).minHeight),
    lines: rects.length,
    textTop: Math.min(...rects.map((r) => r.top)), textBottom: Math.max(...rects.map((r) => r.bottom)),
  });
})()`;

/** A door as DOOR_LAID_OUT reads it, with the results it was read on. */
interface DoorLaidOut {
  where: string;
  label: string;
  boxTop: number;
  boxHeight: number;
  tapMin: number;
  lines: number;
  textTop: number;
  textBottom: number;
}

/** Opens the results of the first walk whose screen draws a full card's door
 * and reads it at rest. Throws where no walk's does. */
async function doorOnAFullCard(site: PageOnSite): Promise<DoorLaidOut> {
  for (const walk of walks()) {
    await openWithRecord(site, "/", walk);
    if (!(await site.page.evaluate(`Boolean(document.querySelector(${JSON.stringify(CARD_DOOR)}))`))) continue;
    await site.page.waitUntilAtRest();
    return { where: resultsWhere(walk), ...(JSON.parse(await site.page.evaluate(DOOR_LAID_OUT)) as Omit<DoorLaidOut, "where">) };
  }
  throw new Error("no walk's results draw a full card's door");
}

const notWalked = skipReason();
if (notWalked) warnNotWalked("the door's label on a full card", notWalked);

describe.skipIf(notWalked !== null)("every screen the module draws", () => {
  it("sets a full result card's door's label in the vertical middle of its box of the tap's height, at the desk", async () => {
    const door = await withSite(doorOnAFullCard, DESK);
    expect(door.lines, `precondition, ${door.where}: the door's label is read`).toBeGreaterThan(0);
    expect(door.tapMin, `precondition, ${door.where}: the door is held to a tap height`).toBeGreaterThan(0);
    expect(Math.abs(door.boxHeight - door.tapMin),
      `precondition, ${door.where}: the door's box is ${door.boxHeight.toFixed(2)} px tall, the tap height ${door.tapMin.toFixed(2)} px`)
      .toBeLessThan(0.5);
    const labelMiddle = (door.textTop + door.textBottom) / 2 - door.boxTop;
    expect(Math.abs(labelMiddle - door.boxHeight / 2),
      `${door.where}, "${door.label}": its label's middle is ${labelMiddle.toFixed(2)} px down a ${door.boxHeight.toFixed(2)} px box`)
      .toBeLessThanOrEqual(CENTRING_TOLERANCE);
  }, 600000);
});
