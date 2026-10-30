// @level presentation
import {
  phraseOf, countryVocabulary, isScored, proseProvenance, routeProvenance, unreadClause,
  type Dataset,
} from "permit-rulebook-data";
import { esc, escAttr } from "./reason.js";
import { framedPageHtml } from "./frame/framed-page.js";
import { pageStamp } from "./route-page.js";
import { siteReadDate } from "./country-page.js";
import {
  DAILY_CHECK_CLAIM, DATA_LEDE_CLOSE_TAIL, FRESHNESS_HUMAN_HAND, LAST_CHECKED, NEWEST_VALUE_CHANGED, PROSE_OURS_TAIL,
  TRANSLATION_POLICY, countryAsJsonLabel, dataLedeClose, dataLedeOpen, dataMetaDescription, proseProvenanceCounts,
} from "./copy/data-page.js";
import { PRODUCT_NAME, TAGLINE, datasetDay } from "./copy/frame.js";
import { WRONG_DOOR_LABEL } from "./copy/feedback.js";
import { readOn } from "./copy/quotes.js";
import {
  DATA_LICENCE_FULL, DATA_PATH, FEEDBACK_PATH, REPO_DATA, absolute, readRange, readWatchRun, url,
  type WatchRun,
} from "./site.js";
import { rulesRead } from "./identity.js";
import { routeJsonPath } from "./slug.js";
import { datasetLd } from "./dataset-ld.js";
// The page's own rules, beside its code; the frame's come first (#142).
import DATA_PAGE_RULES from "./data-page.css?raw";

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

/**
 * `run.lastRun` and `run.unread` are the two facts on this page that move
 * without a person: the day the watch last ran, and the sources it could not
 * read that day. They are an argument for the reason the route page's run is
 * one — a render has to be askable about a run other than today's — and what
 * `run` leaves out is read from the live state, which is what the build does.
 */
