import type { APIRoute } from "astro";
import { robotsTxt } from "../lib/sitemap.js";

/**
 * `/robots.txt` — 404 on the live host until now (product critique B2). It
 * holds nothing back; it exists to say so, and to name the sitemap, which is
 * how a crawler learns about pages nothing outside the site links to.
 */
export const GET: APIRoute = () =>
  new Response(robotsTxt(), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
