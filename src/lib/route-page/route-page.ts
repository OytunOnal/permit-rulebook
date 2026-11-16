// @level presentation
import {
  scopeLine, phraseOf, possessiveAtStartOf, criterionPhrase, formatEURPer, forEachCriterion,
  isScored, joinAnd, periodOf, shortLabelOf,
  type Country, type Dataset, type Route, type WatchState,
} from "permit-rulebook-data";
// One module explains an abbreviation, so the route page and the results card
// say the same words for the same token (2026-09-08).
import { type Glossary, glossSection, glossed } from "../gloss.js";
// One set of elements for the identity the shared CSS places (2026-09-08).
import { rulesRead } from "../identity.js";
import { framedPageHtml } from "../frame/framed-page.js";
import { esc, escAttr } from "../reason.js";
import {
  FEEDBACK_PATH, REPO_DATA, absolute, url, watchState,
} from "../site.js";
import {
  reckonDatasetFacts, routeFactsOf, type PrintedQuotes, type RouteFacts,
} from "../dataset-facts/reckon-dataset-facts.js";
import {
  ROUTE_PAGE_ADDENDUM,
  ASKED_SCOPE_HEADING, BESIDE_THE_RULES, CHECK_ON_THIS_DEVICE, DATA_BEHIND_THIS_PAGE, EVERY_CONDITION_SOURCED,
  EVERY_NUMBER_SOURCED, GENERATED_FROM_DATASET,
  NOT_ASKED_SCOPE_HEADING, ROUTE_PAGE_UNSCORED_ADDENDUM, ROUTE_TAGLINE, RULES_HEADING, WHERE_DO_YOU_STAND,
  alsoInHeading, askedRouteDescription, dailyCheck, everyConditionQuoted, everyNumberQuoted, notAskedRouteDescription,
  onThisRouteHtml, thresholdInDescription,
} from "../copy/route-page.js";
import {
  CHECK_YOUR_OWN_SITUATION, DATASET_ON_GITHUB, DATA_LICENCE_FULL, DATA_LICENCE_NAME, PRODUCT_NAME, ROUTE_AS_JSON,
  checkYoursFor, reuseUnder,
} from "../copy/frame.js";
import { WRONG_DOOR_LABEL } from "../copy/feedback.js";
import {
  countryCheckPath, countryPath, routeAddresses, routeJsonPath, routePath, type RouteAddress,
} from "../slug.js";
import { audienceSentence, gist } from "../route-lines.js";
import { authorityRoutePageLinkHtml } from "../quote.js";
import { noticeSection } from "./blocks/notices.js";
import { answerBlock } from "./blocks/route-figure.js";
import { ruleCard, type RulePage } from "./blocks/rule-card.js";
import { statedBlocks } from "./blocks/stated-blocks.js";
import { tapMin } from "../tap.js";
import ROUTE_PAGE_RULES from "./route-page.css?raw";

/**
 * One page per route, generated from the dataset and never typed.
 *
 * The whole document is built here, as a string, for the reason the verdict
 * module and `reason.ts` exist: what ships has to be readable by a test. The
 * invariants this slice carries — every amount and quote equals the
 * dataset's, no verdict word or verdict colour anywhere, every interactive
 * element reaches the tap minimum — are properties of the rendered page, not
 * of the template that made it, and a check that reads the template is
 * passed by moving a string.
 *
 * The page it renders is `docs/roadkeeper/design/s6-route-page.html`, approved in
 * s6 and revised after its isolated critique: the rail's labels are a
 * list that cannot collide at any width (B1), every control reaches
 * `--tap-min` (B2), no badge and no verdict colour (B3), quotes are `<q>` with
 * their language tagged and a note where the source's notation differs from the
 * page's (F1/F5), and one date format throughout (F3).
 */

function neighbours(country: Country, route: Route, seen: Glossary): string {
  const others = country.routes.filter((r) => r !== route);
  if (!others.length) return "";
  return `
    <nav class="neighbours" aria-labelledby="also-here">
      <h2 class="label" id="also-here">${esc(alsoInHeading(phraseOf(country.code)))}</h2>
      <ul>${others.map((r) => `
        <li><a ${tapMin()} href="${escAttr(url(routePath(country, r)))}">${esc(r.name)}<small>${
    esc(glossed(gist(r), seen))}</small></a></li>`).join("")}
      </ul>
    </nav>`;
}

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

export interface RoutePage {
  path: string;
  jsonPath: string;
  title: string;
  description: string;
  readDate: string;
  html: string;
  /** The route as the dataset holds it, plus where it came from. The data door
   * hands over the record, not a re-typing of it. */
  json: Record<string, unknown>;
}