export function dataPage(dataset: Dataset, run: WatchRun = {}): DataPage {
  const { lastRun, unread } = readWatchRun(dataset, run);
  // The page carries two read dates, and they are not the same date.
  //
  // `read` is the dataset's newest read date — the newest quote date ANYWHERE
  // this site publishes, every sentence of every notice included, since this
  // page hands the whole dataset over. A notice re-read today is a page read
  // today, so the RULES READ stamp and the footer's range are right to take
  // it, and they keep it.
  //
  // `changed` is the newest `retrieved_at` among VALUES and nothing else,
  // which is the only date the word "changed" allows: re-reading a notice is
  // not a value moving. It is the narrower of the two and can only ever be
  // older. They coincide on today's dataset, and coinciding today is not a
  // reason to print either one for the other (Spec review, 2026-09-15).
  // Decision 12: one date format on a page. `dataset_version` is stamped
  // 2026.09.10 and printed 2026.09.10, dots among dashes, two spellings of one
  // day in one list — which is the third format the route-page mock was made to
  // drop (critique F3). `datasetDay` is what the `datetime` attribute and the
  // footer have always taken; the visible text takes it too now (human's walk,
  // 2026-09-15). The version string in the dataset is untouched.
  const version = datasetDay(dataset.dataset_version);
  const read = siteReadDate(dataset);
  const changed = readRange(dataset).newest;
  const clause = unreadClause(unread);
  const prose = proseProvenance(dataset);
  const counts = routeCounts(dataset);
  const title = `The data · ${PRODUCT_NAME}`;
  const desc = dataMetaDescription(counts.scored, counts.quotedOnly, dataset.countries.length);

  // The one page that IS the dataset says so in the vocabulary a dataset
  // index reads. It is a data block, not a program — but the policy names it
  // anyway, so nothing in this site's head is unaccounted for.
  const ld = datasetLd(dataset, DATA_PATH);
  const content = `<div class="masthead-with-stamps">
    <div>
      <h1>The data. <em>${esc(TAGLINE)}</em></h1>
      <p class="lede">${esc(dataLedeOpen(counts.scored, counts.quotedOnly, dataset.countries.length))} ${
    // The last words are the door, in the page's inline link style: the lede
    // is prose, so `tap` and not the button's `tap-min` (human's walk of the
    // s16 preview, 2026-09-16).
    dataLedeClose(`<a class="tap" href="${escAttr(url(FEEDBACK_PATH))}">${esc(DATA_LEDE_CLOSE_TAIL)}</a>`)}</p>
    </div>
    ${rulesRead(read)}
  </div>

  <main>
    <section class="answer" aria-labelledby="holds-h">
      <h2 class="label" id="holds-h">What it holds today</h2>
      <dl class="facts facts-dates">
        <div><dt>Dataset version</dt><dd><time datetime="${escAttr(version)}">${
    esc(version)}</time></dd></div>
        <div><dt>Schema version</dt><dd>${esc(dataset.schema_version)}</dd></div>
        <div><dt>${esc(NEWEST_VALUE_CHANGED)}</dt><dd><time datetime="${escAttr(changed)}">${
    esc(changed)}</time></dd></div>${
    // The run, stated as its own fact beside the one it is not — and taken
    // from the same `lastRun` the sentence below prints, so no render can show
    // a page whose list and whose prose disagree about the last check. A run
    // the state does not have prints nothing at all, as that sentence does.
    lastRun ? `
        <div><dt>${esc(LAST_CHECKED)}</dt><dd><time datetime="${escAttr(lastRun)}">${
      esc(lastRun)}</time></dd></div>` : ""
  }
      </dl>
      <dl class="facts facts-counts">
        <div><dt>Quoted values</dt><dd>${quotedValues(dataset)} with a source and a date</dd></div>
        <div><dt>Sentences of ours</dt><dd>${prose.ours}, ${esc(PROSE_OURS_TAIL)}</dd></div>
      </dl>
      <dl class="facts facts-wide">
        <div><dt>Routes</dt><dd>${counts.scored} scored, ${counts.quotedOnly} quoted and dated but not scored, in ${
    dataset.countries.length} countries</dd></div>
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
    esc(proseProvenanceCounts(prose.with_provenance, prose.ours, prose.declared_unsourced))}.</li>
      </ul>
      <p class="lede">A cookieless counter (Cloudflare Web Analytics) records each page load: the page's address, where you came from, your country, and your browser and operating system versions; nothing you answer, nothing that identifies you, and nothing while you answer.</p>
      <p class="lede">${esc(TRANSLATION_POLICY)}</p>
      <p class="lede">${esc(DAILY_CHECK_CLAIM)}${
    lastRun ? ` — last run <b><time datetime="${escAttr(lastRun)}">${esc(lastRun)}</time></b>` : ""
  }.${
    // The exception, on the day there is one and on no other. The claim was
    // true of 42 sources and false of two for five days in September, and the
    // two backed values on live pages (s11). The date it names is the
    // sources', so it is marked up like every other date on the site — which
    // is why the clause hands it over apart from its words.
    clause ? ` ${esc(clause.before)}<b><time datetime="${escAttr(clause.since)}">${
      esc(clause.since)}</time></b>${esc(clause.after)}` : ""
  } ${esc(FRESHNESS_HUMAN_HAND)}</p>
    </section>

    <section class="data" aria-labelledby="take-h">
      <h2 class="label" id="take-h">Take it</h2>
      <nav aria-label="Downloads">
        <a class="tap-min" href="${escAttr(url(DATASET_JSON_PATH))}">The whole dataset as JSON</a>
        <a class="tap-min" href="${escAttr(url(COUNTRIES_JSON_PATH))}">countries.json — the passport vocabulary</a>
        <a class="tap-min" href="${escAttr(REPO_DATA)}" target="_blank" rel="noopener">The dataset on GitHub</a>
        <a class="tap-min" href="${escAttr(url(FEEDBACK_PATH))}">${esc(WRONG_DOOR_LABEL)}</a>
      </nav>
      <p class="lede">Reuse it under ${esc(DATA_LICENCE_FULL)} — credit and link back. Every route is also served on its own, with the day it was read:</p>
      ${dataset.countries.map((country) => `
      <nav class="jsonlinks" aria-label="${escAttr(countryAsJsonLabel(phraseOf(country.code)))}">
        <b class="label">${esc(phraseOf(country.code))}</b>${country.routes.map((route) => `
        <a class="tap-min" href="${escAttr(url(routeJsonPath(country, route)))}">${esc(route.name)}<small>${
    esc(readOn(pageStamp(dataset, route)))}</small></a>`).join("")}
      </nav>`).join("")}
    </section>
  </main>`;

  const html = framedPageHtml(dataset, {
    title, meta: { description: desc, path: DATA_PATH, kind: "website" },
    headTags: [`<script type="application/ld+json">${ld}</script>`], css: DATA_PAGE_RULES,
    place: { here: DATA_PATH }, run: { lastRun, unread }, content,
  });
  return { path: DATA_PATH, title, description: desc, html };
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
  const content = `<header class="masthead masthead-with-stamps">
    <div>
      <h1>This page is now <a class="tap" href="${escAttr(target)}">The data</a>. <em>${esc(TAGLINE)}</em></h1>
      <p class="lede">Same page, a better name: what the dataset holds today, what checks it, and where to download it. Your browser should be on its way; if it is not, the link above is it.</p>
    </div>
    ${rulesRead(siteReadDate(dataset))}
  </header>`;
  const headTags = [
    `<meta http-equiv="refresh" content="0; url=${escAttr(target)}">`,
    `<link rel="canonical" href="${escAttr(absolute(DATA_PATH))}">`,
    '<meta name="robots" content="noindex, follow">',
  ];
  return {
    path: "/status",
    title,
    description: `This page is now called The data, at ${absolute(DATA_PATH)}.`,
    html: framedPageHtml(dataset, { title, headTags, content }),
  };
}

/** The vocabulary the passport question is built from, as the site serves it. */
export const countriesJson = (): unknown => countryVocabulary;
