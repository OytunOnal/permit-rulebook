import { reasonFor, type Dataset, type Profile, type RouteResult } from "permit-rulebook-data";

/**
 * The reason column, rendered.
 *
 * Every word here comes from `permit-rulebook-data`, which is where the promise "the
 * reason column is prose, never engine output" has its property test. What
 * this file adds is the only step left between that prose and a person: the
 * markup. It lives beside the page rather than inside it so the rendered
 * result can be read by a test — the check the page had before asserted on
 * its own SOURCE text, and renaming a table silenced it while the blocker
 * came back intact (review S4).
 */

/** Dataset prose reaches the screen as text, never as markup. */
export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * The same, for a value going inside an attribute.
 *
 * `esc` leaves quotation marks alone, which is right in text and wrong in an
 * attribute: a route name or a source URL carrying a `"` closes the attribute
 * and everything after it becomes markup. It was used in fifteen attribute
 * positions on the route page (Standards review, 2026-09-07). Nothing in the
 * dataset carries one today, which is exactly why this had to be fixed before
 * something does.
 */
export function escAttr(s: string): string {
  return esc(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** The one line a card leads with. */
export function whyHtml(dataset: Dataset, r: RouteResult, profile: Profile): string {
  return esc(reasonFor(dataset, r, profile).line);
}

/** The same reason unfolded: one sentence per criterion, so a one-line reason
 * always opens into something concrete. The row's class is the engine's own
 * `kind` — the page names no verdict of its own. */
export function failDetailHtml(dataset: Dataset, r: RouteResult, profile: Profile): string {
  const rows = reasonFor(dataset, r, profile).rows.map((row) => `<li class="${row.kind}">${esc(row.text)}</li>`);
  return rows.length ? `<ul class="faildetail">${rows.join("")}</ul>` : "";
}
