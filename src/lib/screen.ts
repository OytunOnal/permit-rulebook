/**
 * The masthead — headline and subtitle — as a pure function of which screen is
 * showing.
 *
 * It was not one before: "Start over" reset the answers but not the subtitle,
 * so question 1 of a brand-new interview read "Code compared your 13 answers
 * against 23 published rule sets… every value below shows its official quote"
 * — past tense, a count of answers nobody had given, and "below" pointing at an
 * empty page (product-critique v0.7, blocker B4). A claim about a comparison
 * can only be produced from a screen that HAS one, which is what the type below
 * enforces.
 */
export type Screen =
  /**
   * Any question screen: the interview has compared nothing yet. `started` is
   * only about length — after question 1 the promise has been read, so the
   * subtitle shortens and stops pushing the question below the fold on a
   * phone (product-critique v0.7, F8).
   */
  | { kind: "question"; started: boolean }
  /** The verdict, with what was actually compared. */
  | { kind: "results"; answered: number; ruleSets: number; headline: string; nearest?: string }
  /** A published rule answers the person directly; no routes were compared. */
  | { kind: "notice"; title: string };

export interface Masthead {
  /** innerHTML — the headline carries one <b> emphasis. */
  headline: string;
  /** textContent — never markup, so nothing can be smuggled into it. */
  subline: string;
}

/** The promise, before anything has been compared. Present tense throughout. */
export const INTRO_SUBLINE =
  "Code compares your answers against published rules — every value shows its official quote and the " +
  "date we read it from the source. Your answers stay on this device. At the end: which routes look open, " +
  "how close the near-misses are, and which single step would unlock more.";

/** Once the interview is under way the promise has been read; one line is enough. */
export const SHORT_SUBLINE =
  "Every value at the end shows its official quote and the date we read it. Your answers stay on this device.";

export const INTRO_HEADLINE = "Which work-permit routes could fit? <b>A few quick questions.</b>";

export function mastheadFor(screen: Screen): Masthead {
  switch (screen.kind) {
    case "question":
      return { headline: INTRO_HEADLINE, subline: screen.started ? SHORT_SUBLINE : INTRO_SUBLINE };
    case "notice":
      return {
        headline: `${screen.title}.`,
        subline: "Nothing to compare: the published rule below answers your situation directly.",
      };
    case "results": {
      const answers = `${screen.answered} answer${screen.answered === 1 ? "" : "s"}`;
      const sets = `${screen.ruleSets} published rule set${screen.ruleSets === 1 ? "" : "s"}`;
      const base = `Code compared your ${answers} against ${sets}. Every value below shows its official ` +
        "quote and the date we read it from the source.";
      return { headline: screen.headline, subline: screen.nearest ? `${base} Nearest: ${screen.nearest}.` : base };
    }
  }
}

/**
 * Whether a line makes a checkable statement about a comparison that happened.
 * Used by the test that no question screen ever carries one — the symptom B4
 * was, rather than the one line that produced it.
 */
export function claimsAComparison(text: string): boolean {
  return /\bcompared\b/i.test(text) ||
    /nothing to compare/i.test(text) ||
    /\bbelow\b/i.test(text) ||
    /\d/.test(text);
}
