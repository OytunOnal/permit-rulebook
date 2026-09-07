import {
  decidingCriteria, deriveBands, forEachCriterion, formatEURPer, resultProvenance, routeStatements,
  thresholdsForField,
  type Criterion, type Dataset, type Profile, type Route, type RouteResult,
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

const bandOf = (ds: Dataset, field: string, answers: Profile) =>
  deriveBands(ds, field).find((b) => b.id === answers[field]);

/** How far the declared band sits below one threshold, worst case. */
function gapAgainst(ds: Dataset, c: Gte, answers: Profile): number | undefined {
  const band = bandOf(ds, c.field, answers);
  if (!band || band.max === undefined || band.max > c.threshold.amount) return undefined;
  return c.threshold.amount - (band.min ?? 0);
}

/**
 * The threshold this result was actually measured against: the path that was
 * met, or — where none was — the nearest reachable one, which is the path the
 * engine measured the gap to. A route whose salary criterion is a choice of
 * paths used to render whichever the dataset wrote first, which is how a
 * graduate met through €3,122 was shown a rail labelled €4,357 with his own
 * band under the line (human catch 2026-09-07).
 */
export function appliedThresholdOf(ds: Dataset, r: RouteResult, answers: Profile): Gte | undefined {
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
 * Conditions the authority applies that the interview never asked — stated on
 * every card so "criteria met" cannot overpromise. A condition statement is a
 * precondition that carries its quote, and it belongs in exactly the same
 * sentence: the reader is being told what else they must satisfy, not where
 * the dataset keeps it.
 */
export function precondHtml(route: Route): string {
  const items = [
    ...(route.preconditions ?? []),
    ...routeStatements(route).filter((s) => s.kind === "condition").map((s) => s.text),
  ];
  if (!items.length) return "";
  return `<div class="precond"><b>Also required — not checked here:</b> ${
    items.map((t) => esc(t)).join(" · ")}</div>`;
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
export function caveatHtml(route: Route): string {
  const items = routeStatements(route).filter((s) => s.kind === "caveat" && s.source);
  if (!items.length) return "";
  return `<div class="caveat"><b>The official page also says:</b> ${
    items.map((s) => esc(s.text)).join(" ")}</div>`;
}

/**
 * The same, for a statement we could not find the official wording of. It
 * cannot claim "the official page says", and dropping it would take a fact in
 * the reader's favour off the card — so it says plainly that it carries no
 * quote, and why. Nothing here is ever given a neighbouring quote that does
 * not cover it.
 */
export function unsourcedHtml(route: Route): string {
  const items = routeStatements(route).filter((s) => s.kind === "caveat" && !s.source);
  if (!items.length) return "";
  return `<div class="caveat nosrc"><b>Worth knowing — we have not found the official wording:</b> ${
    items.map((s) => `${esc(s.text)} <i>${esc(s.unsourced ?? "")}</i>`).join(" ")}</div>`;
}

/**
 * The salary rail: every threshold on this field as context, the declared band
 * as a bar, and ONE labelled threshold — the one this result was measured
 * against. Neighbouring ticks stay unlabeled so close thresholds cannot
 * collide.
 */
export function railHtml(ds: Dataset, r: RouteResult, answers: Profile): string {
  const salary = appliedThresholdOf(ds, r, answers);
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
  // Only where there was a choice of NUMBERS to make: a lone threshold needs
  // no telling apart from anything, and a losing path that quotes no amount
  // leaves nothing for the reader to mistake for their own.
  const contested = entries.some((e) => e.amount !== undefined && e.applied === false);
  const periodOf = (amount: number | undefined) => {
    if (amount === undefined) return "";
    const c = gteCriteriaOf(r.route).find((x) => x.threshold.amount === amount);
    const p = c ? ds.fields.find((f) => f.id === c.field)?.period : undefined;
    return p ? ` · per ${p}` : "";
  };
  const lines = entries.map(({ label, value, amount, applied }) => {
    const host = new URL(value.source_url).hostname.replace(/^www\./, "");
    const mark = !contested || amount === undefined
      ? ""
      : applied
        ? ` · <b class="applies">applies to you</b>`
        : ` · <span class="applies-not">does not apply to you</span>`;
    return `<div class="src${contested && amount !== undefined && !applied ? " unapplied" : ""}"><i>“${esc(value.quote)}”</i> · ${esc(host)}${
      label ? ` · ${esc(label)}` : ""}${periodOf(amount)}${mark}${
      value.legal_basis ? ` · ${esc(value.legal_basis)}` : ""} · <b>read ${esc(value.retrieved_at)}</b></div>`;
  });
  // The promise on the first screen is that every value shows its quote and
  // its read date. A route with no numeric threshold has no value to quote,
  // and silence there reads as if the promise held (isolated critique #5).
  if (!lines.length)
    return `<div class="srcs"><div class="src nosrc">No numeric threshold on this route, so there is no dated value to quote — its conditions are the ones stated above, and the official page carries their wording.</div></div>`;
  return `<div class="srcs">${lines.join("")}</div>`;
}
