import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dataset from "permit-rulebook-data/data/dataset.json";
import type { Dataset } from "permit-rulebook-data";
import { datasetLd } from "../src/lib/dataset-ld.js";
import { siteReadDate } from "../src/lib/country-page.js";
import { DATA_PATH } from "../src/lib/identity.js";

/**
 * The data page tells a dataset index what it is holding.
 *
 * A search engine reads prose as prose: nothing in "23 routes, quoted and
 * dated" says licence, coverage, version or download. `schema.org/Dataset` is
 * the vocabulary that does, and Google's Dataset Search indexes it — the one
 * place this product's shape is an advantage rather than a niche.
 *
 * Every field is checked against the thing it claims, because a claim to a
 * crawler that the site cannot honour is worse than no claim: the download
 * URLs must be files the build actually emits, and the date must be the date
 * the page itself prints.
 */
const ds = dataset as Dataset;
const root = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));

describe("the data page's Dataset block", () => {
  const raw = datasetLd(ds, DATA_PATH);
  const ld = JSON.parse(raw) as Record<string, unknown>;

  it("is valid JSON that cannot close its own script element", () => {
    expect(raw).not.toContain("<");
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Dataset");
  });

  it("carries what a dataset index requires: a name, a description, a licence and a download", () => {
    expect(String(ld.name).length).toBeGreaterThan(20);
    // Google asks for 50 characters or more; a description shorter than that
    // is a title wearing a description's name.
    expect(String(ld.description).length).toBeGreaterThan(50);
    expect(ld.license).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(ld.isAccessibleForFree).toBe(true);
    expect(Array.isArray(ld.distribution)).toBe(true);
  });

  it("promises no download the build does not emit", () => {
    const dist = ld.distribution as { contentUrl: string; encodingFormat: string }[];
    expect(dist.length).toBeGreaterThan(0);
    for (const d of dist) {
      expect(d.encodingFormat).toBe("application/json");
      const path = new URL(d.contentUrl).pathname;
      expect(existsSync(root(`dist${path}`)), `${d.contentUrl} is offered but not built`).toBe(true);
      JSON.parse(readFileSync(root(`dist${path}`), "utf8")); // and it is JSON
    }
  });

  it("states the same day, the same version and the same countries as the page", () => {
    expect(ld.dateModified).toBe(siteReadDate(ds));
    expect(ld.version).toBe(ds.dataset_version);
    const places = (ld.spatialCoverage as { name: string }[]).map((p) => p.name);
    expect(places).toEqual(ds.countries.map((c) => c.name));
  });

  /**
   * The block is a data block, not a program: the parser never prepares it and
   * `script-src` never sees it (measured — see `tests/csp.test.ts`). So the
   * policy this page ships is the same policy every other page ships, and that
   * is what is asserted here: structured data did not fork the site's one
   * security policy into two.
   */
  it("is in the built page, under the same policy every page ships", () => {
    const html = readFileSync(root("dist/data/index.html"), "utf8");
    const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(block, "the data page carries no Dataset block").not.toBeNull();
    JSON.parse(block![1]!);
    const policyOf = (page: string) =>
      readFileSync(root(page), "utf8").match(/Content-Security-Policy" content="([^"]*)"/)?.[1] ?? "";
    expect(policyOf("dist/data/index.html")).toBe(policyOf("dist/index.html"));
  });

  it("is on the data page and nowhere else", () => {
    for (const page of ["dist/index.html", "dist/germany/index.html",
      "dist/germany/eu-blue-card-general/index.html"])
      expect(readFileSync(root(page), "utf8"), page).not.toContain("application/ld+json");
  });
});
