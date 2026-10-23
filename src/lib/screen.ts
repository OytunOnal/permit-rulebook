// @level application
/**
 * The screens' shared types. Which screen a gesture lands on is the
 * interview's (`interview/`). No words: a question screen's masthead is
 * written beside the question card (`question.ts`), a verdict's inside the
 * verdict (`verdict/`).
 *
 * A claim about a comparison can only stand on a screen that has one. The
 * type says so: only the results and notice screens carry a masthead
 * (product-critique v0.7, blocker B4).
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
