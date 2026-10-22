// @level presentation
import type { FlowAction, Interview } from "../../screen.js";
import type { UnscoredTally } from "../../situations.js";

/**
 * The interview as the verdict reads it: the questions answered so far, which
 * the subline counts, and the route a route page's link sent the reader
 * from — its id and nothing else of the arrival — or null.
 */
export interface InterviewSoFar extends Interview {
  cameFrom: string | null;
}

/** The two moves of the flow that end on a verdict: a comparison, or a
 * notice that answers the reader outright. Each carries that screen's whole
 * masthead — the headline markup, the subline, the subline with its door
 * where it has one, and the sentence the live region announces. */
export type VerdictAction = Extract<FlowAction, { kind: "compare" | "answered-outright" }>;

/** A route as its group lists it: its id, and its card's markup. */
export interface RouteCard {
  route: string;
  html: string;
}

/** A step as the steps group offers it: its title, and its card's markup. */
export interface StepCard {
  title: string;
  html: string;
}

/**
 * Not-yet rows folded under one summary line: the rows that need only a path
 * answer, named by the answers they ask for, or the rows placed in a country
 * the reader is not looking at.
 */
export type Fold =
  | {
    kind: "needs-steps";
    /** The path answers the folded rows ask for, in the dataset's words. */
    steps: string[];
    /** Whether a steps group stands above, for the summary to point at. */
    pointsUp: boolean;
    open: boolean;
    cards: RouteCard[];
  }
  | {
    kind: "elsewhere";
    /** The name of the country the rows are in. */
    country: string;
    /** The place the reader declared, in the dataset's words, or null. */
    told: string | null;
    cards: RouteCard[];
  };

/**
 * One group of a section, in the order the screen draws them: open,
 * unsettled, within reach, steps, not yet, not open to your passport. A group
 * the reader has nothing in is not there.
 */
export type VerdictGroup =
  | { kind: "open" | "unsettled" | "within-reach" | "closed"; cards: RouteCard[] }
  | { kind: "steps"; steps: StepCard[]; hint: string }
  | {
    kind: "not-yet";
    /** Rows and folds in the order they are drawn. */
    items: (RouteCard | Fold)[];
    /** Every route the group holds, folded or not. */
    count: number;
  };

/** What the summary line under the notices counts. */
export interface Strip {
  open: number;
  withinReach: number;
  unsettled: number;
  closed: number;
  notYet: number;
  /** Routes with an unknown the reader can still act on. */
  openUnknowns: number;
}

/** What one country's summary row counts, and the s19 sentence that stands
 * in for its not-yet count where its scored routes do not take the reader's
 * situation. */
export interface Tally extends Strip {
  steps: number;
  closedTo: UnscoredTally | null;
}

/** One country's section on the several-country layout. */
export interface CountrySection {
  name: string;
  open: boolean;
  tally: Tally;
  groups: VerdictGroup[];
}

/** The screen's body as data: the notice screen, one country flat, or a
 * section per country. */
export type VerdictLayout =
  | { kind: "notice" }
  | { kind: "one-country"; strip: Strip; groups: VerdictGroup[] }
  | { kind: "countries"; strip: Strip; sections: CountrySection[] };

/** The whole verdict. */
export interface Verdict {
  /** The flow's action, with the screen's masthead in it. */
  action: VerdictAction;
  /** The clash lines and the notice cards' markup, above everything; on the
   * notice screen, the whole body. */
  notices: string;
  layout: VerdictLayout;
}
