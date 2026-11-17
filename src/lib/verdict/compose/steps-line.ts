// @level presentation
import { phraseOf } from "permit-rulebook-data";
import { STEPS_LINE_LEAD, stepsCountIn, stepsThatWouldUnlockMore } from "../../copy/verdict.js";
import { esc, escAttr } from "../../reason.js";
import type { ComparedLayout, StepsCount } from "../reckon/reckon-verdict.js";

/** The id a country's steps heading carries, which the Steps line links to. */
export const stepsAnchorOf = (country: string): string => `steps-${country.toLowerCase()}`;

/** A link on the Steps line to one country's steps. */
const stepsLinkHtml = (count: StepsCount, words: string): string =>
  `<a href="#${escAttr(stepsAnchorOf(count.country))}">${esc(words)}</a>`;

/**
 * The Steps line, first under the masthead where the layout counts steps
 * (rulings 9 and 10 on #362): on the four-country result its lead, then each
 * country's count, in screen order, a link to that country's steps; on a
 * one-country result the whole line is the one link. A section holding steps
 * is always open, so no link lands in a collapsed one.
 */
export function stepsLineHtml(layout: ComparedLayout): string {
  const counts = layout.stepsLine;
  if (!counts.length) return "";
  if (layout.kind === "one-country") {
    const [count] = counts as [StepsCount];
    return `<p class="steps-line">${stepsLinkHtml(count, stepsThatWouldUnlockMore(count.steps))}</p>`;
  }
  const links = counts.map((count) => stepsLinkHtml(count, stepsCountIn(count.steps, phraseOf(count.country))));
  return `<p class="steps-line">${esc(STEPS_LINE_LEAD)} ${links.join(" · ")}</p>`;
}
