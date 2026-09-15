# s10 — the first paint stops shifting

**Status:** approved 2026-09-15 (human: "approve"). Site #8.

## What happened

The counter's Core Web Vitals (Cloudflare, read 2026-09-10, bots excluded) put
Cumulative Layout Shift **poor for 23%** of samples while LCP and INP were good
for 100%. The debug rows named what moves: `#app` at 0.402 and the shared
footer at 0.414, against Google's "poor" line of 0.25. The interview screen and
the footer — the two things every reader meets.

**The mechanism, from the code.** The page ships `<main id="main"></main>`,
empty. A 220 KB module script then draws the first question into it, and
everything below — the declaration panel, the footer — moves down to make room.
On a fast local connection the script arrives with the HTML and Chrome paints
once, so a local check reads CLS 0 and a test would never see it. On a phone
the HTML paints first and the script arrives later; the reader watches the
page rearrange itself.

**Reproduced on 2026-09-15** with the site's own headless-Chrome driver and a
server that hands the HTML over at once and the module 700 ms late (a realistic
mobile network):

| arrival | CLS | what moved |
|---|---|---|
| `/`, no record | 0.11 | `footer.site-foot`, `#decl` |
| `/?country=fr`, no record | **0.28** | `#app`, `footer.site-foot`, `#decl` |
| `/`, with a saved record | 0.16 | `#app`, `footer.site-foot`, `#stamp` |

The field's 0.40 is the same shift on a slower network. Zero delay gives zero
CLS; the defect is real and it is invisible to every gate this project has.

## What a reader gets

The page as it first paints is already the page: the first question and its
options are on screen before any script runs, where they will stay, and the
footer is where it will stay. A returning reader with a saved record, or a
reader arriving from a country or route page, sees their screen replace the
first question **in the same place and without the footer moving**.

## What must be true

1. **The first question is in the HTML.** It is the same for everyone until an
   answer is given, so it is rendered at build time from the dataset — the
   question, its options, its help — through the same code that renders it at
   run time, not a second copy. When the script runs on a fresh visit it finds
   the screen it would have drawn and draws nothing.
2. **A different first screen replaces it without a shift.** A saved record, a
   `?country=` arrival and a `?route=` arrival each put a different screen on
   first paint. Each replaces the built-in question **in the same box**: the
   footer does not move, and whatever moves inside the box moves by less than
   the "good" line. Reserving the box's height is one way; making the screens
   the same height is another; the measurement decides, not the method.
3. **Nothing else changes.** The interview's behaviour after first paint is
   untouched: answers, back, edit, restart, the results screen, the arrival
   line, the stored record. Every existing test stays green, and the
   root-build fingerprint of the route pages does not move (they are not this
   slice).
4. **No script is still no page** — or exactly what it is today. The page
   handles JavaScript-disabled in no particular way today (there is no
   `<noscript>`); with the first question in the HTML a reader without script
   sees a question they cannot answer. That is better than an empty box and
   worse than a sentence. A one-line `<noscript>` under the question saying the
   interview needs JavaScript is in scope; anything more is not.
5. **The measurement is a gate, not a note.** A browser-driven case, in the
   shape `tests/record.test.ts` already has, loads the built site with the
   module delayed and asserts CLS on all three arrivals. The bound is
   **below 0.1** — Google's "good" — on every one, and **0** on the cold,
   record-less `/`, because that page should paint once. The harness used to
   reproduce this is beside this file, `s10-cls-harness.mjs`, and can be lifted:
   a server that delays `.js` responses, a `PerformanceObserver` on
   `layout-shift` with `buffered: true` installed after load and read after a
   beat (the driver's `evaluate` does not await a promise).
6. **The claim on the site does not change.** Nothing here touches copy.

**Corrected 2026-09-15, after the build's reviews** (the writing session's
correction, dated and marked, as the held-out-scenario rule allows): two things
above were stated more strongly than the system can know. Point 2's "the
footer does not move" was met at 390×844 only because a full box pushes the
footer out of frame; at 390×1400 it moves on every arrival. Point 5's "that page
should paint once" was false even cold: the HTML shipped the ledger `open` and
the module closed it on narrow screens, 0.008 at the taller viewport. Both
turned out to be one thing — **the module changing, after the fact, what the
HTML painted**: the ledger's state, the masthead's subline, the screen in the
box. So the requirement is restated as what it always meant: the first paint's
shape is decided **before** the first paint (a few bytes of inline script,
already the pattern this site hashes into its CSP, setting flags CSS paints
from), the module arrives to the page it would have chosen, and the gate runs
at **two phone viewports and one desktop** and asserts the shift *sources*, not
only the sum — nothing below the box may appear in them on any arrival. The
bounds stay: under 0.1 everywhere, 0 on the cold record-less `/`.

**Corrected again, 2026-09-15, after the review round was built and measured:**
"nothing below the box may appear in the shift sources on any arrival" does
not hold by construction and cannot be made to. A link arrival lands on a
genuinely taller screen — the citizenship search with its hint paragraph,
where the build painted a five-button destination card — and the footer
travels +205 / +246 px on a phone, below the fold, for 0.005 of score. The two
ways to hold it (reserve a box tall enough for the tallest question, or paint
nothing for readers with a record or a link) each trade a visible defect for a
number. So the gate asserts what is by construction — **nothing above the box
moves, ever, at any of three viewports**, and **the cold page moves the footer
by zero pixels** — and the aggregate under 0.1 on every cell (worst 0.062). The
footer's travel on link arrivals is a recorded default, reversible if the
counter says otherwise a week after it is live.

## How it is proved

- The browser case in point 5, red on master today at the numbers in the
  table, green after.
- The existing 349 site tests, the fingerprint, and `record.test.ts` (the
  privacy promise walked in a browser) unchanged and green.
- The human's walk on the preview: the first question is on screen before the
  script arrives — the preview can be served with the same delay — and a
  returning record lands without the page jumping.
- **How it is finally judged:** the counter, the same filter, a week after it
  is live — CLS poor back to 0%, LCP and INP unchanged (the issue's own
  criterion).

## What this slice is not

It is not a redesign of the interview's boot. It is not a service worker, a
smaller bundle, or a preload hint — those may help LCP and are not the defect;
the defect is a box that is empty when it paints and full a moment later.
