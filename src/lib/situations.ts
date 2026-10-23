// @level presentation
import {
  DESTINATION_FIELD, SITUATION_FIELD, phraseOf, fieldOptions, isScored, situationsAsked, type Dataset, type Profile,
} from "permit-rulebook-data";
import { READ_IT_HERE, notCheckedLine, notCheckedQuotedLine } from "./copy/interview.js";
import { esc, sentenceWithLinkHtml } from "./reason.js";
import { routePath } from "./slug.js";
import { url } from "./site.js";

/**
 * A situation no scored route in the chosen country takes (s19).
 *
 * France's five scored routes gate on an offer or a transfer; none takes a
 * hosting agreement; the interview offered it anyway, and the reader who took
 * it was shown a rejection for a route that was merely absent (v1.1 gate
 * critique, B1). The fact was derivable and nothing derived it. This module
 * does: which answers to the situation question a destination's scored
 * routes accept comes from the engine (`situationsAsked`, the same gates every
 * verdict reads), and the quoted route that would have asked comes from the
 * one field a quoted route may carry for it (`situations`). No list typed.
 *
 * Keyed by the destination ANSWER, not the country: "all" is an answer, and
 * under it nothing is marked, because every situation has a scored route
 * somewhere. The fallback answer is never marked either — "None of these yet"
 * is every country's not-yet path, and the not-yet list with its unlocking
 * steps is that answer's written state already (s3b). The mark is for a
 * situation a reader HAS that no scored route in that country takes.
 *
 * The reader who answered "all" is asked which country their offer, transfer
 * or agreement is in, and that question's options are the four one-country
 * destination answers. So the same set answers for it, keyed the other way
 * round — the situation is on the record, the option is the country — and
 * the same mark is drawn under France there (s21, v1.1 gate critique N1).
 */
export interface NotScoredMark {
  /** The country's phrase within a sentence, the data package's. */
  country: string;
  /** The quoted route that carries this situation, when one does. */
  route?: { name: string; path: string };
}

const countryOf = (ds: Dataset, destination: string) =>
  ds.countries.find((c) => c.code.toLowerCase() === destination);

/**
 * The mark for one situation answer under one destination answer, or nothing
 * where a scored route takes it, where the destination is not one country,
 * or where the answer is the fallback.
 */
export function notScoredFor(ds: Dataset, destination: string | undefined, situation: string): NotScoredMark | null {
  if (destination === undefined) return null;
  const option = fieldOptions(ds, SITUATION_FIELD).find((o) => o.value === situation);
  if (!option || option.is_fallback || option.is_unknown) return null;
  const asked = situationsAsked(ds).get(destination);
  if (!asked || asked.has(situation)) return null;
  const country = countryOf(ds, destination);
  if (!country) return null;
  const quoted = country.routes.find((r) => !isScored(r) && r.situations?.includes(situation));
  return {
    country: phraseOf(country.code),
    ...(quoted ? { route: { name: quoted.name, path: routePath(country, quoted) } } : {}),
  };
}

/**
 * The third answer `situationsAsked` never walks: which country the offer,
 * transfer or agreement is in. Asked on the four-country path only, after the
 * situation, and answered with the same codes the destination is (s21).
 */
export const SITUATION_COUNTRY_FIELD = "situation_country";

/** One option of one question: the question's field and the option's value. */
export interface QuestionOption {
  field: string;
  value: string;
}

/**
 * The mark under one option of one question, for the answers on the record —
 * or nothing, for every question but the two that carry one.
 *
 * Question 2 (the situation): the option is the situation, the destination is
 * declared. Question 3 (the country): the option is a destination answer, the
 * situation is declared. One derivation either way; the renderer asks this
 * and never chooses a key itself.
 */
export function markUnder(ds: Dataset, option: QuestionOption, answers: Profile): NotScoredMark | null {
  const { field, value } = option;
  if (field === SITUATION_FIELD) return notScoredFor(ds, answers[DESTINATION_FIELD], value);
  if (field === SITUATION_COUNTRY_FIELD) {
    const situation = answers[SITUATION_FIELD];
    return situation === undefined ? null : notScoredFor(ds, value, situation);
  }
  return null;
}

/** The mark as the question screen draws it: the copy's line, with the door
 * on the last three words where there is a page to open. */
export function notScoredMarkHtml(mark: NotScoredMark): string {
  if (!mark.route) return esc(notCheckedLine(mark.country));
  return sentenceWithLinkHtml(notCheckedQuotedLine(mark.country, mark.route.name), READ_IT_HERE, url(mark.route.path));
}
