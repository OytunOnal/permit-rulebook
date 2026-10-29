// @level presentation
import { forEachCriterion, resultProvenance, type Dataset, type Route, type RouteResult } from "permit-rulebook-data";
import { esc, escAttr } from "../../../../reason.js";
import {
  APPLIES_TO_YOU, DOES_NOT_APPLY_TO_YOU, NO_THRESHOLD_ON_ROUTE, perPeriod,
} from "../../../../copy/verdict.js";
import { readOn } from "../../../../copy/quotes.js";
import { type Glossary, glossed } from "../../../../gloss.js";
// One frame for every quote the product shows (2026-09-08).
import { linkLabelOf, noteHtml, quoteFrame } from "../../../../quote.js";
import type { Gte } from "../../money-shortfall.js";
import { periodOf } from "../../printed-shortfall.js";
import type { CardScreen } from "./card-screen.js";

/** Every gte criterion in a route, at any depth. Nested too: NL ICT states its
 * thresholds inside an any-disjunction, and a top-level-only scan drew no rail
 * on exactly those cards (review). */
function gteCriteriaOf(route: Route): Gte[] {
  const out: Gte[] = [];
  forEachCriterion(route.criteria, (c) => { if (c.op === "gte") out.push(c); });
  return out;
}

/** Does anything on this route turn on a number — a salary rail or a points
 * score? A route where nothing does has no threshold to fall short of, and the
 * card says so rather than leaving the absence to be read as a pass. */
function decidesOnANumber(route: Route): boolean {
  let found = false;
  forEachCriterion(route.criteria, (c) => { if (c.op === "gte" || c.op === "points") found = true; });
  return found;
}

/** Whether a settled amount applies to this reader, said beside its quote;
 * nothing where its path is not decided yet. */
function appliesMarkHtml(applied: boolean | undefined): string {
  if (applied === undefined) return "";
  return applied
    ? ` · <b class="applies">${esc(APPLIES_TO_YOU)}</b>`
    : ` · <span class="applies-not">${esc(DOES_NOT_APPLY_TO_YOU)}</span>`;
}

/** One value a route rests on, as `resultProvenance` lists it. */
type ProvenanceEntry = ReturnType<typeof resultProvenance>[number];

/** What a provenance line is drawn against: the dataset, the route, and
 * whether a choice of amounts on it was settled. */
interface ProvenanceContext {
  ds: Dataset;
  route: Route;
  contested: boolean;
}

/** The period an amount of this route is stated per, said after its quote;
 * nothing where the quote carries no amount. */
function amountPeriodHtml(ds: Dataset, route: Route, amount: number | undefined): string {
  if (amount === undefined) return "";
  const criterion = gteCriteriaOf(route).find((x) => x.threshold.amount === amount);
  const period = criterion ? periodOf(ds, criterion.field) : undefined;
  return period ? ` · ${esc(perPeriod(period))}` : "";
}

/** One value's quote, with whatever citation it is given. */
function provenanceLineHtml(context: ProvenanceContext, entry: ProvenanceEntry, citation?: string): string {
  const { label, value, amount, applied } = entry;
  // The same frame the route pages put round a quote: its language, its host,
  // and the note where the source spells the number its own way.
  const { lang, host, note } = quoteFrame(value, amount);
  // Per entry, not per card: one settled disjunction on a route must not put
  // a ruled-out mark under a second one nobody has decided.
  const takesMark = context.contested && amount !== undefined;
  const mark = takesMark ? appliesMarkHtml(applied) : "";
  return `<div class="src${takesMark && applied === false ? " unapplied" : ""}"><i${
    lang ? ` lang="${escAttr(lang)}"` : ""}>“${esc(value.quote)}”</i> · ${esc(host)}${
    label ? ` · ${esc(label)}` : ""}${amountPeriodHtml(context.ds, context.route, amount)}${mark}${
    citation ? ` · ${esc(citation)}` : ""} · <b>${esc(readOn(value.retrieved_at))}</b>${
    noteHtml(note)}</div>`;
}

/**
 * One sentence, one line.
 *
 * This IS a change to what a card shows, and nobody asked for it as a
 * feature: s5f's decision 3 forced it. Attaching a quote to every bare
 * precondition made eight cards print the same sentence twice, because two
 * claims may honestly rest on one sentence — the Dutch Blue Card's
 * `situation` criterion and the "also required" line about the contract's
 * length are both answered by "Your employment contract is valid for at
 * least 6 months." Printing it twice is not twice the provenance; it is a
 * longer list saying the same thing.
 *
 * What it does: drops a rendered provenance line that is EXACTLY identical
 * to one already printed. A quote carrying a different label, amount or
 * applies-to-you mark differs in the rendered line and still gets its own
 * row, so nothing a reader needs is deduplicated away. Lines are compared
 * before the citation is glossed, which only the first of two would be.
 */
