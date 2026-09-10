import {
  scopeLine, criterionPhrase, deriveQuestions, formatEURPer, forEachCriterion,
  isLocalization, joinAnd, joinOr, provenancedValuesOf,
  referencedFields, routeReadings, routeStatements, shortLabelOf, statementSources, subjectOf,
  type Country, type Criterion, type Dataset, type Notice, type ProvenanceEntry, type Route,
  type StatementException,
} from "permit-rulebook-data";
// The token set itself, not a copy of it. It was pasted in — forty values
// retyped from `tokens.css` — which is the one thing the token file exists to
// prevent: "a value that steps outside a token is a greppable deviation", and a
// second copy is a deviation nobody can grep for (Standards review,
// 2026-09-07). Inlined into the page rather than linked because a route page is
// one file a stranger and a crawler both fetch cold.
import TOKENS from "../../tokens.css?raw";
// The identity pair, from the one file both screens read. The results page
// links the same stylesheet, so the mark and the stamp cannot drift apart
// into two identities (human, 2026-09-08).
import IDENTITY from "../../identity.css?raw";
// One module explains an abbreviation, so the route page and the results card
// say the same words for the same token (2026-09-08).
import { type Glossary, glossSection, glossed } from "./gloss.js";
// One set of elements for the identity the shared CSS places (2026-09-08).
import { MENU_SCRIPT, iconLinks, rulesRead, siteFooter, siteHeader } from "./identity.js";
import { footerFacts, navCountries } from "./country-page.js";
// One frame for every quote the product shows, so the results card and these
// pages cannot describe the same sentence differently (2026-09-08).
import { noteHtml, quoteFrame } from "./quote.js";
import { esc, escAttr } from "./reason.js";
import { contentSecurityPolicy } from "./csp.js";
import {
  DATA_LICENCE_FULL, DATA_LICENCE_NAME, REPO_DATA, TRACKER_URL, analyticsBeacon,
  absolute, headMeta, url,
} from "./site.js";
import {
  PRODUCT_NAME, ROUTE_PAGE_ADDENDUM, ROUTE_TAGLINE,
} from "./copy.js";
import { countryPath, routeAddresses, routeJsonPath, routePath, type RouteAddress } from "./slug.js";

/**
 * One page per route, generated from the dataset and never typed.
 *
 * The whole document is built here, as a string, for the reason `card.ts` and
 * `reason.ts` exist: what ships has to be readable by a test. The invariants
 * this slice carries — every amount and quote equals the dataset's, no verdict
 * word or verdict colour anywhere, every interactive element reaches the tap
 * minimum — are properties of the rendered page, not of the template that made
 * it, and a check that reads the template is passed by moving a string.
 *
 * The page it renders is `docs/spine/design/s6-route-page.html`, approved with
 * the scenario and revised after its isolated critique: the rail's labels are a
 * list that cannot collide at any width (B1), every control reaches
 * `--tap-min` (B2), no badge and no verdict colour (B3), quotes are `<q>` with
 * their language tagged and a note where the source's notation differs from the
 * page's (F1/F5), and one date format throughout (F3).
 */

// ---------------------------------------------------------------------------
// The two ways an interactive element reaches the tap floor
// ---------------------------------------------------------------------------

/**
 * `tap-min` for anything that owns a box — a button, a crumb, a row in the
 * data door. `tap` for a link inside a sentence, where a taller line would
 * open a hole in the prose: it takes the height in vertical padding and gives
 * it back in negative margin.
 *
 * Every `<a>` and `<button>` on a generated page carries exactly one of them,
 * which is what makes the invariant checkable without a browser: the v0.7
 * critique measured 34/22/20 px controls, the token was written for it, and the
 * first mock designed afterwards broke it on seven of sixteen controls.
 */
export const TAP_CLASSES = ["tap", "tap-min"] as const;

const tapMin = (extra = ""): string => `class="${escAttr(extra ? `${extra} ` : "")}tap-min"`;
const tapInline = (extra = ""): string => `class="${escAttr(extra ? `${extra} ` : "")}tap"`;

// ---------------------------------------------------------------------------
// Small helpers over the dataset
// ---------------------------------------------------------------------------


const capitalise = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

const periodOf = (dataset: Dataset, field: string) =>
  dataset.fields.find((f) => f.id === field)?.period;

type Gte = Extract<Criterion, { op: "gte" }>;

/**
 * Every provenanced value under one criterion, its paths included.
 *
 * `provenancedValuesOf` answers for a single criterion, and a disjunction's own
 * answer is only its condition source — so a card built on it alone printed the
 * `any` and dropped the two thresholds inside it. That is not a rendering
 * detail: the Spanish Blue Card states both of its salaries inside a
 * disjunction, and the page showed neither amount and neither quote. The
 * invariant caught it (`de-experienced-worker`, `es-blue-card`), which is what
 * the invariant is for.
 */
