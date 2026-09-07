import type { APIRoute } from "astro";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { assertValidDataset } from "permit-rulebook-data/validate";
import { routeAddresses } from "../../lib/slug.js";
import { routePage } from "../../lib/route-page.js";

/**
 * The data door, one route wide.
 *
 * The developer persona reached the end of the route-page mock and found
 * "open data · CC BY 4.0" as unlinked text, no repository, no JSON, no way to
 * consume a page that proves its own freshness (critique P4). This is the
 * handle: the route exactly as the dataset holds it — every quote, every read
 * date, every history entry — not a re-typing of what the page showed.
 */
export async function getStaticPaths() {
  const dataset = assertValidDataset(rawDataset);
  return routeAddresses(dataset).map((address) => ({
    params: { country: address.countrySlug, route: address.routeSlug },
    props: { json: routePage(dataset, address).json },
  }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(`${JSON.stringify(props.json, null, 2)}\n`, {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
