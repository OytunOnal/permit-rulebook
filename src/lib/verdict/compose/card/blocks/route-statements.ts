// @level presentation
import {
  answerLabel, bindsReader, carveOutFor, deriveBands, fieldOptions, routeReadings, routeStatements, scopeLine,
  type Dataset, type Profile, type Route, type RouteStatement,
} from "permit-rulebook-data";
import { esc, escAttr } from "../../../../reason.js";
import {
  NOT_CHECKED_HEADING, NOT_REQUIRED_FOR_YOUR_PASSPORT, NO_OFFICIAL_WORDING_HEADING, OUR_READING_HEADING, ROUTE_DOOR,
  askedHeading,
} from "../../../../copy/verdict.js";
import { PAGE_ALSO_SAYS, UNSOURCED_REASON_SAID, lastCheckedOn } from "../../../../copy/quotes.js";
import { type Glossary, glossed } from "../../../../gloss.js";
import type { CardScreen } from "./card-screen.js";

/**
 * Preconditions the authority applies that the interview never asked — stated
 * on every card so "criteria met" cannot overpromise. A precondition statement
 * is a Precondition that carries its quote, and it belongs in exactly the same
 * sentence: the reader is being told what else they must satisfy, not where
 * the dataset keeps it. The kind is `precondition`, the glossary's word;
 * "condition" is on Criterion's Avoid list (review 2026-09-07).
 */
export function precondHtml(screen: CardScreen, route: Route): string {
  const { ds, answers, glossary: seen = new Set() } = screen;
  const statements = binding(route, answers).filter((s) => s.kind === "precondition");
  // The ones the interview asked, by the field it asked them on, in the order
  // the statements name those fields.
  const asked = new Map<string, RouteStatement[]>();
  const unasked: RouteStatement[] = [];
  for (const s of statements) {
    const field = askedFieldOf(ds, s, answers);
    if (field === null) { unasked.push(s); continue; }
    asked.set(field, [...(asked.get(field) ?? []), s]);
  }
  return proseBlock({
    cls: "precond", heading: NOT_CHECKED_HEADING,
    items: [...(route.preconditions ?? []), ...unasked.map((s) => s.text)].map((t) => esc(glossed(t, seen))),
    join: " · ",
  }) + [...asked].map(([field, ss]) => proseBlock({
    cls: "precond asked", heading: esc(askedHeading(answerLabel(ds, field, answers[field]))),
    items: ss.map((s) => esc(glossed(s.text, seen))),
    join: " · ",
  })).join("");
}

/**
 * The field the interview asked this precondition on, or null where it asked
 * none (s19, F8; the key since s32).
 *
 * A precondition statement names the question whose answer covers it —
 * `field`, a curator's decision typed in the dataset — and the authority's
 * sentence is never read for it: two statements share a sentence with a
 * criterion by containment and would be decided wrongly by it — the German
 * ICT card's six months with the company wraps the situation gate's own
 * quote, and a tenure is not what the situation question asks (s32). The
 * Spanish researcher card's hosting agreement is the case it serves: its
 * field is the situation, and the reader's research answer IS the
 * declaration.
 *
 * Declared means answered with a real answer: an "I don't know", or the door
 * for a salary no band fits, leaves the condition unchecked, and the heading
 * that says so stays.
 */
function askedFieldOf(ds: Dataset, s: RouteStatement, answers: Profile): string | null {
  if (s.field === undefined) return null;
  return isDeclared(ds, s.field, answers[s.field]) ? s.field : null;
}

/** A real answer on the record — not absent, not the "I don't know" option,
 * not the money question's door for a figure no band fits. */
function isDeclared(ds: Dataset, field: string, value: string | undefined): boolean {
  if (value === undefined) return false;
  if (ds.fields.find((f) => f.id === field)?.type === "money_band")
    return deriveBands(ds, field).some((b) => b.id === value);
  const option = fieldOptions(ds, field).find((o) => o.value === value);
  return option !== undefined && option.is_unknown !== true;
}

/**
 * The statements this reader is actually told about.
 *
 * A condition the authority itself sets aside for the passport they named is
 * not one of the conditions stated to them — the product asked which passport
 * a reader would apply with and then listed the recognised-sponsor rule to a
 * Turkish reader the IND exempts from it (human walk on the live site, s7).
 * Every block below reads this rather than the raw array, so a carve-out
 * cannot be honoured on one heading and forgotten on the next.
 */
// No default for `answers`: a call site that forgets the reader would render
// every condition to everyone, which is the defect s7 exists to end
// (Standards review, 2026-09-10). A page with no reader passes {} and says so.
const binding = (route: Route, answers: Profile): RouteStatement[] =>
  routeStatements(route).filter((s) => bindsReader(s, answers));

