// @level presentation
// A count reads as a word in a sentence — "two routes we hold the rules for"
// — and the dataset package spells it, so the site and the data cannot
// disagree about what two is called (Standards review, 2026-09-08).
import {
  countedWords, phraseOf, phraseAtStartOf, datasetMeta, isScored, joinAnd, scopeLine,
  type Country, type Dataset, type Route,
} from "permit-rulebook-data";
import { esc, escAttr } from "./reason.js";
import { framedPageHtml } from "./frame/framed-page.js";
import {
  audienceSentence, gist, pageStamp, routeFigure,
} from "./route-page/route-page.js";
import { TAGLINE, capitalise } from "./copy/frame.js";
import {
  LISTED_WITH_THEIR_REASONS, LISTED_WITH_THE_REASONS, QUOTED_ONLY_HEADING, RESULT_NAMES_ASKED_ROUTES,
  RESULT_NAMES_FITTING_ROUTES, askedRoutesLabel, countryHeadline, countryLedeOpen, countryPageDescription,
  countryPageTitle, discretionLeftOutLine, notAskedBelowLine, notAskedLede, notAskedRoutesLabel,
} from "./copy/country-page.js";
import { readOn } from "./copy/quotes.js";
import { EXCLUSIONS_URL, url } from "./site.js";
import { countryCheckPath, countryPath, countrySlug, routePath } from "./slug.js";
// One set of elements for the identity, and one memory of what a page has
// already explained: a country page is a crawl landing page like any other
// (Standards and Spec review, 2026-09-08).
import { rulesRead } from "./identity.js";
import { type Glossary, glossSection, glossed } from "./gloss.js";
// The page's own rules, beside its code; the frame's come first (#142).
import COUNTRY_PAGE_RULES from "./country-page.css?raw";

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
 * The date a site-wide page carries: the newest read date in the whole
 * dataset, the one the home page prints. `/data/` hands over every sentence,
 * the ones only the results card prints included, so its date is the
 * dataset's, not the newest route page's. The summary is absent only for a
 * dataset with no read value at all, where no page has a day to print either.
 */
export function siteReadDate(dataset: Dataset): string {
  return datasetMeta(dataset).newest_retrieved_at ?? "";
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
  return countryPageDescription(names.length, phraseOf(country.code), listed);
}

/** What every card on one country index shares: the dataset, the country,
 * and the page's memory of what it has already explained. */
interface CountryCardContext {
  dataset: Dataset;
  country: Country;
  seen: Glossary;
}

/**
 * One card on a country index. The same card for a route the checker asks about
 * and one it does not — same name, same gist, same read date — minus the figure,
 * which a route with no rule to decide has no honest number for. Leaving the
 * figure's own "no salary threshold" on an unscored card would state as a fact
 * about the route something that is a fact about our dataset (s9).
 */
function routeCard(context: CountryCardContext, route: Route): string {
  const { dataset, country, seen } = context;
  const figure = isScored(route) ? routeFigure(dataset, route) : undefined;
  return `
      <li><a class="card tap-min" href="${escAttr(url(routePath(country, route)))}"><span class="name">${
    esc(glossSection(route.name, seen))}</span><p class="gist">${esc(glossed(gist(route), seen))}</p><p class="meta">${
    figure ? `<span>${esc(figure.label)}${figure.value ? ` <b>${esc(figure.value)}</b>` : ""}</span>` : ""}<span>${
    esc(scopeLine(route, { reader: "not-answered" }))}</span><span class="read"><time datetime="${
    escAttr(pageStamp(dataset, route))}">${esc(readOn(pageStamp(dataset, route)))}</time></span></p></a></li>`;
}

/**
 * The two lists a country page carries. The routes the checker asks about come
 * first, in the dataset's own order; the ones it does not ask about come below
 * them under a heading that offers nothing (s9).
 */
interface ListedRoutes {
  scored: Route[];
  quotedOnly: Route[];
}

function listedRoutesOf(country: Country): ListedRoutes {
  return { scored: country.routes.filter(isScored), quotedOnly: country.routes.filter((r) => !isScored(r)) };
}

/** A link to the list of what the dataset leaves out, in the lede's inline link style. */
const exclusionsLinkHtml = (label: string): string =>
  `<a class="tap" href="${escAttr(EXCLUSIONS_URL)}" target="_blank" rel="noopener">${esc(label)}</a>`;

