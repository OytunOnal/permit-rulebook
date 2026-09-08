import {
  decidingCriteria, deriveBands, forEachCriterion, formatEUR, formatEURPer, gapCriterionOf,
  resultProvenance,
  routeReadings, routeStatements,
  type Band, type Criterion, type Dataset, type Profile, type Route, type RouteResult,
  type RouteStatement, type UnsourcedReason,
} from "permit-rulebook-data";
import { esc } from "./reason.js";
// One frame for every quote the product shows (2026-09-08).
import { quoteFrame } from "./quote.js";

/**
 * The blocks of a card that state what the dataset itself says: what else is
 * required, what the source qualifies, which threshold the person was measured
 * against, and the quotes behind all of it.
 *
 * They live here for the reason `reason.ts` does: what the page renders has to
 * be readable by a test. The orientation year modelled "you have no job offer
 * yet" as a rule and failed people the Dutch immigration service does not fail
 * (2026-09-07); the rail labelled a route met through the €3,122 path with
 * €4,357 and drew the reader's own band below that line, so one card carried a
 * verdict and a picture of the same person failing (2026-09-07). Neither is
 * caught by reading the markup in the page — only by reading the markup.
 */

type Gte = Extract<Criterion, { op: "gte" }>;

/** Every gte criterion in a route, at any depth. Nested too: NL ICT states its
 * thresholds inside an any-disjunction, and a top-level-only scan drew no rail
 * on exactly those cards (review). */
