// @level presentation
import type { RouteResult } from "permit-rulebook-data";
import {
  NOTHING_OPEN_HEADLINE, pointsAwayLine, routesOpenHeadline, shortfallHeadline, stepsWouldChangeHeadline,
  unsettledHeadline,
} from "../../copy/verdict.js";
import { composeStepTitle, type VerdictScreen } from "./card/cards.js";
import { comparedMastheadOf, type Explore, type Headline } from "./masthead.js";
import type { Compared } from "./in-view.js";
import { moneyShortfallOf } from "./money-shortfall.js";
import { printedShortfallOf } from "./printed-shortfall.js";
import { nearestStep } from "./steps.js";
import type { VerdictAction } from "./types.js";
import { unscoredVerdict } from "./unscored.js";

/**
 * How near the nearest route within reach is, or nothing: "up to" its gap on
 * a bounded band, as the card says it; on a band open at the bottom, the line
 * it asks, never that line as the reader's shortfall; or its points.
 */
function nearNote(screen: VerdictScreen, near: RouteResult[]): string {
  const first = near[0];
  if (!first) return "";
  const money = moneyShortfallOf(screen.ds, first, screen.answers);
  if (money) return shortfallHeadline(printedShortfallOf(screen.ds, money));
  if (first.gap_points) return pointsAwayLine(first.gap_points);
  return "";
}

/**
 * Nothing open: their rules met under an open question is not "nothing
 * open" — the doubt is the notice's business (human's walk, 2026-09-10);
 * with steps, the steps are the news, and the step worth naming is the first
 * the list offers (s23) — an arranged answer or the job offer line is no step, so
 * neither is counted or named (#175); with neither, no false hope, and what
 * to do next is part of the one line (review J2), pointing at country
 * sections only where there are some (F7).
 */
function zeroOpenHeadline(screen: VerdictScreen, c: Compared): Headline {
  const unsettled = c.whole.unsettled.length;
  if (unsettled) return { headline: unsettledHeadline(unsettled) };
  const nearest = nearestStep(c.steps);
  if (nearest) return { headline: stepsWouldChangeHeadline(c.steps.length), nearest: composeStepTitle(screen, nearest) };
  const explore: Explore = c.inView.visible.length === 1 ? "one-country" : "several-countries";
  return { headline: NOTHING_OPEN_HEADLINE, explore };
}

function openHeadline(screen: VerdictScreen, c: Compared): Headline {
  const countries = new Set(c.whole.met.map((r) => r.country)).size;
  const note = nearNote(screen, c.whole.near);
  return { headline: routesOpenHeadline(c.whole.met.length, countries), ...(note ? { emphasis: note } : {}) };
}

/**
 * The headline of a comparison. A situation no scored route in the declared
 * country takes reads its written state (s19) — keyed, on the four-country
 * path, by the country the reader named at question 3 (s26) — in place of
 * the two zero-open headlines, and for exactly that case. The other branch —
 * every visible country closed to the situation — is not drawn, because on
 * this dataset it cannot occur (tests/s21: "every situation the interview
 * offers is taken by a scored route in some country"); the day that goes
 * red, it needs a written state of its own, here.
 */
function comparedHeadline(screen: VerdictScreen, c: Compared): Headline {
  const unscored = c.zeroOpen ? unscoredVerdict(screen.ds, screen.answers) : null;
  if (unscored) return { headline: unscored.headline, unscored };
  if (c.zeroOpen) return zeroOpenHeadline(screen, c);
  return openHeadline(screen, c);
}

/** The flow's move to a comparison, carrying its whole masthead: the subline
 * counts the reader's answers and the routes checked. */
export function comparedActionOf(screen: VerdictScreen, c: Compared, answered: number): VerdictAction {
  return { kind: "compare", masthead: comparedMastheadOf(comparedHeadline(screen, c), answered, c.inView.results.length) };
}
