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
