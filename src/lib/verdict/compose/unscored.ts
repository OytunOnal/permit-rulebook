// @level presentation
import {
  DESTINATION_FIELD, SITUATION_FIELD, fieldOptions, joinOr, possessiveAtStartOf, situationsAsked,
  type Country, type Dataset, type Profile,
} from "permit-rulebook-data";
import {
  READ_ITS_RULES, unscoredHeadline, unscoredNamedRestLine, unscoredRestLine, unscoredRouteLine, unscoredTallyLine,
} from "../../copy.js";
import { esc, escAttr } from "../../reason.js";
import { url } from "../../site.js";
import type { UnscoredVerdict } from "../../screen.js";
import { SITUATION_COUNTRY_FIELD, notScoredFor } from "../../situations.js";

/**
 * What the verdict says where the declared situation is one no scored route
 * in a country takes (s19): the country's line on the four-country result,
 * the written state a zero-open result reads, and which country leads. The
 * mark itself — which situation a country's scored routes do not take — is
 * the question card's as much as the verdict's, and stays beside it.
 */

/** The situation option's `short`, the words a sentence reads it in. */
const situationPhrase = (ds: Dataset, value: string): string => {
  const o = fieldOptions(ds, SITUATION_FIELD).find((x) => x.value === value);
  return o?.short ?? o?.label ?? value;
};

/**
 * One country's summary line on the four-country result, when the declared
 * situation is one its scored routes do not take (s21).
 *
 * The country's own line, which used to count its routes as "5 not yet",
 * carries the s19 sentence instead: the headline s19 would have written for
 * that country alone, then the quoted route, whose name is the link. The
 * text form is what the line reads as; the HTML form is the same words with
 * the door on the route's name. It is the line whatever the headline is:
 * the open one when something is open elsewhere, the named country's own
 * written state when nothing is (s26) — the line is the section's tally,
 * and a reader who skips the masthead lands on it.
 */
export interface UnscoredTally {
  text: string;
  html: string;
}

export function unscoredTally(ds: Dataset, country: Country, situation: string | undefined): UnscoredTally | null {
  if (situation === undefined) return null;
  const mark = notScoredFor(ds, country.code.toLowerCase(), situation);
  if (!mark) return null;
  const text = unscoredTallyLine(mark.country, situationPhrase(ds, situation), mark.route?.name);
  const html = mark.route
    ? esc(text).replace(esc(mark.route.name), `<a href="${escAttr(url(mark.route.path))}">${esc(mark.route.name)}</a>`)
    : esc(text);
  return { text, html };
}

/**
 * The written state a zero-open result reads when the declared situation is
 * marked for the declared destination — in place of "Nothing open", never in
 * addition to it (s19, point 3).
 *
 * `steps` is what the country's scored routes do take: the situations the
 * engine says they ask, less the fallback, in the option's short words and
 * joined the way the hold list joins them, so the subline and the group
 * summary below it cannot name the same thing two ways.
 *
 * On the four-country path the destination answer is "all", under which
 * nothing is marked — but the reader who answered it was asked which country
 * their agreement is in, and that answer is a one-country destination answer
 * (s21). It is the key there (s26): the same researcher read s19's written
 * state on the France path and "Nothing open" on this one, the sentence that
 * explained it third in France's line, under Germany's. One function, one
 * copy — the direct path and the four-country path read the same headline
 * for the same answers, and only the rest sentence names the country, since
 * "the routes below" are four countries' here. The four-country verdict also
 * says which country it is about, so the result can lead with that
 * country's section.
 */
export function unscoredVerdict(ds: Dataset, answers: Profile): UnscoredVerdict | null {
  const destination = answers[DESTINATION_FIELD];
  const situation = answers[SITUATION_FIELD];
  if (destination === undefined || situation === undefined) return null;
  // Keyed by the named country where the destination is all four, and by the
  // destination itself everywhere else — the direct path never asks question
  // 3, so a country answer under a one-country destination is not a key.
  const named = destination === "all" ? answers[SITUATION_COUNTRY_FIELD] : undefined;
  const key = named ?? destination;
  const mark = notScoredFor(ds, key, situation);
  if (!mark) return null;
  const asked = situationsAsked(ds).get(key) ?? new Set<string>();
  const steps = joinOr(fieldOptions(ds, SITUATION_FIELD)
    .filter((o) => asked.has(o.value) && !o.is_fallback && !o.is_unknown)
    .map((o) => o.short ?? o.label));
  const phrase = situationPhrase(ds, situation);
  const opening = possessiveAtStartOf(key.toUpperCase());
  const rest = named ? unscoredNamedRestLine(opening, steps) : unscoredRestLine(steps);
  return {
    headline: unscoredHeadline(mark.country, phrase),
    subline: mark.route ? `${unscoredRouteLine(opening, phrase, mark.route.name)} ${rest}` : rest,
    ...(mark.route ? { door: { text: READ_ITS_RULES, href: url(mark.route.path) } } : {}),
    ...(named ? { lead: named } : {}),
  };
}

/**
 * Which country leads the four-country result, open — the one the reader
 * named at question 3, when nothing is open anywhere and its scored routes
 * do not take the declared situation — or none (s26). The decision is the
 * headline's: the written state is drawn only on a zero-open result, and the
 * country it names is the country that leads; with something open anywhere,
 * or a written state for nobody, the sections keep the dataset's order. One
 * function, so the sections and the headline cannot decide it two ways.
 */
export function leadCountry(ds: Dataset, answers: Profile, zeroOpen: boolean): string | undefined {
  return zeroOpen ? unscoredVerdict(ds, answers)?.lead : undefined;
}

/** Whether this country is the one that leads: the one predicate the order
 * and the section's open state read. */
export const leads = (country: { code: string }, lead: string | undefined): boolean =>
  lead !== undefined && country.code.toLowerCase() === lead;

/**
 * The country sections of the four-country result, the named country's
 * first (s26): the section the headline is about leads the list, and the
 * others keep the dataset's order. `sort` is stable, so nothing else moves;
 * with no country to lead, or one the list does not hold, the order is the
 * dataset's.
 */
export function namedFirst<T extends { code: string }>(countries: readonly T[], lead: string | undefined): T[] {
  return [...countries].sort((a, b) => Number(leads(b, lead)) - Number(leads(a, lead)));
}