export function gteCriteriaOf(route: Route): Gte[] {
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

const bandOf = (ds: Dataset, field: string, answers: Profile) =>
  deriveBands(ds, field).find((b) => b.id === answers[field]);

/**
 * The gte CRITERION this result was measured against — the glossary fixes both
 * words and this returns the criterion, not the threshold it carries (review
 * 2026-09-07).
 *
 * It is the engine's answer, not a second one computed here: the rail, the
 * "short by" banner and the card's one-line explanation are three statements
 * about one rule, and while the sentence was written in the engine and the rail
 * here, they disagreed — a reader with a good salary and too little in the bank
 * was told her salary was short (isolated v1-gate critique, 2026-09-08).
 */
export const measuredCriterionOf = (ds: Dataset, r: RouteResult, answers: Profile): Gte | undefined =>
  gapCriterionOf(ds, r, answers) as Gte | undefined;

/**
 * Preconditions the authority applies that the interview never asked — stated
 * on every card so "criteria met" cannot overpromise. A precondition statement
 * is a Precondition that carries its quote, and it belongs in exactly the same
 * sentence: the reader is being told what else they must satisfy, not where
 * the dataset keeps it. The kind was called `condition` until the glossary was
 * read back — a coined synonym for Criterion's own Avoid list (review
 * 2026-09-07).
 */
export function precondHtml(route: Route): string {
  return proseBlock(
    "precond", "Also required — not checked here:",
    [
      ...(route.preconditions ?? []),
      ...routeStatements(route).filter((s) => s.kind === "precondition").map((s) => s.text),
    ].map(esc),
    " · ",
  );
}

/**
 * One block of dataset prose under one heading. The three blocks below were
 * three structural copies of the same six lines, differing only in which
 * sentences they select, what class they carry and what the heading claims
 * about who said them (review 2026-09-07) — and the heading is the only part
 * that matters, because it is the part that tells the reader whose words these
 * are. Parameterising it puts those three claims side by side in one place.
 */
function proseBlock(cls: string, heading: string, items: string[], join = " "): string {
  if (!items.length) return "";
  return `<div class="${cls}"><b>${heading}</b> ${items.join(join)}</div>`;
}

/**
 * What the source itself says its own answer does not settle. A caveat fails
 * nobody and is never scored: it sits beside the verdict so a reader the page
 * cannot answer for is not handed a flat answer the source qualifies. Some of
 * these say the reader may qualify for LESS; under a heading that means "you
 * must also do this" that reads as one more bar to clear, which is why they
 * are here and not there (human catch 2026-09-07). The quote behind each one
 * is in the card's source list, like every other value.
 */
export function sourcedCaveatHtml(route: Route): string {
  return proseBlock(
    "caveat", "The official page also says:",
    routeStatements(route).filter((s) => s.kind === "caveat" && s.source).map((s) => esc(s.text)),
  );
}

/**
 * Why we have no quote, said to the reader. The dataset carries the decision —
 * a reason from a fixed set and the day we last looked — and this is where it
 * becomes a sentence; the free prose beside it (which document, what was
 * tried) is an addition, never the whole answer (review 2026-09-07).
 */
const REASON_SAID: Record<UnsourcedReason["reason"], string> = {
  "scanned-image": "The authority publishes it only as a scan, so there is no text to quote.",
  "not-published-in-words": "The authority states it as a list or a table, never in a sentence to quote.",
  "unreachable": "We cannot reach the source from here.",
};

function unsourcedSaid(s: RouteStatement): string {
  const why = s.unsourced;
  if (!why) return "";
  return `${REASON_SAID[why.reason]}${why.note ? ` ${why.note}` : ""} Last checked ${why.checked_at}.`;
}

/**
 * The same, for a statement we could not find the official wording of. It
 * cannot claim "the official page says", and dropping it would take a fact in
 * the reader's favour off the card — so it says plainly that it carries no
 * quote, and why. Nothing here is ever given a neighbouring quote that does
 * not cover it.
 */
export function unsourcedCaveatHtml(route: Route): string {
  return proseBlock(
    "caveat nosrc", "Worth knowing — we have not found the official wording:",
    routeStatements(route)
      .filter((s) => s.kind === "caveat" && !s.source)
      .map((s) => `${esc(s.text)} <i>${esc(unsourcedSaid(s))}</i>`),
  );
}

/**
 * Every caveat of a card, each under the heading its provenance earns. One
 * call, because which blocks a card shows is a rendering decision and the page
 * was making it — gluing the two together at the call site, which is exactly
 * what the seam above exists to stop (review 2026-09-07).
 */
export function caveatHtml(route: Route): string {
  return sourcedCaveatHtml(route) + unsourcedCaveatHtml(route);
}

/**
 * Our own reading — what we modelled, what we did not, and where a number came
 * from a page no machine re-reads. It is not a claim about the law and no
 * authority said it, so it gets a heading that says so in the reader's
 * language rather than the dataset's: a stranger owes our vocabulary nothing.
 *
 * It is the only text on a card that may carry quotation marks with no source
 * beside it, because being a reading IS the attribution — which is exactly why
 * it may never appear in the quote list or under a heading that says an
 * authority spoke (s5e). It read `routeStatements(route).filter(s => s.kind
 * === "modelling")` until this review, one of nine such filters across two
 * repos; readings are their own construct now, so there is one accessor and no
 * predicate to keep in step (review 2026-09-07).
 */
export function readingHtml(route: Route): string {
  return proseBlock(
    "caveat ours", "Our reading, not the authority's words:",
    routeReadings(route).map((r) => esc(r.text)),
  );
}

/**
 * The thresholds this route actually asks of this reader — the amounts on the
 * deciding path, deduplicated, in order.
 *
 * Not every threshold in the dataset on the same field: the card drew six ticks
 * for a Dutch salary, five of them belonging to other routes and carrying
 * nothing but a hover title, which is invisible to a reader and to a finger
 * (human walk, 2026-09-08). Neighbouring amounts are context, and the route
 * page's own rail is where context belongs.
 */
export function decidingThresholds(ds: Dataset, r: RouteResult, answers: Profile): Gte[] {
  const measured = measuredCriterionOf(ds, r, answers);
  if (!measured) return [];
  const decided = decidingCriteria(r.criteria)
    .flatMap((cr) => (cr.criterion.op === "gte" ? [cr.criterion] : []))
    .filter((c) => c.field === measured.field);
  const all = decided.length ? decided : [measured];
  const seen = new Set<number>();
  return all
    .filter((c) => (seen.has(c.threshold.amount) ? false : seen.add(c.threshold.amount)))
    .sort((a, b) => a.threshold.amount - b.threshold.amount);
}

/**
 * Where the reader's band stands against one amount, in the words the card
 * already uses elsewhere.
 */
export function bandStandsAt(band: Band, amount: number): string {
  if (band.max !== undefined && band.max <= amount)
    return `up to ${formatEUR(amount - (band.min ?? 0))} short`;
  if (band.min !== undefined && band.min >= amount) return "above the amount";
  return "crosses the amount";
}

/**
 * The salary rail: this route's own amounts, the reader's band, and a line of
 * words for each — nothing drawn that is not named.
 *
 * Three things it will not do again, all seen on one NL ICT card. It will not
 * draw a mark it does not label: five of six ticks said what they were only in
 * a `title` nobody hovers. It will not measure the bar and the band on two
 * roundings: the band began five pixels left of the tick it starts on, so the
 * picture disagreed with itself. And it will not position labels absolutely:
 * they wrapped into a three-line stack at the right edge, which is the same
 * collision the route page's rail was rebuilt to end (critique B1).
 */
export function railHtml(ds: Dataset, r: RouteResult, answers: Profile): string {
  const thresholds = decidingThresholds(ds, r, answers);
  if (!thresholds.length) return "";
  const field = thresholds[0].field;
  const band = bandOf(ds, field, answers);
  if (!band) return "";
  const period = ds.fields.find((f) => f.id === field)?.period;
  const amounts = thresholds.map((c) => c.threshold.amount);

  // The band's own edges, where it has none: a band open below starts under the
  // lowest amount, one open above runs past the highest.
  const bandLo = band.min ?? Math.min(...amounts) * 0.8;
  const bandHi = band.max ?? Math.max(...amounts) * 1.3;
  const lo = Math.min(...amounts, bandLo) * 0.94;
  const hi = Math.max(...amounts, bandHi) * 1.04;

  /**
   * One scale and one rounding for everything on the bar. The band's left edge
   * and a tick at the same amount have to be the same string, or a reader sees
   * the band miss the line it starts on.
   */
  const at = (v: number): string =>
    `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100)).toFixed(2)}%`;
  const span = (from: number, to: number): string =>
    `${(Number.parseFloat(at(to)) - Number.parseFloat(at(from))).toFixed(2)}%`;

  // `rail-tick`, not `tick`: the results screen already used `.tick` for the
  // chosen-answer checkmark, whose `margin-left:.35rem` was silently shifting
  // every line on this bar six pixels right of the amount it marks. That is the
  // "the band does not meet the lines" the walk reported — a class collision,
  // not a rounding error, and the same shape as the `.country` one this
  // codebase has met before (human walk, 2026-09-08).
  const ticks = amounts
    .map((a) => `<span class="rail-tick" style="left:${at(a)}"></span>`)
    .join("");

  const rows = [
    ...thresholds.map((c) => {
      const label = c.threshold_label ? ` — ${esc(c.threshold_label)}` : "";
      return `<li><span class="sw sw-asks"></span><b>${esc(formatEURPer(c.threshold.amount, period))}</b>` +
        `<span>what this route asks${label} · ${esc(bandStandsAt(band, c.threshold.amount))}</span></li>`;
    }),
    `<li><span class="sw sw-you"></span><b>${esc(band.label)}</b><span>your answer</span></li>`,
  ].join("");

  return `
        <div class="rail">
          <div class="bar" aria-hidden="true"><span class="you" style="left:${at(bandLo)};width:${
    span(bandLo, bandHi)}"></span>${ticks}</div>
          <ul class="rail-rows" aria-label="What this route asks, and what you answered">${rows}</ul>
        </div>`;
}

/**
 * Every value this route rests on, quoted and dated. Where a route states two
 * thresholds and only one of them applied to this reader, both still render —
 * they may want to know the other exists — but each says which it is. Printing
 * both unmarked left a reader free to take the lower one for theirs when they
 * do not qualify for it (human catch 2026-09-07).
 */
export function provenanceHtml(ds: Dataset, r: RouteResult): string {
  const entries = resultProvenance(r);
  // A lone threshold needs no telling apart from anything, and a losing path
  // that quotes no amount leaves nothing for the reader to mistake for theirs.
  // Only where a choice of NUMBERS was actually settled ONE WAY OR THE OTHER.
  // `applied` reads three states now: an undecided disjunction leaves it
  // undefined, and treating that as "lost" told a reader who had not yet
  // reached the salary question that both of the route's thresholds were
  // against them (review 2026-09-07).
  const contested = entries.some((e) => e.amount !== undefined && e.applied === false);
  const periodOf = (amount: number | undefined) => {
    if (amount === undefined) return "";
    const c = gteCriteriaOf(r.route).find((x) => x.threshold.amount === amount);
    const p = c ? ds.fields.find((f) => f.id === c.field)?.period : undefined;
    return p ? ` · per ${p}` : "";
  };
  const rendered = entries.map(({ label, value, amount, applied }) => {
    // The same frame the route pages put round a quote: its language, its host,
    // and the note where the source spells the number its own way.
    const { lang, host, note } = quoteFrame(value, amount);
    // Per entry, not per card: one settled disjunction on a route must not put
    // a ruled-out mark under a second one nobody has decided.
    const mark = !contested || amount === undefined || applied === undefined
      ? ""
      : applied
        ? ` · <b class="applies">applies to you</b>`
        : ` · <span class="applies-not">does not apply to you</span>`;
    return `<div class="src${contested && amount !== undefined && applied === false ? " unapplied" : ""}"><i${
      lang ? ` lang="${lang}"` : ""}>“${esc(value.quote)}”</i> · ${esc(host)}${
      label ? ` · ${esc(label)}` : ""}${periodOf(amount)}${mark}${
      value.legal_basis ? ` · ${esc(value.legal_basis)}` : ""} · <b>read ${esc(value.retrieved_at)}</b>${
      note ? `<span class="note">${esc(note)}</span>` : ""}</div>`;
  });
  // One sentence, one line.
  //
  // This IS a change to what a card shows, and nobody asked for it as a
  // feature: s5f's decision 3 forced it. Attaching a quote to every bare
  // precondition made eight cards print the same sentence twice, because two
  // claims may honestly rest on one sentence — the Dutch Blue Card's
  // `situation` criterion and the "also required" line about the contract's
  // length are both answered by "Your employment contract is valid for at
  // least 6 months." Printing it twice is not twice the provenance; it is a
  // longer list saying the same thing.
  //
  // What it does: drops a rendered provenance line that is EXACTLY identical
  // to one already printed. A quote carrying a different label, amount or
  // applies-to-you mark differs in the rendered line and still gets its own
  // row, so nothing a reader needs is deduplicated away.
  const seen = new Set<string>();
  const lines = rendered.filter((line) => {
    if (seen.has(line)) return false;
    seen.add(line);
    return true;
  });

  // The promise on the first screen is that every value shows its quote and
  // its read date. A route that decides nothing on a number has no AMOUNT to
  // quote, and silence about that reads as if the promise held (isolated
  // critique #5). Since s5e its conditions do carry quotes, so the line is no
  // longer a substitute for an empty list — it says the one thing the list
  // cannot: there is no threshold here to be short of.
  if (!decidesOnANumber(r.route))
    lines.push(`<div class="src nosrc">No salary or points threshold on this route — nothing here to fall short of. What it asks for is in the conditions above, each with the official wording behind it.</div>`);
  return `<div class="srcs">${lines.join("")}</div>`;
}