function valuesUnder(c: Criterion): ProvenanceEntry[] {
  const out: ProvenanceEntry[] = [];
  forEachCriterion([c], (x) => out.push(...provenancedValuesOf(x)));
  // One quote, one line: a disjunction whose condition source is restated on a
  // path says the same sentence twice.
  const seen = new Set<string>();
  return out.filter((e) => {
    const key = `${e.value.source_url}#${e.value.quote}#${e.label ?? ""}#${e.amount ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The thresholds a criterion states, its paths included. */
function gteUnder(c: Criterion): Gte[] {
  const out: Gte[] = [];
  forEachCriterion([c], (x) => { if (x.op === "gte") out.push(x); });
  return out;
}

/**
 * The Netherlands takes an article and the other three do not. Nothing in the
 * dataset says so — a country carries its name, not its grammar — so the one
 * exception is declared here rather than showing a reader "a permit to work in
 * Netherlands" on six pages.
 *
 * Keyed on the country code, not on the display name: a name is a string that
 * can be re-worded, and re-wording it would silently drop the article. DEBT: a
 * fact about a country belongs in `countries.json` beside its name and its
 * class; it is one word for one country today, and it moves there the second
 * country that needs it (Standards review, 2026-09-07).
 */
const TAKES_THE = new Set(["NL"]);
export const withArticle = (country: Country): string =>
  TAKES_THE.has(country.code) ? `the ${country.name}` : country.name;

/**
 * Who the page is for, said before the first rule. An Irish reader who lands on
 * a German route page from a search is told here, not after seven rules and a
 * refusal (scenario step 10), and the call to action below leads to the notice
 * that answers her rather than to a rejection.
 */
export const audienceSentence = (country: Country): string =>
  `This page is for people who need a permit to work in ${withArticle(country)}.`;

/** Every provenanced value on this route, in the order the page prints them. */
function routeValues(route: Route): ProvenanceEntry[] {
  const out: ProvenanceEntry[] = [];
  forEachCriterion(route.criteria, (c) => out.push(...provenancedValuesOf(c)));
  // Both halves of a statement: the stamp is the latest read date on the page
  // (decision 12), and a carve-out's quote is on the page (Standards review,
  // 2026-09-10 — this was the one call site the accessor was written for that
  // still read one half).
  for (const s of routeStatements(route)) for (const source of statementSources(s)) out.push({ value: source });
  return out;
}

/**
 * The stamp's date: the newest read date among the page's own quotes.
 *
 * The mock's first cut showed the OLDEST of three dates in the headline trust
 * artefact, with no line saying what it aggregated (critique F3). Decision 12
 * settles it — the stamp equals the latest read date on the page, so a reader
 * can derive the number from the lines below it.
 */
export function stampDate(route: Route, notice?: Notice): string {
  const dates = routeValues(route).map((e) => e.value.retrieved_at);
  if (notice) dates.push(notice.source.retrieved_at);
  return dates.sort().at(-1) ?? "";
}

/**
 * The one notice that says who a route page is NOT for: an EU, EEA or Swiss
 * passport needs no permit here. It is on the page before the first rule so an
 * Irish reader landing on a German page is told, rather than walked through
 * seven rules and handed a refusal (scenario step 10).
 */
export function audienceNotice(dataset: Dataset): Notice | undefined {
  return (dataset.notices ?? []).find((n) => n.kind === "no-permit-needed");
}

// ---------------------------------------------------------------------------
// The quote block
// ---------------------------------------------------------------------------

interface QuoteOptions {
  /** The amount this quote is the proof of, where it is the proof of one. */
  amount?: number;
  /** What the value is called on its own line ("standard amount"). */
  label?: string;
  linkText?: string;
}

function quoteBlock(value: ProvenanceEntry["value"], o: QuoteOptions = {}, seen: Glossary = new Set()): string {
  const { lang, host, note } = quoteFrame(value, o.amount);
  return `<div class="src">
        <span><q${lang ? ` lang="${escAttr(lang)}"` : ""}>${esc(value.quote)}</q> · ${esc(host)}${
    o.label ? ` · ${esc(o.label)}` : ""}${
    value.legal_basis ? ` · ${esc(glossed(value.legal_basis, seen))}` : ""} · <b><time datetime="${escAttr(value.retrieved_at)}">read ${esc(value.retrieved_at)}</time></b>${
    noteHtml(note)}</span>
        <a ${tapInline()} href="${escAttr(value.source_url)}" target="_blank" rel="noopener">${
    esc(o.linkText ?? "Official page")} &#8599;</a>
      </div>`;
}

// ---------------------------------------------------------------------------
// The rail
// ---------------------------------------------------------------------------

interface RailRow { amount: number; text: string; own: boolean }

/**
 * The thresholds a reader can place this route's number against: the ones the
 * same country states on the same field. Every threshold in the dataset would
 * put ten ticks under a German salary, half of them Spanish; this route's alone
 * would be a scale with one mark and nothing to read it against (critique P2).
 */
function railRows(country: Country, route: Route, own: Gte): RailRow[] {
  const byAmount = new Map<number, { routes: Route[]; label?: string }>();
  for (const r of country.routes)
    forEachCriterion(r.criteria, (c) => {
      if (c.op !== "gte" || c.field !== own.field) return;
      const entry = byAmount.get(c.threshold.amount) ?? { routes: [] };
      if (!entry.routes.includes(r)) entry.routes.push(r);
      if (r === route) entry.label = c.threshold_label;
      byAmount.set(c.threshold.amount, entry);
    });
  return [...byAmount.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([amount, entry]) => {
      // A route may state two amounts on one rule — the Spanish Blue Card
      // states both of its salaries inside a disjunction — so "ours" is any
      // amount this route states, not only the one the card was built from.
      const own_ = entry.routes.includes(route);
      const others = entry.routes.filter((r) => r !== route);
      const text = own_
        ? `this route${entry.label ? ` — ${entry.label}` : ""}`
        : others.length === 1
          ? `${others[0].name} — another route here`
          : `${others.length} other routes here`;
      return { amount, text, own: own_ };
    });
}

function railHtml(dataset: Dataset, country: Country, route: Route, own: Gte): string {
  const rows = railRows(country, route, own);
  if (rows.length < 2) return "";
  const lo = Math.min(...rows.map((r) => r.amount)) * 0.9;
  const hi = Math.max(...rows.map((r) => r.amount)) * 1.08;
  const pct = (v: number) => Math.max(1, Math.min(99, ((v - lo) / (hi - lo)) * 100));
  const period = periodOf(dataset, own.field);
  return `<div class="rail" aria-hidden="true">${
    rows.map((r) => `<span class="tick" style="left:${pct(r.amount).toFixed(1)}%"></span>`).join("")
  }</div>
      <ul class="rail-list" aria-label="What this country asks on the same figure">${
    rows.map((r) => `<li><span>${r.own ? "<strong>" : ""}${esc(formatEURPer(r.amount, period))}${
      r.own ? "</strong>" : ""}</span><span>${esc(r.text)}</span></li>`).join("")
  }</ul>`;
}

// ---------------------------------------------------------------------------
// One rule card
// ---------------------------------------------------------------------------

/**
 * What a rule is called on the page. A threshold is named by the fact it
 * measures — the field's own noun, from the dataset — and everything else by
 * what it asks for, which is the phrase the engine builds for a verdict line.
 * Neither is ever a field id: the page holds no id-to-label map of its own,
 * which is how "Not met: situation" once shipped on 22 of 23 cards.
 */
function ruleHeading(dataset: Dataset, c: Criterion): string {
  // A rule that turns on a number is named by the fact it measures, whether it
  // states one amount or a choice of them; naming a two-amount rule by its own
  // phrase produced a heading two lines long carrying both figures.
  const thresholds = gteUnder(c);
  if (thresholds.length) return capitalise(shortLabelOf(dataset, thresholds[0].field));
  return capitalise(criterionPhrase(dataset, c));
}

function ruleKind(c: Criterion): string {
  if (gteUnder(c).length) return "Threshold";
  if (c.op === "points") return "Points";
  if ("field" in c && c.field === "citizenship") return "Who this is for";
  return "Condition";
}

function rulePlain(dataset: Dataset, c: Criterion, notice?: Notice): string {
  if (c.op === "gte") {
    // The fact the number measures comes from the field, not from a guess at
    // its id: "The offer must pay at least ..." is true of a salary and false
    // of the funds a job-search stay asks you to evidence.
    const period = periodOf(dataset, c.field);
    return `This route asks for at least <span class="mono">${
      esc(formatEURPer(c.threshold.amount, period))}</span> — ${
      esc(subjectOf(dataset, c.field))}.`;
  }
  if (c.op === "points")
    return `This route counts ${c.required.value} points from the official table. Every item below scores, and the table is quoted under it.`;
  if (c.op === "any")
    return `Either of these answers this rule: ${esc(joinOr(
      c.paths.map((p) => joinAnd(p.criteria.map((pc) => criterionPhrase(dataset, pc)))),
    ))}.`;
  if ("field" in c && c.field === "citizenship")
    // The lede has already said who the page is for, three lines above; saying
    // it again word for word at the top of the first rule reads as a stutter.
    // What this card adds is the authority's own answer for everyone else, in
    // its words, with its quote below.
    return notice ? esc(notice.body) : `This route asks for ${esc(criterionPhrase(dataset, c))}.`;
  return `This route asks for ${esc(criterionPhrase(dataset, c))}.`;
}

/**
 * What the interview actually asks, for a rule that has no quote to show.
 *
 * A card reading "This route asks for a job offer." under a heading reading
 * "A job offer" tells a stranger nothing she did not read one line above
 * (Standards review, 2026-09-07). Where the dataset carries no source for a
 * condition, the honest thing left to say is what the checker will ask her and
 * where she can go and find the answer out — both of which the dataset holds.
 */
function asksBlock(dataset: Dataset, c: Criterion): string {
  const fields = referencedFields(c)
    .map((id) => dataset.fields.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => f !== undefined);
  if (!fields.length) return "";
  const learn = fields.flatMap((f) => (f.learn ? [f.learn] : []));
  return `
        <div class="asks"><b>What the checker asks</b><ul>${
    fields.map((f) => `<li>${esc(f.label)}</li>`).join("")}</ul>${
    learn.map((l) => `<p>You can find this out yourself: <a ${tapInline()} href="${
      escAttr(l.url)}" target="_blank" rel="noopener">${esc(l.label)} &#8599;</a></p>`).join("")}</div>`;
}

function ruleCard(
  dataset: Dataset, country: Country, route: Route, c: Criterion, seen: Glossary, notice?: Notice,
): string {
  const values = valuesUnder(c);
  const isAudience = "field" in c && c.field === "citizenship";
  if (isAudience && notice && !values.length) values.push({ value: notice.source });
  const thresholds = gteUnder(c);
  const year = thresholds.length ? thresholds[0].threshold.retrieved_at.slice(0, 4) : "";
  // A card with no evidence and no scale is one sentence restating its own
  // heading; it says instead what the interview will ask.
  const asks = values.length === 0 && thresholds.length === 0 ? asksBlock(dataset, c) : "";
  return `
      <article class="rule">
        <div class="top"><h2>${esc(ruleHeading(dataset, c))}</h2><span class="kind">${
    esc(ruleKind(c))}${year ? ` · ${esc(year)}` : ""}</span></div>
        <p class="plain">${rulePlain(dataset, c, notice)}</p>${
    thresholds.length ? `
      ${railHtml(dataset, country, route, thresholds[0])}` : ""}${asks}${
    values.map((e) => `
      ${quoteBlock(e.value, { amount: e.amount, label: e.label }, seen)}`).join("")}
      </article>`;
}

/**
 * The rules, in the order the interview asks them.
 *
 * Two kinds of criterion never become a card. A criterion that only asks WHERE
 * a route applies is answered by the address of the page the reader is on, and
 * printing "Germany as your destination" as a rule on a German page tells a
 * stranger nothing. Anything else is a card.
 */
export function ruleCriteria(dataset: Dataset, route: Route): Criterion[] {
  const order = deriveQuestions(dataset).map((q) => q.field);
  const rank = (c: Criterion): number => {
    const positions = referencedFields(c).map((f) => order.indexOf(f)).filter((i) => i >= 0);
    return positions.length ? Math.min(...positions) : order.length;
  };
  return route.criteria
    .filter((c) => !isLocalization(c))
    .map((c, i) => ({ c, i, rank: rank(c) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.c);
}

// ---------------------------------------------------------------------------
// The blocks beside the rules
// ---------------------------------------------------------------------------

/**
 * Why we have no quote, said to the reader: the declared reason from the fixed
 * set, plus the day we last looked. The same three sentences the results card
 * uses (`lib/card.ts`), because one absence should not read two ways.
 */
const REASON_SAID: Record<string, string> = {
  "scanned-image": "The authority publishes it only as a scan, so there is no text to quote.",
  "not-published-in-words": "The authority states it as a list or a table, never in a sentence to quote.",
  "unreachable": "We cannot reach the source from here.",
};

function unsourcedSaid(s: { unsourced?: { reason: string; checked_at: string; note?: string } }): string {
  const why = s.unsourced;
  if (!why) return "";
  return `${REASON_SAID[why.reason] ?? ""}${why.note ? ` ${why.note}` : ""} Last checked ${why.checked_at}.`;
}

/**
 * Who a condition does not bind, under the condition itself.
 *
 * A route page has no reader and rules on nobody, so it never drops a
 * condition the way a card does: it shows both halves, each with its own quote
 * and its own read date, and the page stays a full statement of the rules
 * (s7). Nested inside the condition's own list item, because a carve-out that
 * floated free of the sentence it qualifies would be a sentence about nothing.
 */
function carveOutBlock(statement: { except?: StatementException }, seen: Glossary): string {
  const except = statement.except;
  if (!except) return "";
  return `<div class="except"><b>Who this does not bind</b> ${
    esc(except.text)}${quoteBlock(except.source, {}, seen)}</div>`;
}

function statedBlocks(route: Route, seen: Glossary): string {
  const preconditions = [
    ...(route.preconditions ?? []).map((t) => ({ text: t, source: undefined, except: undefined })),
    ...routeStatements(route).filter((s) => s.kind === "precondition"),
  ];
  const caveats = routeStatements(route).filter((s) => s.kind === "caveat");
  const readings = routeReadings(route);
  const block = (cls: string, heading: string, items: string[]): string =>
    items.length
      ? `
      <div class="${escAttr(cls)}"><b>${esc(heading)}</b><ul>${
        items.map((t) => `<li>${t}</li>`).join("")}</ul></div>`
      : "";
  return [
    block("precond", "Also required — not checked here", preconditions.map((s) =>
      esc(s.text) + (s.source ? quoteBlock(s.source, {}, seen) : "") + carveOutBlock(s, seen))),
    block("precond", "The official page also says", caveats.filter((s) => s.source).map((s) =>
      esc(s.text) + quoteBlock(s.source!, {}, seen) + carveOutBlock(s, seen))),
    // A caveat we could not find the wording for is still a fact in the
    // reader's favour, so it stays — under a heading that says plainly that no
    // quote covers it, with the declared reason and the day we last looked.
    // Dropping it here while `statedNotAsked` still counted it was a page that
    // named fewer limbs than it claimed (Standards review, 2026-09-07).
    block("precond", "Worth knowing — we have not found the official wording",
      caveats.filter((s) => !s.source).map((s) =>
        `${esc(s.text)} <i>${esc(unsourcedSaid(s))}</i>` + carveOutBlock(s, seen))),
    block("reading", "Our reading, not the authority's words", readings.map((r) => esc(r.text))),
  ].join("");
}

/**
 * A route in one line, for the list of the country's other routes. The summary's
 * first sentence, and no more than a line of it: the aside is a way across, not
 * a second card, and four routes' full summaries turned it into a wall.
 */
/**
 * The one figure a route turns on, with the label its own field gives it.
 *
 * The country index prints it beside every route, and an unlabelled number on
 * an index is a number a reader has to open the page to understand: "€1,091"
 * is a salary to anyone who does not already know the Opportunity Card asks for
 * living costs (isolated critique of the nav mock, B2/F3, 2026-09-08). The
 * label is derived from the field, never typed per route.
 */
export interface RouteFigure {
  label: string;
  /** Empty where the route asks for no number at all. */
  value: string;
}

export function routeFigure(dataset: Dataset, route: Route): RouteFigure {
  const amounts = ruleCriteria(dataset, route).flatMap(gteUnder)
    .sort((a, b) => a.threshold.amount - b.threshold.amount);
  const points = route.criteria.flatMap((c) => (c.op === "points" ? [c] : []));
  if (amounts.length) {
    const own = amounts[0]!;
    const field = dataset.fields.find((f) => f.id === own.field);
    // "Salary threshold" and "funds to show" are the two things money means on
    // these routes, and the field says which: one is what a job pays you, the
    // other is what you must be able to show you have.
    const label = /funds/.test(own.field) ? "funds to show" : "salary threshold";
    const from = amounts.some((c) => c.threshold.amount !== own.threshold.amount) ? "from " : "";
    return {
      label,
      value: `${from}${formatEURPer(own.threshold.amount, field?.period)}`,
    };
  }
  if (points.length) return { label: "points needed", value: String(points[0]!.required.value) };
  return { label: "no salary threshold", value: "" };
}

export function gist(route: Route): string {
  // A whole sentence or nothing: ten of the twenty-three cards ended in an
  // ellipsis mid-clause, which is a sentence the reader has to open the page to
  // finish (Spec review, 2026-09-08). The summary's first sentence is written
  // to stand alone, so it stands.
  const first = (route.summary ?? "").split(/(?<=\.)\s/)[0] ?? "";
  return first || scopeLine(route);
}

/**
 * What a search visitor came for, before anything explains itself: the number
 * this route asks for, the day we read it, and the way in.
 *
 * It was 1.5 screens down on a desktop and 2.4 on a phone, behind a box about
 * what the interview does and does not ask — a disclaimer about a screen the
 * visitor has never seen (isolated v1-gate critique, 2026-09-08, F1). The box
 * still says what it says; it says it after the answer.
 *
 * A route that asks for no money says so in the same place: the absence is an
 * answer to "what is the threshold", and leaving it blank reads as a page that
 * forgot its own number.
 */
function answerBlock(dataset: Dataset, route: Route, read: string): string {
  const thresholds = ruleCriteria(dataset, route).flatMap(gteUnder);
  const seen = new Set<number>();
  const amounts = thresholds
    .filter((c) => (seen.has(c.threshold.amount) ? false : seen.add(c.threshold.amount)))
    .sort((a, b) => a.threshold.amount - b.threshold.amount);
  const points = route.criteria.flatMap((c) => (c.op === "points" ? [c] : []));

  const asks = amounts.length
    ? amounts.map((c) => `<b>${esc(formatEURPer(c.threshold.amount, periodOf(dataset, c.field)))}</b>${
      c.threshold_label ? ` <span class="answer-label">— ${esc(c.threshold_label)}</span>` : ""}`).join("<br>")
    : points.length
      ? `<b>${points[0]!.required.value} points</b> <span class="answer-label">— from the official table</span>`
      : `<b>No salary or points threshold</b> <span class="answer-label">— what this route asks for is in the conditions below</span>`;

  return `
  <section class="answer" aria-labelledby="answer-h">
    <h2 class="label" id="answer-h">What this route asks for</h2>
    <p class="answer-figure">${asks}</p>
    <p class="answer-read">Read from the authority's own page on <b><time datetime="${
    escAttr(read)}">${esc(read)}</time></b>, with the sentence it came from below.</p>
  </section>`;
}

function neighbours(country: Country, route: Route): string {
  const others = country.routes.filter((r) => r !== route);
  if (!others.length) return "";
  return `
    <nav class="neighbours" aria-labelledby="also-here">
      <h2 class="label" id="also-here">Also in ${esc(country.name)}</h2>
      <ul>${others.map((r) => `
        <li><a ${tapMin()} href="${escAttr(url(routePath(country, r)))}">${esc(r.name)}<small>${
    esc(gist(r))}</small></a></li>`).join("")}
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
  return `${country.name}'s ${route.name}: ${joinAnd(bits)} — every value quoted from its ` +
    "official page with the date it was read.";
}

/**
 * One route page.
 *
 * `lastRun` is the day the watch last re-read every source — the single value
 * on this page that moves without anyone editing anything. It is an argument
 * rather than a read inside the footer so that a render over a frozen dataset
 * is genuinely frozen: the fingerprint case hashed a page that changed by
 * itself, and failed the first build a data change ever reached through the
 * dispatch (CI 2026-09-09).
 */
export function routePage(dataset: Dataset, address: RouteAddress, lastRun?: string): RoutePage {
  const { country, route } = address;
  const notice = audienceNotice(dataset);
  const read = stampDate(route, notice);
  const title = `${route.name} · ${country.name} · ${PRODUCT_NAME}`;
  const desc = description(dataset, country, route);
  const path = address.path;
  const jsonPath = routeJsonPath(country, route);
  const rules = ruleCriteria(dataset, route);
  // One page, one memory of which abbreviations it has already expanded. The
  // heading claims the section symbol before any citation can: it is where the
  // page states its own name, and a German route's name carries "§" whether
  // the reader has met the symbol before or not (human, 2026-09-08). The trail
  // above it repeats the name for navigation and is not a use; a neighbouring
  // route's name is a cross-reference and keeps the short form.
  const seen: Glossary = new Set();
  const heading = glossSection(route.name, seen);

  const head = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${contentSecurityPolicy([MENU_SCRIPT])}
${iconLinks()}
${headMeta({ title, description: desc, path, kind: "article" })}
<style>${PAGE_CSS}</style>`;

  const body = `<div class="wrap">

  ${siteHeader(navCountries(dataset), { countryPath: countryPath(country), current: "true" })}

  <header class="masthead masthead-with-stamps">
    <div>
      <h1>${esc(heading)}. <em>${esc(ROUTE_TAGLINE)}</em></h1>
      <p class="lede">${route.summary ? `${esc(route.summary)} ` : ""}Every number on this page is the authority's own sentence, with the page it came from and the day we read it. ${esc(audienceSentence(country))} ${esc(ROUTE_PAGE_ADDENDUM)}</p>
    </div>
    ${rulesRead(read)}
  </header>

  <div class="page">
  <main>
${answerBlock(dataset, route, read)}
  <section class="cta" aria-labelledby="cta-h">
    <h2 class="visually-hidden" id="cta-h">Check your own situation</h2>
    <p><strong>Where do you stand on this route?</strong> The questions are answered on this device only — nothing is sent anywhere. You get each rule against what you declared, the gap if there is one, and which single change would open more routes.</p>
    <a ${tapMin("btn")} href="${escAttr(`${url("/")}?route=${route.id}`)}">Check yours — ${esc(country.name)}, ${
    esc(route.name)}</a>
  </section>

  <section class="scope" aria-labelledby="scope-h">
    <b id="scope-h">What the checker asks, and what it does not</b>
    <p>Every number below is quoted from an official page, and a daily check re-reads every source. On this route — <strong>${
    esc(scopeLine(route))}</strong>. ${esc(route.scope.reason)}</p>
  </section>

  <section class="rules" aria-labelledby="rules-h">
    <h2 class="visually-hidden" id="rules-h">The rules of this route</h2>${
    rules.map((c) => ruleCard(dataset, country, route, c, seen, notice)).join("")}${
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
      <a ${tapMin()} href="${escAttr(TRACKER_URL)}" target="_blank" rel="noopener">Report a wrong value</a>
    </nav>
  </section>
${neighbours(country, route)}
  </aside>
  </div>

  ${siteFooter(navCountries(dataset), footerFacts(dataset, lastRun), {
    countryPath: countryPath(country), current: "true", jsonPath,
    checkPath: `/?country=${country.code.toLowerCase()}`,
  })}

</div>
<script>${MENU_SCRIPT}</script>
${analyticsBeacon()}`;

  return {
    path, jsonPath, title, description: desc, readDate: read,
    html: `<!doctype html>\n<html lang="en">\n<head>\n${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`,
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
export function routePages(dataset: Dataset, lastRun?: string): RoutePage[] {
  return routeAddresses(dataset).map((a) => routePage(dataset, a, lastRun));
}

// ---------------------------------------------------------------------------
// The stylesheet
// ---------------------------------------------------------------------------

/**
 * `docs/spine/design/s6-route-page.html`, verbatim, plus the two tap rules and
 * the accessibility fixes the critique's F5 asked for (a focus style of the
 * page's own, and a way to give a section a heading a screen reader can find
 * without printing one twice).
 *
 * The tokens are inlined rather than imported: a route page is one file a
 * search engine and a stranger both fetch cold, and a second request for four
 * kilobytes of custom properties buys nothing.
 */
export const PAGE_CSS = `
${TOKENS}
* { box-sizing: border-box; }
body { margin: 0; background: var(--color-bg); color: var(--color-ink); font: var(--text-body); }
a { color: var(--color-stamp); }
.visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.wrap { max-width: var(--max-content); margin: 0 auto; padding: var(--space-5) var(--space-4) var(--space-6); }
.page { display: grid; grid-template-columns: minmax(0, 1fr) 17rem; gap: var(--space-5); align-items: start; margin-top: var(--space-4); }
.page > aside { position: sticky; top: var(--space-4); display: grid; gap: var(--gap-cards); }
@media (max-width: 760px) { .page { grid-template-columns: 1fr; } .page > aside { position: static; } }
.label { font: var(--text-label); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--color-muted); }
.mono { font: var(--text-value); }
/* The two ways an interactive element reaches the token's tap minimum. Every
   structural rule below outranks these on specificity, so they change nothing
   that is already tall enough and catch anything that is not. */
.tap-min { display: inline-flex; align-items: center; min-height: var(--tap-min); }
a.tap { display: inline-block; padding: calc((var(--tap-min) - 1.6em) / 2) 0; margin: calc((1.6em - var(--tap-min)) / 2) 0; }

/* ---- masthead ---- */
.masthead { border-bottom: var(--rule-heavy); padding-bottom: var(--space-4); }
h1 { font: var(--text-hero); margin: var(--space-2) 0 var(--space-2); }
.lede { margin: 0; color: var(--color-muted); }
${IDENTITY}

/* ---- what this page checks: plain words, ink on card, no verdict colour ---- */
.scope { margin: 0; padding: var(--space-3) var(--space-4); background: var(--color-card); border-left: 4px solid var(--color-ink); }
.scope b { font: var(--text-label); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--color-ink); display: block; margin-bottom: var(--space-1); }
.scope p { margin: 0; }

/* ---- the rules ---- */
.rules { margin-top: var(--space-5); display: grid; gap: var(--gap-cards); }
.rule { background: var(--color-card); border-top: var(--rule-card-top); border-bottom: var(--rule-soft); padding: var(--pad-card); }
.rule .top { display: flex; justify-content: space-between; gap: var(--space-3); align-items: baseline; }
.rule h2 { font: var(--text-route); margin: 0; }
.kind { font: var(--text-label); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--color-muted); white-space: nowrap; }
.rule p.plain { margin: var(--space-2) 0 0; }

/* Threshold rail. The labels never sit on the track: positioned labels
   overlapped by 51-65 px at every common phone width (critique B1). The ticks
   are the picture; the list under them is the text, and a list cannot collide. */
.rail { position: relative; height: var(--rail-h); background: var(--rail-track); margin: var(--space-4) 0 var(--space-3); }
.rail .tick { position: absolute; top: -4px; width: 1px; height: calc(var(--rail-h) + 8px); background: var(--rail-tick); }
.rail-list { display: block; margin: 0 0 var(--space-2); padding: 0; list-style: none; }
.rail-list li { display: flex; justify-content: space-between; gap: var(--space-3); padding: var(--space-1) 0; border-bottom: var(--rule-dotted); }
.rail-list li span:first-child { font: var(--text-value); }
.rail-list li span:last-child { font: var(--text-source); color: var(--color-muted); text-align: right; }

/* A rule the dataset carries no quote for says what the interview will ask
   instead of restating its own heading in one sentence. Ink on the card, no
   new colour: this is not evidence and must not dress as evidence. */
.asks { margin: var(--space-3) 0 0; padding-top: var(--space-2); border-top: var(--rule-dotted); font: var(--text-source); color: var(--color-muted); }
.asks ul { margin: 0; padding-left: 1.1rem; }
.asks p { margin: var(--space-2) 0 0; }

/* Source line: the quote is the proof, so it is framed — language tagged, the
   separator difference explained once — and its link reaches 44 px. */
.src { font: var(--text-source); color: var(--color-muted); border-top: var(--rule-dotted); padding-top: var(--space-2); margin-top: var(--space-3); display: flex; justify-content: space-between; gap: var(--space-3); align-items: flex-start; }
.src q { font-style: italic; color: var(--color-ink); quotes: "\\201C" "\\201D"; }
.src b { color: var(--color-met); font-weight: 600; }
.src a { white-space: nowrap; display: inline-flex; align-items: center; min-height: var(--tap-min); padding: 0 var(--space-2); margin: 0; }
/* The note reads as part of the line it belongs to, separated the way the
   rest of that line is (F2). */
.src .note { display: inline; }

/* Ink on the soft tint: the label was --color-hold on --color-hold-soft, 3.68:1
   at 11 px — the most consequential line on the page was its least legible. */
.precond, .reading { margin: var(--space-3) 0 0; padding: var(--space-3) var(--space-4); border-left: 3px solid var(--color-hold); background: var(--color-hold-soft); }
/* Direct children only. A quote nested inside one of these blocks carries the
   read-date emphasis in its own <b>, and a descendant selector turned that date
   into an uppercase, letter-spaced label (seen on spain/intra-company-transfer
   once preconditions started carrying their quotes). */
.precond > b, .reading > b, .asks > b { font: var(--text-label); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--color-ink); display: block; margin-bottom: var(--space-1); }
.precond ul, .reading ul { margin: 0; padding-left: 1.1rem; }
.precond li, .reading li { margin-bottom: var(--space-2); }
.precond .src, .reading .src { border-top: none; padding-top: var(--space-1); margin-top: var(--space-1); }
/* s7: who a condition does not bind, under the condition itself — indented so
   the eye reads it as a qualification of the line above, never as a rule of
   its own. No verdict colour here either: the page rules on nobody. */
