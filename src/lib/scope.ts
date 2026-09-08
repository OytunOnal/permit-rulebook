import { rescopeProfile } from "permit-rulebook-data";
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
 * Which route a link claims to come from, if the dataset has one by that name.
 * An id nothing answers to is ignored rather than reported: a stranger pasting
 * a stale URL gets the ordinary interview, not an error about a route id.
 */
export function arrivalFrom(dataset: Dataset, search: string): ScopedArrival | null {
  const id = new URLSearchParams(search).get("route");
  if (!id) return null;
  for (const country of dataset.countries)
    for (const route of country.routes)
      if (route.id === id) return { route, country };
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
export function destinationFor(arrival: ScopedArrival | null, _answers: Record<string, string> = {}): string | null {
  if (!arrival) return null;
  return arrival.country.code.toLowerCase();
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
  const code = new URLSearchParams(search).get("country");
  if (!code) return null;
  return dataset.countries.find((c) => c.code.toLowerCase() === code.toLowerCase()) ?? null;
}

/**
 * The destination a country arrival puts on the record, or nothing. Same rule
 * as a route arrival: the country the reader pressed is the country they are
 * asking about.
 */
export function destinationForCountry(
  country: Country | null, _answers: Record<string, string> = {},
): string | null {
  if (!country) return null;
  return country.code.toLowerCase();
}

/**
 * The record this arrival lands on.
 *
 * Everything the reader told us is theirs and is kept, amounts included — the
 * money ladder is one pooled list for all four countries, so a band means the
 * same euros wherever they are headed. Only the destination changes, and
 * `changed` is what the screen says out loud. What the new country's rules no
 * longer ask is dropped by the interview's own replay, where every other
 * change of answer is.
 */
export function rescopedFor(
  dataset: Dataset, destination: string, answers: Profile,
): { answers: Profile; changed: boolean } {
  const changed = answers["destination"] !== destination;
  return { answers: rescopeProfile(dataset, answers, destination).profile, changed };
}
