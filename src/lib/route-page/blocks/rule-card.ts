// @level presentation
import {
  criterionPhrase, deriveQuestions, fillRouteSlots, forEachCriterion, formatEURPer, isLocalization, joinAnd,
  learnLinkOf, periodOf, provenancedValuesOf, referencedFields, shortLabelOf, subjectOf, thresholdsUnder,
  type Country, type Criterion, type Dataset, type Notice, type ProvenanceEntry, type Route,
} from "permit-rulebook-data";
import { type Glossary, glossed } from "../../gloss.js";
// One frame for every quote the product shows, so the results card and these
// pages cannot describe the same sentence differently (2026-09-08).
import { glossedLearnLinkText, linkLabelOf, noteHtml, quoteFrame } from "../../quote.js";
import { esc, escAttr } from "../../reason.js";
import { ANY_PATH, EITHER_PATH } from "../../copy/route-page.js";
import { capitalise } from "../../copy/frame.js";
import { readOn } from "../../copy/quotes.js";
import { railHtml } from "./rail.js";

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

export const tapMin = (extra = ""): string => `class="${escAttr(extra ? `${extra} ` : "")}tap-min"`;
export const tapInline = (extra = ""): string => `class="${escAttr(extra ? `${extra} ` : "")}tap"`;

// ---------------------------------------------------------------------------
// Small helpers over the dataset
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// The quote block
// ---------------------------------------------------------------------------

interface QuoteOptions {
  /** The amount this quote is the proof of, where it is the proof of one. */
  amount?: number;
  /** What the value is called on its own line ("standard amount"). */
  label?: string;
}

/** A read date as a quote and a headline figure both print it. */
export const readDateTime = (day: string): string => `<time datetime="${escAttr(day)}">${esc(readOn(day))}</time>`;

export function quoteBlock(value: ProvenanceEntry["value"], o: QuoteOptions = {}, seen: Glossary = new Set()): string {
  const { lang, host, note } = quoteFrame(value, o.amount);
  return `<div class="src">
        <span><q${lang ? ` lang="${escAttr(lang)}"` : ""}>${esc(value.quote)}</q> · ${esc(host)}${
    o.label ? ` · ${esc(o.label)}` : ""}${
    value.legal_basis ? ` · ${esc(glossed(value.legal_basis, seen))}` : ""} · <b>${readDateTime(value.retrieved_at)}</b>${
    noteHtml(note)}</span>
        <a ${tapInline()} href="${escAttr(value.source_url)}" target="_blank" rel="noopener">${
    esc(linkLabelOf(value.source_url))} &#8599;</a>
      </div>`;
}

/**
 * What every rule card on one route page shares: the dataset, the country and
 * route the page is about, the page's memory of what it has already explained,
 * and the free-movement notice the audience card may borrow its quote from.
 */
export interface RulePage {
  dataset: Dataset;
  country: Country;
  route: Route;
  seen: Glossary;
  notice?: Notice;
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
  const thresholds = thresholdsUnder(c);
  if (thresholds.length) return capitalise(shortLabelOf(dataset, thresholds[0].field));
  // Named by who it shuts out, said as the answer they gave: "Algeria" is a
  // country and "an Algerian passport" is the thing this rule reads.
  if (c.op === "not-in") return `Not open to ${criterionPhrase(dataset, c)}`;
  // A choice of paths is named by its own label: the body lists the paths, and
  // its phrase may be a short_reason written for a verdict line, not a heading.
  if (c.op === "any") return capitalise(c.label);
  return capitalise(criterionPhrase(dataset, c));
}

function ruleKind(c: Criterion): string {
  if (thresholdsUnder(c).length) return "Threshold";
  if (c.op === "points") return "Points";
  // A closure is the opposite claim from the criterion beside it, and the two
  // sit on the same page: one says who the permit is for, the other who the
  // authority does not open it to. Reading them under one label would make the
  // page say the second is a condition the reader could meet (s8).
  if (c.op === "not-in") return "Who this is not for";
  if ("field" in c && c.field === "citizenship") return "Who this is for";
  return "Condition";
}