.except { margin: var(--space-2) 0 0 var(--space-3); padding-left: var(--space-3); border-left: 2px dashed var(--color-line); }
.except > b { font: var(--text-label); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--color-muted); }

/* ---- check yours ---- */
.cta { margin: var(--space-5) 0 0; padding: var(--space-4); background: var(--color-card); border: var(--rule-soft); display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); flex-wrap: wrap; }
.cta p { margin: 0; }
.cta a.btn { display: inline-flex; align-items: center; justify-content: center; text-align: center; min-height: var(--tap-min); line-height: 1.3; padding: .55rem var(--space-4); background: var(--color-ink); color: var(--color-bg); text-decoration: none; font: 700 .95rem var(--font-sans); }

/* ---- the data behind the page: the developer's door ---- */
.data { margin: 0; padding: var(--space-3) var(--space-4); background: var(--color-card); border-top: var(--rule-card-top); border-bottom: var(--rule-soft); display: grid; gap: var(--space-3); }
.data p { margin: 0; }
.data h2 { margin: 0; }
.data nav { display: grid; gap: var(--space-2); }
.data nav a { display: inline-flex; align-items: center; min-height: var(--tap-min); padding: 0 var(--space-3); border: var(--rule-soft); text-decoration: none; font: var(--text-value); }

