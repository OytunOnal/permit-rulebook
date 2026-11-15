// @level presentation
import type { Dataset } from "permit-rulebook-data";
import { DISCLAIMER, datasetDay } from "../../copy/frame.js";
import type { DatasetFacts } from "../../dataset-facts/reckon-dataset-facts.js";
import { DATA_LICENCE_NAME, DATA_LICENCE_URL, OWNER, REPO_DATA, SPONSOR_URL } from "../../site.js";
import type { FooterFacts } from "./site-footer.js";

/**
 * What the shared footer states, from the page's reckoning of the dataset's
 * facts and from `site.ts` — never typed into a page. It lives apart from the
 * footer because it needs the dataset and the footer must not:
 * `site-footer.ts` knows markup, not data.
 */
export function footerFacts(dataset: Dataset, facts: DatasetFacts): FooterFacts {
  const { readRange: read, watchRun: { lastRun, unread } } = facts;
  return {
    read,
    // The version is a date, and this product spells a date one way
    // (decision 12): "2026.09.07" beside a read date is a second date format on
    // the same line, which is the thing that rule exists to prevent.
    datasetVersion: datasetDay(dataset.dataset_version),
    lastRun,
    unread: unread.length,
    disclaimer: DISCLAIMER,
    licenceUrl: DATA_LICENCE_URL,
    licenceName: DATA_LICENCE_NAME,
    repository: REPO_DATA,
    sponsor: SPONSOR_URL,
    owner: OWNER,
    // The year the notice carries, from the newest reading rather than from the
    // clock: a page built today about values read today says the same year
    // twice, and a page rebuilt in January must not claim a year the data has
    // not reached.
    year: read.newest.slice(0, 4),
  };
}
