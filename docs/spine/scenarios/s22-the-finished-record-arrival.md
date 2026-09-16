# s22 — the finished-record arrival is measured, and painted once

**Status:** approved 2026-09-16 (human: "ikisi de şimdi"). v1.1 re-score N2.

## What happened

A reader who comes back with a *finished* record — one that restores
straight to a verdict — sees the masthead move: the re-score measured CLS
0.65 at 390×844, 0.76 at 390×1400, 0.56 on desktop, the shift sources
`#app`, `#subline`, `#stamp`. The s10 gate never saw it: its "finished
record" seed uses `education`, `age` and `salary_eur_year: "60000"`, field
names the product no longer writes, so the record replays as a half record
and the gate measured a question screen while believing it measured a
verdict. s20's build noted the stale seed and left it; the re-score
measured what it hid.

## What must be true

1. **The gate measures a real finished record.** The s10 test's seeds are
   produced by the product's own `serialize` over a profile the interview
   accepts today (the s13/s20 tests already do this); the "finished record"
   row asserts it lands on a *result* (`data-state`), not a question, so a
   stale seed is red, not silent. Run it before any fix: the numbers above
   must reproduce.
2. **The finished-record arrival paints once, like the other four.** The
   pre-paint script knows *record* and *link*; it cannot know *finished*
   without reading the record, and the s10 rule is that the first paint's
   shape is decided before paint by a few bytes. Two ways, and the
   measurement decides between them, not the method:
   - (a) the pre-paint script reads the stored record's completeness — a
     flag the product writes into the record when the verdict is reached
     (`done: true`, or the record's `screen`) — and sets `data-first="verdict"`;
     CSS then paints the masthead's verdict shape (the *RECORD GENERATED*
     stamp, the results subline height) before the module arrives;
   - (b) the module, on a finished record, renders the verdict's masthead
     without moving what the HTML painted: the stamp swaps in place, the
     subline is reserved at the results height for every record arrival.
   Whichever is built, the bound is s10's: **CLS under 0.1 on the
   finished-record arrival at all three viewports, nothing above the box in
   the shift sources**, and the cold `/` still 0.
3. **The record stays what it is**: nothing new is remembered beyond what
   the product already writes; if (a) adds a field to the record, it is the
   one bit the verdict already implies, and `record.test.ts` (answers never
   leave the device) stays green.
4. **Nothing else changes**; s10's three existing arrivals keep their
   numbers; the resumed line (s20) keeps its place.

**Corrected 2026-09-16, by the build (measured, not argued):** the re-seeded
gate reproduced 0.58 / 0.72 / 0.46. Point 2's premise — a verdict masthead
shape to paint before the module — is false: over sixty random verdicts
the masthead's text column spans 113–198 px (the headline, not the
subline, is the larger mover), and no reservation holds every verdict
without a masthead redesign. And no masthead-only fix reaches 0.1: once the
footer travels thousands of pixels in the same frame the ledger and footer
under the box score ≈ 0.4 by themselves. So the s10 stand-in device is
applied to the frame: the record carries one bit, `done`, written when the
verdict is reached; the pre-paint script reads it and sets
`data-first="verdict"`; headline, subline, stamp, box and footer are
hidden until the module draws them in place, and the verdict reader's
first paint is the site header, the tagline and *Your answers are on this
device — bringing them back.* — the same sentence the record reader already
meets. **CLS 0 at all three viewports**, no shift source at all; the other
four arrivals unchanged. The session re-measured it on the preview with a
record the product itself wrote. One thing seen and not touched: in a
desktop Chrome with classic scrollbars the verdict's arrival can make a
scrollbar appear and shift the page 17 px; `scrollbar-gutter: stable` would
settle it — on the board.

## How it is proved

- The re-seeded gate red first (0.65) then green (< 0.1) on the finished
  record at 390×844, 390×1400 and 1280×900; the other rows unchanged.
- `record.test.ts` green.
- The human's walk on a phone: answer to a verdict, close the tab, reopen
  `/` — the page does not jump.

## What this slice is not

It is not a redesign of the masthead. It is the fifth arrival the s10 gate
should have measured, measured, and held to the same bound.