/* ---- the answer ---- */
/* The number a search visitor came for, in the first screen: quiet furniture,
   loud number (isolated v1-gate critique 2026-09-08, F1). */
.answer { margin: 0; padding: var(--space-3) var(--space-4); background: var(--color-card); border-bottom: var(--rule-soft); }
.answer .label { margin: 0 0 var(--space-1); }
/* Not .asks: that class is the "what the checker asks" block three sections
   down, and this page has been bitten by a class collision twice already
   (.country vs .country-sec, .tick vs .rail-tick). */
.answer-figure { margin: 0; font: 600 1.5rem var(--font-mono); line-height: 1.35; color: var(--color-ink); }
.answer-figure b { font-weight: 600; }
.answer-label { font: var(--text-source); color: var(--color-muted); }
.answer-read { margin: var(--space-2) 0 0; font: var(--text-source); color: var(--color-muted); }

/* ---- the data page ---- */
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: var(--space-3); margin: var(--space-3) 0 0; }
.facts > div { border-top: var(--rule-dotted); padding-top: var(--space-2); }
.facts dt { font: var(--text-label); letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--color-muted); }
.facts dd { margin: .2rem 0 0; font: var(--text-value); font-size: 1rem; color: var(--color-ink); }
.checks { list-style: none; margin: var(--space-3) 0 0; padding: 0; display: grid; gap: var(--space-2); }
.checks li { border-top: var(--rule-dotted); padding-top: var(--space-2); }
.checks b { color: var(--color-ink); }
/* The per-route JSON lists. Written as nav.jsonlinks because these navs sit
   inside section.data, whose own ".data nav a" rule is the route page's boxed
   data door and outranks a bare ".jsonlinks a". The links are rows here, so
   they take the tap-target floor as a row height: the inline tap class carries
   a negative vertical margin, which is right for a link inside a sentence and
   inside a grid pulled each list up over its own country heading (human, live
   site, 2026-09-08). */
