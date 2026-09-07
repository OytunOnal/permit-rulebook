import type { Country, Dataset, Route } from "permit-rulebook-data";

/**
 * The address of a route page.
 *
 * `/germany/eu-blue-card-general` — the country as a person names it, the route
 * as the authority names it. Not the dataset ids (`de-blue-card-general`),
 * which are keys, not words: a URL a stranger sees in a search result is a
 * user-facing string like any other, and a two-letter storage prefix is a fact
 * about us.
 *
 * The slug is derived from the route's own name, with anything the authority
 * put in brackets — the local-language name, the statute number — dropped: it
 * is there to disambiguate on a card, and it makes an unreadable URL. What
 * remains has to be unique inside its country, which `routeAddresses` proves
 * rather than assumes; a collision would silently overwrite one route's page
 * with another's at build time.
 *
 * Accents are decomposed and their marks dropped, so a French route name is
 * still addressable if one ever escapes its brackets.
 */
const DIACRITICS = /\p{M}/gu;

/**
 * Brackets come off from the inside out. A single pass over `\([^)]*\)` stops
 * at the first closing bracket, so "Researcher (Directive (EU) 2016/801)" kept
 * its tail and addressed itself `/netherlands/researcher-2016-801` — a URL
 * built from a directive number nobody searches for.
 */
const withoutBrackets = (s: string): string => {
  let out = s;
  for (;;) {
    const next = out.replace(/\([^()]*\)/g, " ");
    if (next === out) return next.replace(/[()]/g, " ");
    out = next;
  }
};

const slugify = (s: string): string =>
  withoutBrackets(s.normalize("NFD").replace(DIACRITICS, ""))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const countrySlug = (country: Country): string => slugify(country.name);

export const routeSlug = (route: Route): string => slugify(route.name);

export const routePath = (country: Country, route: Route): string =>
  `/${countrySlug(country)}/${routeSlug(route)}`;

/** The data door: this one route, as the dataset holds it. */
export const routeJsonPath = (country: Country, route: Route): string =>
  `${routePath(country, route)}.json`;

export interface RouteAddress {
  country: Country;
  route: Route;
  countrySlug: string;
  routeSlug: string;
  path: string;
}

/**
 * Every route page this dataset produces, addressed. Throws on a collision:
 * two routes sharing an address is one route with no page, and a build that
 * ships twenty-two pages where it promised twenty-three should not be quiet
 * about it.
 */
export function routeAddresses(dataset: Dataset): RouteAddress[] {
  const seen = new Map<string, string>();
  const out: RouteAddress[] = [];
  for (const country of dataset.countries)
    for (const route of country.routes) {
      const address = {
        country, route,
        countrySlug: countrySlug(country),
        routeSlug: routeSlug(route),
        path: routePath(country, route),
      };
      const clash = seen.get(address.path);
      if (clash)
        throw new Error(
          `two routes want the same page: ${clash} and ${route.id} both address ${address.path}`,
        );
      seen.set(address.path, route.id);
      out.push(address);
    }
  return out;
}
