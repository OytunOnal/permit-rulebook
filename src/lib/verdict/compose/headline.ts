// @level presentation
import {
  NOTHING_OPEN_HEADLINE, pointsAwayLine, routesOpenHeadline, shortfallHeadline, stepsWouldChangeHeadline,
  unsettledHeadline,
} from "../../copy/verdict.js";
import { composeStepTitle } from "./card/cards.js";
import { findStep, firstPlaceOfStep, standingOn } from "./drawn-cards.js";
import type { Headline } from "./masthead.js";
import type { HeadlineLayout, ReckonedComparison, WrittenStateKey } from "../reckon/reckon-verdict.js";
import { printedShortfallOf } from "./printed-shortfall.js";
import type { VerdictScreen } from "./types.js";
import { unscoredVerdict } from "./unscored.js";

/**
 * How near the nearest route within reach is, or nothing: "up to" its gap on
 * a bounded band, as the card says it; on a band open at the bottom, the line
 * it asks, never that line as the reader's shortfall; or its points. The
 * shortfall is the route's standing's, as the card's.
 */
function nearNote(screen: VerdictScreen, compared: ReckonedComparison, nearest: string | null): string {
  const named = compared.inView.results.find((r) => r.route.id === nearest);
  if (!named) return "";
  const money = standingOn(compared.layout, named.route.id).shortfall;
  if (money) return shortfallHeadline(printedShortfallOf(screen.ds, money));
  if (named.gap_points) return pointsAwayLine(named.gap_points);
  return "";
}

/** A headline's words with the nearest route's gap stressed after them, where
 * there is one. */
function withNearNote(headline: string, note: string): Headline {
  return note ? { headline, emphasis: note } : { headline };
}

/** The written state's words, for the key the layout's headline carries. */
function writtenStateHeadline(screen: VerdictScreen, writtenStateKey: WrittenStateKey): Headline {
  const unscored = unscoredVerdict(screen.ds, writtenStateKey);
  return { headline: unscored.headline, unscored };
}

/**
 * The headline of a comparison, in words, of the kind the layout reckoned
 * (#314): the written state (s19); their rules met under an open question,
 * which is not "nothing open" — the doubt is the notice's business — the
 * nearest within reach stressed; the steps, and the step the list offers
 * first by its card's title (s23); nothing open, with what to do next as part
 * of the one line (review J2); or the open routes, the nearest within reach
 * stressed.
 */
export function comparedHeadlineOf(screen: VerdictScreen, compared: ReckonedComparison, reckoned: HeadlineLayout): Headline {
  switch (reckoned.kind) {
    case "written-state":
      return writtenStateHeadline(screen, reckoned.writtenStateKey);
    case "unsettled":
      return withNearNote(unsettledHeadline(reckoned.routes), nearNote(screen, compared, reckoned.nearest));
    case "steps": {
      const step = findStep(compared, reckoned.nearest);
      const nearest = composeStepTitle(screen, { step, place: firstPlaceOfStep(compared.layout, reckoned.nearest) });
      return { headline: stepsWouldChangeHeadline(reckoned.steps), nearest };
    }
    case "nothing-open":
      return { headline: NOTHING_OPEN_HEADLINE, explore: reckoned.explore };
    case "open":
      return withNearNote(routesOpenHeadline(reckoned.routes, reckoned.countries), nearNote(screen, compared, reckoned.nearest));
  }
}
