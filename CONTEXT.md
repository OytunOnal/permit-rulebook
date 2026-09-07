# Visa Navigator

The domain of deterministic work-permit eligibility: a person declares facts
about themselves, code compares them against sourced official rules, and the
result explains what fits, what is close, and which step would change that.

## Language

### Rules and values

**Route**:
One work/residence permit category of one country (e.g. "EU Blue Card —
shortage occupation"), with its published criteria.
_Avoid_: visa (colloquial), program, pathway

**Criterion**:
A single testable requirement of a route. A route is the AND of its criteria;
a disjunction ("Fachkraft OR points") is itself one criterion with paths.
_Avoid_: rule, condition, requirement

**Threshold**:
An official numeric minimum (salary, monthly funds, points), always carried
with its provenance.
_Avoid_: limit, cutoff

**Provenance**:
What every value must carry to exist: official source URL, verbatim quote,
retrieval date, and an append-only history of prior values. One declared
exception: **Unsourced**.
_Avoid_: citation, reference, metadata

**Route statement**:
Something a source says about one route that no criterion can compute, carried
in the source's own words — either a Precondition that ships with its quote, or
a Caveat. Watched and quote-checked like every other value.
_Avoid_: note, editorial, prose, footnote, condition

**Caveat**:
A qualification a source puts on its own answer, shown beside the verdict and
never scored — it fails nobody. Several say the reader may qualify for *less*,
which is why a caveat never appears under "Also required — not checked here".
_Avoid_: precondition, requirement, warning, disclaimer, fine print

**Unsourced**:
The one declared exception to Provenance: a Route statement carrying no
verbatim quote, because the source does not publish one we can read. Recorded
as an enumerated reason — `scanned-image`, `not-published-in-words`,
`unreachable` — plus the date we last looked, never as prose, which would make
the gate optional by writing. The card says in the open that it has no quote
and why; a neighbouring quote is never borrowed to cover it.
_Avoid_: undocumented, unverified, missing source, TODO, "no source found"

**Deciding path**:
The single path of a disjunction an outcome actually rested on — the one that
passed, or, where none did, the nearest reachable one the gap was measured to.
It names the threshold the reader was measured against, and other paths are
marked as not theirs. **Where nothing has decided, no path is claimed and
nothing is marked either way** — a card that has decided nothing marks nothing.
_Avoid_: matched path, winning branch, chosen path, first path

**Route reading**:
Our own reading of a route — what we did or did not model, and why — shown on
the card as "Our reading, not the authority's words" and never scored. It is
the second declared exception to Provenance, and it lives in its own place
(`Route.readings`), not inside Route statement, because a statement is the
source's words and a reading is ours. The type system says what this entry
says.
_Avoid_: modelling, note, editorial, commentary, statement

**Renderable kind**:
The declared kind of every string the dataset can put in front of a person:
**authority** (the source's words — must carry a covering quote or a declared
absence), **ours** (a Route reading), or **label** (a route name, an option, a
ledger heading). The provenance gate reads this declaration. A quotation mark
is evidence, never the key: a check that keys on a surface feature is passed by
editing the feature.
_Avoid_: text type, string class, prose category

**Prose provenance**:
The measurement `npm run check` prints for sentences, beside the one it prints
for numbers: how many carry a covering source, how many are declared ours, how
many are declared unsourced with a reason, how many sit on the human tier. A
number a person reads, not a test that passes.
_Avoid_: coverage, completeness

**Still reachable**:
A criterion result that did not fail, or failed only by a Bounded gap. The
single predicate behind route status, hard fail and question selection — it was
once spelled four different ways, and the spellings drifted.
_Avoid_: alive, open, possible, not-yet-failed

**Points ladder**:
A criterion scored across several declared items against a required total
(the Chancenkarte model). It can be satisfied early but is never failed until
every item is answered.
_Avoid_: score, quiz

### The person's side

**Declaration**:
A self-stated answer. The tool compares declarations with published values —
it never verifies them and never decides anything.
_Avoid_: input, profile data, claim

**Band**:
An answer range for a numeric question whose edges are exactly the published
thresholds, so an answer can never straddle a decision boundary.
_Avoid_: bracket, range

**Open unknown**:
An explicit "I don't know" declaration. It is an open gap, not a no: it never
fails a route, and it points to a learn source.
_Avoid_: missing answer, null

**Learn source**:
The official place where an open unknown can be resolved by the person
themselves (e.g. the Anabin database for degree recognition).
_Avoid_: help link, reference link

### Verdicts

**Met** (UI: "criteria met"):
Every criterion of the route passes on the declarations given.

**Within reach**:
The route misses only by bounded gaps — a known maximum distance ("up to
€4,766", "2 points short").
_Avoid_: almost, partial match

**Not yet**:
The route has a hard fail or an open unknown.
_Avoid_: rejected, ineligible, closed

**Bounded gap**:
A shortfall with a known ceiling (adjacent band below a threshold, points
short on a completed ladder). Bounded gaps keep the interview going and
become the gap story, never a death sentence.
_Avoid_: soft fail, near miss

**Hard fail**:
A definitive miss on a fixed attribute or a path choice. Only hard fails
retire a route (and with it, its remaining questions). Carried on every
result, it also decides what the screen may still promise: on a hard-failed
route an unknown is moot, so no learn box offers to resolve it.
_Avoid_: rejection, disqualification

**Live unknown**:
An unknown the person can still act on — one they answered "I don't know" on
a route that has not hard-failed. Only live unknowns are counted, auto-opened
and offered a learn box.
_Avoid_: open question, missing answer

**Notice**:
A dataset-level, provenanced statement that answers a person no route can
answer ("no work permit needed" for an EU passport). It sits beside routes,
carries quote + source + date like any value, and is watched like one.
_Avoid_: banner, message, info box

**Precondition**:
A plain-language condition the authority applies that the interview never
asks (a recognised sponsor, market-rate pay, a professional registration).
Shown on the card as "Also required — not checked here", never scored — so
"criteria met" cannot overpromise.
_Avoid_: extra requirement, fine print

**Short reason**:
How a criterion names itself in a verdict line ("age — for 30 or older"), so
a bare field name does not read as a verdict on the person.

**Moot criterion**:
A "failure" caused by having more than the route wants — the Opportunity Card
wants no offer yet and the person has one. Reads as "not needed with a job
offer", never as a miss.
_Avoid_: irrelevant, N/A

**Step-gated row**:
A not-yet route whose only genuine failure is a path step. These collapse
into one group naming the steps the group actually asks for.

### Change and leverage

**Field kind — attribute / path / improvable**:
attribute: a fixed fact (age, citizenship) — never counterfactualed.
path: a step one takes (job offer, transfer, hosting agreement).
improvable: closable through effort or time (language, funds, experience,
recognition).
_Avoid_: mutable/immutable, editable

**Leverage step** (UI: "steps that would unlock more"):
A provable single-step counterfactual: re-evaluating the declarations with
one path/improvable answer changed, and reporting only routes that verifiably
turn met or within reach. Nothing resting on unanswered questions is ever
promised.
_Avoid_: suggestion, tip, recommendation (unqualified)

### Source watch

**Watchlist**:
The declared set of monitored official sources; coverage against the dataset
is enforced both ways, not promised.

**Value source**:
A watched page/document that backs specific dataset values.

**Sentinel**:
A watched signal that backs no value directly (an edition index, an
official-recheck reminder) but announces that values may have moved.
_Avoid_: extra source, misc

**Human tier**:
A source machines cannot or should not read (bot-walled statute site,
glyph-encoded PDF); it carries a verification age and raises reminders
instead of being fetched.
_Avoid_: manual source

**Flag**:
The artifact a detected change or due reminder produces — named source,
hashes, quoted context; a human turns it into a dataset update.
_Avoid_: alert, notification

**Baseline**:
The first recorded snapshot of a source, against which change is measured.
