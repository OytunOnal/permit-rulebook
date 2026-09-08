import type { Country, Dataset, Route } from "permit-rulebook-data";

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
 * A link is not louder than a declaration: where the person has already
 * answered where they are going, that answer stands, even when the link
 * disagrees with it. The route still sorts first — they did come from its page
 * — but nothing they told us is overwritten.
 */
export function destinationFor(arrival: ScopedArrival | null, answers: Record<string, string>): string | null {
  if (!arrival || answers["destination"] !== undefined) return null;
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
 * as a route arrival: a link is never louder than a declaration.
 */
export function destinationForCountry(
  country: Country | null, answers: Record<string, string>,
): string | null {
  if (!country || answers["destination"] !== undefined) return null;
  return country.code.toLowerCase();
}
