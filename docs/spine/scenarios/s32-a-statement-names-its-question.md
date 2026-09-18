# s32 — a statement names the question that asks it

**Status:** approved 2026-09-18 (human: "onaylıyorum"). v1.2 fix from s19's correction (6)/(7):
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

**Corrected 2026-09-18, by the build:** (1) There is no changelog: 0.8.1's
reason is written in the schema's own `description` of what it added (the
`textHistoryEntry`, the two reasons, the table's `history`), so 0.8.2's is the
`description` of `field` on `routeStatement`, with the comment on the type
beside it. The schema holds the id's shape (`fieldDef.id`'s own pattern) and
the validator the rest: `knownStatementField` (an id the dataset does not
declare) and `statementFieldNotRead` (a field no criterion of the route
reads, read through `referencedFields`), each naming the route and the
statement. The contract had no sentence for it — `CONTRIBUTING.md` step 4
said a precondition is what "no question can reach" — so the step gained
one. (2) `askedByCriterion` keeps its signature with the route unread: the
field is held to its route by the validator, so "the same statement on a
different route" is no longer a case the data can produce, and the s19 data
test's assertion of it is retired with the key. The s19 check the other way
(a fielded statement named in `not_asked`) stays, renamed from
`notAskedButQuotedByCriterion` to `notAskedButAsked`; the new cross-check is
`quotedByCriterionUndecided`. Containment is not read by either — the
scenario's own count (wrong twice in three) is the reason. (3) `not_asked`
does not derive: s19 left it authored and validated (the contract's "authored,
not derived"), so de-researcher's list is emptied by hand, its value moves to
`every-deciding-rule-asked` and its `reason` is rewritten in the form s19 gave
es-researcher's; `data/exclusions.md` records no German route but the
self-employment one and is unmoved. Versions: schema `0.8.2`, dataset
`2026.09.18` (the same-day convention, first change of the day), newest read
date `2026-09-17` unchanged — every quote keeps its day. (4) The two tenures
do not *return* to *not checked here*: they never left it. s19's rule was
verbatim only, containment never matched, and on master both already read
under that heading; what moves on the cards is de-researcher's hosting
agreement alone (into the asked block, and its scope line to *scored against
your answers*). No fingerprint moves: `tests/fixtures/root-build.json` is over
the frozen two-route dataset (`de-blue-card-general`, `de-skilled-academic`),
and none of the three routes is in it — de-researcher's own page does move
(its scope line and its `reason`), and it is not fingerprinted; `/data/`'s
fixture is over the same frozen dataset. Neither regenerated. (As first
written this sentence pointed at `askedFieldOf`, which the route page does not
read — corrected at the review, 2026-09-18.)

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
