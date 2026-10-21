// @level presentation
import type { Country, Dataset } from "permit-rulebook-data";

/**
 * The dataset's country for a code. Every route the engine names carries a
 * country of the dataset, so a code the dataset lacks is a fault, and it
 * throws: a screen never draws a bare code where a country's name belongs.
 */
export function countryOf(dataset: Dataset, code: string): Country {
  const country = dataset.countries.find((c) => c.code === code);
  if (!country) throw new Error(`no country ${JSON.stringify(code)} in the dataset`);
  return country;
}
