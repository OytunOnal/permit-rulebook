import { describe, expect, it } from "vitest";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { countryOf } from "../src/lib/countries.js";

/**
 * One lookup for a country's name, on the question card and on the verdict:
 * a code the dataset lacks throws rather than drawing the bare code.
 */
const ds = rawDataset as unknown as Dataset;

describe("a country is looked up by its code", () => {
  it("each of the dataset's codes finds its own country", () => {
    for (const country of ds.countries) expect(countryOf(ds, country.code)).toBe(country);
  });

  it("a code the dataset lacks throws", () => {
    const missing = "XX";
    expect(ds.countries.some((c) => c.code === missing), "the dataset has the code this case calls missing").toBe(false);
    expect(() => countryOf(ds, missing)).toThrow(/XX/);
  });
});
