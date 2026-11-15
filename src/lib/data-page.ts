// @level presentation
import {
  phraseOf, countryVocabulary, proseProvenance, unreadClause,
  type Country, type Dataset, type WatchState,
} from "permit-rulebook-data";
import { esc, escAttr } from "./reason.js";
import { framedPageHtml } from "./frame/framed-page.js";
import {
  ANALYTICS_NOTE, CHECKS_HEADING, COUNTRIES_JSON_LINK, DAILY_CHECK_CLAIM, DATASET_VERSION, DATA_HEADLINE,
  DATA_LEDE_CLOSE_TAIL, DATA_PAGE_TITLE, DOWNLOADS_LABEL, FRESHNESS_HUMAN_HAND, GATES_LEAD, HOLDS_HEADING,
  LAST_CHECKED, NEWEST_VALUE_CHANGED, PROSE_OURS_TAIL, PROSE_PROVENANCE, QUOTED_VALUES, QUOTE_FIDELITY,
  QUOTE_FIDELITY_LINE, ROUTES_TERM, SCHEMA_VALIDATION, SCHEMA_VALIDATION_LINE, SCHEMA_VERSION, SENTENCES_OF_OURS,
  SERVED_ON_ITS_OWN, STATUS_ALIAS_LEDE, STATUS_ALIAS_TITLE, TAKE_HEADING, TRANSLATION_POLICY, WATCH_COVERAGE,
  WATCH_COVERAGE_LINE, WHOLE_DATASET_AS_JSON, countryAsJsonLabel, dataLedeClose, dataLedeOpen, dataMetaDescription,
  movedHeadingHtml, proseProvenanceCounts, proseProvenanceLine, quotedValuesCount, routesCount,
  statusAliasDescription,
} from "./copy/data-page.js";
import { DATASET_ON_GITHUB, LAST_RUN, TAGLINE, THE_DATA, datasetDay, reuseUnder } from "./copy/frame.js";
import { WRONG_DOOR_LABEL } from "./copy/feedback.js";
import { readOn } from "./copy/quotes.js";
import {
  DATA_LICENCE_FULL, DATA_PATH, FEEDBACK_PATH, REPO_DATA, absolute, url, watchState,
} from "./site.js";
import {
  reckonDatasetFacts, routeFactsOf, type DatasetFacts, type WatchRun,
} from "./dataset-facts/reckon-dataset-facts.js";
import { rulesRead } from "./identity.js";
import { routeJsonPath } from "./slug.js";
import { datasetLd } from "./dataset-ld.js";
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

/** What the data page's sections state: the dataset, its reckoned facts, and its prose counts. */
interface DataPageFacts {
  dataset: Dataset;
  facts: DatasetFacts;
  prose: ReturnType<typeof proseProvenance>;
}

/**
 * The masthead: the headline, the lede and the read stamp. The stamp takes the
 * end of the read range, every sentence of every notice included, since this
 * page hands the whole dataset over: a notice re-read today is a page read
 * today. The footer's range ends on the same reckoned day, so the two cannot
 * disagree (#323, ruling 1).
 */
function dataMastheadHtml(page: DataPageFacts): string {
  const { facts: { counts, readRange } } = page;
  return `<div class="masthead-with-stamps">
    <div>
      <h1>${esc(DATA_HEADLINE)} <em>${esc(TAGLINE)}</em></h1>
      <p class="lede">${esc(dataLedeOpen(counts.scored, counts.quotedOnly, counts.countries))} ${
    // The last words are the door, in the page's inline link style: the lede
    // is prose, so `tap` and not the button's `tap-min` (human's walk of the
    // s16 preview, 2026-09-16).
    dataLedeClose(`<a class="tap" href="${escAttr(url(FEEDBACK_PATH))}">${esc(DATA_LEDE_CLOSE_TAIL)}</a>`)}</p>
    </div>
    ${rulesRead(readRange.newest)}
  </div>`;
}

/** One fact that is a day: its term, and the day marked up as a date. */
const dayFactHtml = (term: string, day: string): string =>
  `<div><dt>${esc(term)}</dt><dd><time datetime="${escAttr(day)}">${esc(day)}</time></dd></div>`;

/**
 * The dataset's dates: its version, its schema, the newest value changed, and
 * the watch's last run.
 *
 * `changed` is the newest `retrieved_at` among VALUES and nothing else, which
 * is the only date the word "changed" allows: re-reading a notice is not a
 * value moving. It is narrower than the masthead's read date and can only ever
 * be older. They coincide on today's dataset, and coinciding today is not a
 * reason to print either one for the other (Spec review, 2026-09-15).
 *
 * Decision 12: one date format on a page. `dataset_version` is stamped
 * 2026.09.10 and printed 2026.09.10, dots among dashes, two spellings of one
 * day in one list — which is the third format the route-page mock was made to
 * drop (critique F3). `datasetDay` is what the `datetime` attribute and the
 * footer have always taken; the visible text takes it too now (human's walk,
 * 2026-09-15). The version string in the dataset is untouched.
 */
