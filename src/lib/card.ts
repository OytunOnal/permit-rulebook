import { routeStatements, type Route } from "visa-rules";
import { esc } from "./reason.js";

/**
 * The two blocks of a card that come from the dataset's own words rather than
 * from a computed verdict.
 *
 * They live here for the reason `reason.ts` does: what the page renders has to
 * be readable by a test. The orientation year modelled "you have no job offer
 * yet" as a rule and failed people the Dutch immigration service does not fail
 * (2026-09-07); the honest replacements are prose on the card, and prose on a
 * card is only kept honest if something can read it.
 */

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
 * cannot answer for is not handed a flat answer the source qualifies. The
 * quote behind each one is in the card's source list, like every other value.
 */
export function caveatHtml(route: Route): string {
  const items = routeStatements(route).filter((s) => s.kind === "caveat");
  if (!items.length) return "";
  return `<div class="caveat"><b>The official page also says:</b> ${
    items.map((s) => esc(s.text)).join(" ")}</div>`;
}
