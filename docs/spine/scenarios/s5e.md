# s5e — "Every sentence carries its source, not only every number" · Acceptance scenario

Status: DRAFT — awaiting human approval (2026-09-07).
Human decision the same day: **close this before launch**, not in s6.
Born from: the audit the builder returned while fixing the orientation-year
false requirement — asked for the size of the problem, not a fix.
Screen change: the source lines under a card gain entries; no new screen.
Slice exits: `tdd` + `code-review` — mandatory.

## The problem, in one measurement

**46 criterion notes ship. 0 carry a `source_url`. 0 carry a `retrieved_at`.
39 of them contain a quotation mark.**

The schema types `note` as a bare string, so provenance is impossible there by
construction. The product's promise is that every value carries its official
source, a verbatim quote and the date it was read. Numbers keep that promise.
These sentences — many of them quoting an authority, some of them stating what
the law does — do not, and nothing watches them. When a page reworded, the
quote-fidelity gate would catch a threshold's quote and miss all 39 of these.

This is the third time in two days that unsourced prose turned out to be doing a
rule's job: the Chancenkarte "part-time work" line, `nl-orientation-year`'s
`situation = none`, and `de-chancenkarte`'s twin of it. Each was found by a
human reading a screen. The pattern is not bad luck; it is a field that permits
claims without evidence.

## Design decisions this slice encodes (approved with this scenario)

1. **No new construct.** s5d already built `Route.statements` — provenanced text
   with `kind: "condition" | "caveat"`, watched and quote-checked like a
   threshold. Notes move into that shape rather than growing a parallel one. A
   third kind is added: **`modelling`** — our own commentary about what we did
   or did not model, which is *not* a claim about the law.
2. **Three groups, three destinations,** from the audit:
   - **A — our reasoning stated as a fact about the rule (~8).** Each is either
     sourced with a quote and a read date, or demoted to a caveat or a summary
     sentence, or deleted. **The one that cannot survive as prose:**
     `nl-hsm-under30`'s "When changing employer after turning 30, the €5,942.00
     amount applies" — a euro figure asserted with no quote and no source. A
     number without provenance is exactly what this product exists not to do.
   - **B — a genuine quote attributed to an authority, with no URL and no read
     date (~28).** Each gets its `source_url` and `retrieved_at`; the watchlist
     grows with any page not already on it; the quote-fidelity gate checks them
     from then on.
   - **C — modelling and verification commentary (~10).** Honest by
     construction; it becomes `kind: "modelling"`, marked as ours, and can never
     again be mistaken for something an authority said.
3. **The gate, written so content cannot silence it.** After this slice a build
   fails when a route or criterion ships text containing a quotation mark
   without a `source_url` and a `retrieved_at`. The honest escape is not to
   delete the quotation marks — it is to mark the text `kind: "modelling"`,
   which is an attributable decision that it is ours, recorded in the dataset
   and visible on the card. Absence of a source must be a decision someone made,
   never a blank a rule taught an agent to fill.
4. **What the reader sees changes, and should.** A card's source list will get
   longer: today it shows the quotes behind the numbers, and after this it shows
   the quotes behind the conditions too. Where a sentence is ours, the card says
   so in words a stranger understands — not "modelling", but something like
   "our reading, not the authority's words".
5. **This slice does not model anything new.** No criterion changes meaning, no
   threshold moves, no route appears or disappears. If the work reveals that a
   note was doing a rule's job — the pattern above — that is recorded as a
   finding for its own slice, not fixed inside this one.

## Seed data

No new routes. Group B's sources are the pages already behind each route
(BAMF, ZAV, service-public, BOE/UGE, ind.nl) and some are already watched. The
work is locating the exact page each existing quote came from, which is
curation, not research.

## The cost, stated before it is paid

**Some of Group B will need a human read.** Where a quote came from a page no
machine here can reach — the Spanish UGE PDF, the German hosts that answer from
elsewhere but not from here, the IND pages that render client-side — the source
can be attached but the quote cannot be machine-verified, and the gate will
report it as `unverifiable — human tier`. Those become a verification checklist,
like `verify-s5.md`. **The scenario is not green until that checklist exists and
its size is known** — a human may reasonably decide, on seeing it, that some
notes should be deleted rather than verified. That decision is theirs.

## Steps

1. **The measurement moves.** Re-run the audit that produced this scenario: of
   46 notes, the count carrying a `source_url` goes from 0 to every note that
   quotes anything. The remainder are all `kind: "modelling"`, and that number
   is reported, not hidden.
2. **The euro figure.** `nl-hsm-under30`'s €5,942 change-of-employer sentence
   either carries a quote from ind.nl with a read date, or it is gone. There is
   no third outcome for a number.
3. **The gate bites.** Add a note containing a quotation mark and no source: the
   build fails, and the message says the two honest options. Mark the same text
   `kind: "modelling"`: the build passes and the card shows it as ours.
4. **The card reads correctly to a stranger.** Walk a German and a Dutch route
   and read every source line aloud: each is either an authority's sentence with
   a host and a date, or plainly marked as ours. No line leaves a reader unable
   to tell which.
5. **Edge profile (mandatory).** The all-unknown weak profile across four
   countries: no card gains an empty source block, no card gains a wall of
   sources that buries the verdict, and the "no numeric value" honesty line
   still appears where it did.
6. **Watch coverage holds both ways.** Every newly attached source is on the
   watchlist; no watch entry is orphaned; `npm run check` reports the new quotes
   as verified or as `unverifiable — human tier`, never silently.
7. **Regression.** All existing tests stay green; the value set is unchanged —
   this slice moves prose, not numbers.

## Invariants (property tests)

- **No text a card can render quotes an authority without carrying a source and
  a date.** Generated over every route and every criterion, at the symptom
  level: not "the field is present" but "nothing reaches the screen in quotation
  marks without provenance beside it".
- **`kind: "modelling"` text never renders as an authority's words**, in any
  state, over generated profiles.
- Everything from the existing suites, re-run.

## Runs

- mock-green: —
- real-green: — (requires the human pass over whatever verification checklist
  this slice produces)

## De-mock births

- The human-tier subset of Group B: a `verify-s5e.md` checklist, born the moment
  the first quote is attached to a source no machine here can read.
