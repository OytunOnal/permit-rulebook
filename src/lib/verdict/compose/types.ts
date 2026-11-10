// @level presentation
import type { VerdictMasthead } from "../../screen.js";
import type { VerdictLayout } from "./verdict-layout.js";

/**
 * The interview as the verdict reads it: the questions answered so far, which
 * the subline counts, and the route a route page's link sent the reader
 * from — its id and nothing else of the arrival — or null.
 */
export interface InterviewSoFar {
  answered: number;
  cameFrom: string | null;
}

/** The two ways a verdict ends the interview: a comparison, or a notice that
 * answers the reader outright. Each carries that screen's whole masthead —
 * the headline markup, the subline, the subline with its door where it has
 * one, and the sentence the live region announces. */
export type VerdictAction =
  /** The interview ended and the routes were compared. */
  | { kind: "compare"; masthead: VerdictMasthead }
  /** A published notice answers the person outright, so nothing was compared. */
  | { kind: "answered-outright"; masthead: VerdictMasthead };

/** A step as the steps group offers it: its title, and its card's markup. */
export interface StepCard {
  title: string;
  html: string;
}

/** The whole verdict: the layout as data, and each thing drawn from it. */
export interface Verdict {
  /** How the verdict ends the interview, with the screen's masthead in it. */
  action: VerdictAction;
  /** The clash lines and the notice cards' markup, above everything; on the
   * notice screen, the whole body. */
  notices: string;
  /** Where everything stands, with no words and no markup (#314). */
  layout: VerdictLayout;
  /** Each drawn route's card or row markup, by the route's id. */
  routes: Record<string, string>;
  /** Each drawn step's title and card markup, by the id the layout gives it. */
  steps: Record<string, StepCard>;
  /** The body under the notices, drawn from the layout: the strip, the groups
   * or a section per country, and the offer; empty on the notice screen. */
  body: string;
}
