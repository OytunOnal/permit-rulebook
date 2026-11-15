// @level application
/**
 * The dataset's facts, reckoned once, with no words and no markup: the dates,
 * the counts and the watch run every page prints (#323). A page takes its
 * facts from one call and only draws what it is handed, so two pages cannot
 * print two newest days. `reckonDatasetFacts`, `countryFactsOf` and the types
 * leave this entry, and, until the route page draws its cards from
 * `DatasetFacts` (#385), the route page's printed-quote choices it reads.
 *
 * It reads no file: whoever builds a page reads the watch's state and passes
 * it in, so the facts can be reckoned on any dataset and any state.
 *
 * Its imports name their `.ts` files, so the social card's render script,
 * plain Node with no build step, reaches it as the site and the suite do.
 */
import type { Country, Dataset, WatchState } from "permit-rulebook-data";
import {
  datasetCountsOf, routeCountsOf, type DatasetCounts, type RouteCounts,
} from "./dataset-wide/dataset-counts.ts";
import { newestValueChangedOf, readRangeOf, type ReadRange } from "./dataset-wide/read-range.ts";
import { watchRunOf, type WatchRun } from "./dataset-wide/watch-run.ts";
import { countryStamp } from "./per-page/printed-quotes.ts";

export type { DatasetCounts, RouteCounts } from "./dataset-wide/dataset-counts.ts";
export type { ReadRange } from "./dataset-wide/read-range.ts";
export type { WatchRun } from "./dataset-wide/watch-run.ts";
export {
  audienceNotice, cardValues, noticesOn, ownUnread, pageStamp, printedNotices, routeSourceUrls, ruleCriteria,
  valuesUnder,
} from "./per-page/printed-quotes.ts";

/** What a country page prints about its country. */
export interface CountryFacts {
  /** The newest of its route pages' stamps: its "Rules read" stamp and its sitemap date. */
  stamp: string;
  /** Its routes, scored and quoted only. */
  counts: RouteCounts;
}

/** What a page prints about the dataset as a whole, and about each country. */
export interface DatasetFacts {
  /** The read range: the footer's two days, and its end the "Rules read" stamp of every page not a route's or a country's. */
  readRange: ReadRange;
  /** The newest day a value was read: `/data/`'s "Newest value changed". */
  newestValueChanged: string;
  /** The watch's last run and the sources it could not read. */
  watchRun: WatchRun;
  /** The dataset-wide counts. */
  counts: DatasetCounts;
  /** Each country's facts, by its code. */
  countries: ReadonlyMap<string, CountryFacts>;
}

/** Every fact a page prints about the dataset, on the watch's `watchState`. */
export function reckonDatasetFacts(dataset: Dataset, watchState: WatchState): DatasetFacts {
  return {
    readRange: readRangeOf(dataset),
    newestValueChanged: newestValueChangedOf(dataset),
    watchRun: watchRunOf(dataset, watchState),
    counts: datasetCountsOf(dataset),
    countries: new Map(dataset.countries.map((country) => [country.code, {
      stamp: countryStamp(dataset, country),
      counts: routeCountsOf(country.routes),
    }])),
  };
}

/** `country`'s facts in `facts`. Throws, naming the country, where the reckoning holds none. */
export function countryFactsOf(facts: DatasetFacts, country: Country): CountryFacts {
  const own = facts.countries.get(country.code);
  if (!own) throw new Error(`the dataset's facts hold nothing for ${country.code}`);
  return own;
}
