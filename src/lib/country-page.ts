// A count reads as a word in a sentence — "Germany: eight routes." — and the
// dataset package spells it, so the site and the data cannot disagree about
// what eight is called (Standards review, 2026-09-08).
import {
  countedWords, joinAnd, scopeLine, type Country, type Dataset, type Route,
} from "permit-rulebook-data";
import { esc, escAttr } from "./reason.js";
import { contentSecurityPolicy } from "./csp.js";
import {
  PAGE_CSS, audienceSentence, gist, pageStamp, routeFigure, withArticle,
} from "./route-page.js";
import {
  DISCLAIMER, PRODUCT_NAME, TAGLINE, datasetDay,
} from "./copy.js";
import {
  DATA_LICENCE_NAME, DATA_LICENCE_URL, EXCLUSIONS_URL, NEW_NEED_URL, OWNER, REPO_DATA, analyticsBeacon,
  SPONSOR_URL, TRACKER_URL, headMeta, lastWatchRun, readRange, url,
} from "./site.js";
import { countryPath, countrySlug, routePath } from "./slug.js";
// One set of elements for the identity, and one memory of what a page has
// already explained: a country page is a crawl landing page like any other
// (Standards and Spec review, 2026-09-08).
import {
  MENU_SCRIPT, iconLinks, rulesRead, siteFooter, siteHeader,
  type FooterFacts, type NavLink,
} from "./identity.js";
import { type Glossary, glossSection } from "./gloss.js";

/**
 * One page per country — the address a route page's crumb climbs to.
 *
 * The isolated product critique of 2026-09-08 (B2) requested `/germany/` from
 * the live host and got a 404, while `/germany/eu-blue-card-general` answered
 * 200. Every route page was orphaned: the home page linked none of them, no
 * sitemap named them, and the only way to one was another route page's "also
 * in" list or a URL you already held. This is the missing floor of the site —
 * one click from the home page's footer, one click from here to any route.
 *
 * It is built as a string for the reason `route-page.ts` is: what ships has to
 * be readable by a test. It is the same document that page is, minus everything
 * a country has no business claiming — no stamp of its own, no rules, no
 * verdict vocabulary — and it links `route-page.ts`'s own stylesheet rather
 * than growing a second one, so the two screens cannot drift apart.
 *
 * A stranger arrives here from a search result, so this page explains what it
 * prints: the first "§" in its list of routes is glossed the way a route page
 * glosses its own heading (Spec review, 2026-09-08 — it used to keep the short
 * form on the grounds that a list is navigation, which is true of a crumb and
 * not of a landing page). It carries the identity pair for the same reason, and
 * stamps the day the dataset itself was last read, because nothing on it is
 * quoted (human amendment to decision 12, 2026-09-08).
 */

export interface CountryAddress {
  country: Country;
  slug: string;
  path: string;
}

/** Every country page this dataset produces. Four at launch. */
export function countryAddresses(dataset: Dataset): CountryAddress[] {
  return dataset.countries.map((country) => ({
    country,
    slug: countrySlug(country),
    path: countryPath(country),
  }));
}

/**
 * The four links the home page's footer carries — the first of the two clicks
 * that reach every route page. Generated here rather than written into the
 * template, so a fifth country is linked the day it lands in the dataset.
 */
export interface CountryLink {
  path: string;
  name: string;
}

export function countryLinks(dataset: Dataset): CountryLink[] {
  return countryAddresses(dataset).map(({ country, path }) => ({ path, name: country.name }));
}

/** The same four, in the shape the shared header's nav takes. */
export function navCountries(dataset: Dataset): NavLink[] {
  return countryLinks(dataset).map(({ path, name }) => ({ path, label: name }));
}

export interface CountryPage {
  path: string;
  title: string;
  description: string;
  html: string;
}

/**
 * The newest read date behind any of this country's routes — what the head of a
 * page a crawler reads says about when its content last moved. The pair in the
 * masthead stamps the site's own newest read date instead: this page quotes
 * nothing, and the promise it can honestly make is the one the interview's
 * question screens make (human amendment to decision 12, 2026-09-08).
 */
export function countryReadDate(dataset: Dataset, country: Country): string {
  return country.routes.map((r) => pageStamp(dataset, r)).sort().at(-1) ?? "";
}

/**
 * The newest read date behind anything this site publishes, derived the same
 * way every page's own date is — the newest of the four countries'. The
 * dataset's own summary carries this figure too, but it is typed as possibly
 * absent, and a date printed on a page may not be.
 */
export function siteReadDate(dataset: Dataset): string {
  return countryAddresses(dataset)
    .map((a) => countryReadDate(dataset, a.country))
    .sort().at(-1) ?? "";
}

/**
 * What a link preview says about a country page: the routes it lists, by name,
 * capped so a description stays a description. The count is stated, so the
 * three names never read as the whole list.
 */
