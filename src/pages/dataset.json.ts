import type { APIRoute } from "astro";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { assertValidDataset } from "permit-rulebook-data/validate";

/**
 * The whole dataset, as the site serves it: the same file the pages are built
 * from, validated at this boundary like every other door.
 */
export const GET: APIRoute = () =>
  new Response(`${JSON.stringify(assertValidDataset(rawDataset), null, 2)}\n`, {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