function datesFactsHtml(dataset: Dataset, facts: DatasetFacts): string {
  const { newestValueChanged: changed, watchRun: { lastRun } } = facts;
  return `<dl class="facts facts-dates">
        ${dayFactHtml(DATASET_VERSION, datasetDay(dataset.dataset_version))}
        <div><dt>${esc(SCHEMA_VERSION)}</dt><dd>${esc(dataset.schema_version)}</dd></div>
        ${dayFactHtml(NEWEST_VALUE_CHANGED, changed)}${
    // The run, stated as its own fact beside the one it is not — and taken
    // from the same `lastRun` the sentence below prints, so no render can show
    // a page whose list and whose prose disagree about the last check. A run
    // the state does not have prints nothing at all, as that sentence does.
    lastRun ? `
        ${dayFactHtml(LAST_CHECKED, lastRun)}` : ""
  }
      </dl>`;
}

/** What the dataset holds today: its dates, then its counts. */
function holdsSectionHtml(page: DataPageFacts): string {
  const { dataset, facts, prose } = page;
  const { counts } = facts;
  return `<section class="answer" aria-labelledby="holds-h">
      <h2 class="label" id="holds-h">${esc(HOLDS_HEADING)}</h2>
      ${datesFactsHtml(dataset, facts)}
      <dl class="facts facts-counts">
        <div><dt>${esc(QUOTED_VALUES)}</dt><dd>${esc(quotedValuesCount(counts.quotedValues))}</dd></div>
        <div><dt>${esc(SENTENCES_OF_OURS)}</dt><dd>${prose.ours}, ${esc(PROSE_OURS_TAIL)}</dd></div>
      </dl>
      <dl class="facts facts-wide">
        <div><dt>${esc(ROUTES_TERM)}</dt><dd>${esc(routesCount(counts.scored, counts.quotedOnly, counts.countries))}</dd></div>
      </dl>
    </section>`;
}

/** The daily check's claim, with the watch's last run and, on a day it missed sources, the exception. */
function dailyCheckHtml(run: WatchRun): string {
  const { lastRun } = run;
  const clause = unreadClause(run.unread);
  return `${esc(DAILY_CHECK_CLAIM)}${
    lastRun ? ` — ${esc(LAST_RUN)} <b><time datetime="${escAttr(lastRun)}">${esc(lastRun)}</time></b>` : ""
  }.${
    // The exception, on the day there is one and on no other. The claim was
    // true of 42 sources and false of two for five days in September, and the
    // two backed values on live pages (s11). The date it names is the
    // sources', so it is marked up like every other date on the site — which
    // is why the clause hands it over apart from its words.
    clause ? ` ${esc(clause.before)}<b><time datetime="${escAttr(clause.since)}">${
      esc(clause.since)}</time></b>${esc(clause.after)}` : ""
  } ${esc(FRESHNESS_HUMAN_HAND)}`;
}

/** What checks the dataset: the four gates, the counter, the translation policy and the daily check. */
function checksSectionHtml(page: DataPageFacts): string {
  const { facts, prose } = page;
  return `<section class="rules" aria-labelledby="checks-h">
      <h2 class="label" id="checks-h">${esc(CHECKS_HEADING)}</h2>
      <p>${esc(GATES_LEAD)}</p>
      <ul class="checks">
        <li><b>${esc(SCHEMA_VALIDATION)}</b> — ${esc(SCHEMA_VALIDATION_LINE)}</li>
        <li><b>${esc(QUOTE_FIDELITY)}</b> — ${esc(QUOTE_FIDELITY_LINE)}</li>
        <li><b>${esc(WATCH_COVERAGE)}</b> — ${esc(WATCH_COVERAGE_LINE)}</li>
        <li><b>${esc(PROSE_PROVENANCE)}</b> — ${
    esc(proseProvenanceLine(proseProvenanceCounts(prose.with_provenance, prose.ours, prose.declared_unsourced)))}</li>
      </ul>
      <p class="lede">${esc(ANALYTICS_NOTE)}</p>
      <p class="lede">${esc(TRANSLATION_POLICY)}</p>
      <p class="lede">${dailyCheckHtml(facts.watchRun)}</p>
    </section>`;
}