function description(country: Country): string {
  const names = country.routes.map((r: Route) => r.name);
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  const listed = rest > 0 ? `${joinAnd(shown)} and ${rest} more` : joinAnd(shown);
  return `The ${names.length} work-permit routes we hold rules for in ${withArticle(country)}: ` +
    `${listed} — each with the authority's own sentence for every value and the day it was read.`;
}

export function countryPage(dataset: Dataset, address: CountryAddress): CountryPage {
  const { country, path } = address;
  const title = `Work permits in ${withArticle(country)} · ${PRODUCT_NAME}`;
  const desc = description(country);
  const read = countryReadDate(dataset, country);
  const count = country.routes.length;
  // One page, one memory of what it has already explained. A stranger meets
  // "§" here as readily as on a route page — this is a landing page too.
  const seen: Glossary = new Set();

  const head = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${contentSecurityPolicy([MENU_SCRIPT])}
${iconLinks()}
${headMeta({ title, description: desc, path, kind: "website" })}
<style>${PAGE_CSS}</style>`;

  const body = `<div class="wrap">

  ${siteHeader(navCountries(dataset), { countryPath: path, current: "page" })}

  <div class="masthead-with-stamps">
    <div>
      <h1>${esc(withArticle(country))}: ${esc(countedWords(count, "route"))}. <em>${esc(TAGLINE)}</em></h1>
      <p class="lede">Every employment route ${esc(withArticle(country))} publishes that a rule can decide, each on its own page with the authority's sentences and the day we read them. ${
    esc(audienceSentence(country))} Routes that turn on an official's discretion are <a class="tap" href="${
    escAttr(EXCLUSIONS_URL)}" target="_blank" rel="noopener">listed with their reasons</a>, not here.</p>
    </div>
    ${rulesRead(read)}
  </div>

  <main>
    <ul class="routes" aria-label="The routes in ${escAttr(withArticle(country))}">${
    country.routes.map((route) => {
      const figure = routeFigure(dataset, route);
      return `
      <li><a class="card tap-min" href="${escAttr(url(routePath(country, route)))}"><span class="name">${
        esc(glossSection(route.name, seen))}</span><p class="gist">${esc(gist(route))}</p><p class="meta"><span>${
        esc(figure.label)}${figure.value ? ` <b>${esc(figure.value)}</b>` : ""}</span><span>${
        esc(scopeLine(route))}</span><span class="read"><time datetime="${
        escAttr(pageStamp(dataset, route))}">read ${esc(pageStamp(dataset, route))}</time></span></p></a></li>`;
    }).join("")}
    </ul>

    <div class="cta">
      <a class="btn tap-min" href="${escAttr(`${url("/")}?country=${country.code.toLowerCase()}`)}">Check yours — ${
    esc(country.name)}</a>
      <span class="note">Answered on this device only. The result names which of these routes fit.</span>
    </div>
  </main>

  ${siteFooter(navCountries(dataset), footerFacts(dataset), {
    countryPath: path, current: "page", checkPath: `/?country=${country.code.toLowerCase()}`,
  })}

</div>
<script>${MENU_SCRIPT}</script>
${analyticsBeacon()}`;

  return {
    path, title, description: desc,
    html: `<!doctype html>\n<html lang="en">\n<head>\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`,
  };
}

/** Every country page this dataset produces. */
export function countryPages(dataset: Dataset): CountryPage[] {
  return countryAddresses(dataset).map((address) => countryPage(dataset, address));
}

/**
 * What the shared footer states, from the dataset and from `site.ts` — never
 * typed into a page. It lives here because it needs the dataset and the footer
 * itself must not: `identity.ts` knows markup, not data.
 */
export function footerFacts(dataset: Dataset, lastRun: string = lastWatchRun()): FooterFacts {
  // Once: it walks every route's provenance, and the year comes from the same
  // answer rather than a second walk (Standards review, 2026-09-08).
  const read = readRange(dataset);
  return {
    read,
    // The version is a date, and this product spells a date one way
    // (decision 12): "2026.09.07" beside a read date is a second date format on
    // the same line, which is the thing that rule exists to prevent.
    datasetVersion: datasetDay(dataset.dataset_version),
    lastRun,
    disclaimer: DISCLAIMER,
    licenceUrl: DATA_LICENCE_URL,
    licenceName: DATA_LICENCE_NAME,
    repository: REPO_DATA,
    tracker: TRACKER_URL,
    newNeed: NEW_NEED_URL,
    sponsor: SPONSOR_URL,
    owner: OWNER,
    // The year the notice carries, from the newest reading rather than from the
    // clock: a page built today about values read today says the same year
    // twice, and a page rebuilt in January must not claim a year the data has
    // not reached.
    year: read.newest.slice(0, 4),
  };
}
