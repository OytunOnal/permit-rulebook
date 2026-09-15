import { STORAGE_KEY } from "./record.js";

/**
 * What the page has to know about the reader before it paints.
 *
 * s10 put the first question in the HTML, and the interview stopped moving.
 * What still moved was everything the module decided AFTER the HTML had
 * painted: the masthead's promise shortens for a reader who has answered
 * something, and the declaration panel folds away on a narrow screen. Both
 * decisions were taken 700 ms late, when the 220 KB module landed, and both
 * moved the page under a reader who was already reading it — the footer by
 * 44 to 140 px at 390x1400, which is only out of frame at 390x844 (Spec
 * review, 2026-09-15).
 *
 * So the decisions are taken before the first paint instead, by the smallest
 * script that can take them: it reads the two things the module would read —
 * the record, and the link the reader followed — plus the width, and writes
 * what it found on `<html>`. The stylesheet does the rest, so the page paints
 * in the shape the module would have chosen and the module arrives to a page
 * that needs nothing done to it.
 *
 * It is inline and in `<head>` because it must run before the first paint,
 * and it is hashed into the policy like the menu's script is. Everything it
 * reads, it reads from where the module reads it.
 */

/** The width above which the ledger is a fixed panel rather than a disclosure.
 * The stylesheet says the same number in its own media queries; a stylesheet
 * cannot import, and the two are read together. */
export const WIDE_QUERY = "(min-width: 761px)";

/**
 * `data-first="started"` — this reader has answered something, so the short
 * promise is theirs. `data-narrow` — the ledger is a disclosure here, and a
 * closed one. Neither says anything a module could not work out; they say it
 * early enough to matter.
 *
 * The record is looked for under the current key only. The module still reads
 * the pre-rename one and carries it across, but its name is the working name
 * this product buried, and this script is INLINED into the page — where the
 * working name may not appear at all (s6 decision 1, and the sweep that holds
 * it). The cost is one masthead swap for whoever still has a record from
 * before the rename and has not answered anything since.
 */
export const FIRST_PAINT_SCRIPT = `
  (() => {
    const page = document.documentElement;
    // A link from a country or a route page puts a destination on the record
    // before the first question is asked, so its reader has answered
    // something too.
    let started = /[?&](country|route)=/.test(location.search);
    try {
      started = started || !!localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    } catch { /* a browser that refuses site data is a reader with no record */ }
    if (started) page.dataset.first = "started";
    if (!matchMedia(${JSON.stringify(WIDE_QUERY)}).matches) page.dataset.narrow = "";
  })();
`;
