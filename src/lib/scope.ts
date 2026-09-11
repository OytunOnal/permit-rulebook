import { isScored, joinAnd, remainingQuestions, shortLabelOf, subjectOf } from "permit-rulebook-data";
import type { Country, Dataset, Profile, Route } from "permit-rulebook-data";

/**
 * Arriving at the interview from a route page.
 *
 * A route page's one call to action is `/?route=<route id>`, and it does two
 * things and no more: the destination goes on the record, so the interview
 * starts where the reader already is, and that route sorts first in whatever
 * group it lands in when the results come.
 *
 * It lives here rather than inside the page for the reason `screen.ts` does:
 * the behaviour the scenario walks in step 10 — "the pre-scoped route appears
 * first in the results and every behaviour from s5d and s5e holds" — has to be
 * readable by a test, and a rule written inline in a template is checked by
 * reading the template.
 */
export interface ScopedArrival {
  route: Route;
  country: Country;
}

/**
 * Which route a link claims to come from, if the dataset has one by that name
 * AND the product scores it. An id nothing answers to is ignored rather than
 * reported: a stranger pasting a stale URL gets the ordinary interview, not an
 * error about a route id.
 *
 * A route the product does not score is ignored the same way, and for a
 * sharper reason. No page emits a link to one — those pages carry the
 * country's own link instead — but a hand-typed or stale `?route=` would put
 * the route's name in the interview's opening sentence and sort it first in
 * results it can never appear in: the screen would promise a verdict on the one
 * route the whole page said it would never reach (s9).
 */
export function arrivalFrom(dataset: Dataset, search: string): ScopedArrival | null {
  const id = new URLSearchParams(search).get("route");
  if (!id) return null;
  for (const country of dataset.countries)
    for (const route of country.routes)
      if (route.id === id) return isScored(route) ? { route, country } : null;
  return null;
}

/**
 * The destination this arrival puts on the record, or nothing.
 *
 * An arrival that names a country IS a declaration: the reader is standing on
 * that country's page and pressed its own button. The old rule — a link is
 * never louder than an answer — left a returning reader who pressed "Check
 * yours — France" looking at her German verdicts with the word France nowhere
 * on the screen (isolated v1-gate critique, 2026-09-08, B2). A stale answer is
 * not louder than the question the reader is asking now; it is re-scoped, and
 * the screen says so.
 */
export function destinationFor(arrival: ScopedArrival | null): string | null {
  return arrival ? arrival.country.code.toLowerCase() : null;
}

/**
 * The route the reader came from, first. `sort` is stable, so everything else
 * keeps the order the engine gave it.
 */
export function scopedFirst<T extends { route: { id: string } }>(rows: T[], routeId: string | null): T[] {
  if (!routeId) return rows;
  return [...rows].sort((a, b) =>
    Number(b.route.id === routeId) - Number(a.route.id === routeId));
}

/**
 * Arriving from a country page's "Check yours — Germany".
 *
 * The country index's one call to action is `/?country=<code>`, and it does the
 * lesser half of what a route link does: the destination goes on the record, so
 * the interview starts where the reader already is, and nothing sorts first
 * because no route was named (human, 2026-09-08).
 *
 * A code the dataset does not have is ignored, for the reason a stale route id
 * is: a stranger with an old link gets the ordinary interview, not an error.
 */
export function countryArrivalFrom(dataset: Dataset, search: string): Country | null {
  const params = new URLSearchParams(search);
  const code = params.get("country");
  if (code)
    return dataset.countries.find((c) => c.code.toLowerCase() === code.toLowerCase()) ?? null;
  // A route this product does not score still stands in a country, and the
  // reader pressed the button on its page. `arrivalFrom` refuses it — rightly,
  // because there is no verdict to scope to — and until this branch that
  // refusal threw the country away with it, landing a reader who came from a
  // French permit's page on an interview about nowhere (Spec review,
  // 2026-09-10).
  const id = params.get("route");
  if (!id) return null;
  for (const country of dataset.countries)
    for (const route of country.routes)
      if (route.id === id && !isScored(route)) return country;
  return null;
}

/**
 * The destination a country arrival puts on the record, or nothing. Same rule
 * as a route arrival: the country the reader pressed is the country they are
 * asking about.
 */
export function destinationForCountry(country: Country | null): string | null {
  return country ? country.code.toLowerCase() : null;
}

/**
 * How a question is named inside a sentence about it.
 *
 * The dataset writes two names for every field: a `subject`, a noun phrase
 * built to sit inside a sentence ("your German level", "whether your work is
 * in information technology"), and a `short_label` for the answer ledger ("IT
 * work"). The line that named a returning question lower-cased the ledger
 * label, which turned the acronym in "IT work" into a fragment — the live site
 * read "we ask again about it work" (human re-read, 2026-09-08).
 *
 * So: the subject, which is already a phrase in the case the dataset wrote it;
 * the short label verbatim if a field has no subject; and, if the dataset has
 * neither, a phrase that is still a sentence rather than a field id.
 */
