// @level presentation
import {
  scopeLine, phraseOf, possessiveAtStartOf, criterionPhrase, formatEURPer, forEachCriterion,
  isScored, joinAnd, periodOf, shortLabelOf,
  type Country, type Dataset, type Route,
} from "permit-rulebook-data";
// One module explains an abbreviation, so the route page and the results card
// say the same words for the same token (2026-09-08).
import { type Glossary, glossSection, glossed } from "../gloss.js";
// One set of elements for the identity the shared CSS places (2026-09-08).
import { rulesRead } from "../identity.js";
import { framedPageHtml } from "../frame/framed-page.js";
import { esc, escAttr } from "../reason.js";
import {
  DATA_LICENCE_FULL, DATA_LICENCE_NAME, FEEDBACK_PATH, REPO_DATA,
  absolute, readWatchRun, url, type WatchRun,
} from "../site.js";
import {
  ROUTE_PAGE_ADDENDUM,
  NOT_ASKED_SCOPE_HEADING, ROUTE_PAGE_UNSCORED_ADDENDUM, ROUTE_TAGLINE, alsoInHeading, askedRouteDescription,
  audienceLine, dailyCheck, everyConditionQuoted, everyNumberQuoted, notAskedRouteDescription,
} from "../copy/route-page.js";
import { PRODUCT_NAME } from "../copy/frame.js";
import { WRONG_DOOR_LABEL } from "../copy/feedback.js";
import { countryPath, routeAddresses, routeJsonPath, routePath, type RouteAddress } from "../slug.js";
import { audienceNotice, noticeSection, ownUnread, pageStamp, printedNotices } from "./blocks/notices.js";
import { answerBlock, gist } from "./blocks/route-figure.js";
import { ruleCard, ruleCriteria, tapMin, type RulePage } from "./blocks/rule-card.js";
import { statedBlocks } from "./blocks/stated-blocks.js";
// The page's own rules, beside its code; the frame's come first (#142).
import ROUTE_PAGE_RULES from "./route-page.css?raw";

export { TAP_CLASSES } from "./blocks/rule-card.js";
export { audienceNotice, noticesOn, ownUnread, pageStamp, routeSourceUrls } from "./blocks/notices.js";
export { gist, routeFigure, type RouteFigure } from "./blocks/route-figure.js";

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

/**
 * Who the page is for, said before the first rule. An Irish reader who lands on
 * a German route page from a search is told here, not after seven rules and a
 * refusal (`tests/s6-edges.test.ts`), and the call to action below leads to the notice
 * that answers her rather than to a rejection.
 */
export const audienceSentence = (country: Country): string => audienceLine(phraseOf(country.code));

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

function description(dataset: Dataset, country: Country, route: Route): string {
  // A route the checker does not ask about has no criteria to describe, and
  // the other routes' sentence would come out as the country's name, the
  // route's name and an empty list. What a search result should promise is
  // what the page actually is (s9).
  if (!isScored(route)) return notAskedRouteDescription(possessiveAtStartOf(country.code), route.name);
  const bits: string[] = [];
  forEachCriterion(route.criteria, (c) => {
    if (c.op === "gte")
      bits.push(`the ${formatEURPer(c.threshold.amount, periodOf(dataset, c.field))} ${
        shortLabelOf(dataset, c.field).toLowerCase()}`);
  });
  for (const c of ruleCriteria(dataset, route)) {
    if (bits.length >= 3) break;
    if (c.op === "gte" || (("field" in c) && c.field === "citizenship")) continue;
    bits.push(criterionPhrase(dataset, c));
  }
  return askedRouteDescription(possessiveAtStartOf(country.code), route.name, joinAnd(bits));
}

/**
 * One route page.
 *
 * `run.lastRun` is the day the watch last re-read every source — the single
 * value on this page that moves without anyone editing anything. It is an
 * argument rather than a read inside the footer so that a render over a frozen
 * dataset is genuinely frozen: the fingerprint case hashed a page that changed
 * by itself, and failed the first build a data change ever reached through the
 * dispatch (CI 2026-09-09). What that run could not read, `run.unread`, moves
 * with it, and is read the same way, for the same reason. Either one left out
 * is read from the watch's state.
 */