function description(dataset: Dataset, address: RouteAddress, printed: PrintedQuotes): string {
  const { country, route } = address;
  // A route the checker does not ask about has no criteria to describe, and
  // the other routes' sentence would come out as the country's name, the
  // route's name and an empty list. What a search result should promise is
  // what the page actually is (s9).
  if (!isScored(route)) return notAskedRouteDescription(possessiveAtStartOf(country.code), route.name);
  const bits: string[] = [];
  forEachCriterion(route.criteria, (c) => {
    if (c.op === "gte")
      bits.push(thresholdInDescription(formatEURPer(c.threshold.amount, periodOf(dataset, c.field)),
        shortLabelOf(dataset, c.field).toLowerCase()));
  });
  for (const { criterion: c } of printed.cards) {
    if (bits.length >= 3) break;
    const isThresholdOrCitizenship = c.op === "gte" || ("field" in c && c.field === "citizenship");
    if (isThresholdOrCitizenship) continue;
    bits.push(criterionPhrase(dataset, c));
  }
  return askedRouteDescription(possessiveAtStartOf(country.code), route.name, joinAnd(bits));
}

/**
 * One route page.
 *
 * The day the watch last re-read every source is the single value on this
 * page that moves without anyone editing anything, and what that run could not
 * read moves with it. Both come from `state`, the watch's state the page is
 * built on, an argument rather than a read inside the footer so that a render
 * over a frozen dataset is genuinely frozen: the fingerprint case hashed a page
 * that changed by itself, and failed the first build a data change ever
 * reached through the dispatch (CI 2026-09-09). A render about another run is
 * handed a copy of the state that carries that run.
 */
export function routePage(dataset: Dataset, address: RouteAddress, state: WatchState = watchState): RoutePage {
  const facts = reckonDatasetFacts(dataset, state);
  const { country, route } = address;
  const routeFacts = routeFactsOf(facts, route);
  const read = routeFacts.stamp;
  const title = `${route.name} · ${country.name} · ${PRODUCT_NAME}`;
  const desc = description(dataset, address, routeFacts.printed);
  const path = address.path;
  const jsonPath = routeJsonPath(country, route);
  // One page, one memory of which abbreviations it has already expanded. The
  // heading claims the section symbol before any citation can: it is where the
  // page states its own name, and a German route's name carries "§" whether
  // the reader has met the symbol before or not (human, 2026-09-08). The trail
  // above it repeats the name for navigation and is not a use; a neighbouring
  // route's name is a cross-reference and keeps the short form.
  const seen: Glossary = new Set();
  const page: RulePage = { dataset, country, route, seen, notice: routeFacts.printed.audienceNotice };
  const content = `${mastheadHtml(page, read)}

  <div class="page">
  ${mainHtml(page, routeFacts)}
  ${asideHtml(page, jsonPath)}
  </div>`;
  const html = framedPageHtml(dataset, {
    title, meta: { description: desc, path, kind: "article" }, css: ROUTE_PAGE_RULES, facts, content,
    place: { countryPath: countryPath(country), current: "true", jsonPath, checkPath: countryCheckPath(country) },
  });
  return { path, jsonPath, title, description: desc, readDate: read, html, json: routeRecord(dataset, address, read) };
}

/** Every route page this dataset produces. 23 at launch. */
export function routePages(dataset: Dataset, state: WatchState = watchState): RoutePage[] {
  return routeAddresses(dataset).map((a) => routePage(dataset, a, state));
}

/** The masthead: the route's name, the tagline, the lede, the link to the
 * route's authority's route page as the result card draws it (#401, ruling 5)
 * and the read stamp. */
function mastheadHtml(page: RulePage, read: string): string {
  const { country, route, seen } = page;
  const heading = glossSection(route.name, seen);
  const scored = isScored(route);
  // The H1 is the name and nothing after it. It carried the tagline as an
  // `<em>` behind a full stop — "…(§ 19c / § 6 BeschV). The rules,
  // quoted and dated." — a name that ends in a bracket, then a sentence, in
  // one heading (v1.1 gate critique, P8 — s27). The tagline is its own line
  // under it now, in the type the `<em>` had; the <title> and the social
  // card never carried it and do not move.
  return `<header class="masthead masthead-with-stamps">
    <div>
      <h1>${esc(heading)}</h1>
      <p class="tagline">${esc(ROUTE_TAGLINE)}</p>
      <p class="lede">${route.summary ? `${esc(glossed(route.summary, seen))} ` : ""}${esc(scored ? EVERY_NUMBER_SOURCED : EVERY_CONDITION_SOURCED)} ${
    esc(audienceSentence(country))} ${esc(scored ? ROUTE_PAGE_ADDENDUM : ROUTE_PAGE_UNSCORED_ADDENDUM)}</p>
      ${authorityRoutePageLinkHtml(route)}
    </div>
    ${rulesRead(read)}
  </header>`;
}

