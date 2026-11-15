// @level application
/**
 * The dataset's facts, reckoned once, with no words and no markup: the dates,
 * the counts and the watch run every page prints (#323). A page takes its
 * facts from one call and only draws what it is handed, so two pages cannot
 * print two newest days. `reckonDatasetFacts`, `countryFactsOf`, `routeFactsOf`
 * and the types leave this entry. Which quotes each route page prints is part
 * of the facts, so a route page draws its cards from the answer its stamp is
 * reckoned on (#323, ruling 8).
 *
 * It reads no file: whoever builds a page reads the watch's state and passes
 * it in, so the facts can be reckoned on any dataset and any state.
 *
 * Its imports name their `.ts` files, so the social card's render script,
 * plain Node with no build step, reaches it as the site and the suite do.
 */
import type { Country, Dataset, Route, WatchState } from "permit-rulebook-data";
import {
  datasetCountsOf, routeCountsOf, type DatasetCounts, type RouteCounts,
} from "./dataset-wide/dataset-counts.ts";
import { newestValueChangedOf, readRangeOf, type ReadRange } from "./dataset-wide/read-range.ts";
import { watchRunOf, type WatchRun } from "./dataset-wide/watch-run.ts";
import { reckonRouteFacts, type RouteFacts } from "./per-page/reckon-route-facts.ts";

export type { DatasetCounts, RouteCounts } from "./dataset-wide/dataset-counts.ts";
export type { ReadRange } from "./dataset-wide/read-range.ts";
export type { WatchRun } from "./dataset-wide/watch-run.ts";
export type { PrintedCard, PrintedQuotes, RouteFacts } from "./per-page/reckon-route-facts.ts";

/** What a country page prints about its country. */
export interface CountryFacts {
  /** The newest of its route pages' stamps: its "Rules read" stamp and its sitemap date. */
  stamp: string;
  /** Its routes, scored and quoted only. */
  counts: RouteCounts;
}

/** What a page prints about the dataset as a whole, about each country and about each route. */
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
  /** Each route page's printed quotes, stamp and unread sources, by the route's id. */
  routes: ReadonlyMap<string, RouteFacts>;
}

/** Every fact a page prints about the dataset, on the watch's `watchState`. */
export function reckonDatasetFacts(dataset: Dataset, watchState: WatchState): DatasetFacts {
  const watchRun = watchRunOf(dataset, watchState);
  const routes = new Map(dataset.countries.flatMap((country) => country.routes)
    .map((route) => [route.id, reckonRouteFacts(dataset, route, watchRun.unread)]));
  // A country page's stamp is the newest of its route pages' stamps: the day
  // the newest sentence any of them prints was read.
  const stampOf = (route: Route): string => routeFactsIn(routes, route).stamp;
  return {
    readRange: readRangeOf(dataset),
    newestValueChanged: newestValueChangedOf(dataset),
    watchRun,
    counts: datasetCountsOf(dataset),
    countries: new Map(dataset.countries.map((country) => [country.code, {
      stamp: country.routes.map(stampOf).sort().at(-1) ?? "",
      counts: routeCountsOf(country.routes),
    }])),
    routes,
  };
}

/** `country`'s facts in `facts`. Throws, naming the country, where the reckoning holds none. */
export function countryFactsOf(facts: DatasetFacts, country: Country): CountryFacts {
  const countryFacts = facts.countries.get(country.code);
  if (!countryFacts) throw new Error(`the dataset's facts hold nothing for ${country.code}`);
  return countryFacts;
}

/** `route`'s facts in `facts`. Throws, naming the route, where the reckoning holds none. */
export function routeFactsOf(facts: DatasetFacts, route: Route): RouteFacts {
  return routeFactsIn(facts.routes, route);
}

function routeFactsIn(routes: ReadonlyMap<string, RouteFacts>, route: Route): RouteFacts {
  const routeFacts = routes.get(route.id);
  if (!routeFacts) throw new Error(`the dataset's facts hold nothing for ${route.id}`);
  return routeFacts;
}
