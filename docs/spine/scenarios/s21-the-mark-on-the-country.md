# s21 — the mark on the country, and on the four-country result

**Status:** approved 2026-09-16 (human: "ikisi de şimdi"). v1.1 re-score N1.

## What happened

s19 marked question 2's situation option for a reader who had already
chosen one country. The same researcher on the *"Any of these four"* path
answers *research* at question 2 (nothing to mark — every situation has a
scored route somewhere), then *France* at question 3, and the mark is not
there: thirteen questions later the four-country result says *"Nothing open
on these answers"* and France's line says *5 not yet*. B1's cost, sixteen
answers in.

## What must be true

1. **Question 3 marks a country the declared situation cannot use.** On the
   four-country path, when the situation is declared, the country question
   (`situation_country`) renders the s19 mark under each country option
   whose scored routes do not take that situation — the same derivation
   (`situationsAsked`), the same words (*Not scored for France yet — Talent
   — researcher (chercheur) is quoted, not scored: read it here.*), the same
   `copy.ts` function, no second copy. Countries that take it: no mark.
2. **The four-country result says it in France's line.** When the declared
   situation is one the country's scored routes do not take, that country's
   summary line in the multi-country result carries the s19 sentence in
   place of *N not yet*: *No scored route in France takes a research hosting
   agreement — Talent — researcher (chercheur) is quoted, not scored.* with
   the route name the link. The section's body stays (the not-yet cards).
   Other countries' lines unchanged.
3. **The headline on that path.** If every country is closed to the
   situation the headline is s19's written state; if some are open (the
   common case — Germany, Spain and the Netherlands take research), the
   existing headline stands and the France line does the saying. No new
   headline shape.
4. **Two polish items from the re-score, while here:** the mark is
   announced — `aria-describedby` from the option to its mark — and *read it
   here* loses the external glyph (it is an internal link; the `out` class
   or its arrow is the culprit).
5. **Nothing else changes**; s19's tests stay green; the fingerprint does
   not move (route pages untouched).

## How it is proved

- A browser walk: *Any of these four* → research → question 3 shows the
  mark under France only, with the link; the walk continues to the result
  and France's line carries the sentence; Germany's line does not.
- A unit case over every (situation × country) pair: the mark appears
  exactly where `situationsAsked` says.
- The mark's `aria-describedby` resolves; no `out` on the mark's link.
- The human's walk, or the session's at their ask.

## What this slice is not

It is not a change to the one-country path (s19), and not the finished-record
arrival (s22).
