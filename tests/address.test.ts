import { describe, expect, it } from "vitest";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset, Route } from "permit-rulebook-data";
import { routeAddresses, routeSlug } from "../src/lib/slug.js";

const ds = dataset as unknown as Dataset;
const routes = ds.countries.flatMap((c) => c.routes);
const byId = (id: string): Route => {
  const route = routes.find((r) => r.id === id);
  if (!route) throw new Error(`no route ${id}`);
  return route;
};

/**
 * An address is a promise; a name is not.
 *
 * The human's walk on 2026-09-10 corrected four route names that had not
 * earned their meaning — and because the address was derived from the name,
 * all four pages moved. They had been in the sitemap sent to Google and Bing
 * since v1. These are the addresses those pages shipped with, and this test is
 * what keeps a future wording round from moving them again.
 */
describe("the addresses v1 published", () => {
  const published: Array<[string, string]> = [
    ["fr-ict", "ict-seconded-employee"],
    ["de-ict-card", "ict-card-intra-corporate-transfer"],
    ["nl-ict", "intra-corporate-transferee"],
    ["nl-orientation-year", "orientation-year"],
  ];

  for (const [id, address] of published)
    it(`${id} still answers at /${address}`, () => {
      expect(routeSlug(byId(id))).toBe(address);
    });

  it("keeps the address when the name changes again", () => {
    const renamed = { ...byId("fr-ict"), name: "Something else entirely" };
    expect(routeSlug(renamed)).toBe("ict-seconded-employee");
  });

  it("derives from the name where no address was promised", () => {
    const fresh = { ...byId("fr-ict"), slug: undefined, name: "EU Blue Card (carte bleue)" };
    expect(routeSlug(fresh)).toBe("eu-blue-card");
  });
});

describe("every page has one address", () => {
  it("no two routes want the same page", () => {
    expect(() => routeAddresses(ds)).not.toThrow();
    expect(routeAddresses(ds)).toHaveLength(routes.length);
  });

  it("pinned addresses are readable, lowercase and hyphenated", () => {
    for (const route of routes.filter((r) => r.slug))
      expect(route.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
});
