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
  /**
   * The verdict, with what was actually compared. `explore` is the nothing-
   * open screen's own next step: with no single step to name, it still has to
   * say what to do next, and what it can point at depends on whether there
   * are country sections below to send anyone to (product-critique v0.7, F7).
   */
  | {
    kind: "results"; answered: number; routes: number; headline: string;
    nearest?: string; explore?: Explore;
  }
  /** A published rule answers the person directly; no routes were compared. */
  | { kind: "notice"; title: string };

/** How many countries the results screen is showing. */
export type Explore = "one-country" | "several-countries";

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

/**
 * `<em>`, not `<b>`: this is the standing tagline, and it is a line of its own
 * under the question (human, 2026-09-08). `<b>` stays for the inline emphasis
 * a result headline puts on a number, which must not break the line.
 */
export const INTRO_HEADLINE = "Which work-permit routes could fit? <em>A few quick questions.</em>";

/** The only two ways the nothing-open screen can offer a way forward. Written
 * here, with the rest of the masthead copy: appending a sentence to the
 * element afterwards made a second author of the one line the type exists to
 * keep honest (review J2). */
const EXPLORE_SENTENCE: Record<Explore, string> = {
  "one-country": " Change an answer to explore — every route below says what it asks for, and quotes it.",
  "several-countries": " Change an answer to explore — or see each country's reasons below.",
};

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
      // The user-facing wording stays "published rule set" — what the code
      // calls them is Routes, which is the term the glossary fixes (review S2).
      const sets = `${screen.routes} published rule set${screen.routes === 1 ? "" : "s"}`;
      let subline = `Code compared your ${answers} against ${sets}. Every value below shows its official ` +
        "quote and the date we read it from the source.";
      if (screen.nearest) subline += ` Nearest: ${screen.nearest}.`;
      if (screen.explore) subline += EXPLORE_SENTENCE[screen.explore];
      return { headline: screen.headline, subline };
    }
  }
}

/**
 * Every move the page can make between screens. B4 was a wiring defect rather
 * than a rendering one — "Start over" cleared the answers and left the claim
 * about them standing — so the transitions live here beside the renderer,
 * where a property test can walk them in any order.
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
  | { kind: "compare"; routes: number; headline: string; nearest?: string; explore?: Explore }
  /** A published notice answers the person outright, so nothing was compared. */
  | { kind: "answered-outright"; title: string };

/** What the masthead needs to know about the interview so far. */
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
      return {
        kind: "results", answered: interview.answered, routes: action.routes,
        headline: action.headline, nearest: action.nearest, explore: action.explore,
      };
    case "answered-outright":
      return { kind: "notice", title: action.title };
  }
}

/**
 * Whether a line makes a checkable statement about a comparison that happened.
 * Used by the test that no question screen ever carries one — the symptom B4
 * was, rather than the one line that produced it. The four shapes such a
 * statement takes: the verb, its denial, a pointer at results that may not be
 * there, and a count of what was compared. (A bare digit is not one of them —
 * that made the name a description of something else, review S6.)
 */
export function claimsAComparison(text: string): boolean {
  return /\bcompared\b/i.test(text) ||
    /nothing to compare/i.test(text) ||
    /\bbelow\b/i.test(text) ||
    /\b\d+\s+(?:answers?|routes?|published|rule)/i.test(text);
}

/**
 * The history the interview keeps, as a value rather than as a side effect.
 *
 * One entry per screen the reader can go back to, and each entry remembers
 * which question it was showing — never a copy of the answers, so stepping
 * back keeps everything answered since. The page turns these into
 * `pushState`/`replaceState`; the rule about WHEN each happens lives here,
 * where it can be read by a test.
 *
 * It went wrong the other way round: every render pushed, so answering,
 * editing and going back all added entries, the numbers stopped naming the
 * questions, and a phone that throttles a burst of pushes dropped some of them
 * — three answers, one entry, and a back gesture that jumped three questions
 * and then went forward (human's phone walk, 2026-09-08).
 */
export interface HistoryEntry {
  /** The question this entry shows; null on the results or a notice screen. */
  field: string | null;
}

export interface ScreenHistory {
  entries: HistoryEntry[];
  /** Which entry the reader is standing on; -1 before the first render. */
  current: number;
}

export const emptyHistory = (): ScreenHistory => ({ entries: [], current: -1 });

/** What the page should do with the browser's history for this render. */
export interface HistoryMove {
  /** `push` adds an entry; `replace` rewrites the one being stood on. */
  how: "push" | "replace";
  step: number;
}

/**
 * Advancing to a new question (or to the results) pushes; every other render —
 * an edit, a restore, starting over — replaces the entry it is standing on. A
 * new answer after going back drops what was ahead, exactly as the browser's
 * own forward stack does.
 */
export function recordScreen(history: ScreenHistory, field: string | null, advance: boolean): HistoryMove {
  if (advance && history.current >= 0) {
    history.current += 1;
    history.entries.length = history.current;
    history.entries.push({ field });
    return { how: "push", step: history.current };
  }
  if (history.current < 0) history.current = 0;
  history.entries[history.current] = { field };
  return { how: "replace", step: history.current };
}

/** The screen an entry names, or nothing where it is not ours to restore. */
export function screenAt(history: ScreenHistory, step: number): HistoryEntry | undefined {
  return history.entries[step];
}

/**
 * The entries a reloaded page has to rebuild.
 *
 * A reload empties the page's own list while the browser keeps every entry it
 * pushed: `step` restarted at 0, `history.length` stayed at 5, and both Backs
 * stopped meaning anything — the browser's found no screen to restore and the
 * page's fell through to the edit path (Spec review, 2026-09-08). The record
 * knows the order the questions were answered in, so the list can be rebuilt
 * from it: one entry per answered question, then the one on screen.
 */
export function historyFor(answered: string[], showing: string | null): ScreenHistory {
  const entries: HistoryEntry[] = answered.map((field) => ({ field }));
  entries.push({ field: showing });
  return { entries, current: entries.length - 1 };
}

/**
 * The nearest entry this page knows about.
 *
 * A browser entry may name a step the rebuilt list is shorter than — the
 * reader answered more before the reload than the record kept, or a route the
 * dataset no longer asks dropped an answer. Clamping lands them on the nearest
 * question instead of leaving the gesture dead.
 */
export function clampStep(history: ScreenHistory, step: number): number {
  if (!history.entries.length) return 0;
  return Math.max(0, Math.min(step, history.entries.length - 1));
}
