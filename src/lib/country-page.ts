import { joinAnd, type Country, type Dataset, type Route } from "permit-rulebook-data";
import { esc, escAttr } from "./reason.js";
import {
  PAGE_CSS, audienceNotice, audienceSentence, gist, stampDate, withArticle,
} from "./route-page.js";
import {
  DISCLAIMER, FRESHNESS_NOTE, PRODUCT_NAME, SEAL_LETTERS, TAGLINE, datasetDay,
} from "./copy.js";
import {
  DATA_LICENCE_NAME, DATA_LICENCE_URL, SOCIAL_CARD_PATH, absolute, url,
} from "./site.js";
import { countryPath, countrySlug, routePath } from "./slug.js";

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
 * The route names here are navigation, not use: a name in a list is a
 * cross-reference, and it keeps the short form the route page's own heading
 * glosses ("§ 18b"). That is the rule `route-page.ts` already states for its
 * crumbs and its neighbours list.
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

export interface CountryPage {
  path: string;
  title: string;
  description: string;
  html: string;
}

/**
 * The newest read date behind any of this country's routes. Nothing on this
 * page is quoted, so it carries no stamp; the date is here because the head of
 * a page a crawler reads should say when its content last moved.
 */
export function countryReadDate(dataset: Dataset, country: Country): string {
  const notice = audienceNotice(dataset);
  return country.routes.map((r) => stampDate(r, notice)).sort().at(-1) ?? "";
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

  const head = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${escAttr(desc)}">
<link rel="canonical" href="${escAttr(absolute(path))}">
<link rel="icon" href="${escAttr(url("/favicon.ico"))}" sizes="16x16 32x32 64x64">
<link rel="icon" href="${escAttr(url("/favicon.svg"))}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${escAttr(url("/favicon-64.png"))}">
<meta property="og:site_name" content="${escAttr(PRODUCT_NAME)}">
<meta property="og:title" content="${escAttr(title)}">
<meta property="og:description" content="${escAttr(`${TAGLINE} ${desc}`)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${escAttr(absolute(path))}">
<meta property="og:image" content="${escAttr(absolute(SOCIAL_CARD_PATH))}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escAttr(title)}">
<meta name="twitter:description" content="${escAttr(`${TAGLINE} ${desc}`)}">
<meta name="twitter:image" content="${escAttr(absolute(SOCIAL_CARD_PATH))}">
<style>${PAGE_CSS}</style>`;

  const body = `<div class="wrap">

  <header class="masthead">
    <nav class="crumbs label" aria-label="Where you are">
      <a class="tap-min" href="${escAttr(url("/"))}"><span class="seal" title="${
    escAttr(PRODUCT_NAME)}" aria-hidden="true">${SEAL_LETTERS}</span>${
    esc(PRODUCT_NAME)}</a><span>${esc(country.name)}</span>
    </nav>
    <h1>Work permits in ${esc(withArticle(country))}</h1>
    <p class="lede">${esc(audienceSentence(country))} These are the ${count} routes we hold rules for here. Each one has a page of its own, where every value is the authority's own sentence with the page it came from and the day we read it.</p>
  </header>

  <main>
    <nav class="neighbours" aria-labelledby="routes-h">
      <h2 class="label" id="routes-h">The ${count} routes in ${esc(withArticle(country))}</h2>
      <ul>${country.routes.map((route) => `
        <li><a class="tap-min" href="${escAttr(url(routePath(country, route)))}">${
    esc(route.name)}<small>${esc(gist(route))}</small></a></li>`).join("")}
      </ul>
    </nav>

    <section class="cta" aria-labelledby="cta-h">
      <h2 class="visually-hidden" id="cta-h">Check your own situation</h2>
      <p><strong>Not sure which of these to read?</strong> The questions are answered on this device only — nothing is sent anywhere.</p>
      <a class="btn tap-min" href="${escAttr(url("/"))}">Check yours — ${esc(country.name)}</a>
    </section>
  </main>

  <footer>
    <p class="disclaimer">${esc(DISCLAIMER)} ${esc(FRESHNESS_NOTE)}</p>
    <div class="health"><span>dataset <time datetime="${
    escAttr(datasetDay(dataset.dataset_version))}">${esc(datasetDay(dataset.dataset_version))}</time></span><span>newest value read <time datetime="${
    escAttr(read)}">${esc(read)}</time></span><span>open data · <a class="tap" href="${
    escAttr(DATA_LICENCE_URL)}" target="_blank" rel="noopener">${esc(DATA_LICENCE_NAME)}</a></span></div>
  </footer>

</div>`;

  return {
    path, title, description: desc,
    html: `<!doctype html>\n<html lang="en">\n<head>\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`,
  };
}

/** Every country page this dataset produces. */
export function countryPages(dataset: Dataset): CountryPage[] {
  return countryAddresses(dataset).map((address) => countryPage(dataset, address));
}
