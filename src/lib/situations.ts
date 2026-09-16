import {
  DESTINATION_FIELD, SITUATION_FIELD, fieldOptions, isScored, joinOr, situationsAsked,
  type Dataset, type Profile,
} from "permit-rulebook-data";
import {
  READ_ITS_RULES, READ_IT_HERE, notScoredLine, notScoredQuotedLine, unscoredHeadline, unscoredRestLine,
  unscoredRouteLine,
} from "./copy.js";
import { esc, escAttr } from "./reason.js";
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
 */
export interface NotScoredMark {
  /** The country's name, the dataset's. */
  country: string;
  /** The quoted route that carries this situation, when one does. */
  route?: { name: string; path: string };
}

/** The situation option's `short`, the words a sentence reads it in. */
const situationPhrase = (ds: Dataset, value: string): string => {
  const o = fieldOptions(ds, SITUATION_FIELD).find((x) => x.value === value);
  return o?.short ?? o?.label ?? value;
};

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
    country: country.name,
    ...(quoted ? { route: { name: quoted.name, path: routePath(country, quoted) } } : {}),
  };
}

/** The mark as the question screen draws it: the copy's line, with the door
 * on the last three words where there is a page to open. */
export function notScoredMarkHtml(mark: NotScoredMark): string {
  if (!mark.route) return esc(notScoredLine(mark.country));
  const line = esc(notScoredQuotedLine(mark.country, mark.route.name));
  const door = `<a href="${escAttr(url(mark.route.path))}">${esc(READ_IT_HERE)}</a>`;
  return line.replace(esc(READ_IT_HERE), door);
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
 */
export interface UnscoredVerdict {
  headline: string;
  /** The whole subline, as text — what the live region announces. */
  subline: string;
  /** The words of the subline that are the link, and where it goes. */
  door?: { text: string; href: string };
}

export function unscoredVerdict(ds: Dataset, answers: Profile): UnscoredVerdict | null {
  const destination = answers[DESTINATION_FIELD];
  const situation = answers[SITUATION_FIELD];
  if (destination === undefined || situation === undefined) return null;
  const mark = notScoredFor(ds, destination, situation);
  if (!mark) return null;
  const asked = situationsAsked(ds).get(destination) ?? new Set<string>();
  const steps = joinOr(fieldOptions(ds, SITUATION_FIELD)
    .filter((o) => asked.has(o.value) && !o.is_fallback && !o.is_unknown)
    .map((o) => o.short ?? o.label));
  const phrase = situationPhrase(ds, situation);
  const rest = unscoredRestLine(steps);
  return {
    headline: unscoredHeadline(mark.country, phrase),
    subline: mark.route ? `${unscoredRouteLine(mark.country, phrase, mark.route.name)} ${rest}` : rest,
    ...(mark.route ? { door: { text: READ_ITS_RULES, href: url(mark.route.path) } } : {}),
  };
}