nav.jsonlinks { display: grid; gap: 0; margin-top: var(--space-4); }
nav.jsonlinks .label { display: block; margin: 0 0 var(--space-1); padding: 0; color: var(--color-muted); }
nav.jsonlinks a { display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; min-height: var(--tap-min); margin: 0; padding: var(--space-2) 0; border: none; border-top: var(--rule-dotted); text-decoration: none; color: var(--color-stamp); font: var(--text-body); }
nav.jsonlinks a small { font: var(--text-source); color: var(--color-met); white-space: nowrap; }

/* ---- the country index: the whole card is the link ---- */
/* One target, not three: the name, the gist and the meta line sit inside a
   single link, so a thumb has the whole card and a reader has one thing to
   click (nav-mock critique F2, 2026-09-08). The title carries the link colour,
   because the card itself cannot. */
.routes { list-style: none; margin: var(--space-4) 0 0; padding: 0; display: grid; gap: var(--gap-cards); }
.routes li { background: var(--color-card); border: var(--rule-soft); }
.routes li:hover, .routes li:focus-within { border-color: var(--color-stamp); }
.routes a.card { display: block; padding: var(--pad-card); color: inherit; text-decoration: none; }
.routes .name { font: var(--text-route); line-height: 1.3; color: var(--color-stamp); text-decoration: underline; text-decoration-color: var(--color-line); text-underline-offset: .2em; }
.routes .gist { margin: .25rem 0 0; color: var(--color-ink); }
.routes .meta { display: flex; gap: var(--space-3); flex-wrap: wrap; margin: .45rem 0 0; font: 500 .85rem/1.4 var(--font-sans); color: var(--color-muted); }
.routes .meta b { font-weight: 600; color: var(--color-ink); }
.routes .meta .read { font: var(--text-source); color: var(--color-met); align-self: center; }
.cta .note { color: var(--color-muted); }
footer .ends { display: flex; gap: var(--space-4); flex-wrap: wrap; }
footer .ends a { color: var(--color-muted); display: inline-flex; align-items: center; min-height: var(--tap-min); }

