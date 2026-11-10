// @level presentation
import {
  NOTHING_OPEN_HEADLINE, pointsAwayLine, routesOpenHeadline, shortfallHeadline, stepsWouldChangeHeadline,
  unsettledHeadline,
} from "../../copy/verdict.js";
import { composeStepTitle, type VerdictScreen } from "./card/cards.js";
import type { Headline } from "./masthead.js";
import type { Compared } from "./in-view.js";
import { stepKeyed } from "./layout.js";
import { moneyShortfallOf } from "./money-shortfall.js";
import { printedShortfallOf } from "./printed-shortfall.js";
import { unscoredVerdict } from "./unscored.js";
import type { HeadlineLayout } from "./verdict-layout.js";

/**
 * How near the nearest route within reach is, or nothing: "up to" its gap on
 * a bounded band, as the card says it; on a band open at the bottom, the line
 * it asks, never that line as the reader's shortfall; or its points.
 */
function nearNote(screen: VerdictScreen, c: Compared, nearest: string | null): string {
  const first = c.inView.results.find((r) => r.route.id === nearest);
  if (!first) return "";
  const money = moneyShortfallOf(screen.ds, first, screen.answers);
  if (money) return shortfallHeadline(printedShortfallOf(screen.ds, money));
  if (first.gap_points) return pointsAwayLine(first.gap_points);
  return "";
}

/** The written state's words, which the layout says stand. */
function writtenStateHeadline(screen: VerdictScreen): Headline {
  const unscored = unscoredVerdict(screen.ds, screen.answers);
  if (!unscored) throw new Error("the layout reads a written state these answers have none of");
  return { headline: unscored.headline, unscored };
}

/**
 * The headline of a comparison, in words, of the kind the layout reckoned
 * (#314): the written state (s19); their rules met under an open question,
 * which is not "nothing open" — the doubt is the notice's business; the
 * steps, and the step the list offers first by its card's title (s23);
 * nothing open, with what to do next as part of the one line (review J2);
 * or the open routes, the nearest within reach stressed.
 */
export function comparedHeadlineOf(screen: VerdictScreen, c: Compared, reckoned: HeadlineLayout): Headline {
  switch (reckoned.kind) {
    case "written-state":
      return writtenStateHeadline(screen);
    case "unsettled":
      return { headline: unsettledHeadline(reckoned.routes) };
    case "steps": {
      const nearest = composeStepTitle(screen, stepKeyed(c.steps, reckoned.nearest));
      return { headline: stepsWouldChangeHeadline(reckoned.steps), nearest };
    }
    case "nothing-open":
      return { headline: NOTHING_OPEN_HEADLINE, explore: reckoned.explore };
    case "open": {
      const note = nearNote(screen, c, reckoned.nearest);
      return { headline: routesOpenHeadline(reckoned.routes, reckoned.countries), ...(note ? { emphasis: note } : {}) };
    }
  }
}