function rulePlain(dataset: Dataset, c: Criterion, notice?: Notice): string {
  // The dataset's own sentence, and only it. A closure is the one criterion
  // whose plain line cannot be composed from the answers it names — composing
  // it produces "This route asks for Algeria" (s8).
  if (c.op === "not-in") return esc(c.text);
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
  if ("field" in c && c.field === "citizenship")
    // The lede has already said who the page is for, three lines above; saying
    // it again word for word at the top of the first rule reads as a stutter.
    // What this card adds is the authority's own answer for everyone else, in
    // its words, with its quote below.
    return notice ? esc(notice.body) : `This route asks for ${esc(criterionPhrase(dataset, c))}.`;
  return `This route asks for ${esc(criterionPhrase(dataset, c))}.`;
}

/**
 * A rule's plain words under its heading. A choice of paths is a lead-in and
 * one line per path, opening on the path's label, so a reader sees which
 * conditions belong together: one line of "and"s and "or"s cannot be grouped.
 */
function plainHtml(dataset: Dataset, c: Criterion, notice?: Notice): string {
  if (c.op !== "any") return `<p class="plain">${rulePlain(dataset, c, notice)}</p>`;
  const lines = c.paths.map((p) =>
    `<li>${esc(capitalise(p.label))}: ${esc(joinAnd(p.criteria.map((pc) => criterionPhrase(dataset, pc))))}</li>`);
  return `<p class="plain">${esc(c.paths.length > 2 ? ANY_PATH : EITHER_PATH)}</p>
        <ul class="paths">${lines.join("")}</ul>`;
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
function asksBlock(dataset: Dataset, criteria: Criterion[], seen: Glossary): string {
  const fields = [...new Set(criteria.flatMap((c) => referencedFields(c)))]
    .map((id) => dataset.fields.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => f !== undefined);
  if (!fields.length) return "";
  // A question's words with any route they name said in full (#159).
  const learn = fields.flatMap((f) => learnLinkOf(dataset, f.id) ?? []);
  return `
        <div class="asks"><b>What the checker asks</b><ul>${
    fields.map((f) => `<li>${esc(glossed(fillRouteSlots(f.label, dataset), seen))}</li>`).join("")}</ul>${
    learn.map((l) => `<p>You can find this out yourself: <a ${tapInline()} href="${
      escAttr(l.url)}" target="_blank" rel="noopener">${
      esc(glossedLearnLinkText(l, seen))} &#8599;</a></p>`).join("")}</div>`;
}

/** A rule with no quote and no figure under it, its paths included. */
const isUnquoted = (c: Criterion): boolean => valuesUnder(c).length === 0 && thresholdsUnder(c).length === 0;

/**
 * The unquoted rules inside a quoted card's disjunction, which the asks block
 * lists as it lists an unquoted card's own: a quote on one path (the shortage
 * Blue Card's IT path) does not quote the rules of another (its degree path,
 * where the shortage list's door belongs). A disjunction that carries its own
 * quote speaks for its paths, so nothing under it is unquoted.
 */
function unquotedInPaths(c: Criterion): Criterion[] {
  if (c.op !== "any" || c.source) return [];
  return c.paths.flatMap((p) => p.criteria.flatMap((pc) => (isUnquoted(pc) ? [pc] : unquotedInPaths(pc))));
}

/** The quotes one rule card prints. */
export function cardValues(c: Criterion, notice?: Notice): ProvenanceEntry[] {
  const values = valuesUnder(c);
  // A closure names the same field and makes the opposite claim, so it is not
  // the audience card and never borrows the free-movement notice's words.
  const isAudience = "field" in c && c.field === "citizenship" && c.op !== "not-in";
  const isUnquotedAudience = isAudience && values.length === 0;
  if (isUnquotedAudience && notice) values.push({ value: notice.source });
  return values;
}

export function ruleCard(page: RulePage, c: Criterion): string {
  const { dataset, seen, notice } = page;
  const values = cardValues(c, notice);
  const thresholds = thresholdsUnder(c);
  const year = thresholds.length ? thresholds[0].threshold.retrieved_at.slice(0, 4) : "";
  // A card with no evidence and no scale is one sentence restating its own
  // heading; it says instead what the interview will ask. A quoted card says
  // it for the unquoted rules inside its paths.
  const asks = asksBlock(dataset, values.length === 0 && thresholds.length === 0 ? [c] : unquotedInPaths(c), seen);
  return `
      <article class="rule">
        <div class="top"><h2>${esc(ruleHeading(dataset, c))}</h2><span class="kind">${
    esc(ruleKind(c))}${year ? ` · ${esc(year)}` : ""}</span></div>
        ${plainHtml(dataset, c, notice)}${
    thresholds.length ? `
      ${railHtml(page, thresholds[0])}` : ""}${asks}${
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