export function questionPhrase(dataset: Dataset, field: string): string {
  const subject = subjectOf(dataset, field);
  if (subject !== field) return subject;
  const short = shortLabelOf(dataset, field);
  if (short !== field) return short;
  return "one more question";
}

/**
 * The record, replayed against the rules as they stand.
 *
 * Every answer is kept only while the interview would still ask its question:
 * a fact the flow has retired — the Dutch designated-institution question
 * after the salary answer settles it, every German-only question once the
 * reader is asking about France — leaves the ledger rather than sitting in it
 * unexplained. One implementation, because the interview replays on an edit
 * and on an arrival, and two copies of this rule would disagree about what a
 * reader still has on the record.
 */
export function replayRecord(
  dataset: Dataset, answers: Profile, order: readonly string[],
): { answers: Profile; order: string[] } {
  const kept: Profile = {};
  const keptOrder: string[] = [];
  for (const field of order) {
    if (answers[field] === undefined) continue;
    if (!remainingQuestions(dataset, kept).some((q) => q.field === field)) continue;
    kept[field] = answers[field];
    keptOrder.push(field);
  }
  return { answers: kept, order: keptOrder };
}

/**
 * What an arrival does to the record, and what the screen can honestly say
 * about it.
 *
 * `kept` and `asks` are the two facts the reader needs: which of their answers
 * survived the move, and how many questions this country still has for them.
 * Both are read off the record as it stands AFTER the move — the line used to
 * be built from the answers that were dropped, and told a reader arriving in
 * France that five German questions were coming back when what actually
 * followed were two French ones (Spec review, 2026-09-08).
 */
export function arrivalPlan(
  dataset: Dataset, answers: Profile, order: readonly string[], destination: string,
): { answers: Profile; order: string[]; kept: string[]; asks: number; changed: boolean } {
  const changed = answers["destination"] !== destination;
  // An arrival that changes nothing changes nothing: a reader already here
  // keeps the record exactly as they left it, replay included (Spec review,
  // 2026-09-08 — and a plan that tidied a record nobody asked to tidy would
  // be a silent edit).
  if (!changed)
    return {
      answers, order: [...order], changed,
      kept: order.filter((f) => f !== "destination" && answers[f] !== undefined),
      asks: remainingQuestions(dataset, answers).length,
    };
  // The money ladder is one pooled list for all four countries, so every
  // amount means what it meant: only the destination changes here, and the
  // replay below decides what the new country still asks about.
  const moved: Profile = { ...answers, destination };
  const inOrder = order.includes("destination") ? [...order] : ["destination", ...order];
  const replayed = replayRecord(dataset, moved, inOrder);
  return {
    ...replayed,
    // The destination is the thing that just changed; the sentence names it in
    // its own clause rather than listing it as an answer that survived.
    kept: replayed.order.filter((f) => f !== "destination"),
    asks: remainingQuestions(dataset, replayed.answers).length,
    changed,
  };
}

/**
 * The one line an arrival prints, on whichever screen the reader lands on.
 *
 * `rescoped` is the difference between a reader who told us nothing yet and a
 * reader whose record said another country a moment ago: the second one is
 * being moved, and the sentence says so rather than describing a record they
 * did not write. Everything after the opening is read forwards — the answers
 * that survived, and the questions that are actually coming.
 */
export function arrivalSentence(dataset: Dataset, o: {
  from: string; place: string; rescoped: boolean;
  kept: readonly string[]; asks: number;
}): string {
  // A reader who clicked France's own page is not told they came from France
  // to France: where the origin and the place are the same name, the sentence
  // states the place once (read live, 2026-09-08 — "Starting from France —
  // France is on the record. … France asks 1 more question." said France three
  // times before it said anything).
  const opening = o.from === o.place
    ? (o.rescoped ? `${o.place} is on the record now.` : `${o.place} is on the record.`)
    : o.rescoped
      ? `Starting from ${o.from} — ${o.place} is on the record.`
      : `Coming from ${o.from} — ${o.place} is on the record.`;
  // A reader who has answered nothing has no answers to account for, and the
  // question counter under this line already says how many are coming.
  if (!o.rescoped) return opening;
  const clauses: string[] = [];
  if (o.kept.length)
    clauses.push(`Your answers about ${joinAnd(o.kept.map((f) => questionPhrase(dataset, f)))} are kept`);
  if (o.asks > 0)
    clauses.push(`${o.place} asks ${o.asks} more question${o.asks === 1 ? "" : "s"}`);
  return clauses.length ? `${opening} ${clauses.join("; ")}.` : opening;
}
