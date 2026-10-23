// @level presentation
/**
 * `/data/`'s own words (`lib/data-page.ts`, `lib/dataset-ld.ts`).
 *
 * Every word a reader reads lives in this folder, one file per screen or
 * part (CODING_STANDARDS.md, Rules).
 */
import { PRODUCT_NAME } from "./frame.js";

/** `/data/`'s label for a country's routes as JSON; `country` is its phrase. */
export const countryAsJsonLabel = (country: string): string => `${country} as JSON`;

/** `/data/`, which carries the whole exception sentence after it. */
export const DAILY_CHECK_CLAIM = "Every source is re-read daily";

/**
 * Why the proof is not in English (human decision, 2026-09-08).
 *
 * The quotes carrying this product's whole claim are in German, French, Spanish
 * and Dutch, and a reader from India, Nigeria or Brazil meets them with no
 * English beside them (isolated v1-gate critique, 2026-09-08, F4). They are not
 * translated and will not be: a translation is our words standing beside the
 * authority's, and the sentence the authority wrote is the record. What the
 * site owes the reader is to say so.
 */
export const TRANSLATION_POLICY =
  "Quotes are shown in the authority's own language and are never translated: a translation " +
  "would be our words beside theirs, and the original is the record. Each quote names its " +
  "language and its source.";

/**
 * The two dates the `/data/` list prints, each under a word that means it.
 *
 * They are two facts and they sat side by side under one word: the day a value
 * last changed, and the day every source was last checked. The row said "Newest
 * value read", and on 2026-09-15 the product's own author read it as "last
 * checked" and asked why the numbers were old. They were not — nothing had
 * changed since, which is what the daily watch keeps confirming and what, by
 * design, never moves a value's date. A label its author misreads has not
 * earned its meaning (s12).
 *
 * "Changed" is the accurate word for the first: that date moves only when a
 * person updates a value after a flag. The second is the run the freshness
 * sentence below already prints, and the page reads it from the one place that
 * has it rather than asking the state again.
 */
export const NEWEST_VALUE_CHANGED = "Newest value changed";
export const LAST_CHECKED = "Last checked";

/**
 * The `/data/` counts row for our own sentences, after the number: what the
 * provenance gate calls "declared" is, to a reader, that we wrote them and
 * said so. The gate's own line further down the page keeps its own words —
 * the label was in the gate's vocabulary, and the reader has not met the gate
 * (light critique of s12, 2026-09-16; s16).
 */
export const PROSE_OURS_TAIL = "written by us and marked as ours";

/**
 * `/data/`'s masthead lede. The opening is one sentence whose numbers are the
 * page's own, so it is a function of them; the closing sentence ended as
 * plain text with no door for four days, which the human's walk of the s16
 * preview found (2026-09-16) — and once the door was there, "or tell us it
 * is wrong" presupposed a wrong, which the human's read of the same preview
 * found the same day ("1" of three). So the sentence is a condition and an
 * offer, with the door on the last two words. Composed here the way
 * `resultFeedbackLine` is, so the full stop is the copy's and not the
 * template's: the words arrive already wrapped as a link, and the line
 * closes the sentence around them.
 */
export const DATA_LEDE_OPEN = "Everything this site shows is one open dataset:";
export const dataLedeOpen = (scored: number, quotedOnly: number, countries: number): string =>
  `${DATA_LEDE_OPEN} ${scored} routes scored against your answers and ${
    quotedOnly} more quoted and dated but not scored, across ${countries} countries, every threshold and condition `
  + "carrying the authority's own sentence, the page it came from and the day we read it.";
export const DATA_LEDE_CLOSE_TAIL = "tell us";
export const dataLedeClose = (door: string): string => `Take it, check it, and if something is wrong, ${door}.`;

/**
 * How soon a person reads a flag, as the site promises it. It is the time the
 * data repository's clock keeps (`OVERDUE_AFTER_DAYS` in permit-rulebook-data's
 * `src/watch/overdue.ts`): a flag still open on the second UTC morning after
 * the day it was raised turns the watch red (#62). Typed here and not read
 * from there, by the human's decision on the review of #64: it is a promise to
 * a reader, not a threshold the site computes with, and changing the clock is
 * a #62-sized decision that changes this with it. Both sentences that make the
 * promise compose it from here.
 */
export const FLAG_READ_WITHIN = "within two days";

/**
 * The freshness sentence's second half on `/data/`: what happens when a source
 * moves, and the one thing that never happens on its own. It used to say a
 * moved source "files an issue in the tracker" — a tracker the reader had not
 * met, and since s13 not where a reader goes. The exception clause before it
 * is s11's and prints on its own terms; this is the part that follows it on
 * every day (s16). It did not say how soon a person reads the flag until the
 * clock that keeps that time was merged (#62).
 */
export const FRESHNESS_HUMAN_HAND =
  `A source that has moved raises a flag and a person reads it ${FLAG_READ_WITHIN}: the values on this site, and the dates beside `
  + "them, change when a person changes them, never on their own.";

/** What the dataset's description counts: its routes, scored and quoted only, and its countries. */
export interface DatasetCounts {
  total: number;
  scored: number;
  quotedOnly: number;
  countries: number;
}

/**
 * The Dataset block's description on `/data/`. A dataset index (Google's
 * Dataset Search) reads it, and a person reads it in that index's result, so
 * it lives with the site's other words rather than beside the JSON (Standards
 * review of #64). The counts are the page's own; the last sentence is the
 * page's own promise, in the same clause.
 */
export const datasetDescription = ({ total, scored, quotedOnly, countries }: DatasetCounts): string =>
  `${total} employment-based work-permit routes across ${countries} European countries: `
  + `${scored} scored against a reader's declared answers and ${quotedOnly} quoted and dated `
  + "without being scored. Every value — salary threshold, qualification, experience, language level — carries the "
  + "sentence it came from on the authority's own page and the day that page was read. "
  + `Re-read daily; a change to a source raises a flag a person reads ${FLAG_READ_WITHIN}.`;

/**
 * What a search result and a link preview say about `/data/`. The counts are
 * the page's own, so it is a function of them and not a string. It used to end
 * "the downloads, the checks and the tracker" — a door the page stopped
 * offering in s16, found by that build's own check and taken as a back-edge
 * the same day. A description is a summary of the page, and the door is one
 * link, so the tail is plainer rather than renamed.
 */
export const dataMetaDescription = (scored: number, quotedOnly: number, countries: number): string =>
  `What ${PRODUCT_NAME} holds today: ${scored} routes scored against your answers and ${
    quotedOnly} quoted and dated but not scored, across ${countries} countries, every value carrying its source `
  + "and the day it was read — with the downloads and the checks.";

/**
 * `/data/`'s prose-provenance counts, after the gate's name (s23, P4).
 *
 * The third count is of sentences kept on a dated reason — a source that
 * publishes only a scan, or a table — and it is usually zero. "0 standing on
 * a dated reason" was modelling vocabulary on a reader's line, and a zero is
 * not a fact a reader needs (v1.1 gate critique, P4; the scenario prefers
 * dropping it). Where the count is not zero, the row says it in the reader's
 * word.
 */
export const proseProvenanceCounts = (sourced: number, ours: number, dated: number): string => [
  `${sourced} sourced`, `${ours} ours`, ...(dated ? [`${dated} kept on a dated reason`] : []),
].join(", ");