export function routePage(dataset: Dataset, address: RouteAddress, run: WatchRun = {}): RoutePage {
  const watch = readWatchRun(dataset, run);
  const { country, route } = address;
  const notice = audienceNotice(dataset);
  const about = printedNotices(dataset, route);
  const read = pageStamp(dataset, route);
  const title = `${route.name} · ${country.name} · ${PRODUCT_NAME}`;
  const desc = description(dataset, country, route);
  const path = address.path;
  const jsonPath = routeJsonPath(country, route);
  const rules = ruleCriteria(dataset, route);
  // The footer counts every unread source a reader is looking at (s11); the
  // sentence under the scope heading speaks for this page's own (s23, F3).
  const missed = ownUnread(dataset, route, watch.unread).length;
  // One page, one memory of which abbreviations it has already expanded. The
  // heading claims the section symbol before any citation can: it is where the
  // page states its own name, and a German route's name carries "§" whether
  // the reader has met the symbol before or not (human, 2026-09-08). The trail
  // above it repeats the name for navigation and is not a use; a neighbouring
  // route's name is a cross-reference and keeps the short form.
  const seen: Glossary = new Set();
  const heading = glossSection(route.name, seen);
  const rulePage: RulePage = { dataset, country, route, seen, notice };

  const scored = isScored(route);
  // The H1 is the name and nothing after it. It carried the tagline as an
  // `<em>` behind a full stop — "…(§ 19c / § 6 BeschV). The rules,
  // quoted and dated." — a name that ends in a bracket, then a sentence, in
  // one heading (v1.1 gate critique, P8 — s27). The tagline is its own line
  // under it now, in the type the `<em>` had; the <title> and the social
  // card never carried it and do not move.
  const content = `<header class="masthead masthead-with-stamps">
    <div>
      <h1>${esc(heading)}</h1>
      <p class="tagline">${esc(ROUTE_TAGLINE)}</p>
      <p class="lede">${route.summary ? `${esc(glossed(route.summary, seen))} ` : ""}Every ${
    scored ? "number" : "condition"} on this page is the authority's own sentence, with the page it came from and the day we read it. ${
    esc(audienceSentence(country))} ${esc(scored ? ROUTE_PAGE_ADDENDUM : ROUTE_PAGE_UNSCORED_ADDENDUM)}</p>
    </div>
    ${rulesRead(read)}
  </header>

  <div class="page">
  <main>${scored ? `
${answerBlock(dataset, route)}${about.map((n) => noticeSection(n, seen)).join("")}
  <section class="cta" aria-labelledby="cta-h">
    <h2 class="visually-hidden" id="cta-h">Check your own situation</h2>
    <p><strong>Where do you stand on this route?</strong> The questions are answered on this device only — nothing is sent anywhere. You get each rule against what you declared, the gap if there is one, and which single change would open more routes.</p>
    <a ${tapMin("btn")} href="${escAttr(`${url("/")}?route=${route.id}`)}">Check yours — ${esc(country.name)}, ${
    esc(route.name)}</a>
  </section>

  <section class="scope" aria-labelledby="scope-h">
    <b id="scope-h">What the checker asks, and what it does not</b>
    <p>${esc(everyNumberQuoted(dailyCheck(missed)))} On this route — <strong>${
    esc(scopeLine(route, { reader: "not-answered" }))}</strong>. ${esc(route.scope.reason)}</p>
  </section>` : `
  <section class="scope" aria-labelledby="scope-h">
    <b id="scope-h">${esc(NOT_ASKED_SCOPE_HEADING)}</b>
    <p><strong>${esc(scopeLine(route, { reader: "not-answered" }))}</strong>. ${esc(route.scope.reason)} ${esc(everyConditionQuoted(dailyCheck(missed)))}</p>
  </section>`}

  <section class="rules" aria-labelledby="rules-h">
    <h2 class="visually-hidden" id="rules-h">The rules of this route</h2>${
    rules.map((c) => ruleCard(rulePage, c)).join("")}${
    statedBlocks(route, seen)}
  </section>


  </main>
  <aside aria-label="Beside the rules">
  <section class="data" aria-labelledby="data-h">
    <h2 class="label" id="data-h">The data behind this page</h2>
    <p>This page is generated from an open dataset: every number and quote above is a record in it, with its source and read date. Reuse it under ${
    esc(DATA_LICENCE_FULL)} — credit and link back.</p>
    <nav aria-label="The data behind this page">
      <a ${tapMin()} href="${escAttr(url(jsonPath))}">This route as JSON</a>
      <a ${tapMin()} href="${escAttr(REPO_DATA)}" target="_blank" rel="noopener">The dataset on GitHub</a>
      <a ${tapMin()} href="${escAttr(url(FEEDBACK_PATH))}">${esc(WRONG_DOOR_LABEL)}</a>
    </nav>
  </section>
${neighbours(country, route, seen)}
  </aside>
  </div>`;

  const html = framedPageHtml(dataset, {
    title, meta: { description: desc, path, kind: "article" }, css: ROUTE_PAGE_RULES, run: watch, content,
    place: { countryPath: countryPath(country), current: "true", jsonPath, checkPath: `/?country=${country.code.toLowerCase()}` },
  });
  return {
    path, jsonPath, title, description: desc, readDate: read, html,
    json: {
      country: { code: country.code, name: country.name },
      route,
      page: absolute(path),
      dataset_version: dataset.dataset_version,
      schema_version: dataset.schema_version,
      licence: DATA_LICENCE_NAME,
      source: REPO_DATA,
      rules_read: read,
    },
  };
}

/** Every route page this dataset produces. 23 at launch. */
export function routePages(dataset: Dataset, run: WatchRun = {}): RoutePage[] {
  return routeAddresses(dataset).map((a) => routePage(dataset, a, run));
}
