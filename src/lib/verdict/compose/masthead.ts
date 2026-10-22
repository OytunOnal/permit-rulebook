// @level presentation
import {
  EVERY_VALUE_BELOW_QUOTED, EXPLORE_ONE_COUNTRY, EXPLORE_SEVERAL_COUNTRIES, NOTHING_TO_COMPARE, answersCheckedLine,
  nearestLine, noticeHeadline,
} from "../../copy/verdict.js";
import { esc, sentenceWithLinkHtml } from "../../reason.js";
import type { VerdictMasthead } from "../../screen.js";
import type { UnscoredVerdict } from "./unscored.js";

/** How many countries the results screen is showing. */
export type Explore = "one-country" | "several-countries";

/** What the masthead says of a comparison: the verdict in words, the words
 * after it the headline stresses, the next step it names, the nothing-open
 * screen's way forward, or the s19 written state in place of the subline. */
export interface Headline {
  headline: string;
  emphasis?: string;
  nearest?: string;
  explore?: Explore;
  unscored?: UnscoredVerdict;
}

/** The only two ways the nothing-open screen can offer a way forward, written
 * as part of the one subline: appending a sentence to the element afterwards
 * made a second author of the one line the masthead keeps honest (review J2). */
const EXPLORE_SENTENCE: Record<Explore, string> = {
  "one-country": EXPLORE_ONE_COUNTRY,
  "several-countries": EXPLORE_SEVERAL_COUNTRIES,
};

const headlineHtml = ({ headline, emphasis }: Headline): string =>
  emphasis ? `${esc(headline)} <b>${esc(emphasis)}</b>` : esc(headline);

/**
 * The sentence is written once, in words; the emphasis is markup laid over
 * it, so the announced line is the sentence itself rather than a strip of its
 * own HTML (Standards review, 2026-09-08). A verdict arriving with no live
 * region told a screen-reader user nothing happened (critique F16).
 */
const announcedOf = ({ headline, emphasis }: Headline): string => (emphasis ? `${headline} ${emphasis}` : headline);

/** The s19 written state's subline: the whole sentence as text, and the door
 * a link only in the HTML form, so what is announced is what is read. */
function unscoredMasthead(h: Headline, unscored: UnscoredVerdict): VerdictMasthead {
  const { subline, door } = unscored;
  const sublineHtml = door ? sentenceWithLinkHtml(subline, door.text, door.href) : esc(subline);
  return { headline: headlineHtml(h), subline, sublineHtml, announced: announcedOf(h) };
}

/** A comparison's masthead: its headline, and a subline counting what was
 * compared — the reader's answers, the routes checked — then the step it names
 * or its way forward. */
export function comparedMastheadOf(h: Headline, answered: number, routes: number): VerdictMasthead {
  if (h.unscored) return unscoredMasthead(h, h.unscored);
  const subline = [
    answersCheckedLine(answered, routes), EVERY_VALUE_BELOW_QUOTED,
    ...(h.nearest ? [nearestLine(h.nearest)] : []),
    ...(h.explore ? [EXPLORE_SENTENCE[h.explore]] : []),
  ].join(" ");
  return { headline: headlineHtml(h), subline, announced: announcedOf(h) };
}

/** The notice screen's masthead: the notice's own title, and that nothing was
 * compared. */
export function noticeMastheadOf(title: string): VerdictMasthead {
  const headline = noticeHeadline(title);
  return { headline: esc(headline), subline: NOTHING_TO_COMPARE, announced: headline };
}
