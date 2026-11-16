// @level presentation
import { LANGUAGE_NAMES, formatEUR, hostKindOf, quoteLanguage, type Route } from "permit-rulebook-data";
import {
  OFFICIAL_PAGE, consolidatedTextOn, languageNote, learnLinkWithKind, readOn, sameNumberNote, thisRouteOn,
} from "./copy/quotes.js";
import { esc, escAttr } from "./reason.js";
import { type Glossary, glossed } from "./gloss.js";
import { tapInline } from "./tap.js";

/**
 * How a quote is framed, wherever one is shown.
 *
 * A quote is the whole claim of this product, and a claim needs a frame: which
 * language it is in, whose page it came from, and — where the source spells a
 * number differently from the way we spell it — that the two are the same
 * number.
 *
 * The route pages framed their quotes and the results card did not: twenty
 * sentences of German statute sat on the results screen tagged as English, with
 * no "German, from …" beside them, so a screen reader read them aloud in an
 * English voice to the reader the proof exists to convince (isolated v1-gate
 * critique, 2026-09-08, F2). One frame, computed in one place, so the two
 * screens cannot drift apart again.
 */

export interface QuoteFrame {
  /** The BCP 47 tag for the quote's own language, where the source has one. */
  lang?: string;
  /** The source's host, without `www.`. */
  host: string;
  /** The sentence shown under the quote, empty where there is nothing to say. */
  note: string;
}

export const hostOf = (url: string): string => new URL(url).hostname.replace(/^www\./, "");

/** The label of a link to a source: whose page it opens, by its host's kind. */
export function linkLabelOf(url: string): string {
  return hostKindOf(url) === "consolidated-text" ? consolidatedTextOn(hostOf(url)) : OFFICIAL_PAGE;
}

/**
 * The link to a route's Authority's route page (GLOSSARY), drawn from the
 * route alone, wherever a route offers it: a result card, a not-yet row, a
 * closed row and the route page call this one function, so they cannot drift
 * apart (ruling 5 on #396). It names the site it opens; its look is the
 * door's (`route-link`, in quote-line.css), and the sheet puts its ↗ after it.
 */
export function authorityRoutePageLinkHtml(route: Route): string {
  return `<a class="route-link authority-route-page" href="${escAttr(route.info_url)}" target="_blank" rel="noopener">${
    esc(thisRouteOn(hostOf(route.info_url)))}</a>`;
}

/**
 * A learn link's text. Its own label says what the reader does there; where
 * the page is not the authority's, the label is followed by what the page is,
 * unless the label already says so.
 */
export function learnLinkTextOf(learn: { label: string; url: string }): string {
  if (hostKindOf(learn.url) === "authority") return learn.label;
  const kind = linkLabelOf(learn.url);
  return learn.label.includes(kind) ? learn.label : learnLinkWithKind(learn.label, kind);
}

/**
 * A learn link's text on a screen that explains its shorthand once: the label
 * glossed on the screen's memory (#151, ruling 8), then the page's kind where
 * it is not the authority's (#158). Every surface that prints a learn link
 * takes it here, so the two steps run in one order.
 */
export function glossedLearnLinkText(learn: { label: string; url: string }, seen: Glossary): string {
  return learnLinkTextOf({ ...learn, label: glossed(learn.label, seen) });
}

/**
 * Where the source writes a number differently from the way this page writes
 * it, say so once, beside the quote.
 *
 * The proof for €50,700 spells it `50.700`, directly under a line reading
 * €50,700, and a careful reader comparing the two sees the evidence disagreeing
 * with the claim (critique F1). Nothing here is typed: both spellings are
 * derived from the amount, and the note only appears when the source's
 * spelling is actually in the quote and actually differs.
 */
export function separatorNote(amount: number, quote: string): string {
  const ours = formatEUR(amount).replace("€", "").trim();
  if (!/[.,]/.test(ours)) return "";
  // The two separators swap places through a placeholder no number contains,
  // so 50,700 becomes 50.700 and 45,934.20 becomes 45.934,20.
  const swap = "";
  const theirs = ours
    .replace(/,/g, swap)
    .replace(/\./g, ",")
    .replace(new RegExp(swap, "g"), ".");
  if (theirs === ours || !quote.includes(theirs) || quote.includes(ours)) return "";
  return sameNumberNote(theirs, ours);
}