/**
 * What the authority itself says is off this reader, in place of the condition
 * it releases them from.
 *
 * It is a rule like any other and it carries its own quote, which goes where
 * every quote on a card goes — the source list below. Never under "Also
 * required": the whole point of the sentence is that it is not required, and
 * the heading that means "you must also do this" would say the opposite of
 * what the IND says (s7).
 */
export function carveOutHtml(screen: CardScreen, route: Route): string {
  const { answers, glossary: seen = new Set() } = screen;
  return proseBlock({
    cls: "caveat carveout", heading: NOT_REQUIRED_FOR_YOUR_PASSPORT,
    items: routeStatements(route).flatMap((s) => {
      const except = carveOutFor(s, answers);
      return except ? [esc(glossed(except.text, seen))] : [];
    }),
    join: " · ",
  });
}

/**
 * How much of this route the interview decided, in the words the route page
 * prints, and the door to that page.
 *
 * It lives here rather than in the template for the reason the blocks above
 * do: the count is the reader's, and a line that still counted a condition
 * this reader is exempt from would be counting a sentence the card no longer
 * shows (s7). `href` comes from the caller, which builds the route's address
 * for the site's base.
 */
export function scopedHtml(route: Route, answers: Profile, href: string): string {
  // The scope line stands alone; the door is a line of its own under it, not
  // a third item after a separator (s27, point 8).
  return `<div class="scoped">${esc(scopeLine(route, { reader: "answered", profile: answers }))}<a class="door" href="${
    escAttr(href)}">${esc(ROUTE_DOOR)}</a></div>`;
}

/** A prose block's class, heading and items, and the separator its items are
 * joined by: a space unless it names its own. */
interface ProseBlock {
  cls: string;
  heading: string;
  items: string[];
  join?: string;
}

/**
 * One block of dataset prose under one heading. The three blocks below were
 * three structural copies of the same six lines, differing only in which
 * sentences they select, what class they carry and what the heading claims
 * about who said them (review 2026-09-07) — and the heading is the only part
 * that matters, because it is the part that tells the reader whose words these
 * are. Parameterising it puts those three claims side by side in one place.
 */
function proseBlock(block: ProseBlock): string {
  const { cls, heading, items, join = " " } = block;
  if (!items.length) return "";
  return `<div class="${escAttr(cls)}"><b>${heading}</b> ${items.join(join)}</div>`;
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
function sourcedCaveatHtml(screen: CardScreen, route: Route): string {
  const { answers, glossary: seen = new Set() } = screen;
  return proseBlock({
    cls: "caveat", heading: `${PAGE_ALSO_SAYS}:`,
    items: binding(route, answers).filter((s) => s.kind === "caveat" && s.source).map((s) => esc(glossed(s.text, seen))),
  });
}

/** Why we have no quote, said to the reader: the declared reason's sentence,
 * the dataset's own note on it, and the day we last looked. */
function unsourcedSaid(s: RouteStatement): string {
  const why = s.unsourced;
  if (!why) return "";
  return `${UNSOURCED_REASON_SAID[why.reason]}${why.note ? ` ${why.note}` : ""} ${lastCheckedOn(why.checked_at)}`;
}

/**
 * The same, for a statement we could not find the official wording of. It
 * cannot claim "the page also says", and dropping it would take a fact in
 * the reader's favour off the card — so it says plainly that it carries no
 * quote, and why. Nothing here is ever given a neighbouring quote that does
 * not cover it.
 */
function unsourcedCaveatHtml(screen: CardScreen, route: Route): string {
  const { answers, glossary: seen = new Set() } = screen;
  return proseBlock({
    cls: "caveat nosrc", heading: NO_OFFICIAL_WORDING_HEADING,
    items: binding(route, answers)
      .filter((s) => s.kind === "caveat" && !s.source)
      .map((s) => `${esc(glossed(s.text, seen))} <i>${esc(unsourcedSaid(s))}</i>`),
  });
}

/**
 * Every caveat of a card, each under the heading its provenance earns. One
 * call, because which blocks a card shows is a rendering decision and the page
 * was making it — gluing the two together at the call site, which is exactly
 * what the seam above exists to stop (review 2026-09-07).
 */
export function caveatHtml(screen: CardScreen, route: Route): string {
  // The two blocks are one screen: they share its memory, or one of their own.
  const shared: CardScreen = { ...screen, glossary: screen.glossary ?? new Set() };
  return sourcedCaveatHtml(shared, route) + unsourcedCaveatHtml(shared, route);
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
 * authority spoke (s5e). Readings are their own construct, read through
 * `routeReadings`, so there is one accessor and no filter over statements to
 * keep in step across two repositories (review 2026-09-07).
 */
export function readingHtml(route: Route, seen: Glossary = new Set()): string {
  return proseBlock({
    cls: "caveat ours", heading: OUR_READING_HEADING,
    items: routeReadings(route).map((r) => esc(glossed(r.text, seen))),
  });
}