/** The main column: what sits above the rules, then the rules and the blocks stated beside them. */
function mainHtml(page: RulePage, routeFacts: RouteFacts): string {
  const { route, seen } = page;
  return `<main>${aboveTheRulesHtml(page, routeFacts)}

  <section class="rules" aria-labelledby="rules-h">
    <h2 class="visually-hidden" id="rules-h">${esc(RULES_HEADING)}</h2>${
    routeFacts.printed.cards.map((card) => ruleCard(page, card)).join("")}${
    statedBlocks(route, seen)}
  </section>


  </main>`;
}

/**
 * What a reader meets before the rules: on a route the checker scores, the
 * answer block, the notices, the way into the checker and the scope; on one it
 * does not, the scope alone.
 */
function aboveTheRulesHtml(page: RulePage, routeFacts: RouteFacts): string {
  const { dataset, country, route, seen } = page;
  // The footer counts every unread source a reader is looking at (s11); the
  // sentence under the scope heading speaks for this page's own (s23, F3).
  const missed = routeFacts.unread.length;
  return isScored(route) ? `
${answerBlock(dataset, route, routeFacts.printed)}${routeFacts.printed.notices.map((n) => noticeSection(n, seen)).join("")}
  <section class="cta" aria-labelledby="cta-h">
    <h2 class="visually-hidden" id="cta-h">${esc(CHECK_YOUR_OWN_SITUATION)}</h2>
    <p><strong>${esc(WHERE_DO_YOU_STAND)}</strong> ${esc(CHECK_ON_THIS_DEVICE)}</p>
    <a ${tapMin("btn")} href="${escAttr(`${url("/")}?route=${route.id}`)}">${esc(checkYoursFor(country.name, route.name))}</a>
  </section>

  <section class="scope" aria-labelledby="scope-h">
    <b id="scope-h">${esc(ASKED_SCOPE_HEADING)}</b>
    <p>${esc(everyNumberQuoted(dailyCheck(missed)))} ${
    onThisRouteHtml(esc(scopeLine(route, { reader: "not-answered" })))} ${esc(route.scope.reason)}</p>
  </section>` : `
  <section class="scope" aria-labelledby="scope-h">
    <b id="scope-h">${esc(NOT_ASKED_SCOPE_HEADING)}</b>
    <p><strong>${esc(scopeLine(route, { reader: "not-answered" }))}</strong>. ${esc(route.scope.reason)} ${esc(everyConditionQuoted(dailyCheck(missed)))}</p>
  </section>`;
}

/** The aside: the data behind the page, and the country's other routes. */
function asideHtml(page: RulePage, jsonPath: string): string {
  const { country, route, seen } = page;
  return `<aside aria-label="${escAttr(BESIDE_THE_RULES)}">
  <section class="data" aria-labelledby="data-h">
    <h2 class="label" id="data-h">${esc(DATA_BEHIND_THIS_PAGE)}</h2>
    <p>${esc(GENERATED_FROM_DATASET)} ${esc(reuseUnder(DATA_LICENCE_FULL))}</p>
    <nav aria-label="${escAttr(DATA_BEHIND_THIS_PAGE)}">
      <a ${tapMin()} href="${escAttr(url(jsonPath))}">${esc(ROUTE_AS_JSON)}</a>
      <a ${tapMin()} href="${escAttr(REPO_DATA)}" target="_blank" rel="noopener">${esc(DATASET_ON_GITHUB)}</a>
      <a ${tapMin()} href="${escAttr(url(FEEDBACK_PATH))}">${esc(WRONG_DOOR_LABEL)}</a>
    </nav>
  </section>
${neighbours(country, route, seen)}
  </aside>`;
}

/** The route as the dataset holds it, plus where it came from: what the data door hands over. */
function routeRecord(dataset: Dataset, address: RouteAddress, read: string): Record<string, unknown> {
  const { country, route } = address;
  return {
    country: { code: country.code, name: country.name },
    route,
    page: absolute(address.path),
    dataset_version: dataset.dataset_version,
    schema_version: dataset.schema_version,
    licence: DATA_LICENCE_NAME,
    source: REPO_DATA,
    rules_read: read,
  };
}
