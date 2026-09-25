import { esc, escAttr } from "./reason.js";
import type { UnscoredVerdict } from "./situations.js";

/**
 * The masthead — headline and subtitle — as a pure function of which screen is
 * showing.
 *
 * It was not one before: "Start over" reset the answers but not the subtitle,
 * so question 1 of a brand-new interview read "…compared your 13 answers
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
    /**
     * The written state for a situation no scored route in the declared
     * country takes: the whole subline, in place of the count of what was
     * compared, with one door in it (s19). The verdict is not "nothing open";
     * it is that the route is absent, and where its rules are read.
     */
    unscored?: UnscoredVerdict;
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
  /**
   * The same words with the one link the s19 written state carries, composed
   * here from escaped parts and present only on that screen: the page draws it
   * where it exists and writes `subline` as text everywhere else. The text form
   * stays the one that is announced and the one every test reads.
   */
  sublineHtml?: string;
}

/**
 * The promise, before anything has been compared. Present tense throughout.
 *
 * In the passive, on the human's choice (2026-09-16): the sentence used to
 * have "Code" as its subject, and a sentence whose subject is "Code" read
 * oddly to them on two walks. The subject leaves the sentence; the claim — a
 * comparison by code, not a judgement by a person — stays. The results
 * sentence below went the same way.
 */
export const INTRO_SUBLINE =
  "Your answers are compared against published rules — every value shows its official quote and the " +
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
      // The passive, as the intro (human, 2026-09-16). The count is the
      // subject now, so the verb has to agree with it: one answer WAS compared.
      const were = screen.answered === 1 ? "was" : "were";
      if (screen.unscored) {
        const { subline, door } = screen.unscored;
        // The door is a link only in the HTML form; the text form is the
        // sentence itself, so what is announced is what is read.
        const sublineHtml = door
          ? esc(subline).replace(esc(door.text), `<a href="${escAttr(door.href)}">${esc(door.text)}</a>`)
          : esc(subline);
        return { headline: screen.headline, subline, sublineHtml };
      }
      let subline = `Your ${answers} ${were} compared against ${sets}. Every value below shows its official ` +
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
  | { kind: "compare"; routes: number; headline: string; nearest?: string; explore?: Explore; unscored?: UnscoredVerdict }
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
        headline: action.headline, nearest: action.nearest, explore: action.explore, unscored: action.unscored,
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
 *
 * The verb is the past one. Since the intro went passive (s17) the word
 * "compared" also stands in a sentence that claims nothing has happened —
 * "your answers ARE compared" is the promise, in the present — so the shape
 * this looks for is the comparison that has been done: "were compared", "was
 * compared", or the old active "compared your". Preceded by "is" or "are" it
 * is the promise and does not count.
 */
export function claimsAComparison(text: string): boolean {
  return /(?<!\b(?:is|are)\s)\bcompared\b/i.test(text) ||
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
  /**
   * The first step the browser holds an entry of this interview for. Every
   * step from here to `current` is one `history.back()` can land on; the
   * steps before it are the page's own, rebuilt from the record, and the
   * browser has nothing of ours there (s37).
   */
  firstHeld: number;
}

export const emptyHistory = (): ScreenHistory => ({ entries: [], current: -1, firstHeld: 0 });

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
  if (history.current < 0) {
    // The first screen — of the page, or after "Start over" — rewrites the
    // entry the reader is standing on, which the browser holds: the steps
    // counted from it are all held.
    history.current = 0;
    history.firstHeld = 0;
  }
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
  return { entries, current: entries.length - 1, firstHeld: 0 };
}

/** What the page can read about how it came to be showing: the state on the
 * entry it opened onto, and the navigation's own type. */
export interface Landing {
  /** `history.state` before the page wrote anything. */
  state: unknown;
  /** `performance.getEntriesByType("navigation")[0]?.type`; undefined when
   * the browser does not say. */
  navigation: string | undefined;
}

/**
 * Where the held steps begin, for a page that has just rebuilt its list and
 * stands on `current`.
 *
 * The rebuilt list is right about the questions and says nothing about what
 * the browser holds. A reload or a return through the browser's history keeps
 * every entry the interview wrote; a fresh arrival onto a stored record holds
 * one — the arrival — and a "← Back" that asked the browser for the step
 * before it took the reader off the site (s37, measured 2026-09-25).
 *
 * The navigation's type alone cannot tell them apart: an arrival that is then
 * reloaded, or left and returned to, reads `reload` or `back_forward` while
 * the browser still holds only the arrival — measured in headless Chrome the
 * same day, `history.length` 3 and `/data/` behind in both. The entry itself
 * can: the page writes where the held steps begin into every entry's state,
 * and the browser keeps that state with the entry through a reload, a return
 * and a restored session, and drops it with the entry. An entry that carries
 * it is believed. One written before the rule carries only its step, and
 * there the type decides as the earlier reload repair assumed: a reload or a
 * return holds every step. Anything else — no state, a type the page cannot
 * read — is an arrival, because stepping back in place is safe everywhere and
 * `history.back()` onto nothing leaves the site.
 */
export function firstHeldStep(landing: Landing, current: number): number {
  const state = (landing.state ?? {}) as { step?: unknown; firstHeld?: unknown };
  const top = Math.max(0, current);
  if (typeof state.firstHeld === "number") return Math.max(0, Math.min(state.firstHeld, top));
  const returned = landing.navigation === "reload" || landing.navigation === "back_forward";
  if (typeof state.step === "number" && returned) return 0;
  return top;
}

/**
 * What the screen's "← Back" does from where the reader stands. Past the first
 * held step it is `history.back()`, so the screen's Back and the phone's are
 * one gesture (human, 2026-09-08); on or before it the browser has nothing of
 * ours behind, and the previous question is shown in place instead.
 */
export function backFor(history: ScreenHistory): "browser" | "in-place" {
  return history.current > history.firstHeld ? "browser" : "in-place";
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
