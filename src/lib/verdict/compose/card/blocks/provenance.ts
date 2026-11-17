// @level presentation
import {
  forEachCriterion, periodOf, resultProvenance, thresholdsUnder, type Dataset, type Route, type RouteResult,
} from "permit-rulebook-data";
import { esc } from "../../../../reason.js";
import {
  APPLIES_TO_YOU, DOES_NOT_APPLY_TO_YOU, NO_THRESHOLD_ON_ROUTE, perPeriod,
} from "../../../../copy/verdict.js";
import { type Glossary, glossed } from "../../../../gloss.js";
// One line for every quote the product shows (2026-09-08; #387).
import { quoteLineHtml, type QuoteLineOptions } from "../../../../quote.js";
import type { CardScreen } from "./card-screen.js";
import { routeAsStated } from "./route-statements.js";

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
  // At any depth: NL ICT states its thresholds inside a choice of paths.
  const criterion = route.criteria.flatMap(thresholdsUnder).find((x) => x.threshold.amount === amount);
  const period = criterion ? periodOf(ds, criterion.field) : undefined;
  return period ? ` · ${esc(perPeriod(period))}` : "";
}

/** What a card adds to one value's quote line: the period its amount is
 * stated per, the applies-to-you mark on a settled choice of amounts, the
 * does-not-apply mark and the dimming on every quote of a path not taken,
 * and the citation it is given. */
function cardLineOptionsOf(context: ProvenanceContext, entry: ProvenanceEntry, citation?: string): QuoteLineOptions {
  const { label, amount, applied } = entry;
  // Per entry, not per card: one settled disjunction on a route must not put
  // a ruled-out mark under a second one nobody has decided.
  const ruledOut = applied === false;
  const takesMark = ruledOut || (context.contested && amount !== undefined);
  return {
    amount, label, citation,
    afterLabelHtml: amountPeriodHtml(context.ds, context.route, amount) + (takesMark ? appliesMarkHtml(applied) : ""),
    lineClass: ruledOut ? "unapplied" : undefined,
  };
}

/**
 * A card's values in the order a reader takes them (ruling 5 on #420): the
 * deciding path's, and every value no path decides, first; then each value of
 * a path not taken. Within each part, the dataset's order. The engine marks
 * each value's path; this reads the mark and decides nothing.
 */
function decidingPathFirst(entries: ProvenanceEntry[]): ProvenanceEntry[] {
  return [...entries.filter((e) => e.applied !== false), ...entries.filter((e) => e.applied === false)];
}

/**
 * A card's values without one whose sentence another value from the same page
 * on the card quotes inside a longer one: the longer line carries it (ruling 4
 * on #420). The dataset gives such a pair one legal basis and one read date,
 * so dropping the shorter loses nothing the reader is shown.
 */
function withoutContainedSentences(entries: ProvenanceEntry[]): ProvenanceEntry[] {
  return entries.filter(({ value }) => !entries.some((other) =>
    other.value.source_url === value.source_url && other.value.quote !== value.quote && other.value.quote.includes(value.quote)));
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
 * do not qualify for it (human catch 2026-09-07). An item the card dropped,
 * linked to a path its route did not take (`notTaken`), is not quoted either
 * (#315, ruling 5). Any other value of a path not taken is quoted after the
 * rest, dimmed and marked as not applying (ruling 5 on #420).
 */
export function provenanceHtml(screen: CardScreen, r: RouteResult, notTaken: ReadonlySet<string> = new Set()): string {
  const { ds, answers, glossary: seen = new Set() } = screen;
  const entries = decidingPathFirst(withoutContainedSentences(
    resultProvenance({ ...r, route: routeAsStated(r.route, notTaken) }, answers)));
  // A lone threshold needs no telling apart from anything, and a losing path
  // that quotes no amount leaves nothing for the reader to mistake for theirs.
  // Only where a choice of NUMBERS was actually settled ONE WAY OR THE OTHER.
  // `applied` reads three states now: an undecided disjunction leaves it
  // undefined, and treating that as "lost" told a reader who had not yet
  // reached the salary question that both of the route's thresholds were
  // against them (review 2026-09-07).
  const contested = entries.some((e) => e.amount !== undefined && e.applied === false);
  // The same line the route pages draw a quote with: its frame, and its own
  // link to its source, with the card's additions (#387).
  const lines = distinctProvenanceLines(entries, seen, (entry, citation) =>
    quoteLineHtml(entry.value, cardLineOptionsOf({ ds, route: r.route, contested }, entry, citation)));

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
