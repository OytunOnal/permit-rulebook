# s32 — a statement names the question that asks it

**Status:** proposed 2026-09-18. v1.2 fix from s19's correction (6)/(7):
"a `field` on precondition statements is the cleaner derivation".

## What happened

A route card's *Also required — not checked here* block lists the
authority's preconditions. s19 split off the ones the interview *does*
ask into *Asked in the interview — you declared "…"*, deriving "asked"
from a shared sentence: a statement whose quote a criterion of the same
route also quotes, verbatim (`askedByCriterion`, and the site's
`askedFieldOf` for the declared answer). Eight statements on seven routes
match that way. Three more share a sentence by *containment* (the
statement's quote sits inside a criterion's longer quote) and are not
caught — read 2026-09-18:

- `de-researcher` · hosting agreement with a research facility — the
  situation question's *research* answer **is** a hosting agreement: asked.
- `de-ict-card` · six months with the company before the transfer — the
  situation question asks *a transfer*, not the tenure: **not** asked.
- `fr-ict` · six months with the group already — likewise **not** asked.

So containment would have been wrong twice out of three; the sentence is
the wrong key. What decides "asked" is a curator's judgment of which
question covers the statement — a typed field.

## What must be true

1. **`field` on a statement.** `routeStatement` gains an optional `field`
   (a field id the dataset declares): the interview question whose answer
   covers this precondition. Schema **0.8.2** with the reason; the key is
   validated against the dataset's fields, and a `field` that no criterion
   of the same route reads is a validation error (the statement would claim
   an asking the route never does).
2. **"Asked" is the field, not the sentence.** `askedByCriterion(route,
   statement)` returns true iff the statement carries a `field`. The
   shared-sentence rule retires. The validator keeps its cross-check in the
   other direction, as a decision: a statement whose quote a criterion of
   the route quotes verbatim must either carry `field` or be listed in
   `scope.not_asked` — a curator's sentence, not a blank.
3. **The eleven decided.** The eight verbatim matches carry the field they
   matched on today (`situation` seven times, `fr_innovative_employer`
   once); `de-researcher`'s hosting agreement carries `situation`; the two
   tenure statements carry none and stay in *not checked here*. Each move
   is a data change on the day; `scope.not_asked` derives as s19 left it.
4. **The site reads the field.** `askedFieldOf` returns the statement's
   `field` when the reader has declared it (`isDeclared`), else null — no
   quote comparison. The *Asked in the interview* block, the *you declared*
   text and the scope line follow; the two tenure statements return to the
   *not checked here* list on `de-ict-card` and `fr-ict`; `de-researcher`'s
   hosting agreement moves into the asked block. The route fingerprint
   moves for those routes and regenerates with the reason.
5. **Nothing else changes.** Verdicts, counts, the record, the other
   routes' cards.

## How it is proved

- Data: the validator rejects a `field` the dataset does not declare and a
  `field` no criterion of the route reads; a test per decided statement
  (the eleven) that `askedByCriterion` reads the field; the verbatim
  cross-check green on the dataset.
- Site: a unit case per route card among the three changed: the asked
  block and the not-checked list as point 4 says; a browser walk on
  `de-ict-card` (a transferee) reads the tenure under *not checked here*.
- The human's read of one card each way on the local build.

## What this slice is not

It is not a change to what any statement says or quotes, not a new
question, and not the scope line's words.
