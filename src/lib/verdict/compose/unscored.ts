// @level presentation
import {
  SITUATION_FIELD, fieldOptions, joinOr, possessiveAtStartOf, situationsAsked, type Country, type Dataset, type Profile,
} from "permit-rulebook-data";
import {
  READ_ITS_RULES, unscoredHeadline, unscoredNamedRestLine, unscoredRestLine, unscoredRouteLine, unscoredTallyLine,
} from "../../copy/verdict.js";
import { esc, sentenceWithLinkHtml } from "../../reason.js";
import { url } from "../../site.js";
import { routePath } from "../../slug.js";
import type { NotScoredMark } from "../../situations.js";
import { phraseOfAnswer } from "./answer-phrase.js";
import { countryMarkOf, writtenStateKeyOf } from "../reckon/reckon-verdict.js";

/**
 * What the verdict says where the declared situation is one no scored route
 * in a country takes (s19): the country's line on the four-country result,
 * and the written state a zero-open result reads. Where the marks stand is
 * the layout's (`countryMarkOf`, `writtenStateKeyOf`); this words them. The
 * mark itself — which situation a country's scored routes do not take — is
 * the question card's as much as the verdict's, and stays beside it.
 */

/** Where the quoted route's page is: the mark names the route and its
 * country, and the verdict builds the address (ruling 19). */
const quotedHref = (quoted: NonNullable<NotScoredMark["quoted"]>): string => url(routePath(quoted.country, quoted.route));

/** The situation option's `short`, the words a sentence reads it in. */
const situationPhrase = (ds: Dataset, value: string): string => {
  const o = fieldOptions(ds, SITUATION_FIELD).find((x) => x.value === value);
  return o ? phraseOfAnswer(o) : value;
};

/**
 * One country's summary line on the four-country result, when the declared
 * situation is one its scored routes do not take (s21).
 *
 * The country's own line carries the s19 sentence in place of a not-yet
 * count, which would say "5 not yet" of routes that cannot take the reader's
 * situation at all: the headline s19 would have written for
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
  const mark = countryMarkOf(ds, country, situation);
  if (!mark || situation === undefined) return null;
  const text = unscoredTallyLine(mark.country, situationPhrase(ds, situation), mark.quoted?.route.name);
  const html = mark.quoted ? sentenceWithLinkHtml(text, mark.quoted.route.name, quotedHref(mark.quoted)) : esc(text);
  return { text, html };
}

/**
 * The written state a zero-open result reads when the declared situation is
 * marked for the declared destination (s19): its headline, and its subline
 * with the one door in it.
 */
export interface UnscoredVerdict {
  headline: string;
  /** The whole subline, as text — what the live region announces. */
  subline: string;
  /** The words of the subline that are the link, and where it goes. */
  door?: { text: string; href: string };
}

/**
 * The written state itself, in place of "Nothing open", never in addition to
 * it (s19, point 3).
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
 * "the routes below" are four countries' here. Which country the
 * four-country result leads with is the layout's, read from the same key.
 */
export function unscoredVerdict(ds: Dataset, answers: Profile): UnscoredVerdict | null {
  const keyed = writtenStateKeyOf(ds, answers);
  if (!keyed) return null;
  const { key, named, mark, situation } = keyed;
  const asked = situationsAsked(ds).get(key) ?? new Set<string>();
  const steps = joinOr(fieldOptions(ds, SITUATION_FIELD)
    .filter((o) => asked.has(o.value) && !o.is_fallback && !o.is_unknown)
    .map(phraseOfAnswer));
  const phrase = situationPhrase(ds, situation);
  const opening = possessiveAtStartOf(key.toUpperCase());
  const rest = named ? unscoredNamedRestLine(opening, steps) : unscoredRestLine(steps);
  return {
    headline: unscoredHeadline(mark.country, phrase),
    subline: mark.quoted ? `${unscoredRouteLine(opening, phrase, mark.quoted.route.name)} ${rest}` : rest,
    ...(mark.quoted ? { door: { text: READ_ITS_RULES, href: quotedHref(mark.quoted) } } : {}),
  };
}