/* ---- neighbours ---- */
.neighbours { margin: 0; padding: var(--space-3) var(--space-4) var(--space-2); background: var(--color-card); border-top: var(--rule-card-top); border-bottom: var(--rule-soft); }
.neighbours h2 { margin: 0; }
.neighbours ul { list-style: none; padding: 0; margin: var(--space-2) 0 0; display: grid; gap: 0; }
.neighbours li a { display: block; min-height: var(--tap-min); padding: var(--space-2) 0; border-top: var(--rule-dotted); text-decoration: none; color: var(--color-ink); }
.neighbours li a small { display: block; font: var(--text-source); color: var(--color-muted); }

footer { margin-top: var(--space-6); border-top: var(--rule-heavy); padding-top: var(--space-4); color: var(--color-muted); }
footer .health { display: flex; justify-content: space-between; gap: var(--space-3); font: var(--text-source); margin-top: var(--space-3); flex-wrap: wrap; align-items: center; }
footer .health a { display: inline-flex; align-items: center; min-height: var(--tap-min); }

@media (max-width: 760px) {
  .src { flex-direction: column; }
  .src a { padding-left: 0; }
  /* On a phone the button leads its own section: the sentence about privacy
     is worth reading, and worth reading second (2026-09-08). */
  .cta { flex-direction: column; align-items: stretch; }
  .cta a.btn { order: -1; text-align: center; }
  .rule .top { flex-direction: column; gap: var(--space-1); }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
`;
