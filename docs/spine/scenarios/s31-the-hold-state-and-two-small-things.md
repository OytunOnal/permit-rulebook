# s31 — the hold state says where it is, and two small things

**Status:** proposed 2026-09-18. v1.2 fixes: the finished-record hold state
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
