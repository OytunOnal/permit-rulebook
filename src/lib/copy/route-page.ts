// @level presentation
/**
 * A route page's own words (`lib/route-page.ts`).
 *
 * Every word a reader reads lives in this folder, one file per screen or
 * part (CODING_STANDARDS.md, Rules).
 */
import { countedWords } from "permit-rulebook-data";

/**
 * The route page says something narrower under its own name.
 *
 * The product's tagline is a claim about the whole rulebook; a route page is
 * one route, and its second line has said so since the approved route-page mock
 * ("The rules, quoted and dated."). Both live here rather than one of them
 * living in a template, so a change of voice is one edit and a test can read
 * which page says which (Spec review, 2026-09-08). Since s27 the line is its
 * own element under the route's name, and it ends in a colon: it introduces
 * what follows (the human's walk, 2026-09-17).
 */
export const ROUTE_TAGLINE = "The rules, quoted and dated:";

/**
 * A route page's words around its country: who the page is for, the heading
 * over the country's other routes, and what a search result reads about a
 * route the checker asks about. `country` is the country's phrase within a
 * sentence; `countryOpening` its possessive where it opens one ("The
 * Netherlands'"); `asks` the route's first few conditions, joined.
 */
export const audienceLine = (country: string): string => `This page is for people who need a permit to work in ${country}.`;
export const alsoInHeading = (country: string): string => `Also in ${country}`;
export const askedRouteDescription = (countryOpening: string, routeName: string, asks: string): string =>
  `${countryOpening} ${routeName}: ${asks} — every value quoted from its official page with the date it was read.`;

/**
 * Where a route page's quotes come from, said of every source alike: a quote
 * may stand on a consolidated text, which is not the authority's page, so the
 * words claim no "official" page (GLOSSARY, Consolidated text; #151's fix
 * round, ruling 1). `check` is the daily-check clause.
 */
export const everyNumberQuoted = (check: string): string =>
  `Every number below is quoted from the page each rule cites, and ${check}.`;
export const everyConditionQuoted = (check: string): string =>
  `Every condition below is quoted from the page each rule cites, and ${check}.`;

/**
 * What a route page adds to it. A page a stranger lands on cold from a search
 * has to say, before it says anything else, that it is describing rules rather
 * than judging the reader.
 */
export const ROUTE_PAGE_ADDENDUM = "This page describes the rules; it does not decide on you.";

/**
 * What a page for a route the checker does not ask about says instead.
 *
 * The other routes' promise — the rules, not a judgement — is true here too
 * and is not the thing a stranger needs first. A reader who arrives on one of
 * these from a search has to be told, in the same breath as the route's name,
 * that the checker will never rule on this one: the sentence under the heading
 * explains why, and this is the half-line that gets them there (s9).
 */
export const ROUTE_PAGE_UNSCORED_ADDENDUM =
  "This route is one the checker does not ask about — the rules are stated here, quoted and dated.";

/** The heading over such a route's scope statement. */
export const NOT_ASKED_SCOPE_HEADING = "Why the checker does not ask about this route";
/** What a search result says of such a route's page. `countryOpening` is the
 * country's possessive where it opens a sentence. */
export const notAskedRouteDescription = (countryOpening: string, routeName: string): string =>
  `${countryOpening} ${routeName}: the conditions as the authority states them, each with the sentence it came from `
  + "and the day that page was read. Quoted and dated here; the checker does not ask about it.";

/**
 * Under a route page's headline figures. Each figure carries its own read date,
 * so this line names none; a panel with no figure has no sentence to point to
 * and does not carry it.
 */
export const ANSWER_SOURCED = "From the authority's own page, with the sentence it came from below.";

/** A points route's headline figure, and what stands beside it. */
export const pointsFigure = (points: number): string => `${points} points`;
export const POINTS_FIGURE_LABEL = "— from the official table";

/**
 * The panel of a route that asks for no number. The absence is the answer to
 * "what is the threshold", and no sentence states an absence, so it points to
 * the conditions rather than to a quote.
 */
export const NO_FIGURE = "No salary or points threshold";
export const NO_FIGURE_LABEL = "— what this route asks for is in the conditions below";

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

/**
 * The route page, inside its own sentence about what is quoted.
 *
 * `unread` here is how many of THIS ROUTE's sources the last run could not
 * read — the s11 list filtered by the page's own source set. The first form
 * counted the whole list, so on the day BAMF's graduate page did not answer,
 * 27 of 28 route pages cast doubt on sources that had been read fine and
 * none of them named the one that had not (v1.1 gate critique, F3). A page
 * whose own sources were all read says the plain thing; one whose source was
 * missed says so, and says what that means for the values on it. No country
 * in the sentence: the route is the page.
 */
export const dailyCheck = (unread: number): string =>
  unread === 0 ? DAILY_CHECK : `${DAILY_CHECK}; the last run did not reach ${
    countedWords(unread, "of this route's sources", "of this route's sources")}; ${
    unread === 1 ? "its" : "their"} values still show the day they were read`;

/** The rest of the route-page footer: what the date beside each quote means. */
export const freshnessNote = (unread: number): string =>
  `Rules change; the date beside each quote is the day we last read it, and ${dailyCheck(unread)}.`;

// The section sign carries no explainer. It read "§ = section" once per page
// beside the first citation (s23, P1 — before that "(§ 20a, section 20a)", a
// stutter), until the human's walk of s32 (2026-09-18): the sign is read as a
// reader reads it. `gloss.ts` still names the act a citation cites, on first
// use, in the citation's own bracket.

/**
 * The lead-in to a criterion's paths on a route page, each path on a line of
 * its own under its label. "Either" is said of two; three or more paths take
 * "any one".
 */
export const EITHER_PATH = "Either path meets it:";
export const ANY_PATH = "Any one of these paths meets it:";
