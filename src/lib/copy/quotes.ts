// @level presentation
/**
 * The words around a quote, wherever one is shown: whose page a source link
 * opens, the day it was read, and the heading over what a page also says.
 *
 * Every word a reader reads lives in this folder, one file per screen or
 * part (CODING_STANDARDS.md, Rules).
 */
import type { UnsourcedReasonWord } from "permit-rulebook-data";

/**
 * A link to a source says whose page it opens (GLOSSARY, Consolidated text).
 * The kind is the data package's, read off the host; the words are these.
 */
export const OFFICIAL_PAGE = "Official page";
export const consolidatedTextOn = (host: string): string => `Consolidated text on ${host}`;
/** A learn link's own label, followed by the kind of page it opens. */
export const learnLinkWithKind = (label: string, kind: string): string => `${label} — ${kind}`;

/** The heading over the caveats a source puts on its own answer, on a route
 * page and a results card: true of an authority's page and a consolidated
 * text alike. */
export const PAGE_ALSO_SAYS = "The page also says";

/**
 * The day a page was read, in the one form every read date takes: a quote on
 * a route page or a results card, a headline figure, a country card and the
 * data door's route list. The figure is dated by its own reading, so it and
 * its quote cannot differ.
 */
export const readOn = (day: string): string => `read ${day}`;

/**
 * Why we have no quote, said to the reader: the dataset carries the decision
 * — a reason from a fixed set and the day we last looked — and these are its
 * sentences, on a route page and a results card alike, so one absence never
 * reads two ways. The free prose beside them (which document, what was tried)
 * is an addition, never the whole answer (review 2026-09-07).
 */
export const UNSOURCED_REASON_SAID: Record<UnsourcedReasonWord, string> = {
  "scanned-image": "The authority publishes it only as a scan, so there is no text to quote.",
  "not-published-in-words": "The authority states it as a list or a table, never in a sentence to quote.",
  "unreachable": "We cannot reach the source from here.",
};
/** The day we last went looking for the wording, closing that sentence. */
export const lastCheckedOn = (day: string): string => `Last checked ${day}.`;
