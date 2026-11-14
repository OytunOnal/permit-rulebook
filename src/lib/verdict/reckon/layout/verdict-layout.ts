// @level application
import type { Dataset, Profile } from "permit-rulebook-data";

/**
 * The results screen's layout as data: where each route stands, which
 * sections open, what each fold holds, what the strip and each summary row
 * count, which country leads, and what kind of headline it has. No words and
 * no markup: a route is its id, a country its code, an answer its field and
 * value, and the files that draw read this to word and draw it (#314).
 */

/** The dataset and the answers given to it: what the layout is reckoned on. */
export interface AnsweredDataset {
  ds: Dataset;
  answers: Profile;
}

/** One answer to one question: the question's field and the option's value. */
export interface AnswerRef {
  field: string;
  value: string;
}

/** The groups that list routes, each route by its id. */
export type RouteGroupKind = "open" | "unsettled" | "within-reach" | "closed";

/**
 * Not-yet rows folded under one summary line: the rows that need only a path
 * answer, with the answers they ask for, or the rows placed in a country the
 * reader is not looking at, with that country's code.
 */
export type Fold =
  | {
    kind: "needs-path-answers";
    /** The path answers the folded rows ask for, arranged ones included, in
     * the order the rows first ask them. */
    pathAnswers: AnswerRef[];
    /** Whether the steps, the job offer line or the arranged line stands above,
     * for the summary to point at. */
    pointsUp: boolean;
    open: boolean;
    routes: string[];
  }
  | { kind: "elsewhere"; country: string; routes: string[] };

/**
 * The job offer line: for a reader exploring with no offer, what a job offer
 * in one country would free — routes that would then be checked, never met:
 * the country's code, how many routes, and the fields they would ask next.
 */
export interface JobOfferLine {
  country: string;
  routes: number;
  fields: string[];
}

/** The arranged line: each arranged answer that opens a route in one country,
 * with how many it opens there. */
export interface ArrangedLine {
  country: string;
  answers: (AnswerRef & { routes: number })[];
}

/** A step as one section offers it: the id its card is drawn under, the step's
 * key among the screen's steps, and the routes it opens in that section. */
export interface StepPlace {
  id: string;
  step: string;
  routes: string[];
}

/**
 * One group of a section, in the order the screen draws them: open,
 * unsettled, within reach, steps (the job offer line first), the arranged line,
 * not yet, not open to your passport. A group the reader has nothing in is
 * not there.
 */
export type VerdictGroup =
  | { kind: RouteGroupKind; routes: string[] }
  | { kind: "steps"; jobOfferLine: JobOfferLine | null; steps: StepPlace[]; hint: boolean }
  | ({ kind: "arranged" } & ArrangedLine)
  | {
    kind: "not-yet";
    /** Rows, by route id, and folds, in the order they are drawn. */
    items: (string | Fold)[];
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

/** What one country's summary row counts, and whether the s19 sentence stands
 * in for its not-yet count: its scored routes do not take the reader's
 * situation. */
export interface Tally extends Strip {
  steps: number;
  /** The routes the country's job offer line would check (ruling 7 of #187). */
  checkedWithJobOffer: number;
  /** The routes the country's arranged line would open, each counted once
   * (ruling 7 of #187). */
  openedByArrangedAnswers: number;
  situationNotTaken: boolean;
}

/** One country's section on the several-country layout, by the country's code. */
export interface CountrySection {
  country: string;
  open: boolean;
  tally: Tally;
  groups: VerdictGroup[];
}

/** How many countries the results screen is showing. */
export type Explore = "one-country" | "several-countries";

/**
 * The headline's kind, with the numbers it counts and what its second
 * sentence names: the route nearest within reach, by id, or the nearest step,
 * by key. The written state is s19's; the others are a comparison's own.
 */
export type HeadlineLayout =
  | { kind: "written-state" }
  | { kind: "unsettled"; routes: number; nearest: string | null }
  | { kind: "steps"; steps: number; nearest: string }
  | { kind: "nothing-open"; explore: Explore }
  | { kind: "open"; routes: number; countries: number; nearest: string | null };

/** A comparison's layout: one country flat, or a section per country, the
 * country the headline is about first where it names one. */
export type ComparedLayout =
  | { kind: "one-country"; country: string; strip: Strip; headline: HeadlineLayout; groups: VerdictGroup[] }
  | {
    kind: "countries"; strip: Strip; headline: HeadlineLayout;
    /** The country whose section leads, open, by its code; null where the
     * sections keep the dataset's order. */
    lead: string | null;
    sections: CountrySection[];
  };

/** The screen's body as data: the notice screen, or a comparison's. */
export type VerdictLayout = { kind: "notice" } | ComparedLayout;
