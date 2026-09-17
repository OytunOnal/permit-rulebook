# s26 — one reader, one hierarchy

**Status:** approved 2026-09-17 (human: "onaylıyorum"). v1.2 fix: the four-country headline's
hierarchy (v1.1 re-score, polish; the residue N1 left).

## What happened

A researcher with a French hosting agreement reads two different screens
for the same answers. On the France path (question 1: France) s19 gives
them a written state: *No scored route in France takes a research hosting
agreement.* over *France's route for a research hosting agreement — Talent
— researcher (chercheur) — is quoted here but not scored: read its rules.
The routes below need …*. On the four-country path (question 1: *Any of
these four*; question 3: France) the same reader gets *Nothing open on these
answers.* over a green **0 OPEN**, and the sentence that explains it sits
third, in France's summary line, under Germany's — s21 put it there because
"the four-country result has no headline to give one country". But this
reader *named* France at question 3; the product knows which country their
agreement is in. One reader, two hierarchies.

## What must be true

1. **The named country gets the headline.** On the four-country path, when
   nothing is open anywhere and the reader answered question 3
   (`situation_country`) with a country whose scored routes do not take the
   declared situation, the headline and subline are s19's written state for
   *that* country — the same `unscoredVerdict`, keyed by `situation_country`
   where the destination is `all`, the same words, the same door on *read
   its rules*. One function, one copy; the direct path and the four-country
   path read the same headline for the same answers (assert equality).
2. **The rest sentence names the country on this path.** *The routes below
   need …* is true on the France page, where every route below is French;
   on the four-country page it would claim the other three countries' routes
   need what France's do. On this path the sentence reads *France's routes
   below need …* (steps derived as in s19, from France's scored routes); the
   direct path's sentence does not change.
3. **The named country's section comes first, and open.** The section for
   the country the reader named leads the list and renders expanded, before
   the others in their dataset order; its summary line keeps s21's sentence
   with the route link (the line is the section's tally, and a reader who
   skips the masthead lands on it). The other sections are what they were:
   any holding an unlocking step opens (critique #4), the rest collapsed.
4. **The strip stays.** *0 OPEN · N NOT YET* is the count, and the count is
   right; it stays under the headline as it does on the direct path.
5. **Every other four-country result is unchanged.** Something open
   anywhere: the open headline, and the named country's line does the
   saying (s21 stands). Nothing open and the named country's routes *do*
   take the situation (an offer in Germany, nothing met): *Nothing open yet
   — N steps would change that.* as today, sections in dataset order. No
   country named (an explorer, `none`): as today.
6. **Nothing else changes.** The record, the counts, the cards, the route
   pages (the fingerprint does not move). s19's and s21's tests stay green.

**Corrected 2026-09-17, by the build:** point 6's "s21's tests stay green"
cannot hold as written — s21's browser case walks the exact walk points 1
and 3 rewrite (*Any of these four* → research → France → nothing open) and
pinned what they change. Four of its assertions moved: the headline
(*Nothing open on these answers.*) and the section order (Germany first) now
read s26's state on that walk (France's written state; France first); the
pin on the live region (`cstatus`, the same sentence) and the negative
(`not.toContain("No scored route")`) are dropped there — the first lives on
in s26's case, which pins `cstatus` to France's state; the second is
inverted there (`not.toContain("Nothing open")`, and the opening walk keeps
the original negative). The seeds, the taps and s21's own decisions — the
mark at question 3, the sentence with its link on France's line, the other
three lines, the not-yet body — are untouched, and s19's tests are green as
they were. Two small shapes the points implied but did not name: the
four-country verdict carries `lead`, the named country's answer, and one
function (`leadCountry`) holds the decision "zero open → written state →
lead; otherwise none", read by the page and by the test, with one predicate
(`leads`) for the order and the section's open state; and the copy's
`possessive` is exported, so the proof that the rest sentences "differ only
by the country's name" reads the one rule the route line already uses
rather than typing its own. On point 5 and point 3's second sentence: the
review found them proved by reading only; three seeded screens now measure
them — the explorer (`none`, nobody named) and the offer in Germany keep the
dataset's order with the steps-holding sections open, and a researcher with
a recognised degree, the funds and no German reads France first and open
beside a Germany open on its language steps (the profile exists on this
dataset; no unreachable branch to pin). The two walks run with the network
watched and make the record test's own assertion — the privacy walk clicks
the first option everywhere and never reaches question 3 (Security).

## How it is proved

- A unit case: for every (situation × country) pair `situationsAsked` marks,
  the four-country answers (`all` + that `situation_country`) and the direct
  answers produce the same headline and the same route line; and the rest
  sentence differs only by the country's name.
- A unit case on the section order: the named country first and open; and
  with something open anywhere, dataset order as before.
- A browser walk at 390×844 and 1280×900: *Any of these four* → research →
  France → the critique's answers to a zero-open result; the headline is
  France's written state, the door goes to `/france/talent-researcher/`,
  France's section is first and open, Germany's line unchanged. Then the
  same walk with an answer that opens a German route: the open headline,
  France's line does the saying.
- The human's walk on the preview: the four-country researcher, both ways.

## What this slice is not

It is not a change to the direct path's screen, not a redesign of the
country sections, and not the four-country case where every country is
closed to the situation (unreachable on this dataset; s21 pins it).