function distinctProvenanceLines(
  entries: ProvenanceEntry[], seen: Glossary, lineHtml: (entry: ProvenanceEntry, citation?: string) => string,
): string[] {
  const printed = new Set<string>();
  const lines: string[] = [];
  for (const entry of entries) {
    const line = lineHtml(entry, entry.value.legal_basis);
    if (printed.has(line)) continue;
    printed.add(line);
    lines.push(lineHtml(entry, entry.value.legal_basis && glossed(entry.value.legal_basis, seen)));
  }
  return lines;
}

/**
 * Every value this route rests on, quoted and dated. Where a route states two
 * thresholds and only one of them applied to this reader, both still render —
 * they may want to know the other exists — but each says which it is. Printing
 * both unmarked left a reader free to take the lower one for theirs when they
 * do not qualify for it (human catch 2026-09-07).
 */
export function provenanceHtml(screen: CardScreen, r: RouteResult): string {
  const { ds, answers, glossary: seen = new Set() } = screen;
  const entries = resultProvenance(r, answers);
  // A lone threshold needs no telling apart from anything, and a losing path
  // that quotes no amount leaves nothing for the reader to mistake for theirs.
  // Only where a choice of NUMBERS was actually settled ONE WAY OR THE OTHER.
  // `applied` reads three states now: an undecided disjunction leaves it
  // undefined, and treating that as "lost" told a reader who had not yet
  // reached the salary question that both of the route's thresholds were
  // against them (review 2026-09-07).
  const contested = entries.some((e) => e.amount !== undefined && e.applied === false);
  const lines = distinctProvenanceLines(entries, seen, (entry, citation) =>
    provenanceLineHtml({ ds, route: r.route, contested }, entry, citation));

  // The promise on the first screen is that every value shows its quote and
  // its read date. A route that decides nothing on a number has no AMOUNT to
  // quote, and silence about that reads as if the promise held (isolated
  // critique #5). Since s5e its conditions do carry quotes, so the line is no
  // longer a substitute for an empty list — it says the one thing the list
  // cannot: there is no threshold here to be short of.
  if (!decidesOnANumber(r.route))
    lines.push(`<div class="src nosrc">${esc(NO_THRESHOLD_ON_ROUTE)}</div>`);
  return `<div class="srcs">${lines.join("")}</div>`;
}

/**
 * A quote long enough to bury the card is shown to its first sentence, with
 * the whole passage on the element and its source a click away — the evidence
 * stays complete, the card stays readable (tracker #5). The notice's quotes
 * go through it as the cards' do: the Türkiye notice's runs to 640
 * characters (Standards review, 2026-09-10).
 */
function quoteForCard(quote: string): { shown: string; trimmed: boolean } {
  if (quote.length <= 200) return { shown: quote, trimmed: false };
  const end = quote.indexOf(". ");
  if (end < 0 || end > 200) return { shown: quote.slice(0, 200).trimEnd() + "…", trimmed: true };
  return { shown: quote.slice(0, end + 1) + " …", trimmed: true };
}

/**
 * One quote, framed the way every quote on a results screen is framed: its
 * language, its host, whatever citation it carries, and the day it was read.
 *
 * The closed-route row and the notice both draw it. The frame is the claim of
 * this product, and three copies of it would be three claims that can drift
 * (s8).
 */
export function srcLine(
  value: { quote: string; source_url: string; retrieved_at: string; legal_basis?: string }, seen: Glossary,
): string {
  const { lang, host, note } = quoteFrame(value);
  const { shown, trimmed } = quoteForCard(value.quote);
  return `<div class="src"${trimmed ? ` title="${escAttr(value.quote)}"` : ""}><i${
    lang ? ` lang="${escAttr(lang)}"` : ""}>“${esc(shown)}”</i> · ${esc(host)}${
    value.legal_basis ? ` · ${esc(glossed(value.legal_basis, seen))}` : ""} · <b>${esc(readOn(value.retrieved_at))}</b>${
    noteHtml(note)}</div>`;
}

/** The link at a card's foot to the page behind it, labelled by whose page it is. */
export function sourceLinkHtml(url: string): string {
  return `<a class="next" href="${escAttr(url)}" target="_blank" rel="noopener">${esc(linkLabelOf(url))}</a>`;
}
