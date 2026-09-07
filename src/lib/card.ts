import {
  decidingCriteria, deriveBands, forEachCriterion, formatEURPer, resultProvenance, routeReadings,
  routeStatements, thresholdsForField,
  type Criterion, type Dataset, type Profile, type Route, type RouteResult,
  type RouteStatement, type UnsourcedReason,
} from "visa-rules";
import { esc } from "./reason.js";

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

/** How far the declared band sits below one threshold, worst case. */
function gapAgainst(ds: Dataset, c: Gte, answers: Profile): number | undefined {
  const band = bandOf(ds, c.field, answers);
  if (!band || band.max === undefined || band.max > c.threshold.amount) return undefined;
  return c.threshold.amount - (band.min ?? 0);
}

/**
 * The gte CRITERION this result was measured against — the glossary fixes both
 * words and this returns the criterion, not the threshold it carries (review
 * 2026-09-07). The path that was met, or — where none was — the nearest
 * reachable one, which is the path the engine measured the gap to. A route
 * whose salary criterion is a choice of paths used to render whichever the
 * dataset wrote first, which is how a graduate met through €3,122 was shown a
 * rail labelled €4,357 with his own band under the line (human catch
 * 2026-09-07). Where nothing has decided the choice, it names a threshold the
 * person can at least locate their band against; it draws a rail, it never
 * marks a quote.
 */
export function measuredCriterionOf(ds: Dataset, r: RouteResult, answers: Profile): Gte | undefined {
  const decided = decidingCriteria(r.criteria)
    .flatMap((cr) => (cr.criterion.op === "gte" ? [cr.criterion] : []))
    .filter((c) => answers[c.field] !== undefined);
  // Where a bounded gap exists, the rail is drawn on the criterion it was
  // measured on, so the label and the distance can never name different rules.
  const gapped = r.gap_max === undefined
    ? undefined
    : decided.find((c) => Math.abs((gapAgainst(ds, c, answers) ?? NaN) - r.gap_max!) < 0.005);
  // Nothing decided the disjunction yet (an open "I don't know"): fall back to
  // a threshold the person can at least locate their band against.
  return gapped ?? decided[0] ?? gteCriteriaOf(r.route).find((c) => answers[c.field] !== undefined);
}

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
 * The salary rail: every threshold on this field as context, the declared band
 * as a bar, and ONE labelled threshold — the one this result was measured
 * against. Neighbouring ticks stay unlabeled so close thresholds cannot
 * collide.
 */
export function railHtml(ds: Dataset, r: RouteResult, answers: Profile): string {
  const salary = measuredCriterionOf(ds, r, answers);
  if (!salary) return "";
  const field = salary.field;
  const ts = thresholdsForField(ds, field);
  const band = bandOf(ds, field, answers);
  if (!band || ts.length === 0) return "";
  const period = ds.fields.find((f) => f.id === field)?.period;
  const lo = Math.min(...ts) * 0.88, hi = Math.max(...ts) * 1.1;
  const pct = (v: number) => Math.max(2, Math.min(98, ((v - lo) / (hi - lo)) * 100));
  const bMin = pct(band.min ?? lo), bMax = pct(band.max ?? hi);
  const ticks = ts.map((t) => `<span class="tick" style="left:${pct(t)}%" title="${formatEURPer(t, period)} — a threshold on another route"></span>`).join("");
  const own = salary.threshold.amount;
  const labels = `<span class="lbl" style="left:${pct(own)}%"><b>${formatEURPer(own, period)}</b>${
    salary.threshold_label ? esc(salary.threshold_label) : ""}</span>`;
  // The two labels overprint when the band meets the threshold (critique
  // #10). Shifting sideways only moved the collision — the labels are
  // wider than the narrow bands — so the second label drops to its own
  // line, where no width can bring them back together.
  const centre = (bMin + bMax) / 2;
  const collides = Math.abs(pct(own) - centre) < 14;
  const youStyle = `left:${centre}%;top:${collides ? "2.5rem" : "1.35rem"}`;
  return `
        <div class="rail" aria-label="Salary thresholds">
          <div class="bar"><span class="you" style="left:${bMin}%;width:${bMax - bMin}%"></span>${ticks}</div>
          <div class="lbls">${labels}
            <span class="lbl you-l" style="${youStyle}"><b>your band</b></span>
          </div>
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
  const lines = entries.map(({ label, value, amount, applied }) => {
    const host = new URL(value.source_url).hostname.replace(/^www\./, "");
    // Per entry, not per card: one settled disjunction on a route must not put
    // a ruled-out mark under a second one nobody has decided.
    const mark = !contested || amount === undefined || applied === undefined
      ? ""
      : applied
        ? ` · <b class="applies">applies to you</b>`
        : ` · <span class="applies-not">does not apply to you</span>`;
    return `<div class="src${contested && amount !== undefined && applied === false ? " unapplied" : ""}"><i>“${esc(value.quote)}”</i> · ${esc(host)}${
      label ? ` · ${esc(label)}` : ""}${periodOf(amount)}${mark}${
      value.legal_basis ? ` · ${esc(value.legal_basis)}` : ""} · <b>read ${esc(value.retrieved_at)}</b></div>`;
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