/** One country's routes, each as its own JSON with its route page's stamp. */
function countryJsonLinksHtml(facts: DatasetFacts, country: Country): string {
  return `
      <nav class="jsonlinks" aria-label="${escAttr(countryAsJsonLabel(phraseOf(country.code)))}">
        <b class="label">${esc(phraseOf(country.code))}</b>${country.routes.map((route) => `
        <a class="tap-min" href="${escAttr(url(routeJsonPath(country, route)))}">${esc(route.name)}<small>${
    esc(readOn(routeFactsOf(facts, route).stamp))}</small></a>`).join("")}
      </nav>`;
}

/** Where to take the dataset: the downloads, the licence, and every route's own JSON. */
function takeSectionHtml(page: DataPageFacts): string {
  const { dataset, facts } = page;
  return `<section class="data" aria-labelledby="take-h">
      <h2 class="label" id="take-h">${esc(TAKE_HEADING)}</h2>
      <nav aria-label="${escAttr(DOWNLOADS_LABEL)}">
        <a class="tap-min" href="${escAttr(url(DATASET_JSON_PATH))}">${esc(WHOLE_DATASET_AS_JSON)}</a>
        <a class="tap-min" href="${escAttr(url(COUNTRIES_JSON_PATH))}">${esc(COUNTRIES_JSON_LINK)}</a>
        <a class="tap-min" href="${escAttr(REPO_DATA)}" target="_blank" rel="noopener">${esc(DATASET_ON_GITHUB)}</a>
        <a class="tap-min" href="${escAttr(url(FEEDBACK_PATH))}">${esc(WRONG_DOOR_LABEL)}</a>
      </nav>
      <p class="lede">${esc(reuseUnder(DATA_LICENCE_FULL))} ${esc(SERVED_ON_ITS_OWN)}</p>
      ${dataset.countries.map((country) => countryJsonLinksHtml(facts, country)).join("")}
    </section>`;
}

/**
 * The watch's last run and the sources it could not read are the two facts on
 * this page that move without a person, and they come from `state`, the
 * watch's state the page is built on: the live one, which is what the build
 * does, or a copy that carries another run, so a render can be asked about a
 * run other than today's.
 */
export function dataPage(dataset: Dataset, state: WatchState = watchState): DataPage {
  const facts = reckonDatasetFacts(dataset, state);
  const { counts } = facts;
  const page: DataPageFacts = { dataset, facts, prose: proseProvenance(dataset) };
  const title = DATA_PAGE_TITLE;
  const desc = dataMetaDescription(counts.scored, counts.quotedOnly, counts.countries);
  // The one page that IS the dataset says so in the vocabulary a dataset
  // index reads. It is a data block, not a program — but the policy names it
  // anyway, so nothing in this site's head is unaccounted for.
  const ld = datasetLd(dataset, DATA_PATH, facts);
  const content = `${dataMastheadHtml(page)}

  <main>
    ${holdsSectionHtml(page)}

    ${checksSectionHtml(page)}

    ${takeSectionHtml(page)}
  </main>`;
  const html = framedPageHtml(dataset, {
    title, meta: { description: desc, path: DATA_PATH, kind: "website" },
    headTags: [`<script type="application/ld+json">${ld}</script>`], css: DATA_PAGE_RULES,
    place: { here: DATA_PATH }, facts, content,
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
 * ignores the refresh. Its stamp and its footer come from `state`'s reckoning
 * of the dataset's facts, the page's it points to.
 */
export function statusAlias(dataset: Dataset, state: WatchState = watchState): DataPage {
  const facts = reckonDatasetFacts(dataset, state);
  const target = url(DATA_PATH);
  const title = STATUS_ALIAS_TITLE;
  const content = `<header class="masthead masthead-with-stamps">
    <div>
      <h1>${movedHeadingHtml(`<a class="tap" href="${escAttr(target)}">${esc(THE_DATA)}</a>`)} <em>${esc(TAGLINE)}</em></h1>
      <p class="lede">${esc(STATUS_ALIAS_LEDE)}</p>
    </div>
    ${rulesRead(facts.readRange.newest)}
  </header>`;
  const headTags = [
    `<meta http-equiv="refresh" content="0; url=${escAttr(target)}">`,
    `<link rel="canonical" href="${escAttr(absolute(DATA_PATH))}">`,
    '<meta name="robots" content="noindex, follow">',
  ];
  return {
    path: "/status",
    title,
    description: statusAliasDescription(absolute(DATA_PATH)),
    html: framedPageHtml(dataset, { title, headTags, facts, content }),
  };
}

/** The vocabulary the passport question is built from, as the site serves it. */
export const countriesJson = (): unknown => countryVocabulary;
