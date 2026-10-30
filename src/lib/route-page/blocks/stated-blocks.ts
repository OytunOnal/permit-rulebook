// @level presentation
import {
  isScored, routeReadings, routeStatements, type Route, type StatementException, type UnsourcedReason,
} from "permit-rulebook-data";
import { type Glossary, glossed } from "../../gloss.js";
import { esc, escAttr } from "../../reason.js";
import { PAGE_ALSO_SAYS, UNSOURCED_REASON_SAID, lastCheckedOn } from "../../copy/quotes.js";
import { quoteBlock } from "./rule-card.js";

// ---------------------------------------------------------------------------
// The blocks beside the rules
// ---------------------------------------------------------------------------

/**
 * Why we have no quote, said to the reader: the declared reason's sentence
 * from the fixed set, the dataset's own note, and the day we last looked —
 * the words the results card reads too, because one absence should not read
 * two ways.
 */
function unsourcedSaid(s: { unsourced?: UnsourcedReason }): string {
  const why = s.unsourced;
  if (!why) return "";
  return `${UNSOURCED_REASON_SAID[why.reason]}${why.note ? ` ${why.note}` : ""} ${lastCheckedOn(why.checked_at)}`;
}

/**
 * Who a condition does not bind, under the condition itself.
 *
 * A route page has no reader and rules on nobody, so it never drops a
 * condition the way a card does: it shows both halves, each with its own quote
 * and its own read date, and the page stays a full statement of the rules
 * (s7). Nested inside the condition's own list item, because a carve-out that
 * floated free of the sentence it qualifies would be a sentence about nothing.
 */
function carveOutBlock(statement: { except?: StatementException }, seen: Glossary): string {
  const except = statement.except;
  if (!except) return "";
  return `<div class="except"><b>Who this does not bind</b> ${
    esc(glossed(except.text, seen))}${quoteBlock(except.source, {}, seen)}</div>`;
}

export function statedBlocks(route: Route, seen: Glossary): string {
  const preconditions = [
    ...(route.preconditions ?? []).map((t) => ({ text: t, source: undefined, except: undefined })),
    ...routeStatements(route).filter((s) => s.kind === "precondition"),
  ];
  const caveats = routeStatements(route).filter((s) => s.kind === "caveat");
  const readings = routeReadings(route);
  const block = (cls: string, heading: string, items: string[]): string =>
    items.length
      ? `
      <div class="${escAttr(cls)}"><b>${esc(heading)}</b><ul>${
        items.map((t) => `<li>${t}</li>`).join("")}</ul></div>`
      : "";
  return [
    // "Also required" is a claim about the rules BESIDE the ones the interview
    // asks. A route the product does not score has no others, so on those five
    // pages the heading is what the section actually is: the authority's
    // requirements, all of them, none of them checked here (s9).
    block("precond", isScored(route) ? "Also required — not checked here" : "What the authority requires",
      preconditions.map((s) =>
        esc(glossed(s.text, seen)) + (s.source ? quoteBlock(s.source, {}, seen) : "") + carveOutBlock(s, seen))),
    block("precond", PAGE_ALSO_SAYS, caveats.filter((s) => s.source).map((s) =>
      esc(glossed(s.text, seen)) + quoteBlock(s.source!, {}, seen) + carveOutBlock(s, seen))),
    // A caveat we could not find the wording for is still a fact in the
    // reader's favour, so it stays — under a heading that says plainly that no
    // quote covers it, with the declared reason and the day we last looked.
    // Dropping it here while `statedNotAsked` still counted it was a page that
    // named fewer limbs than it claimed (Standards review, 2026-09-07).
    block("precond", "Worth knowing — we have not found the official wording",
      caveats.filter((s) => !s.source).map((s) =>
        `${esc(glossed(s.text, seen))} <i>${esc(unsourcedSaid(s))}</i>` + carveOutBlock(s, seen))),
    block("reading", "Our reading, not the authority's words", readings.map((r) => esc(glossed(r.text, seen)))),
  ].join("");
}
