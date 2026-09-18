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
 * `data-first` says which of four readers this is. `"record"` — answers are
 * on this device, so the short promise is theirs and the box says the answers
 * are coming back. `"verdict"` — the record says the interview was finished,
 * so their screen is a verdict and nothing the build painted is theirs but
 * the frame: the masthead's question, the card, the ledger and the footer are
 * all covered until the module draws the page they came back to (s22).
 * `"link"` — they pressed "Check yours" on a country or route page, which has
 * answered question one for them but may be everything they have answered, so
 * the box says only that it is setting up. Absent — a fresh visit, and the
 * page the build painted is already right. `data-narrow` — the ledger is a
 * disclosure here, and a closed one. `data-answered` — the reader has answered
 * something (a record, or the link that answered question one), so on a phone
 * the ledger line already stands above the question, where the module will
 * keep it (s30, amendment 6) — for the first screen even when the link's code
 * is one the page does not know: the head decides the first paint, and the
 * module writes the flag from its own count only from the first gesture on.
 *
 * The two started readers are told apart because the sentence for one is false
 * for the other: a reader with no answers cannot have answers brought back
 * (human's walk, 2026-09-15). A record wins over a link, because a reader who
 * has both does have answers on the device.
 *
 * The finished reader is told apart by one key of the record, read as the
 * product wrote it: `done`, true when the interview had nothing left to ask.
 * Reading it costs a `JSON.parse` of a few hundred bytes, and nothing else in
 * the record is looked at — the answers stay the module's business. A record
 * that does not parse is still a record: the module decides what it is.
 *
 * Nothing here says anything a module could not work out; it says it early
 * enough to matter, and it names nothing from the dataset — no country, no
 * route — because this string is inlined into the page, where nothing checks
 * a name against the dataset.
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
    let first = /[?&](country|route)=/.test(location.search) ? "link" : "";
    try {
      const raw = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
      if (raw) {
        first = "record";
        try { if (JSON.parse(raw).done === true) first = "verdict"; } catch { /* the module decides */ }
      }
    } catch { /* a browser that refuses site data is a reader with no record */ }
    if (first) page.dataset.first = first;
    if (first === "record" || first === "link") page.dataset.answered = "";
    if (!matchMedia(${JSON.stringify(WIDE_QUERY)}).matches) page.dataset.narrow = "";
  })();
`;
