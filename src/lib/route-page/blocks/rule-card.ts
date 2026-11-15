// @level presentation
import {
  criterionPhrase, fillRouteSlots, formatEURPer, joinAnd,
  learnLinkOf, periodOf, referencedFields, shortLabelOf, subjectOf, thresholdsUnder,
  type Country, type Criterion, type Dataset, type Notice, type Route,
} from "permit-rulebook-data";
import type { PrintedRule } from "../../dataset-facts/reckon-dataset-facts.js";
import { type Glossary, glossed } from "../../gloss.js";
// One frame for every quote the product shows, so the results card and these
// pages cannot describe the same sentence differently (2026-09-08).
import { glossedLearnLinkText, quoteBlock } from "../../quote.js";
import { esc, escAttr } from "../../reason.js";
import { tapInline } from "../../tap.js";
import { ANY_PATH, EITHER_PATH } from "../../copy/route-page.js";
import { capitalise } from "../../copy/frame.js";
import { railHtml } from "./rail.js";

// The route page's entry and its figure take these from here, as they did
// before the quote line and the tap floor moved out of the route page.
export { TAP_CLASSES, tapMin } from "../../tap.js";
export { readDateTime } from "../../quote.js";

/**
 * What every rule card on one route page shares: the dataset, the country and
 * route the page is about, the page's memory of what it has already explained,
 * and the free-movement notice whose words the audience card borrows.
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

/**
 * One rule card, drawn from the reckoning's answer: its quotes, and the rules
 * on it that print none, for which it says what the interview will ask.
 */
export function ruleCard(page: RulePage, rule: PrintedRule): string {
  const { dataset, seen, notice } = page;
  const { criterion: c, quotes: values } = rule;
  const thresholds = thresholdsUnder(c);
  const year = thresholds.length ? thresholds[0].threshold.retrieved_at.slice(0, 4) : "";
  const asks = asksBlock(dataset, rule.unquoted, seen);
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
