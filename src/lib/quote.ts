import { LANGUAGE_NAMES, formatEUR, quoteLanguage } from "permit-rulebook-data";
import { esc } from "./reason.js";

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
  return `The source writes ${theirs} where this page writes ${ours} — the same number.`;
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
      languageName ? `${languageName}, from ${hostOf(value.source_url)}.` : "",
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
