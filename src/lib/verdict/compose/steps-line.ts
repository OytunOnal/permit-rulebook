// @level presentation
import { phraseOf } from "permit-rulebook-data";
import { STEPS_LINE_LEAD, stepsCountIn, stepsThatWouldUnlockMore } from "../../copy/verdict.js";
import { esc, escAttr } from "../../reason.js";
import type { ComparedLayout, CountryHolding } from "../reckon/reckon-verdict.js";

/** The id a country's steps heading carries, which the Steps line links to. */
export const stepsAnchorOf = (country: string): string => `steps-${country.toLowerCase()}`;

/** A link on the Steps line to one country's steps. */
const stepsLinkHtml = (holding: CountryHolding, words: string): string =>
  `<a href="#${escAttr(stepsAnchorOf(holding.country))}">${esc(words)}</a>`;

/**
 * The Steps line, first under the masthead where the layout counts steps
 * (rulings 9 and 10 on #362): on the four-country result its lead, then each
 * country's count, in screen order, a link to that country's steps; on a
 * one-country result the whole line is the one link. A section holding steps
 * is always open, so no link lands in a collapsed one.
 */
export function stepsLineHtml(layout: ComparedLayout): string {
  const holdings = layout.stepsLine;
  if (!holdings.length) return "";
  if (layout.kind === "one-country") {
    const [holding] = holdings;
    if (holding === undefined || holdings.length !== 1)
      throw new Error(`a one-country result's Steps line counts steps in ${holdings.length} countries, not one`);
    return `<p class="steps-line">${stepsLinkHtml(holding, stepsThatWouldUnlockMore(holding.steps))}</p>`;
  }
  const links = holdings.map((holding) => stepsLinkHtml(holding, stepsCountIn(holding.steps, phraseOf(holding.country))));
  return `<p class="steps-line">${esc(STEPS_LINE_LEAD)} ${links.join(" · ")}</p>`;
}
