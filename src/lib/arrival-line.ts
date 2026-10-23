// @level presentation
import { joinAnd, phraseAtStartOf, phraseOf, shortLabelOf, subjectOf } from "permit-rulebook-data";
import type { Dataset } from "permit-rulebook-data";
import {
  answersKeptClause, comingFromRouteLine, placeAsksMoreClause, placeOnRecordLine, placeOnRecordNowLine,
  startingFromRouteLine, UNNAMED_QUESTION_PHRASE,
} from "./copy/interview.js";
import { type Glossary, glossSection } from "./gloss.js";
import { esc } from "./reason.js";
import type { ArrivalFacts } from "./scope.js";

/**
 * The arrival line: what an arrival did, in one sentence, on whichever screen
 * the reader lands on.
 *
 * The route path narrated itself and the country path did not (critique F15),
 * and neither said anything to a reader with a record — who is exactly the
 * reader whose screen just changed country (B2). The route's name is glossed
 * with the screen's own glossary, so an act it cites is explained once on
 * that screen, here or in the card below.
 */
export function arrivalLineHtml(dataset: Dataset, facts: ArrivalFacts, glossary: Glossary): string {
  const route = facts.route ? glossSection(facts.route.name, glossary) : null;
  return `<p class="recorded" role="status">${esc(arrivalSentence(dataset, { ...facts, route }))}</p>`;
}

/**
 * How a question is named inside a sentence about it.
 *
 * The dataset writes two names for every field: a `subject`, a noun phrase
 * built to sit inside a sentence ("your German level", "whether your work is
 * in information technology"), and a `short_label` for the answer ledger ("IT
 * work"). Lower-casing the ledger label turns the acronym in "IT work" into a
 * fragment ("it work").
 *
 * So: the subject, which is already a phrase in the case the dataset wrote it;
 * the short label verbatim if a field has no subject; and, if the dataset has
 * neither, a phrase that is still a sentence rather than a field id.
 */
function questionPhrase(dataset: Dataset, field: string): string {
  const subject = subjectOf(dataset, field);
  if (subject !== field) return subject;
  const short = shortLabelOf(dataset, field);
  if (short !== field) return short;
  return UNNAMED_QUESTION_PHRASE;
}

/**
 * The sentence. `rescoped` is the difference between a reader who told us
 * nothing yet and a reader whose record said another country a moment ago:
 * the second one is being moved, and the sentence says so rather than
 * describing a record they did not write. Everything after the opening is
 * read forwards — the answers that survived, and the questions that are
 * actually coming.
 *
 * `route` is the route's name as the screen prints it, or null when the
 * reader came from the country's own page; `country` is the country's code.
 */
function arrivalSentence(
  dataset: Dataset, o: Omit<ArrivalFacts, "route"> & { route: string | null },
): string {
  const place = phraseOf(o.country);
  const placeOpening = phraseAtStartOf(o.country);
  const opening = arrivalOpening(o, { place, placeOpening });
  // A reader who has answered nothing has no answers to account for, and the
  // question counter under this line already says how many are coming.
  if (!o.rescoped) return opening;
  const clauses: string[] = [];
  if (o.kept.length) clauses.push(answersKeptClause(joinAnd(o.kept.map((f) => questionPhrase(dataset, f)))));
  if (o.asks > 0) clauses.push(placeAsksMoreClause(clauses.length ? place : placeOpening, o.asks));
  return clauses.length ? `${opening} ${clauses.join("; ")}.` : opening;
}

/**
 * The arrival line's first sentence. A reader who came from a country's own
 * page (`route` null) is not told they came from it: the sentence states the
 * place once. One sent from a route page is told which route.
 */
function arrivalOpening(
  { route, rescoped }: { route: string | null; rescoped: boolean },
  names: { place: string; placeOpening: string },
): string {
  if (route === null) return rescoped ? placeOnRecordNowLine(names.placeOpening) : placeOnRecordLine(names.placeOpening);
  return rescoped ? startingFromRouteLine(route, names.place) : comingFromRouteLine(route, names.place);
}
