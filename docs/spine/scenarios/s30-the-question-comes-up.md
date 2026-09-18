# s30 — on a phone the next question comes up to meet the reader

**Status:** approved 2026-09-18 (human: "tamamdır", after trying a throwaway
build in Chrome's phone emulation; option B of three, then "sadece mobil").
v1.2 fix: P10 (v1.1 gate critique, polish; re-score: "each question starts
445 px down"). real-green: 2026-09-18 (human: "merge"; site 3535086).

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

**Corrected 2026-09-18, by the build:** point 1 names Back beside an answer
and point 3 says a browser history move scrolls nothing — on this site they
are one gesture. The card's ← Back *is* `history.back()` (s16: the screen's
Back and the phone's Back are one gesture), so it renders under `restoring`,
as `kind: "restore"`, from the popstate handler. The resolution is point 1's:
the reader asked for that question. The first build left Back to the
browser, whose restore brings back the scroll the reader *left* the entry at
— right only while they had not scrolled on it. The Spec review measured the
other case at 390×844: an answer, a scroll of 250, an answer and Back put
scrollY at 622 and the card's top 177 px above the viewport. So on a narrow
screen a history move that draws a question later than the first lands it
under the header too — after the browser's restore, which comes after the
popstate handler and its microtasks and before the first animation frame
(read in that order, in that walk: 372 in the handler, 622 in the frame), so
the landing waits for the frame and wins; instant or smooth per reduced
motion, as an answer's. Back to the *first* screen (`screens.current === 0`)
keeps the browser's own restore — that entry's 0, the page as the cold load
shows it — and on a wide screen a history move still scrolls nothing of ours;
the cold load and a restored record are `arriving` and untouched. The one
Back that would render as `edit` — standing on the page's first entry with
answers behind it — no walk reaches: the rebuilt list stands on its last
entry, and on the first there is nothing behind. (1, the gap) The header's
own `padding-bottom` (`--space-3`, 13.6 px at 16 px), read from computed
style: the breath the header keeps under itself, so the card sits under it by
the same measure.

**Corrected 2026-09-18, by the build (amendment 6):** "the CLS numbers do not
move" holds to the gate and not to the thousandth. The order is the page's
`data-answered`, written by the module from what the interview kept and, for
a reader whose answers are on the device (`record`) or in the link (`link`),
by the pre-paint script too — without which the ledger's move to the top
measured 0.197 at 390×844 and 0.171 at 390×1400 on every returning arrival
(over the s10 gate). With it, measured against the page before this amendment
on the same machine: 390×844 record 0.001 → 0.003 (the ledger line is in view
now, and its count's words change width), the two links 0.006 → 0.003;
390×1400 record 0.037 → 0.030, links 0.063/0.062 → 0.055/0.054; the cold page
0 → 0; the footer's travel unchanged on every row (+44 px on the record is
s20's resumed line, not this). And "Start over" (`reset`) is not among the
gestures point 6 names: on a narrow screen it keeps s20's reveal. (Delta
review) A link whose code the page does not know (`?country=zz`) is painted
with the flag and brings no answer; the first build took the flag down on that
render and moved the ledger below after the module landed — the move s10
forbids. Three ways were weighed: the head cannot know the dataset's codes
(the s13 sweep keeps every name out of the inlined script); leaving `link`
unflagged pre-paint costs a valid link 0.197 / 0.172 at 390×844 / 390×1400
(over the gate); so the head's word stands for the first screen — the flag
comes down on a gesture, never on the arrival — and the unknown-link reader
on a phone meets the ledger line *You declared · nothing yet* above question
one, which is true. Measured with the s10 method: `?country=zz` (and an
unknown route) 390×844 0.057, 390×1400 0.045, footer +94 px — the same to the
thousandth on master before s30, and the nodes are `#app`, `#stamp` and the
footer: the masthead's promise swapping from the link's to the fresh one, an
arrival the gate does not seed, seen and not touched here; the ledger stays
where it was painted. The valid link unchanged (0.003 / 0.055). The proof line "a ✎ correction at
390 behaves as s20's test already pins" moved with amendment 6 to the
correction landing's own cases (390×844 and 375×667: the ledger closes and
lands, the question under it); s20's rule for a correction is the wide
screen's, pinned at 1280×900.

**Corrected 2026-09-18, by the build (amendment 7):** one rule for both
states — `[data-answered] .decl{order:0}` in the narrow block — replaces
amendment 6's `[data-state="questions"]` one; `landOnVerdict` untouched.
Measured on the build at 390×844: the verdict's ledger line at 440 from the
page's top, the result at 545 (it was at 4969, under the routes). The s10
finished-record arrival, gate's method, before → after: 390×844 CLS 0 → 0,
390×1400 0 → 0, the footer's travel 4146 → 4146 px (the routes' height, s22's
number; the scenario table's 4786 is from an older dataset). Nothing above
the box moves because nothing of the ledger is painted before the module
draws: `#app` — the ledger inside it — is hidden with the masthead by s22's
verdict cover, and an element that appears is not one that shifted. So the
ledger needs no cover of its own.

**Corrected 2026-09-18, by the build (amendment 8):** the trial's "ledger 73,
card 178" in point 6 and the correction above describe the anchor amendment 8
moved. Measured on the build after an answer and after a ✎ correction, at
390×844 and at 375×667 alike: the card's top at 71.8 (the header's 58.6 and
its 13.6 gap, to the browser's rounding), scrollY 478, the ledger line's top
at −33.4 and its bottom at 47.8 — above the card, its lower edge still on the
screen, one swipe up. The ledger's place (amendments 6–7) is unchanged.

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

**Amended 2026-09-18, from the human's walk of the local build in Chrome's
phone emulation** (one point, tried on a throwaway build first — human:
"ledger üstte iyi"):

6. **On a phone, once the reader has answered, the ledger line sits above
   the question.** The collapsed *You declared · N answers — tap to review
   or change* box moves from under the card to above it as soon as one
   answer exists (the first question keeps F8's order: card first, the
   empty ledger below); the landing brings the ledger line's top under the
   header, the question follows it (measured on the trial: ledger 73, card
   178 at 390). Wide screens unchanged (the ledger is already beside the
   card). The ledger's own behaviour — collapsed, expands on tap, ✎ per row
   — does not change; s20's correction landing keeps its rule. The order is
   a declared state of the page (answers exist), not a count typed into CSS.
   **And a correction lands too, on a phone** (human's walk of the trial:
   "ledgerı açıp düzeltmeye tıklayınca soruya gitmiyor" — with the ledger
   open above the card, the re-drawn question sat below it and s20's
   reveal, seeing the card's top on screen, did nothing). On a narrow
   screen ✎ collapses the ledger and lands as an answer does — the ledger
   line under the header, the question under it, the first control focused
   without a second move. Point 3's rule (reveal only when off screen)
   narrows to wide screens.

**Amended 2026-09-18, from the human's walk of the local build** (tried on a
throwaway build first — human: "tamamdır oldu şu an"):

7. **On a phone the ledger line sits above the result too.** Once answers
   exist, the collapsed *You declared · N answers — tap to review or change*
   box stands under the masthead and above the notices, the strip and the
   route sections (measured on the trial at 390: 2206 → 463), so the way
   back to any answer is at the top of the verdict, not after every card.
   `landOnVerdict` keeps landing on the masthead; ✎ from there follows
   s20's verdict → question → verdict return, with the correction landing
   of amendment 6. The same declared state (`data-answered`) decides it;
   wide screens unchanged. The s10 finished-record arrival is measured
   again: the ledger's place is decided pre-paint, so nothing above the box
   moves after the module lands.

**Amended 2026-09-18, from the human's walk on a phone** (human: "telefonda
sorulara değil you declared'e geliyor ekran her cevabımda"):

8. **The landing is the question, not the ledger line.** Amendment 6 sent
   the ledger line's top under the header with the question 105 px below
   it; on a phone every answer felt like arriving at *You declared*. The
   anchor is the question card on every landing — answer, correction,
   later history move — the card's top under the header; the ledger line
   keeps its place above the card (one swipe up), and above the result.
   Nothing else in amendments 6–7 changes.
