# s20 — the correction lands on the question and returns to the verdict

**Status:** approved 2026-09-16 (human: "approve"). v1.1 gate
critique B2, F6, F5 (adjustment 2, the human's pick).

## What happened

On a phone the result screen's *You declared* panel sits at the bottom of
a long page. Tapping a row's ✎ re-renders the question at the top of
`<main>` — 1,366 px above the viewport for *Yearly salary*, 479 px for
*German* — and the reader is left looking at the footer or at the panel
they just tapped, focus on `<body>`. After re-answering, the page stays at
the bottom (scrollY 8,088) while the new verdict is rendered at the top.
The control looks dead on the device half the readers use. Desktop is fine
(the panel is a sidebar beside the card). Two smaller things share the
cause: focus drops to `<body>` after every answer (F6), and a returning
visitor lands on *QUESTION 3 OF UP TO 8* with nothing saying they resumed
(F5).

## What a reader gets

Tap ✎, and the question is on screen with its first option focused. Answer
it, and the new verdict's headline is on screen and announced. Every
answer moves the focus to the next question. Coming back to a half-done
interview, one sentence says so.

## What must be true

1. **On ✎ (any row of *You declared*, either layout):** after the question
   renders, the question card scrolls into view (`scrollIntoView` on the
   card, `block: "start"`, respecting `prefers-reduced-motion`) and its
   first option receives focus. On desktop the same code runs and is a
   no-op in effect (the card is already in view).
2. **On the answer that returns to a result:** the page scrolls to the
   verdict's headline (the masthead `h1`/the hero) and the live region
   announces the headline text. No scroll when the screen was already a
   result and the reader is still on it.
3. **After every answer to a question:** focus moves to the new question's
   first option (or the card's heading when the question has no options —
   the search fields), so a keyboard or screen-reader reader is never
   dropped on `<body>` (F6). The v0.7 focus rules for the correction
   controls stay.
4. **A resumed interview says so.** When the first paint of `/` finds a
   record with questions still open, the question card carries one line
   above the question, from `copy.ts`: *Continuing where you left off — N
   answers kept. Start over.* with *Start over* the existing control. The
   line is not in the cold `/` HTML (nothing is known before paint) and
   does not shift the box: it renders inside the card in the space the
   s10 stand-in reserves — measured, not assumed; the first-paint gate
   stays under its bounds.
5. **Nothing remembered beyond the record**, no timer, no new script hash
   (the interview module is the place).

## How it is proved

- A browser case at 390×1400 (the tall phone): answer to a result, tap
  *Yearly salary ✎*, assert the question card's top is within the viewport
  and `document.activeElement` is its first option; answer, assert the
  headline is within the viewport and the live region carries it.
- The same at 1240 wide: unchanged behaviour, focus on the option.
- A case walking three questions asserting the active element after each.
- A case seeding a half-done record, reloading, asserting the resumed line
  and its count; the s10 CLS gate green at all three viewports.
- The human's walk on a real phone: the exact steps the critique named —
  *Yearly salary ✎*, then a new band, then read the new headline.

## What this slice is not

It does not redesign the *You declared* panel or move it; it makes the
control it already has do what it looks like it does.
