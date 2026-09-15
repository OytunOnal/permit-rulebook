/**
 * The product's own words, in one place.
 *
 * The name, the tagline and the disclaimer are said on the results screen, on
 * twenty-eight route pages, in the social card and in both READMEs. Written out
 * at each of those sites they drift: the masthead once carried a second copy of
 * the intro copy and "Start over" left a stale claim on question 1
 * (product-critique v0.7, B4). Decision 9 makes the disclaimer one sentence
 * from one source everywhere; this is that source.
 */
// A count reads as a word in a sentence, and the dataset package spells it.
import { countedWords } from "permit-rulebook-data";

export const PRODUCT_NAME = "Permit Rulebook";

/** Decision 1. It is set from the token serif wherever it appears. */
export const TAGLINE = "Every route, quoted and dated.";

/**
 * The route page says something narrower under its own name.
 *
 * The product's tagline is a claim about the whole rulebook; a route page is
 * one route, and its second line has said so since the approved route-page mock
 * ("The rules, quoted and dated."). Both live here rather than one of them
 * living in a template, so a change of voice is one edit and a test can read
 * which page says which (Spec review, 2026-09-08).
 */
export const ROUTE_TAGLINE = "The rules, quoted and dated.";

/**
 * The one-line promise the README leads with and the social card carries.
 *
 * The two counts are read from the dataset rather than typed here: they were
 * typed, and s9 moved one of them the same day it was written (Standards
 * review, 2026-09-10).
 */
export const promise = (counts: { scored: number; quotedOnly: number }): string =>
  `An open, dated, source-quoted work-permit ruleset for four countries — ${counts.scored} routes ` +
  `scored against your answers and ${counts.quotedOnly} more quoted and dated without being scored, ` +
  "every value with its official sentence and the day it was read, checked daily.";

/**
 * The launch's legal wording, one sentence, everywhere. It is the IRCC-style
 * text that has been on the site since s1, and A1's condition — no advice, no
 * verdict on the person — is satisfied by these words and not by a policy
 * document nobody reads.
 */
export const DISCLAIMER =
  `${PRODUCT_NAME} makes no immigration decision and no authority is bound by these results — ` +
  "it compares published values with what you declare, nothing more.";

/**
 * What a reader without JavaScript is owed.
 *
 * Until s10 the interview's box shipped empty and a reader with script turned
 * off saw nothing at all — a blank page that said nothing about why. The
 * question is in the HTML now, which is better and still not enough: they can
 * read it and cannot answer it. So the page says so, in one line, under the
 * question. One clause and no more: where the answers go is the masthead's
 * sentence, and saying it twice is not saying it better (Spec review, s10).
 */
export const NO_SCRIPT_LINE = "This question needs JavaScript to answer.";

/**
 * What a route page adds to it. A page a stranger lands on cold from a search
 * has to say, before it says anything else, that it is describing rules rather
 * than judging the reader.
 */
export const ROUTE_PAGE_ADDENDUM = "This page describes the rules; it does not decide on you.";

/**
 * What a page for a route the product does not score says instead.
 *
 * The scored version's promise — the rules, not a judgement — is true here too
 * and is not the thing a stranger needs first. A reader who arrives on one of
 * these from a search has to be told, in the same breath as the route's name,
 * that the checker will never rule on this one: the sentence under the heading
 * explains why, and this is the half-line that gets them there (s9).
 */
export const ROUTE_PAGE_UNSCORED_ADDENDUM =
  "This route is one the checker does not score — the rules are stated here and nothing is asked of you.";

/**
 * What the site says about the daily check — the claim, and the qualification a
 * partial run puts on it.
 *
 * Three surfaces say it, and they said it in four wordings typed into four
 * files. When s11 taught the qualification to two of them, the route page went
 * on asserting on twenty-eight pages that a daily check re-reads every source,
 * on days it had not — and a fourth copy sat in this file, rendered by nothing,
 * waiting to be picked up (Standards review, 2026-09-15). One fact, one source,
 * three surfaces: the shape the "within reach" sentence has followed since
 * 2026-09-08.
 *
 * `unread` is how many sources behind the values a reader is looking at the
 * last run could not read — `unreadSources` in the data package is the one
 * place that works it out. Zero is the ordinary day, and says what the product
 * has always said, to the byte.
 */
const DAILY_CHECK = "a daily check re-reads every source";

/** The route page, inside its own sentence about what is quoted. */
export const dailyCheck = (unread: number): string =>
  // The noun counted here is a pronoun: "them" is the sources the first half
  // of the sentence has just claimed are all re-read.
  unread === 0 ? DAILY_CHECK : `${DAILY_CHECK}; the last run did not reach ${
    countedWords(unread, "of them", "of them")}`;

/** `/data/`, which carries the whole exception sentence after it. */
export const DAILY_CHECK_CLAIM = "Every source is re-read daily";

/** The footer, which has room for the count and no more — a label, so figures. */
export const unreadLabel = (unread: number): string =>
  unread === 0 ? "" : `${unread} source${unread === 1 ? "" : "s"} unread`;

/** The rest of the route-page footer: what the date beside each quote means. */
export const freshnessNote = (unread: number): string =>
  `Rules change; the date beside each quote is the day we last read it, and ${dailyCheck(unread)}.`;

/** The two words the identity is set in, wherever the seal is drawn. */
export const SEAL_LETTERS = "PR";

/**
 * A date, the one way this product prints one.
 *
 * Decision 12: ISO everywhere a date prints. Three formats competed on the
 * route-page mock for the same fact — `04 · 09 · 2026` in the stamp, `read
 * 2026-09-04` on the cards, `dataset 2026.09.07` in the footer — on a page
 * whose whole differentiator is when a thing was read, and the headline one was
 * ambiguous to exactly the reader most likely to be reading it: 4 September or
 * 9 April depends on where you learned to write dates (critique F3).
 *
 * Local time, not UTC: the stamp on a record is the day the person holding it
 * is having.
 */
export function isoDay(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * The dataset's own version, printed as a date where it is one.
 *
 * `dataset_version` is stamped `2026.09.07`, which is a third date format on a
 * page whose differentiator is when a thing was read (critique F3). It is
 * guarded rather than blindly rewritten: `schema_version` is `0.5.0`, the same
 * shape to a careless replace, and it must never print as `0-5-0`. Two screens
 * were formatting it their own way (Standards review, 2026-09-07).
 */
export function datasetDay(version: string): string {
  return /^\d{4}\.\d{2}\.\d{2}$/.test(version) ? version.replace(/\./g, "-") : version;
}

/**
 * Why the proof is not in English (human decision, 2026-09-08).
 *
 * The quotes carrying this product's whole claim are in German, French, Spanish
 * and Dutch, and a reader from India, Nigeria or Brazil meets them with no
 * English beside them (isolated v1-gate critique, 2026-09-08, F4). They are not
 * translated and will not be: a translation is our words standing beside the
 * authority's, and the sentence the authority wrote is the record. What the
 * site owes the reader is to say so.
 */
export const TRANSLATION_POLICY =
  "Quotes are shown in the authority's own language and are never translated: a translation " +
  "would be our words beside theirs, and the original is the record. Each quote names its " +
  "language and its source.";