/** The lede under the headline: whom the routes are for, then where the ones not asked about went. */
function countryLedeHtml(country: Country, quotedOnlyCount: number): string {
  const leftOut = quotedOnlyCount
    ? notAskedBelowLine(esc(countedWords(quotedOnlyCount, "route")), exclusionsLinkHtml(LISTED_WITH_THE_REASONS))
    : discretionLeftOutLine(exclusionsLinkHtml(LISTED_WITH_THEIR_REASONS));
  return `${esc(countryLedeOpen(phraseOf(country.code)))} ${esc(audienceSentence(country))} ${leftOut}`;
}

/**
 * The masthead: the headline, the lede and the read stamp.
 *
 * The heading counts every route, then the ones the checker asks about: a
 * single total over a page whose last route has no verdict in it would promise
 * answers the page does not give. It counts in figures, as every label on the
 * product does; the ledes below it count in words, because they are sentences.
 */
function countryMastheadHtml(dataset: Dataset, country: Country, routes: ListedRoutes): string {
  const headline = countryHeadline(phraseAtStartOf(country.code), country.routes.length, routes.scored.length);
  return `<div class="masthead-with-stamps">
    <div>
      <h1>${esc(headline)} <em>${esc(TAGLINE)}</em></h1>
      <p class="lede">${countryLedeHtml(country, routes.quotedOnly.length)}</p>
    </div>
    ${rulesRead(countryReadDate(dataset, country))}
  </div>`;
}

/** The section under the routes the checker asks about: the ones it does not. */
function quotedOnlySectionHtml(context: CountryCardContext, quotedOnly: Route[]): string {
  return `<section class="quoted-only" aria-labelledby="quoted-only-h">
      <h2 class="label" id="quoted-only-h">${esc(QUOTED_ONLY_HEADING)}</h2>
      <p class="lede">${esc(notAskedLede(capitalise(countedWords(quotedOnly.length, "route")), quotedOnly.length))}</p>
      <ul class="routes" aria-label="${escAttr(notAskedRoutesLabel(phraseOf(context.country.code)))}">${
    quotedOnly.map((route) => routeCard(context, route)).join("")}
      </ul>
    </section>`;
}

/** The way on: the interview, scoped to this country, and what its result names. */
function countryCtaHtml(country: Country, quotedOnlyCount: number): string {
  return `<div class="cta cta-country">
      <a class="btn tap-min" href="${escAttr(url(countryCheckPath(country)))}">Check yours — ${
    esc(country.name)}</a>
      <span class="note">Answered on this device only. ${quotedOnlyCount
    ? RESULT_NAMES_ASKED_ROUTES
    : RESULT_NAMES_FITTING_ROUTES}</span>
    </div>`;
}

/** The page's main: the routes the checker asks about, the ones it does not, and the way on. */
function countryMainHtml(dataset: Dataset, country: Country, routes: ListedRoutes): string {
  const { scored, quotedOnly } = routes;
  // One page, one memory of what it has already explained. A stranger meets
  // "§" here as readily as on a route page — this is a landing page too.
  const cardContext: CountryCardContext = { dataset, country, seen: new Set() };
  return `<main>
    <ul class="routes" aria-label="${escAttr(askedRoutesLabel(phraseOf(country.code)))}">${
    scored.map((route) => routeCard(cardContext, route)).join("")}
    </ul>${quotedOnly.length ? `

    ${quotedOnlySectionHtml(cardContext, quotedOnly)}` : ""}

    ${countryCtaHtml(country, quotedOnly.length)}
  </main>`;
}

export function countryPage(dataset: Dataset, address: CountryAddress): CountryPage {
  const { country, path } = address;
  const title = countryPageTitle(phraseOf(country.code));
  const desc = description(country);
  const routes = listedRoutesOf(country);
  const content = `${countryMastheadHtml(dataset, country, routes)}

  ${countryMainHtml(dataset, country, routes)}`;
  const html = framedPageHtml(dataset, {
    title, meta: { description: desc, path, kind: "website" }, css: COUNTRY_PAGE_RULES, content,
    place: { countryPath: path, current: "page", checkPath: countryCheckPath(country) },
  });
  return { path, title, description: desc, html };
}

/** Every country page this dataset produces. */
export function countryPages(dataset: Dataset): CountryPage[] {
  return countryAddresses(dataset).map((address) => countryPage(dataset, address));
}
