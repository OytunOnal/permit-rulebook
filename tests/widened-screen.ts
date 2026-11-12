import { WidthFailure, type PageOnSite } from "../scripts/browser/browser.mjs";
import { openWithRecord, screensToOpen, walks } from "./reader-pages.js";

/**
 * The reader-pages walk's screens drawn a second time with their text
 * widened on purpose, so text that cannot wrap shows on the machine drawing
 * them what a wider font would show: the runner's fallback for Segoe UI, or a
 * reader's phone's font. The widening is done by the page itself and names
 * no font, so it widens the same on every machine.
 */

/** How much wider the wide pass sets every text: this share of its font size
 * added to its own letter spacing. At this share the Netherlands results that
 * laid out at 417 on the runner lay out at 421 here. */
const WIDENED_SPACING_EM = 0.1;

/** Reads, in the page, the width it lays out at with every element's letter
 * spacing widened by WIDENED_SPACING_EM of its font size, then puts each
 * element's own style attribute back. */
const WIDENED_WIDTH = `(() => {
  const all = [document.documentElement, ...document.querySelectorAll("*")];
  const widened = all.map((el) => {
    const style = getComputedStyle(el);
    return (parseFloat(style.letterSpacing) || 0) + ${WIDENED_SPACING_EM} * parseFloat(style.fontSize);
  });
  const own = all.map((el) => el.getAttribute("style"));
  all.forEach((el, i) => { el.style.letterSpacing = widened[i] + "px"; });
  const width = innerWidth;
  all.forEach((el, i) => { if (own[i] === null) el.removeAttribute("style"); else el.setAttribute("style", own[i]); });
  return width;
})()`;

/** A screen drawn with its text widened: where it was read, and the width the
 * page laid out at; null where the screen already failed its width check as
 * drawn, which the drawn screens name. */
export interface WidenedScreen {
  where: string;
  widenedWidth: number | null;
}

/** Each of the screens `screensToOpen` names for `walksTaken`, opened again
 * and drawn with its text widened. */
export async function widenedScreens(site: PageOnSite, walksTaken = walks()): Promise<WidenedScreen[]> {
  const screens: WidenedScreen[] = [];
  for (const { where, path, record } of screensToOpen(walksTaken)) {
    try {
      await openWithRecord(site, path, record);
    } catch (e) {
      if (!(e instanceof WidthFailure)) throw e;
      screens.push({ where, widenedWidth: null });
      continue;
    }
    screens.push({ where, widenedWidth: Number(await site.page.evaluate(WIDENED_WIDTH)) });
  }
  return screens;
}

/** Each of `screens` that laid out at another width than `screenWidth`, with
 * the width it laid out at. */
export const widenedFailuresOf = (screens: WidenedScreen[], screenWidth: number): string[] =>
  screens.flatMap((s) => (s.widenedWidth === null || s.widenedWidth === screenWidth ? []
    : [`${s.where}, its text widened: the page laid out at innerWidth ${s.widenedWidth}, not the screen's ${screenWidth}`]));
