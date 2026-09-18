# s31 — the hold state says where it is, and two small things

**Status:** approved 2026-09-18 (human: "onaylıyorum"); real-green: 2026-09-18 (human: "merge"; site 370f9e9). v1.2 fixes: the finished-record hold state
(s22's trade), focus after a re-answer (v1.1 re-score polish), and
`scrollbar-gutter: stable` (s22, seen and not touched).

## What happened

1. **The hold state.** A returning reader with a finished record sees, until
   the module draws (~700 ms on a slow connection), the header, the eyebrow
   and — a thousand pixels of blank later — *Your answers are on this device
   — bringing them back.* Measured 2026-09-18 at 390×844 with the module
   held 4 s: eyebrow at 230; headline, subline, stamp and the box laid out
   but `visibility: hidden` (130–800); the stand-in line centred inside the
   hidden box. s22 chose "covered, not moved" so nothing visible shifts
   when the verdict lands — right for CLS, wrong for the eye: the blank
   reads as a failure.
2. **Focus after a re-answer.** After a correction the verdict is drawn and
   announced, but keyboard focus is on `<body>` (F6 was fixed for the
   interview, not for the return to the verdict).
3. **Classic scrollbars.** On a desktop with non-overlay scrollbars the
   verdict's arrival makes a scrollbar appear and shifts the page 17 px
   (s22's note).

## What must be true

1. **The hold state is one line under the eyebrow.** On a verdict arrival
   (`data-first="verdict"`), until the module draws, the page is the header,
   the eyebrow and the stand-in line directly beneath it — nothing laid out
   below (the covered headline, subline, stamp, box and footer take no
   space: `display: none` under the cover, not `visibility: hidden`). When
   the module draws, the line goes and the verdict appears where it stays;
   nothing that was visible changes place. The s10 gate's finished-record
   row must still measure **CLS < 0.1 at 390×844, 390×1400 and 1280×900**
   with no shift source above the box — measured before and after; if the
   line's removal or the masthead's appearance registers as a shift, the
   builder says so with the number and the scenario's correction decides
   between this shape and s22's.
2. **Focus follows the verdict.** When the verdict is drawn after a
   correction (the s20 return), focus lands on the headline (`tabindex="-1"`,
   `preventScroll`), the same element the live region announces — one
   move, no second scroll. A first arrival (cold, record, link) keeps s10's
   rule: nothing takes focus from a reader who touched nothing.
3. **The gutter is stable.** `scrollbar-gutter: stable` on the root, so a
   scrollbar that appears when the verdict lengthens the page takes no
   width from the layout. Measured at 1280×900 with classic scrollbars (the
   headless default on Windows): the content column's left edge before and
   after the verdict is drawn is the same; the cold `/` at 1280 shows no
   visible change (the gutter is on both states).
4. **Nothing else changes.** The other four arrivals keep their s10
   numbers; the interview's landing (s30) and reveal (s20) unchanged.

**Corrected 2026-09-18, by the build:** (1) The shape registers no shift.
The s10 gate's finished-record row, its own method (module 700 ms late,
the observer buffered), before → after: 390×844 CLS 0 → 0, 390×1400 0 → 0,
1280×900 0 → 0, no shift source on either side — what was visible (the
header, the eyebrow) stays put, and what appears was never painted. The
line's place: at 390 the eyebrow is at 107–122 and the line at 130–154 (it
was 445–800, centred in the hidden box); at 1280, 130–145 and 153–176; the
headline lands at the line's own top. The line is the record line's own
sentence, rendered a second time by `holdLineHtml` into the masthead
between the eyebrow and the `h1` (`.stand-in-verdict`), and the module
removes every `.stand-in` on the page, not the box's alone. The masthead's
rule stays transparent under the hold, for s22's reason with more force:
with the covers gone it would sit under the line and move to under the
subline when the verdict drew. The gate's "every reader meets the same box"
case now says so for the four question arrivals and asserts the verdict
reader's box takes no room; that row's footer travel is no longer a
number (the footer has no box at the first paint). (2) "The s20 return" is
`wasResult` false: ✎ sets `data-state="questions"` before it draws the
question, so the answer that draws the verdict replaces a question —
`landOnVerdict` reveals the masthead (s20) and now focuses the headline. A
verdict drawn over a result by a gesture has no path today; the focus is
taken on every gesture-drawn verdict and on none that is `arriving` or
`restoring` — browser Back to a verdict keeps the old rule (nothing takes
the focus), filed with the Back behaviours, not touched. (3) At 1280×900
the question page is 1,315 px tall, so a classic scrollbar is there before
and after the verdict on master as well: the column's edge is 456.5 → 456.5
either way, and the scenario's viewport could not show the defect. It
shows where the question page fits: measured at 1280×1400 with the
scrollbars drawn (the harness hides them unless asked — `scrollbars: true`,
s31), master 464 → 456.5 (a 15 px bar, 7.5 px of centred column); this
build 456.5 → 456.5. The cold `/` at 1280×900 is 456.5 on both builds —
unchanged; at 1280×1400 it is now 456.5 where master had 464 — the gutter
on both states, the trade point 3 names. The rule is
`html{scrollbar-gutter:stable}` in `index.astro`'s global style beside the
`body` it styles: this is the one page whose length changes after it has
painted; the route and country pages ship at their length, `identity.css`
is the pair and `tokens.css` is values. Seen: Chrome reserves the gutter
under `--hide-scrollbars` too, so every desktop measurement in the suite
now sees the column 7.5 px further left — no case reads an absolute edge;
the suite is green. (4) The other four rows, before and after, identical to
the thousandth: 390×844 cold 0, the two links 0.003, record 0.003; 390×1400
cold 0, links 0.055 / 0.054, record 0.030; 1280×900 cold 0, links 0.013 /
0.009, record 0.002.

## How it is proved

- The s10 gate re-run: finished-record CLS at three viewports, before and
  after, both under 0.1, shift sources listed; the other rows unchanged.
- A browser case with the module held: the hold state's DOM — header,
  eyebrow, the line, and nothing else painted (the line's top within the
  eyebrow's height + one gap of the eyebrow's bottom).
- A browser case: ✎ from the verdict → answer → the verdict returns with
  `document.activeElement` the headline; cold arrival: `body`.
- A browser case at 1280×900: the main column's left edge equal before and
  after the verdict, and `getComputedStyle(html).scrollbarGutter` stable.
- The human's read on the local build with the module held (the scratch
  server's `delayJsMs`), and a keyboard walk of one correction.

## What this slice is not

It is not a masthead redesign, not a skeleton headline, and not the Back
behaviours filed under v1.2 (a steward pass).
