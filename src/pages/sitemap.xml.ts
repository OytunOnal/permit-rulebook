import type { APIRoute } from "astro";
import rawDataset from "permit-rulebook-data/data/dataset.json";
import { assertValidDataset } from "permit-rulebook-data/validate";
import { sitemapXml } from "../lib/sitemap.js";

/**
 * `/sitemap.xml` — 404 on the live host until now (product critique B2), on a
 * site whose second distribution channel is pages generated from the rules.
 * Built from the dataset in `lib/sitemap.ts`, so it cannot fall out of step
 * with the pages the same dataset produces.
 */
export const GET: APIRoute = () =>
  new Response(sitemapXml(assertValidDataset(rawDataset)), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
