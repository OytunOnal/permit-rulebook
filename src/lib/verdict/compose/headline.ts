// @level presentation
import type { RouteResult } from "permit-rulebook-data";
import {
  NOTHING_OPEN_HEADLINE, pointsAwayLine, routesOpenHeadline, shortByLine, stepsWouldChangeHeadline, unsettledHeadline,
} from "../../copy.js";
import type { Explore } from "../../screen.js";
import { unscoredVerdict, type UnscoredVerdict } from "../../situations.js";
import { nearestStep } from "../../steps.js";
import { gapAmount, type VerdictScreen } from "./cards.js";
import type { Compared } from "./reading.js";
import type { VerdictAction } from "./types.js";

/** What the masthead says of a comparison: the verdict in words, the words
 * after it the headline stresses, and the next step it names. */
interface Headline {
  headline: string;
  emphasis?: string;
  nearest?: string;
  explore?: Explore;
  unscored?: UnscoredVerdict;
}

/** The flow's action, and the sentence the live region announces. */
export interface Saying {
  action: VerdictAction;
  announced: string;
}

/**
 * The sentence is written once, in words; the emphasis is markup the
 * masthead lays over it, so the announced line is the sentence itself rather
 * than a strip of its own HTML (Standards review, 2026-09-08). A verdict
 * arriving with no live region told a screen-reader user nothing happened
 * (critique F16).
 */
function said(routes: number, h: Headline): Saying {
  return {
    action: { kind: "compare", routes, ...h },
    announced: h.emphasis ? `${h.headline} ${h.emphasis}` : h.headline,
  };
}

/** How near the nearest route within reach is, or nothing. */
function nearNote(screen: VerdictScreen, near: RouteResult[]): string {
  const first = near[0];
  if (first?.gap_max) return shortByLine(gapAmount(screen, first));
  if (first?.gap_points) return pointsAwayLine(first.gap_points);
  return "";
}

/**
 * Nothing open: their rules met under an open question is not "nothing
 * open" — the doubt is the notice's business (human's walk, 2026-09-10);
 * with steps, the steps are the news, and the step worth naming is the first
 * the list offers (s23); with neither, no false hope, and what to do next is
 * part of the one line (review J2), pointing at country sections only where
 * there are some (F7).
 */
function zeroOpenHeadline(c: Compared): Headline {
  const unsettled = c.whole.unsettled.length;
  if (unsettled) return { headline: unsettledHeadline(unsettled) };
  const nearest = nearestStep(c.ups);
  if (nearest) return { headline: stepsWouldChangeHeadline(c.ups.length), nearest: nearest.title };
  const explore: Explore = c.reading.visible.length === 1 ? "one-country" : "several-countries";
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
export function comparedSaying(screen: VerdictScreen, c: Compared): Saying {
  const routes = c.reading.results.length;
  const unscored = c.zeroOpen ? unscoredVerdict(screen.ds, screen.answers) : null;
  if (unscored) return said(routes, { headline: unscored.headline, unscored });
  if (c.zeroOpen) return said(routes, zeroOpenHeadline(c));
  return said(routes, openHeadline(screen, c));
}
