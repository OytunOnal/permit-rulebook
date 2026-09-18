# s30 — on a phone the next question comes up to meet the reader

**Status:** approved 2026-09-18 (human: "tamamdır", after trying a throwaway
build in Chrome's phone emulation; option B of three, then "sadece mobil").
v1.2 fix: P10 (v1.1 gate critique, polish; re-score: "each question starts
445 px down").

## What happened

On a phone every question after the first is drawn 445 px down the page —
under the header (22–81), the headline (130–220), the subline (226–273) and
the stamp (294–395) — with its first option at 550. Measured on the live
site 2026-09-17 at 390×844 and 375×667: at 844 the first option is visible
and the second often is not; at 667 a long first option is cut. The reader
tapped an answer and has to scroll to find the next question. s20's
`reveal` scrolls only when the card's *top* is off-screen, so it never
fires here — the top is on screen; the question is not.

Three ways were put to the human: the stamp leaves the masthead during the
interview (A); every advance lands the question at the top (B); both (C).
B chosen, then narrowed to phones after a trial build: on a desktop the
card sits beside the ledger with room above it, and the hero should stay.

## What must be true

1. **After a gesture that draws a new question — an answer or Back — on a
   narrow screen, the question card's top lands just under the header**
   (the header's height plus one small gap; the builder uses the header's
   measured height, not a number), smooth unless the reader has asked for
   reduced motion, then instant. Every question after the first, every
   time, whatever the card's height.
2. **Narrow means the site's own breakpoint** — `WIDE_QUERY` (`min-width:
   761px`, where the ledger moves beside the card), read through
   `matchMedia` at the moment of the gesture. On a wide screen nothing
   changes: s20's rule stands (the card is revealed only if its top is off
   screen).
3. **A correction keeps s20's rule on every width** (✎ from the ledger: the
   card is revealed only when off screen; the focus lands on the first
   control without a second move). The first paint is not a gesture: a cold
   load, a restored record, a browser history move scroll nothing.
4. **The focus behaviour does not change**: `focusFirst` still takes the
   first control with `preventScroll`, after the landing, so the page moves
   once.
5. **Nothing else changes.** The masthead, the stamp, the first screen, the
   result's `landOnVerdict`, the desktop.

## How it is proved

- Browser cases at 390×844 and 375×667: after the first answer the card's
  top is within the header's height + gap of the viewport top, on the next
  answer and on Back likewise; with `prefers-reduced-motion: reduce` the
  landing is instant (measured within one frame); at 1280×900 the scroll
  position after an answer is unchanged (0); a ✎ correction at 390 behaves
  as s20's test already pins.
- The s10 first-paint gate and s20's tests stay green; the CLS numbers do
  not move (a scroll on a gesture is not a layout shift).
- The human's walk in Chrome's phone emulation on the local build (done on
  the trial; repeated on the real build).

## What this slice is not

It is not the stamp's removal (A — declined), not a masthead redesign, and
not a change to where a verdict lands.
