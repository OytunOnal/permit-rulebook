# s27 — five small slips

**Status:** approved 2026-09-17 (human: "onaylıyorum"); real-green: 2026-09-17 (human: "merge"; site 46663d9). v1.2 fix: P8 (v1.1 gate critique, polish;
re-score: "the deviations are small and local").

## What happened

Five things the critic saw and the walks confirm today, measured on the
live build (2026-09-17):

1. The phone's *Menu* button reads *Menu* while the menu is open
   (`aria-expanded="true"`, text unchanged).
2. On the four-country result the disclosure triangle is a flex item of its
   own (`summary::before`), so `justify-content: space-between` puts it at
   the far left, the country's name in the middle and the tally at the
   right: *▸ ‥‥‥ FRANCE ‥‥‥ 5 not yet*.
3. The 404's call to action has a visually hidden H2 *Start from your own
   situation* directly above a bold *Or start from your own situation.* —
   invisible on screen, read twice by a screen reader.
4. In the desktop sidebar the ✎ glyph wraps alone to a second line
   (*University degree ⏎ ✎*; measured at 1280: the dd two lines, the pen on
   the second).
5. A route page's H1 is *Experienced worker (§ 19c / § 6 BeschV; § =
   section). The rules, quoted and dated.* — a name that ends in a
   parenthesis, then a full stop, then a sentence.

## What must be true

1. **The menu button says what it does.** Closed: *Menu*. Open: *Close*.
   Both words live in `copy.ts`; the script swaps the button's text from
   `data-` attributes rendered on the button (no user-facing string in an
   inline script), together with `aria-expanded`. Escape and outside-click
   restore *Menu*.
2. **The triangle belongs to the name.** In a country section's summary the
   disclosure mark and the country's name are one group (the mark drawn on
   the name's own element), the tally the other; at 1280 the group sits
   left and the tally right on one line; at 390 the tally wraps beneath,
   left-aligned, as it does today. The mark's right edge is within 0.6 em of
   the name's left edge in both states at both widths. The `said` summary
   (s21/s26) keeps its own rule (tally on its own row).
3. **The 404 says it once.** The hidden H2 goes; the bold sentence *Or start
   from your own situation.* becomes the section's heading element (an
   `h2`, styled as the sentence is now), and `aria-labelledby` points at
   it. One element on the page carries those words.
4. **The pencil never stands alone.** In the ledger, the ✎ is bound to the
   last word of the answer (a non-breaking space, or the pen and the last
   word in one no-wrap span); at 1280 no row has the pen on a line below
   its text, for every answer label the dataset offers (measured over the
   longest labels, not one).
5. **A route's H1 is its name.** The tagline *The rules, quoted and dated.*
   leaves the H1 and stands as its own line under it (a `p.tagline` in the
   same header, same type it has now — the H1's `em`); the H1 is the route
   name with its parenthesis and no full stop. The `<title>` and the
   social card do not change. The route fingerprint moves (every route
   page's header) and regenerates with this reason.
6. **Nothing else changes.** No verdict, no count, no record, no copy
   beyond *Close* and the moved tagline; s13's menu tests, s21/s26's
   summary tests and the 404 tests stay green or move only where a point
   above moves them.

**Corrected 2026-09-17, by the build:** point 5 names one fingerprint and
point 1 moves two. The Menu button's two words ride on it as attributes
(`data-word-closed`, `data-word-open`), and the header is on every page —
so `/data/`'s clean-day fingerprint (`tests/fixtures/data-page-clean.json`,
s11) moved with the route pages' and was regenerated with that reason; not
a word of `/data/`'s own moved. Point 2's premise held, with one measured
addition: beside the s21 sentence at 1280 the name is the flex item that
gives way, and squeezed to its widest word it put the mark on a line above
the name — the name element is `white-space: nowrap`, so mark and name are
one line at every width. Point 6's "move only where a point moves them":
`tests/route-page.test.ts` pins the accent's one declaration, whose selector
now names the em and the tagline together (point 5); `tests/identity.test.ts`
reads the tagline off the route page's `p.tagline` where it read the H1's
`em` (point 5). Nothing else moved.

## How it is proved

- Browser cases at 390×844 and 1280×900: the button's text before and after
  a click and after Escape; the mark-to-name gap on a closed and an open
  country section; the 404's single carrier of the sentence and the
  heading the section is labelled by; for each ledger row at 1280 the pen's
  top equals the dd's last-line top and the pen is not the line's first
  glyph; every route page's H1 text ends in `)` or a letter, never `.`, and
  the tagline element follows it.
- Unit: the two menu words come from `copy.ts` and reach the button as
  attributes; the route header renders the name and the tagline as two
  elements.
- The human's walk on the local build: the phone menu, one four-country
  result, the 404, the desktop ledger, one route page.

## What this slice is not

It is not P10 (the question under the hero on a phone), not the hold state,
and not a redesign of the sidebar or the country sections.

**Amended 2026-09-17, from the human's walk of the local build** (two
points, both copy the human decided):

7. **The tagline ends in a colon.** *The rules, quoted and dated:* — it
   introduces what follows. `ROUTE_TAGLINE` only; `<title>` and the social
   card unchanged.
8. **The card's door to the route page is a door.** Under a result card the
   scope line (*quoted and dated · scored …*, the data package's words)
   ended in *· The rules of this route* — a third item in the list, set in
   the external-link red without its arrow, so it read as a label, and the
   separator dangled at a line's end when the link wrapped. Now: the scope
   line stands alone, no trailing separator; the door is its own line
   beneath it, *Read the rules of this route*, underlined, in the colour
   internal links in prose already use (`--color-band`) — the site's two
   signals for a standalone internal link, together (option A of three;
   human: "A"). The words live in `copy.ts`; the s7 pin on the old words
   moves. Tap size unchanged.
