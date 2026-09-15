import {
  countryVocabulary, isScored, proseProvenance, routeProvenance,
  type Dataset,
} from "permit-rulebook-data";
import { esc, escAttr } from "./reason.js";
import { contentSecurityPolicy } from "./csp.js";
import { PAGE_CSS, pageStamp, withArticle } from "./route-page.js";
import { footerFacts, navCountries, siteReadDate } from "./country-page.js";
import { PRODUCT_NAME, TAGLINE, TRANSLATION_POLICY, datasetDay } from "./copy.js";
import {
  DATA_LICENCE_FULL, REPO_DATA, TRACKER_URL, absolute, analyticsBeacon, headMeta, lastWatchRun, url,
} from "./site.js";
import { DATA_PATH, MENU_SCRIPT, iconLinks, rulesRead, siteFooter, siteHeader } from "./identity.js";
import { routeJsonPath } from "./slug.js";
import { datasetLd } from "./dataset-ld.js";

/**
 * The data page — the header's "The data", and the footer's.
 *
 * The critique's developer persona found "open data · CC BY 4.0" as unlinked
 * text with no repository, no JSON and no way to consume a product whose whole
 * claim is freshness (B3, 2026-09-08); the site map found the old `/status`
 * page — a Spine flow diagram written for us, not for a reader — reachable from
 * nowhere at all. This is the page that proves the liveness, one step from
 * anywhere: what the dataset holds today, what checks it, where to download it,
 * and where to say it is wrong.
 *
 * `/status` still answers, because a URL that has been shared is a promise.
 */

export interface DataPage {
  path: string;
  title: string;
  description: string;
  html: string;
}

/** The full dataset, as the site serves it. */
export const DATASET_JSON_PATH = "/dataset.json";
/** The country vocabulary the passport question is built from. */
export const COUNTRIES_JSON_PATH = "/countries.json";

/** Every value in the dataset that carries a quote and a date. */
export function quotedValues(dataset: Dataset): number {
  let count = 0;
  for (const country of dataset.countries)
    for (const route of country.routes) count += routeProvenance(route).length;
  return count;
}

/**
 * The two numbers the dataset holds, counted rather than typed.
 *
 * They are two facts and not one: a route the product scores is compared with
 * a reader's answers, and a route it quotes and does not score is a page of the
 * authority's sentences with nothing asked. A single total would let the second
 * kind pass as the first, which is the claim s9 exists not to make — so every
 * sentence on this page that states one states the other beside it.
 */
export interface RouteCounts {
  scored: number;
  quotedOnly: number;
  total: number;
}

export function routeCounts(dataset: Dataset): RouteCounts {
  const routes = dataset.countries.flatMap((c) => c.routes);
  const scored = routes.filter(isScored).length;
  return { scored, quotedOnly: routes.length - scored, total: routes.length };
}

