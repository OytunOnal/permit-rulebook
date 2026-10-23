// @level application
/**
 * The interview's flow: which screen a gesture lands on. What the browser's
 * history does about it is `interview-history/`'s. No words: a question screen's
 * masthead is written beside the question card (`question.ts`), a verdict's
 * inside the verdict (`verdict/`).
 *
 * A claim about a comparison can only stand on a screen that has one. The
 * type says so: only the results and notice screens carry a masthead, and
 * only the two moves that end on a verdict produce one (product-critique
 * v0.7, blocker B4).
 */
export type Screen =
  /**
   * Any question screen: the interview has compared nothing yet. `started` is
   * only about length — after question 1 the promise has been read, so the
   * subtitle shortens and stops pushing the question below the fold on a
   * phone (product-critique v0.7, F8).
   */
  | { kind: "question"; started: boolean }
  /** The verdict, with the masthead the comparison composed. */
  | { kind: "results"; masthead: VerdictMasthead }
  /** A published rule answers the person directly; no routes were compared. */
  | { kind: "notice"; masthead: VerdictMasthead };

export interface Masthead {
  /**
   * innerHTML — the only markup of its own is one emphasis (`<em>` on the
   * intro, `<b>` on a result). Every other word is escaped: they can be the
   * dataset's (a notice's title, a country's name), and a tag in them would be
   * drawn (#25).
   */
  headline: string;
  /** textContent — never markup, so nothing can be smuggled into it. */
  subline: string;
}

/** A verdict screen's masthead, as the verdict composed it. */
export interface VerdictMasthead extends Masthead {
  /**
   * The same words as `subline` with the one link the s19 written state
   * carries, composed from escaped parts and present only on that screen: the
   * page draws it where it exists and writes `subline` as text everywhere
   * else. The text form stays the one that is announced and the one every test
   * reads.
   */
  sublineHtml?: string;
  /** The sentence the live region announces: the headline's words, without
   * its markup. */
  announced: string;
}

/**
 * Every move the page can make between screens. B4 was a wiring defect rather
 * than a rendering one — "Start over" cleared the answers and left the claim
 * about them standing — so the transitions live here, where a property test
 * can walk them in any order.
 */
export type FlowAction =
  /** An answer recorded, or an edit finished. */
  | { kind: "answer" }
  /** An answered row reopened — from the ledger, or with "← Back". */
  | { kind: "edit" }
  /** A stored record read back, or a browser-Back snapshot restored. */
  | { kind: "restore" }
  /** "Start over". */
  | { kind: "reset" }
  /** The interview ended and the routes were compared. */
  | { kind: "compare"; masthead: VerdictMasthead }
  /** A published notice answers the person outright, so nothing was compared. */
  | { kind: "answered-outright"; masthead: VerdictMasthead };

/** What the flow needs to know about the interview so far. */
export interface Interview {
  /** Questions answered and on file — the page's `asked`. */
  answered: number;
}

/** The screen a gesture lands on. Only `compare` and `answered-outright` can
 * produce a screen that says anything about a comparison, so no path back into
 * the interview can leave a claim standing. */
export function screenAfter(action: FlowAction, interview: Interview): Screen {
  switch (action.kind) {
    case "reset":
      // Start over does not take the count on trust: after it, by definition,
      // nothing has been answered and nothing can be claimed.
      return { kind: "question", started: false };
    case "answer":
    case "edit":
    case "restore":
      return { kind: "question", started: interview.answered > 0 };
    case "compare":
      return { kind: "results", masthead: action.masthead };
    case "answered-outright":
      return { kind: "notice", masthead: action.masthead };
  }
}
