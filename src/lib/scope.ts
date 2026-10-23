// @level application
import { isScored, remainingQuestions } from "permit-rulebook-data";
import type { Country, Dataset, Profile, Route } from "permit-rulebook-data";

/**
 * Arriving at the interview from a route page.
 *
 * A route page's one call to action is `/?route=<route id>`, and it does two
 * things and no more: the destination goes on the record, so the interview
 * starts where the reader already is, and that route sorts first in whatever
 * group it lands in when the results come.
 *
 * The whole arrival is decided by `arrivalOf`, one call a test drives with the
 * address as a string; the line's words and markup are `arrival-line.ts`'.
 */
interface ScopedArrival {
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
function arrivalFrom(dataset: Dataset, search: string): ScopedArrival | null {
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
function destinationFor(arrival: ScopedArrival | null): string | null {
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
function countryArrivalFrom(dataset: Dataset, search: string): Country | null {
  const params = new URLSearchParams(search);
  const code = params.get("country");
  if (code)
    return dataset.countries.find((c) => c.code.toLowerCase() === code.toLowerCase()) ?? null;
  // A route this product does not score still stands in a country, and the
  // reader pressed the button on its page. `arrivalFrom` refuses it — rightly,
  // because there is no verdict to scope to — and without this branch the
  // refusal would throw the country away with it, sending a reader who came
  // from a French permit's page to an interview about nowhere.
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
function destinationForCountry(country: Country | null): string | null {
  return country ? country.code.toLowerCase() : null;
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
 *
 * `setAside` is every answer the replay dropped, in asked order: after an
 * edit the panel names them once, so nothing the reader said leaves in
 * silence (#137).
 */
export function replayRecord(
  dataset: Dataset, answers: Profile, order: readonly string[],
): { answers: Profile; order: string[]; setAside: string[] } {
  const kept: Profile = {};
  const keptOrder: string[] = [];
  const setAside: string[] = [];
  for (const field of order) {
    if (answers[field] === undefined) continue;
    if (!remainingQuestions(dataset, kept).some((q) => q.field === field)) {
      setAside.push(field);
      continue;
    }
    kept[field] = answers[field];
    keptOrder.push(field);
  }
  return { answers: kept, order: keptOrder, setAside };
}

/** The record an arrival finds: the answers, and the fields in the order they were asked. */
export interface RecordOnArrival {
  answers: Profile;
  order: readonly string[];
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
function arrivalPlan(
  dataset: Dataset, record: RecordOnArrival, destination: string,
): { answers: Profile; order: string[]; kept: string[]; asks: number; changed: boolean } {
  const { answers, order } = record;
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
 * What an arrival did, as facts the line may state: the route the reader came
 * from (null when they came from a country's own page), the country's code,
 * whether the record named another country a moment ago, which answers
 * survived the move, and how many questions this country still asks.
 */
export interface ArrivalFacts {
  route: Route | null;
  country: string;
  rescoped: boolean;
  kept: string[];
  asks: number;
}

/**
 * An arrival, decided once: the record after the move (unchanged when nothing
 * moved), the route that sorts first in the verdict, and the facts of the
 * arrival line, or null when nothing moved.
 */
export interface Arrival {
  record: { answers: Profile; order: string[] };
  scopedRouteId: string | null;
  line: ArrivalFacts | null;
}

/**
 * The arrival the address makes (`location.search`): the reader is put where
 * the address says they are.
 *
 * The country it names replaces the destination on the record and everything
 * else the reader told us is kept while the new country still asks it,
 * because a reader standing on France's page pressing France's own button is
 * asking about France — whatever they asked yesterday (B2). A route it names
 * sorts first whether or not the record moved.
 */
export function arrivalOf(dataset: Dataset, search: string, record: RecordOnArrival): Arrival {
  const cameFrom = arrivalFrom(dataset, search);
  const scopedRouteId = cameFrom ? cameFrom.route.id : null;
  const country = cameFrom ? cameFrom.country : countryArrivalFrom(dataset, search);
  const destination = cameFrom ? destinationFor(cameFrom) : destinationForCountry(country);
  const untouched = { answers: record.answers, order: [...record.order] };
  if (destination === null || !country) return { record: untouched, scopedRouteId, line: null };
  const plan = arrivalPlan(dataset, record, destination);
  // Nothing moved: the reader is already here, and a line saying so is a line
  // about nothing.
  if (!plan.changed) return { record: untouched, scopedRouteId, line: null };
  const line: ArrivalFacts = {
    route: cameFrom ? cameFrom.route : null,
    country: country.code,
    rescoped: record.answers["destination"] !== undefined,
    kept: plan.kept,
    asks: plan.asks,
  };
  return { record: { answers: plan.answers, order: plan.order }, scopedRouteId, line };
}