export function dataPage(dataset: Dataset): DataPage {
  const read = siteReadDate(dataset);
  const prose = proseProvenance(dataset);
  const counts = routeCounts(dataset);
  const title = `The data · ${PRODUCT_NAME}`;
  const desc = `What ${PRODUCT_NAME} holds today: ${counts.scored} routes scored against your answers and ${
    counts.quotedOnly} quoted and dated but not scored, across ${
    dataset.countries.length} countries, every value carrying its source and the day it was read — with the downloads, the checks and the tracker.`;

  // The one page that IS the dataset says so in the vocabulary a dataset
  // index reads. It is a data block, not a program — but the policy names it
  // anyway, so nothing in this site's head is unaccounted for.
  const ld = datasetLd(dataset, DATA_PATH);
  const head = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${contentSecurityPolicy([MENU_SCRIPT])}
<script type="application/ld+json">${ld}</script>
${iconLinks()}
${headMeta({ title, description: desc, path: DATA_PATH, kind: "website" })}
<style>${PAGE_CSS}</style>`;

  const body = `<div class="wrap">

  ${siteHeader(navCountries(dataset))}

  <div class="masthead-with-stamps">
    <div>
      <h1>The data. <em>${esc(TAGLINE)}</em></h1>
      <p class="lede">Everything this site shows is one open dataset: ${counts.scored} routes scored against your answers and ${
    counts.quotedOnly} more quoted and dated but not scored, across ${
    dataset.countries.length} countries, every threshold and condition carrying the authority's own sentence, the page it came from and the day we read it. Take it, check it, or tell us it is wrong.</p>
    </div>
    ${rulesRead(read)}
  </div>

  <main>
    <section class="answer" aria-labelledby="holds-h">
      <h2 class="label" id="holds-h">What it holds today</h2>
      <dl class="facts">
        <div><dt>Dataset version</dt><dd><time datetime="${escAttr(datasetDay(dataset.dataset_version))}">${
    esc(dataset.dataset_version)}</time></dd></div>
        <div><dt>Schema version</dt><dd>${esc(dataset.schema_version)}</dd></div>
        <div><dt>Newest value read</dt><dd><time datetime="${escAttr(read)}">${esc(read)}</time></dd></div>
        <div><dt>Routes</dt><dd>${counts.scored} scored, ${counts.quotedOnly} quoted and dated but not scored, in ${
    dataset.countries.length} countries</dd></div>
        <div><dt>Quoted values</dt><dd>${quotedValues(dataset)} with a source and a date</dd></div>
        <div><dt>Sentences of ours</dt><dd>${prose.ours}, declared and shown as ours</dd></div>
      </dl>
    </section>

    <section class="rules" aria-labelledby="checks-h">
      <h2 class="label" id="checks-h">What checks it</h2>
      <p>Four gates run on every change, and the build stops on any of them.</p>
      <ul class="checks">
        <li><b>Schema validation</b> — every value has a source URL, a verbatim quote and a read date, or the dataset does not build. This page exists, so this one passed.</li>
        <li><b>Quote fidelity</b> — every sentence the dataset claims to have quoted is looked for again in a fresh snapshot of the page it cites. It runs where the snapshots live, in the data repository.</li>
        <li><b>Watch coverage</b> — every source a value cites is on the watchlist, and every entry on the watchlist backs a value.</li>
        <li><b>Prose provenance</b> — anything in quotation marks carries the source it is quoting, and what is ours is declared ours: ${
    prose.with_provenance} sourced, ${prose.ours} ours, ${prose.declared_unsourced} standing on a dated reason.</li>
      </ul>
      <p class="lede">A cookieless counter (Cloudflare Web Analytics) records each page load: the page's address, where you came from, your country, and your browser and operating system versions; nothing you answer, nothing that identifies you, and nothing while you answer.</p>
      <p class="lede">${esc(TRANSLATION_POLICY)}</p>
      <p class="lede">Every source is re-read daily${
    lastWatchRun() ? ` — last run <b><time datetime="${escAttr(lastWatchRun())}">${esc(lastWatchRun())}</time></b>` : ""
  }. A source that has moved files an issue in the tracker and a person reads it: the values on this site, and the dates beside them, change when a person changes them, never on their own.</p>
    </section>

    <section class="data" aria-labelledby="take-h">
      <h2 class="label" id="take-h">Take it</h2>
      <nav aria-label="Downloads">
        <a class="tap-min" href="${escAttr(url(DATASET_JSON_PATH))}">The whole dataset as JSON</a>
        <a class="tap-min" href="${escAttr(url(COUNTRIES_JSON_PATH))}">countries.json — the passport vocabulary</a>
        <a class="tap-min" href="${escAttr(REPO_DATA)}" target="_blank" rel="noopener">The dataset on GitHub</a>
        <a class="tap-min" href="${escAttr(TRACKER_URL)}" target="_blank" rel="noopener">Report a wrong value</a>
      </nav>
      <p class="lede">Reuse it under ${esc(DATA_LICENCE_FULL)} — credit and link back. Every route is also served on its own, with the day it was read:</p>
      ${dataset.countries.map((country) => `
      <nav class="jsonlinks" aria-label="${escAttr(`${withArticle(country)} as JSON`)}">
        <b class="label">${esc(withArticle(country))}</b>${country.routes.map((route) => `
        <a class="tap-min" href="${escAttr(url(routeJsonPath(country, route)))}">${esc(route.name)}<small>read ${
    esc(pageStamp(dataset, route))}</small></a>`).join("")}
      </nav>`).join("")}
    </section>
  </main>

  ${siteFooter(navCountries(dataset), footerFacts(dataset))}

</div>
<script>${MENU_SCRIPT}</script>
${analyticsBeacon()}`;

  return {
    path: DATA_PATH,
    title,
    description: desc,
    html: `<!doctype html>\n<html lang="en">\n<head>\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`,
  };
}

/**
 * The old address, kept working.
 *
 * `/status` was linked from nowhere on the site, but a URL that has been shared
 * is a promise: it now says where the page went, links there, and sends a
 * browser after it. A static host has no redirect to offer, so the page is the
 * redirect — and it names its destination in words, for a reader whose browser
 * ignores the refresh.
 */
export function statusAlias(dataset: Dataset): DataPage {
  const target = url(DATA_PATH);
  const title = `Moved to The data · ${PRODUCT_NAME}`;
  const body = `<div class="wrap">
  ${siteHeader(navCountries(dataset))}
  <header class="masthead masthead-with-stamps">
    <div>
      <h1>This page is now <a class="tap" href="${escAttr(target)}">The data</a>. <em>${esc(TAGLINE)}</em></h1>
      <p class="lede">Same page, a better name: what the dataset holds today, what checks it, and where to download it. Your browser should be on its way; if it is not, the link above is it.</p>
    </div>
    ${rulesRead(siteReadDate(dataset))}
  </header>
  ${siteFooter(navCountries(dataset), footerFacts(dataset))}
</div>
<script>${MENU_SCRIPT}</script>
${analyticsBeacon()}`;
  return {
    path: "/status",
    title,
    description: `This page is now called The data, at ${absolute(DATA_PATH)}.`,
    html: `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta http-equiv="refresh" content="0; url=${escAttr(target)}">
<link rel="canonical" href="${escAttr(absolute(DATA_PATH))}">
<meta name="robots" content="noindex, follow">
${contentSecurityPolicy([MENU_SCRIPT])}
${iconLinks()}
<style>${PAGE_CSS}</style>
</head>
<body>
${body}
</body>
</html>
`,
  };
}

/** The vocabulary the passport question is built from, as the site serves it. */
export const countriesJson = (): unknown => countryVocabulary;
