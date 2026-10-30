// @level presentation
import type { Dataset } from "permit-rulebook-data";
import { countryPath } from "../../slug.js";
import type { NavLink } from "./site-header.js";

/**
 * The countries the header and the footer link, one per country the dataset
 * holds, each at its page's path and under its own name. Built from the
 * dataset and the slugs, never from a page, so the frame imports no page.
 */
export function navCountries(dataset: Dataset): NavLink[] {
  return dataset.countries.map((country) => ({ path: countryPath(country), label: country.name }));
}
