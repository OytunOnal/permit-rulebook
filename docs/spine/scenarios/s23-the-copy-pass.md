# s23 — the copy pass

**Status:** approved 2026-09-17 (human: "onaylıyorum"). v1.1 gate
critique adjustment 3 (F1, F3, F4, P1, P2, P3, P4, P5, P6, P7), deferred on
2026-09-16 (*"3 sonra"*), taken 2026-09-17 (*"1 ile başlayalım"*).

## What happened

The v1.1 walk read every user-facing string away from the screen and found
sentences that contradict the reader, name what they cannot see, repeat
themselves, or speak the model's language. None blocks; together they are
the reason Copy & framing has sat at 3/5 across three critiques.

## What must be true

Each item names the screen, the string as it is, and the rule that replaces
it. Every new word lives in `copy.ts`; no string is typed into a template.

1. **F1a — the job-search sentence only to a reader without an offer.**
   *"Your job-search permit above is exactly for this — lawful time in the
   country to land that offer."* renders only when the declared situation is
   `none`; an offer-holder, a transferee and a researcher never see it.
2. **F1b — unlock steps ordered by what the reader can do.** The step groups
   under *Steps that would unlock more* are ordered so that steps requiring
   a different situation than the one declared (a transfer to an
   offer-holder; a hosting agreement to a transferee) come **after** steps
   within the reader's own situation (recognition, language, experience).
   Derived from each step's field: a step whose field is `situation` ranks
   last. The hero's *Nearest:* obeys the same order — it names the first
   step the reader can take, never a situation they did not declare.
3. **F3 — the route page's liveness line names the source or stays silent.**
   Today every route page prints *"a daily check re-reads every source; the
   last run did not reach one of them"* whenever any source anywhere was
   unread. It becomes: when one of **this route's own** sources is in the
   unread list → *"…the last run did not reach one of this route's sources;
   its values still show the day they were read."*; otherwise → the plain
   line *"a daily check re-reads every source."* with no exception. The
   derivation is s11's `unreadSourcesAt` filtered by the route's `source_url`
   set; no country names in the sentence.
4. **F4 — the not-yet Opportunity Card prints its tally.** The card renders
   *"N points — 6 needed"* in the not-yet state exactly as the open card
   does, from the same scorer; and the unlock list collapses the CEFR rungs
   (A2 / B1 / B2) into one step, *"German at A2 or above"*, the way the
   salary ladder was collapsed in v1 — derived from the field being an
   ordered enum, not from a list of fields.
5. **P1 — the statute explainer once, and the same on every render.** The
   heading's parenthesis explains a section sign the first time it is used
   on the page and never again; the explainer is a function of the page,
   not of the card that happens to render first. *"(§ 20a, section 20a)"*
   never appears — the explainer is *"§ = section"* once, or the word
   *section* once, whichever the current copy uses; the builder reads the
   rule and keeps it.
6. **P2 — a rule with two limbs is one sentence.** *"2+ years of related
   experience or 5+ years of related experience"* becomes *"2+ or 5+ years of
   related experience"* (the shared noun phrase factored once) wherever the
   condition line, the heading and the not-yet line render an `in` criterion
   whose options share a tail; and *"Either of these answers this rule:"*
   becomes *"Any of these:"*.
7. **P3 — the curator's note leaves the card.** *"(consolidated mirror —
   gesetze-im-internet.de times out from here)"* is the source's note in the
   dataset; the card prints the source's name and nothing in parentheses
   that is about us. The note stays in the data.
8. **P4 — modelling vocabulary on the scope line.** *"scored, two conditions
   stated but not asked"* → *"scored — 2 conditions this interview did not
   ask"*; *"one in our own reading"* → *"1 condition in our own words, not
   the authority's"*; *"scored against your answers"* stays (it is a
   reader's sentence). *"0 standing on a dated reason"* on `/data/` → *"0
   kept on a dated reason"* or dropped when 0 — the builder proposes one, the
   scenario prefers dropping the zero.
9. **P5 — the stray full stop** after the Anabin link on a phone is a markup
   fault (the period outside the link's tap padding wraps alone); the period
   goes inside the link's line box or goes.
10. **P6 — "A few quick questions." meets the counter.** The subtitle stays;
    the counter's denominator reads *"of about N"* — the word *about* is the
    honest one for a number that moves — or the counter drops the
    denominator until it is stable (after question 2). The scenario prefers
    *about*.
11. **P7 — the Türkiye notice names no route.** The clause *"— the Dutch
    orientation year is one."* goes (human, 2026-09-17: *"kaldır"*): the
    notice's body in the dataset ends at *"…that route's card says so."*
    A reader who reaches such a card sees it there; a Germany-only reader
    is no longer sent to a card that is not on their screen. A data change
    (the notice's `body`), with its history line; no conditional
    mechanism.
12. **Nothing else.** Verdicts, counts, the record, the arrivals. The route
    fingerprint moves (P1, P2, P3, P4, F3 touch route pages) and regenerates
    with the reasons; `/data/` likewise for P4's zero.

## How it is proved

- For each item, a unit case over the rendered string: the offer-holder's
  result has no job-search sentence and the explorer's does; the step order
  for an offer-holder puts `situation` steps last; a route page with an
  unread own-source names it and one without prints the plain line; the
  not-yet Opportunity Card carries *"5 points — 6 needed"*; no page carries
  *"section 20a"* twice or *"(§ 20a, section 20a)"*; no condition line
  repeats its tail; no card carries *"times out"*; the scope line's words;
  the Anabin period; the counter's *about*; the Türkiye notice on a Germany-
  only result.
- A prose pass by the session on the built pages: every user-facing string
  collected and read once, as the critique does.
- The human's read of one result, one route page and `/data/` on the
  preview.

## What this slice is not

It is not F2 (the experience ladder — an engine judgment, its own scenario),
not the four-country headline's hierarchy, and not a redesign of any card.
