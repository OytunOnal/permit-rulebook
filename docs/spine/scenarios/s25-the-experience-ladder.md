# s25 — the experience ladder is two questions

**Status:** approved 2026-09-17 (human: "approve"). v1.1 critique F2
(third run: F19 before it); the human chose "one axis" (*"1"*) of three ways.

## What happened

One question, *"Skilled work experience related to your qualification, in
years?"*, offers four answers — *under 2* · *2+ within the last 5* · *3+
within the last 7* · *5+ within the last 7* — and the engine reads
`y3in7 ⇒ y2in5` (an `implies` added in s5f so a three-year answerer would
not score 0 on the Opportunity Card). The implication is false: three years
inside the last seven can lie entirely six-to-seven years ago. So a reader
who answers *3+ within the last 7* is told **Experienced worker (§ 6
BeschV) is met** — its own quoted rule is *"innerhalb der letzten fünf
Jahren … mindestens zweijährige einschlägige Berufserfahrung"* — and is
paid the Opportunity Card's two points for § 20b Abs. 1 Nr. 7 (*"in den
letzten fünf Jahren mindestens zwei Jahre"*). Meanwhile a second field,
`experience_7y` (*3+ within the last 7?*, yes/no), exists for the Dutch
Blue Card's IT rule alone. Two fields, four rungs, one false implication.

**What the sources actually ask**, read 2026-09-17:

| rule | sentence | asks |
|---|---|---|
| § 6 BeschV (DE experienced worker) | *innerhalb der letzten fünf Jahren mindestens zweijährige* | 2 in the last 5 |
| § 20b Abs. 1 Nr. 7 (DE Opportunity Card, 2 pts) | *in den letzten fünf Jahren mindestens zwei Jahre … und keine Punkte nach Nummer 6* | 2 in the last 5 |
| § 20b Abs. 1 Nr. 6 (DE Opportunity Card, 3 pts) | *in den letzten sieben Jahren mindestens fünf Jahre* | 5 in the last 7 |
| Ley 14/2013 art. 71.2 / 73.2.b (ES highly qualified, ICT) | *al menos tres años* | 3, no window |
| Ley 14/2013 art. 71 bis.2 (ES Blue Card) | *un mínimo de cinco años* | 5, no window |
| IND (NL Blue Card, IT) | *3 years … during the period of 7 years before the application* | 3 in the last 7 |
| FR Blue Card | `eq y5in7` | 5 (window: the builder reads the fiche) |

Two facts, not one: **how much related experience in the last five
years** (Germany's window) and **how much in the last seven** (the Dutch
window; Spain's "at least N" with no window is read as "in the last seven"
being a lower bound the reader can honestly answer — the builder records
whether Spain's law names any window; if it does not, the seven-year
answer is a floor and the scenario says so on the card).

## What must be true

1. **Two questions replace `experience` and `experience_7y`:**
   - `experience_5y` — *"Related skilled work experience in the last five
     years?"* — *under 2 years* · *2 years or more*.
   - `experience_7y` — *"And in the last seven years?"* — *under 3 years* ·
     *3 to under 5* · *5 years or more*. The existing yes/no field is
     replaced by this three-rung one (same id, new options; a record
     carrying the old `yes`/`no` is dropped by `restore` as an unknown
     value, the way any retired option is).
   Both `improvable`, asked in that order, right after `recognition_de`
   where `experience` sits today. **No `implies` on either.**
