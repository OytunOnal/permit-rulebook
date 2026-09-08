import type { APIRoute } from "astro";
import { countriesJson } from "../lib/data-page.js";

/**
 * The country vocabulary the passport question is built from: 199 issuers and
 * the classes that carry free movement, with the sourced legs behind them.
 */
export const GET: APIRoute = () =>
  new Response(`${JSON.stringify(countriesJson(), null, 2)}\n`, {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