/** The frame for one quote: its language, its host and what needs saying. */
export function quoteFrame(
  value: { source_url: string; quote: string },
  amount?: number,
): QuoteFrame {
  const lang = quoteLanguage(value.source_url);
  const languageName = lang ? LANGUAGE_NAMES[lang] : undefined;
  return {
    lang,
    host: hostOf(value.source_url),
    note: [
      languageName ? languageNote(languageName, hostOf(value.source_url)) : "",
      amount !== undefined ? separatorNote(amount, value.quote) : "",
    ].filter(Boolean).join(" "),
  };
}

/**
 * The note, attached to the citation line the way every other fact on it is.
 *
 * Without a separator the line read "read 2026-09-04German, from
 * arbeitsagentur.de." — date running straight into the next sentence, on every
 * quote block in the product (isolated v1-gate critique, 2026-09-08, F2). One
 * function, so the results card and the route page cannot separate it
 * differently.
 */
export const NOTE_SEPARATOR = " · ";

export function noteHtml(note: string): string {
  return note ? `<span class="note">${NOTE_SEPARATOR}${esc(note)}</span>` : "";
}

// ---------------------------------------------------------------------------
// The quote line
// ---------------------------------------------------------------------------

/** A sentence the site quotes: its words, its page, the day it was read and
 * the provision it cites, where it cites one. */
export interface QuotedValue {
  quote: string;
  source_url: string;
  retrieved_at: string;
  legal_basis?: string;
}

/** What a screen adds to a quote line, beside the quote's own frame. */
export interface QuoteLineOptions {
  /** The amount this quote is the proof of, where it is the proof of one. */
  amount?: number;
  /** What the value is called on its own line ("standard amount"). */
  label?: string;
  /** Markup said after the label: a card's period and its applies-to-you mark. */
  afterLabelHtml?: string;
  /** The citation as printed, where the screen glosses it itself; otherwise
   * the value's legal basis, glossed on the screen's memory. */
  citation?: string;
  /** A class the line wears beside `src`: a card's ruled-out amount is "unapplied". */
  lineClass?: string;
  /** Whether a long quote shows its first sentence, its whole text on the line's title. */
  trimLong?: boolean;
}

/** A read date as a quote and a headline figure both print it. */
export const readDateTime = (day: string): string => `<time datetime="${escAttr(day)}">${esc(readOn(day))}</time>`;

/**
 * One quote line, wherever a quote is shown: the quote in its own language,
 * its host, whatever the screen adds, its citation, the day it was read, the
 * frame's note, and its own link to its source ↗ (#387). The route page's
 * rules, its notices and its stated blocks draw it, and so do the results
 * screen's cards, notices and closed rows: one line, so the two screens
 * cannot print a quote two ways.
 */
export function quoteLineHtml(value: QuotedValue, options: QuoteLineOptions = {}, seen: Glossary = new Set()): string {
  const { lang, host, note } = quoteFrame(value, options.amount);
  const { shown, trimmed } = options.trimLong ? trimmedQuote(value.quote) : { shown: value.quote, trimmed: false };
  const citation = options.citation ?? (value.legal_basis ? glossed(value.legal_basis, seen) : "");
  return `<div class="src${options.lineClass ? ` ${escAttr(options.lineClass)}` : ""}"${trimmed ? ` title="${escAttr(value.quote)}"` : ""}>
        <span><q${lang ? ` lang="${escAttr(lang)}"` : ""}>${esc(shown)}</q> · ${esc(host)}${
    options.label ? ` · ${esc(options.label)}` : ""}${options.afterLabelHtml ?? ""}${
    citation ? ` · ${esc(citation)}` : ""} · <b>${readDateTime(value.retrieved_at)}</b>${
    noteHtml(note)}</span>
        <a ${tapInline()} href="${escAttr(value.source_url)}" target="_blank" rel="noopener">${
    esc(linkLabelOf(value.source_url))} &#8599;</a>
      </div>`;
}

/**
 * A quote long enough to bury the card is shown to its first sentence, with
 * the whole passage on the element and its source a click away — the evidence
 * stays complete, the card stays readable (tracker #5). The notice's quotes
 * go through it as the cards' do: the Türkiye notice's runs to 640
 * characters (Standards review, 2026-09-10).
 */
function trimmedQuote(quote: string): { shown: string; trimmed: boolean } {
  if (quote.length <= 200) return { shown: quote, trimmed: false };
  const end = quote.indexOf(". ");
  if (end < 0 || end > 200) return { shown: quote.slice(0, 200).trimEnd() + "…", trimmed: true };
  return { shown: quote.slice(0, end + 1) + " …", trimmed: true };
}