2. **Every rule reads the rung it names**, from the table above: § 6 BeschV
   and Nr. 7 read `experience_5y = 2plus`; Nr. 6 reads `experience_7y =
   5plus` (3 pts) and Nr. 7 is `experience_5y = 2plus` (2 pts) — the points
   item keys on two fields, and the engine's "best row" rule already pays
   the higher; Spain's three-year rules read `experience_7y ∈ {3to5,
   5plus}`; the Spanish and Dutch and French Blue Cards' five-year rules
   read `experience_7y = 5plus`; the Dutch IT rule reads `experience_7y ∈
   {3to5, 5plus}`. Each rule keeps its quote and date; the change is which
   field and which values, and a `history` line on each says why
   (2026-09-17, F2).
3. **A profile that is 3 in the last 7 but not 2 in the last 5** — the
   critique's case — gets Experienced worker *not yet* and 0 experience
   points on the Opportunity Card; a profile that is 2 in the last 5 gets
   *met* and 2 points; 5 in the last 7 gets 3 points, not 5. The
   contradiction detector (`experience_5y = 2plus` with `experience_7y =
   under 3` cannot both be true — two years inside five is at least two
   inside seven) reports the pair the way it reports the others.
4. **The site follows the fields.** The interview asks the two questions
   from the dataset as it asks every other; the *You declared* rows, the
   unlock steps (the ladder fold from s23 applies to `experience_7y`, whose
   rules read tails), the not-yet reasons and the route pages' condition
   lines all derive; no `y3in7`/`y2in5` literal exists anywhere in the site
   (assert). Records from before this slice lose their experience answers
   and are asked again — the resumed line (s20) says how many answers are
   kept; the scenario accepts this cost once.
5. **Schema:** if the field shape allows it, nothing changes; if a
   two-field points item needs a schema word, 0.8.x with the reason.
6. **Nothing else changes.** The other fields, the verdict logic, the
   copy.

**Corrected 2026-09-17, by the data build:** (3) the "contradiction" —
`experience_5y = 2plus` with `experience_7y = lt3` — is not one: a reader
with two and a half years of related work, all inside the last five,
answers *2 years or more* and *under 3 years* and is right. The scenario's
sentence ("two inside five is at least two inside seven") is true and
proves nothing about "under three"; with these rungs no pairing is
impossible. The pair is dropped; nothing replaces it. (2) The Opportunity
Card's two experience rows key on two fields and the reader gets the best
row, never the sum — that needed a schema word: 0.8.1, a points item as
`rows: [{field, value, points}]`. The FR Blue Card fiche names no window
for its five years (the seven-year window belongs to the listed-professions
reduction, a reading); Spain names none either — recorded as a reading on
four routes, which the scope line counts, so those four lines gain *"1
condition in our own words"*: a consequence of saying so, accepted. Found
on the way and corrected with its history line: `es-blue-card` cited art.
71 bis.2 for a sentence that lives in art. 71.2 a). None of the history
enum's reasons names a re-keyed rule; `re-read-unchanged` with a note
carries it — a `rule-rekeyed` reason is a candidate for the schema.

**Corrected 2026-09-17, by the site build:** (1) "dropped by `restore` as an
unknown value, the way any retired option is" described behaviour the site
did not have — `restore` knew field ids, not their options, so a retired
value would have sat on the ledger unscored and never been re-asked; built
in this slice (`AskedField`: the record keeps only answers the interview
can still take). (proof) The walk "recognised … and the tally +2" cannot
both be true: a recognised qualification takes the Opportunity Card's
direct path and scores no points; the walks answer *not yet* on
recognition. A zero-point row is absent from the tally, not printed as +0.
Six browser seeds carried `citizenship: "third_country"` — a class, not an
answer — and the stricter restore drops it; they answer *IN* now.

**Corrected 2026-09-17, by the reviews:** Spec met on both halves, verified
by running the engine. Standards found two breaches in the data half, both
inside the 0.8.1 bump: (1) a re-keyed rule's history line said
`re-read-unchanged` while its note said no re-read happened — the machine
field lied and the note confessed, and the test pinned the note's prose.
The enum gains `rule-rekeyed` and `citation-corrected`; the test counts
reasons, never words. (2) The four "floor" readings were named to the reader
but not listed in `scope.not_asked` — the twin CONTRIBUTING makes the
sentence checkable by; added, with the four `reason` lines revised. On the
site: `AskedField` derives from the package's `Question`; the test seeds
use one mapping.

## How it is proved

- Data: a test per row of the table — the rule reads the field and values
  named; no option in the dataset carries `implies` on either field; the
  critique's profile and its two neighbours give the verdicts in point 3.
- Site: the two questions render in order with their options; a browser
  walk answers *2 or more* / *3 to under 5* and reads Experienced worker
  met with the § 6 BeschV quote and the Opportunity Card at +2; then *under
  2* / *3 to under 5* and reads not yet and +0; no literal of the old values
  in `src/`.
- The human's walk on the preview: the two questions, a result each way.

## What this slice is not

It is not a change to what any authority is quoted as saying, and not a
change to the salary or qualification ladders.
