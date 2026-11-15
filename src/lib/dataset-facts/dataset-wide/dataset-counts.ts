// @level application
import {
  isScored, proseProvenance, routeProvenance, type Dataset, type ProseProvenance, type Route,
} from "permit-rulebook-data";

/**
 * A set of routes, counted: the ones the product scores, the ones it quotes
 * only, and their total.
 *
 * The two route counts are two facts and not one: a route the product scores
 * is compared with a reader's answers, and a route it quotes and does not
 * score is a page of the authority's sentences with nothing asked. A single
 * total would let the second kind pass as the first, which is the claim s9
 * exists not to make — so every sentence that states one states the other
 * beside it.
 */
export interface RouteCounts {
  scored: number;
  quotedOnly: number;
  total: number;
}

/** What the dataset holds, counted rather than typed: its routes, its countries, its quoted values and its prose. */
export interface DatasetCounts extends RouteCounts {
  countries: number;
  /** Every value in the dataset that carries a quote and a date. */
  quotedValues: number;
  /** Its prose sentences: the ones with provenance, ours, and the ones declared unsourced. */
  prose: ProseProvenance;
}

/** `routes`, counted. */
export function routeCountsOf(routes: Route[]): RouteCounts {
  const scored = routes.filter(isScored).length;
  return { scored, quotedOnly: routes.length - scored, total: routes.length };
}

/** The dataset-wide counts a page prints. */
export function datasetCountsOf(dataset: Dataset): DatasetCounts {
  const routes = dataset.countries.flatMap((c) => c.routes);
  const quotedValues = routes.reduce((sum, route) => sum + routeProvenance(route).length, 0);
  return { ...routeCountsOf(routes), countries: dataset.countries.length, quotedValues, prose: proseProvenance(dataset) };
}
