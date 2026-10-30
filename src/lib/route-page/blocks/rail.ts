// @level presentation
import {
  forEachCriterion, formatEURPer, periodOf, type Country, type Dataset, type Route, type ThresholdCriterion,
} from "permit-rulebook-data";
import { esc } from "../../reason.js";

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
function railRows(country: Country, route: Route, own: ThresholdCriterion): RailRow[] {
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
    .map(([amount, entry]) => ({ amount, text: railRowText(entry, route), own: entry.routes.includes(route) }));
}

/**
 * What a rail row says beside its amount: this route's own, one other route's
 * name, or how many other routes state it. A route may state two amounts on
 * one rule — the Spanish Blue Card states both of its salaries inside a
 * disjunction — so "ours" is any amount this route states, not only the one
 * the card was built from.
 */
function railRowText(entry: { routes: Route[]; label?: string }, route: Route): string {
  if (entry.routes.includes(route)) return `this route${entry.label ? ` — ${entry.label}` : ""}`;
  const others = entry.routes.filter((r) => r !== route);
  if (others.length === 1) return `${others[0].name} — another route here`;
  return `${others.length} other routes here`;
}

/** What a rail is drawn against: the dataset, and the country and route the page is about. */
interface RailPage {
  dataset: Dataset;
  country: Country;
  route: Route;
}

export function railHtml(page: RailPage, own: ThresholdCriterion): string {
  const { dataset, country, route } = page;
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
