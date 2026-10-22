// @level presentation
/**
 * The words around a quote, wherever one is shown: whose page a source link
 * opens, the day it was read, and the heading over what a page also says.
 *
 * Every word a reader reads lives in this folder, one file per screen or
 * part (CODING_STANDARDS.md, Rules).
 */

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
