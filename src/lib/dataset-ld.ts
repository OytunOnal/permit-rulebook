import type { Dataset } from "permit-rulebook-data";
import { siteReadDate } from "./country-page.js";
import { DATA_LICENCE_NAME, OWNER, REPO_DATA, absolute } from "./site.js";
import { PRODUCT_NAME } from "./copy.js";

/**
 * The data page's structured description of the dataset, for the machines that
 * read one.
 *
 * Why this and nothing else: the product publishes an open dataset, and a
 * dataset has its own index (Google's Dataset Search) that reads
 * `schema.org/Dataset` and nothing simpler. A search engine cannot infer a
 * licence, a coverage or a download from prose (2026-09-09: the site was in
 * the results, and nothing there said it was data).
 *
 * Every field below is a fact this repository already holds — the licence the
 * LICENSE file grants, the countries in the dataset, the version it carries,
 * the day its newest value was read, and the two endpoints the build actually
 * emits. Nothing is asserted for the crawler's benefit that a reader could not
 * check on the same page.
 *
 * The canonical licence URL is Creative Commons' own, not our copy of the text:
 * the identifier is what a machine matches on, and a link to a file in a
 * repository identifies nothing.
 */
const CC_BY_4 = "https://creativecommons.org/licenses/by/4.0/";

export function datasetLd(dataset: Dataset, path: string): string {
  const read = siteReadDate(dataset);
  const countries = dataset.countries.map((c) => c.name);
  const routes = dataset.countries.reduce((n, c) => n + c.routes.length, 0);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${PRODUCT_NAME} — work-permit routes for ${countries.join(", ")}`,
    description:
      `${routes} employment-based work-permit routes across ${countries.length} European countries. `
      + "Every value — salary threshold, qualification, experience, language level — carries the "
      + "sentence it came from on the authority's own page and the day that page was read. "
      + "Re-read daily; a change to a source raises a flag a person walks.",
    url: absolute(path),
    sameAs: REPO_DATA,
    version: dataset.dataset_version,
    license: CC_BY_4,
    isAccessibleForFree: true,
    creator: { "@type": "Person", name: OWNER },
    dateModified: read,
    keywords: [
      "work permit", "residence permit", "immigration", "eligibility", "open data",
      ...countries,
    ],
    spatialCoverage: countries.map((name) => ({ "@type": "Country", name })),
    distribution: [
      {
        "@type": "DataDownload",
        name: `The whole dataset (${DATA_LICENCE_NAME})`,
        encodingFormat: "application/json",
        contentUrl: absolute("/dataset.json"),
      },
      {
        "@type": "DataDownload",
        name: "The countries and their routes",
        encodingFormat: "application/json",
        contentUrl: absolute("/countries.json"),
      },
    ],
  };
  // Two characters can end a script element early from inside a string; the
  // dataset's own text is a stranger to this file (Standards review's escaping
  // rule, applied to the one place JSON meets HTML).
  return JSON.stringify(ld, null, 2).replace(/</g, "\\u003c");
}
