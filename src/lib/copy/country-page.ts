// @level presentation
/**
 * A country page's own words (`lib/country-page.ts`).
 *
 * Every word a reader reads lives in this folder, one file per screen or
 * part (CODING_STANDARDS.md, Rules).
 */
import { PRODUCT_NAME } from "./frame.js";

/**
 * A country page's heading: what the reader can do there, before answering
 * anything. `country` is the country's phrase where it opens a sentence.
 */
export const countryHeadline = (country: string, total: number, asked: number): string =>
  `${country}: ${total} ${total === 1 ? "route" : "routes"}. The checker asks about ${asked}.`;

/**
 * The country page's words for the routes the checker does not ask about: the
 * section heading, the lede's sentences, the lists' labels and the note under
 * the button. The heading is the scope line's own verb, cut down to what a
 * heading carries, so the heading, the card under it and the page it opens
 * say the same thing.
 */
export const QUOTED_ONLY_HEADING = "Quoted here, not checked";
export const LISTED_WITH_THE_REASONS = "listed with the reasons";
/** `routes` is the count in words ("two routes"); `door` the link, already HTML. */
export const notAskedBelowLine = (routes: string, door: string): string =>
  `Below them, ${routes} the checker does not ask about; what is left out altogether is ${door}.`;
/** `routes` is the count in words, opening the sentence ("Two routes"). */
export const notAskedLede = (routes: string, count: number): string =>
  `${routes} we hold the rules for and the checker does not ask about. Each page states them as the authority does, `
  + `with the day we read them, and asks you nothing; the checker never offers ${count === 1 ? "it" : "them"}.`;
export const askedRoutesLabel = (country: string): string => `The routes in ${country} the checker asks about`;
export const notAskedRoutesLabel = (country: string): string => `Routes in ${country} the checker does not ask about`;
export const RESULT_NAMES_ASKED_ROUTES =
  "The result names which of the routes the checker asks about fit; the ones it does not ask about never appear in it.";

/**
 * The rest of a country page's own words: its title, what a link preview
 * reads about it, the lede's opening, the line for a country whose routes the
 * checker asks about all of, and the note under the button there. `country` is
 * the country's phrase within a sentence; `door` a link, already HTML.
 */
export const countryPageTitle = (country: string): string => `Work permits in ${country} · ${PRODUCT_NAME}`;
/** `listed` names the routes, the first few and how many more. */
export const countryPageDescription = (count: number, country: string, listed: string): string =>
  `The ${count} work-permit routes we hold rules for in ${country}: ${listed} — each with the authority's own `
  + "sentence for every value and the day it was read.";
export const countryLedeOpen = (country: string): string =>
  `Every employment route ${country} publishes that a rule can decide, each on its own page with the authority's `
  + "sentences and the day we read them.";
export const LISTED_WITH_THEIR_REASONS = "listed with their reasons";
export const discretionLeftOutLine = (door: string): string => `Routes that turn on an official's discretion are ${door}, not here.`;
export const RESULT_NAMES_FITTING_ROUTES = "The result names which of these routes fit.";
