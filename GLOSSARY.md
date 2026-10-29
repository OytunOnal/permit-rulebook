# Permit Rulebook (working name Visa Navigator until the release gate, 2026-09-07)

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
_Avoid_ (in code, tests and these ledgers): rule, condition, requirement.
**In front of a reader the word is "condition"** (a rule card's kind label,
"some conditions stated, not asked"): the avoid-list guards the engineering
vocabulary, and "criterion" itself is on the reader-facing avoid-list. One
concept, two registers, both declared (s6, 2026-09-07).

**Threshold**:
An official numeric minimum (salary, monthly funds, points), always carried
with its provenance.
_Avoid_: limit, cutoff

**Provenance**:
What every value must carry to exist: official source URL, verbatim quote,
retrieval date, and an append-only history of prior values. One declared
exception: **Unsourced**.
_Avoid_: citation, reference, metadata

**Reading history** (dataset: `history[]` on a value):
The append-only record of what a value was and when it was read. Since
2026-09-08 each entry carries a declared **reason** — `re-read-unchanged`,
`value-changed`, `source-moved`, `quote-corrected` — and the date it was
checked; prose is optional and never the gate. A re-read that found the same
value is recorded like a change, so "read 2026-09-08" on a page is earned.
_Avoid_: note (as the record), log, changelog

**Route statement**:
Something a source says about one route that no criterion can compute, carried
in the source's own words — either a Precondition that ships with its quote, or
a Caveat. Watched and quote-checked like every other value.
_Avoid_ (in code and ledgers): note, editorial, prose, footnote, condition —
the reader sees "condition" for a Precondition, by the same register rule as
Criterion.

**Caveat**:
A qualification a source puts on its own answer, shown beside the verdict and
never scored — it fails nobody. Several say the reader may qualify for *less*,
which is why a caveat never appears under "Also required — not checked here".
_Avoid_: precondition, requirement, warning, disclaimer, fine print

**Carve-out**:
The passports a Route statement does not bind, in the authority's own words —
the IND releases Turkish employees from the recognised-sponsor rule, and ten
nationalities from the provisional residence permit. It keys only on the
passport the interview asks for, and it carries its own quote and date: a
carve-out we cannot quote is one we do not ship, so it has no Unsourced form.
A reader whose passport it names is not told the condition it releases them
from; the carve-out's sentence stands in its place ("Not required for your
passport"). A page with no reader shows both, under "Who this does not bind".
_Avoid_: exception, exemption, waiver, override — and "except" outside the
field name that carries it.

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
passed, or, where none did, the nearest reachable one the gap was measured to,
or, where no gap was measured, the Open path with the fewest unmet rules (ties
go to the order the paths are written in; #133). It names the threshold the
reader was measured against, and other paths are marked as not theirs. **Where nothing has decided, no path is claimed and
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

**Consolidated text**:
A page that reproduces the authority's words without being the authority — a
statute on buzer.de. A quote may come from one when the authority's own page
cannot be read, and its link says so ("Consolidated text on buzer.de"), never
"Official page" (#92, 2026-10-21).
_Avoid_: mirror (in front of a reader), unofficial source

**Prose provenance**:
The measurement `npm run check` prints for sentences, beside the one it prints
for numbers: how many carry a covering source, how many are declared ours, how
many are declared unsourced with a reason, how many sit on the human tier. A
number a person reads, not a test that passes.
_Avoid_: coverage, completeness

**Pdf-text**:
The watch strategy that decodes a PDF's embedded-font text layer and decides
change on the words, keeping the file's own hash beside them — so a re-typeset
document that says the same sentences reports `unchanged`.
_Avoid_: pdf parsing, text extraction, OCR

**Scanned-image**:
The one word for a document published as a picture of a page with no text layer
to read: an enumerated Unsourced reason on a statement, and the same word a
Pdf-text snapshot records when the decoder finds no words. A text strategy may
never answer anything else about such a document, and never `verified`.
_Avoid_: no text layer, scan, image-only PDF, OCR needed

**Known glyph substitution**:
A declared, dated correction on a watch entry, naming where our decoder's
reading of one source disagrees with the document a person holds. Bounded to
one glyph run for another of the same length with no whitespace, so it can only
fix a confusion and never write content. Applied to the snapshot for the quote
comparison only, never to what the dataset ships.
_Avoid_: fixup, patch, normalisation, cleanup

**Bytes hash**:
A Pdf-text snapshot's hash of the file itself, kept beside the hash of its
words. The words are what a change means; the bytes are what a re-export moves.
Keeping both lets the watch stay quiet about the second and loud about the
first.
_Avoid_: file hash, checksum, digest (unqualified)

**experience_5y** (UI: "Related skilled work experience in the last five years?"):
One of the two experience questions, since s25 (2026-09-17). Two rungs —
under 2 years, 2 years or more — the window Germany asks (§ 6 BeschV; the
Opportunity Card's § 20b Abs. 1 Nr. 7). No option implies another.
_Avoid_: the experience ladder, y2in5, "2+ within the last 5"

**experience_7y** (UI: "Related skilled work experience in the last seven years?"):
The other experience question. Three rungs — under 3, 3 to under 5, 5 or
more — the window the IND asks, and the German Blue Card's IT path (three
years in the last seven, no degree; #77); Spain and France name no window for their
three and five years, so this answer is a floor there (a reading on those
routes). The Opportunity Card's Nr. 6 reads its top rung; a points item
that reads both questions pays the best row, never the sum.
_Avoid_: y3in7, y5in7, "3+ within the last 7", the yes/no question it replaced, "And in the last seven years?" (its wording until #77: the "And" leaned on a question not always asked)

**retired: y3in7 and the implies list.** One question with four rungs and
`y3in7 ⇒ y2in5` read § 6 BeschV's "two in the last five" as met for a
reader whose three years lay six-to-seven years ago; caught by three
critiques, split into the two questions above in s25.

**Scope statement** (UI: "What the checker asks, and what it does not"):
A route's declared fact about how much of it the interview decides, in one of
three values, shown to the reader as what they get — "quoted and dated ·
checked against your answers" · "quoted and dated · checked against your
answers, except N conditions we don't ask about" · "quoted and dated · not
checked against your answers" — and, where unasked limbs are Route readings
rather than the source's words, "… except N conditions we don't ask about —
M of them in our own words, not the authority's", or, where every one of them
is, "… except N conditions we don't ask about, in our own words, not the
authority's" (never "we note") — plus the
limbs it does not ask, named. That is the results card, where the reader has
answered; a page with no answers says what the checker asks instead — "quoted
and dated · the checker asks about all of it" · "… the checker asks about it,
except N conditions" · "… the checker does not ask about it". "Checked" is the
reader's verb, as in "Also required — not checked here"; the model's "scored"
stays in code and on `/data/` (#92, 2026-10-21; earlier wordings "some
conditions stated, not asked", amended 2026-09-08, and "scored, N conditions
this interview did not ask"). Authored by a person, never derived by a test; schema-required; rendered on the route
page and the results card. Called `scope` in the dataset, because "coverage"
already names the watch's both-way check and sits on Prose provenance's
avoid-list (Standards review, 2026-09-07).
_Avoid_: coverage, completeness, fully modelled, modelled, "some conditions
stated, not asked", "scored", "this interview" and "rule set" in front of a
reader.

**Still reachable**:
A criterion result that did not fail, or failed only by a Bounded gap. The
single predicate behind route status, hard fail and question selection — it was
once spelled four different ways, and the spellings drifted. A disjunction is
judged path by path on top of it (Open path, below).
_Avoid_: alive, possible, not-yet-failed; "open" for a criterion (it names a
path or a route, below)

**Open path / open route** (#133):
A path of a disjunction, or a route, none of whose rules is a hard fail. It may
hold rules that failed (a rung short, recognition not yet): open says the
reader can still get there, not that nothing failed. A disjunction is a hard
fail only when none of its paths is open, and every open path asks its
unanswered questions. The open routes are the ones an Asked-for line is
measured against.
_Avoid_: alive, reachable path

**Points ladder**:
A criterion scored across several declared items against a required total
(the Chancenkarte model). It can be satisfied early but is never failed until
every item is answered.
_Avoid_: score (as a noun for the ladder), quiz

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

**Territory** (dataset: `territories[]` in `countries.json`, #160):
A dependent territory a reader may type into the passport search — Puerto
Rico, Guam. It is never a row of the passport list, because its people hold
another country's passport; it carries that passport and the source that says
so, and the search answers it with the passport's country. A territory with no
sourced passport is not listed.
_Avoid_: dependency, overseas country (as a row)

**Learn source**:
The official place where an open unknown can be resolved by the person
themselves (e.g. the Anabin database for degree recognition).
_Avoid_: help link, reference link

**Asked-for line** (UI: "Asked for: …", #77):
The line on a question that names the routes it is being asked for — the open
routes whose undecided rules read its answer — by name and country when one
or two, counted per country when more. It appears only when fewer than all
the open routes read the question, and it is derived from the same reckoning
that decides to ask, never written per question.
_Avoid_: why-we-ask line, reason line, context line, hint

**Set aside** (UI: "Set aside — after your change, no route uses …", #137):
The answers a change of answer leaves no route reading, after the interview is
replayed in asked order on the new answers. They are named once, in the
declared panel (its folded summary on a phone), on the screen the change leads
to, and are not kept: changing back asks them again.
_Avoid_: dropped, discarded, lost, hidden answers

**Reveal / landing** (the two ways a drawn screen meets the reader):
A *reveal* (s20) scrolls only when the card's top is off the screen — every
gesture on a wide screen, where the card sits beside the ledger. A *landing*
(s30) brings the question card's top to just under the header (the header's
measured height and its own padding) on a narrow screen after an answer, a
correction, or a history move to a question later than the first — the
ledger line, when there is one, stays above it, one swipe up. A verdict is
not landed on: it keeps
s20's reveal of the masthead, and a gesture-drawn verdict takes the focus on
the headline — the element the live region announces — with no second scroll
(s31). Start over is neither: on every width it scrolls to the page's top, as
a first visit opens it, and the focus goes to the first control with no
second scroll (#56). The ledger's *place* is a separate matter from
either: on a phone, once answers exist, the line stands above the question
and above the result (s30, amendments 6–7). The first paint is neither: a
cold load, a restored record and a history move to the first screen keep the
browser's own scroll, and take no focus.
_Avoid_: scroll-to, jump, snap, autoscroll

**Beat** (#86):
The moment after a gesture draws a question card, when the card fades in and
nothing on it commits an answer. It is the same length with or without motion;
under reduced motion only the fade is gone. A beat follows every question
card a gesture draws: an answer, a correction, Back, Keep this answer, the
browser's own Back and Forward. The first paint has none, Start over has none
(#56), and the verdict has none.
_Avoid_: reveal (s20's scroll), arrival (a reader sent from a country or route
page), entrance (how the page came to stand on an entry), debounce, cooldown

**Hold line / hold state** (s31):
The one line a returning reader owed a verdict sees under the eyebrow until
the module draws — the record line's own sentence, *Your answers are on this
device — bringing them back.* The hold state is the page while it stands:
the header, the eyebrow, the line, and nothing else laid out — the headline,
subline, stamp, box and footer the build painted take no room (s22 covered
them in place, and the blank read as a failure). The covers come off in the
task that draws the verdict; nothing that was visible changes place. It is
not a stand-in in the box: those are the record and link readers' lines, over
question one (s10).
_Avoid_: skeleton, placeholder headline, loading state, spinner; held (s37's
held step, a step of the interview the browser holds a history entry for)

**Standing promise** (s10, #8):
The masthead's line under the headline, saying what the page will do for
this reader. There are two: one for a reader who has not started, and one for
a reader who has. It stays true from screen to screen until the reader starts
or starts over. It is not a cover, and it never comes off.
_Avoid_: subline (the element that carries it, which a verdict also writes),
"started" as the name of a cover coming off

**Cover / stand-in** (s10, s22, #8):
A *cover* hides part of the page the build painted, for the first paint only.
It is drawn for a reader the build's page is not right for: one whose answers
are on the device, one who followed a link that answered for them, or one owed
a verdict. A *stand-in* is the line shown in the covered place until then. The
covers come off once, in the task that draws the reader's first screen, and
never come back. A cover is not the masthead's *standing promise*, which says
whether a reader has started and stays true from screen to screen.
_Avoid_: placeholder, skeleton, mask, flag (a flag is the watch's — see
**Flag**); "started" as the name of a cover coming off

**First-paint seed** (#66):
A decision the page takes about the reader before it paints: which standing
promise is theirs, whether they have answered anything, whether the screen is
narrow. From the first screen on, the page goes on taking the same decision
itself. A seed is not a cover: it never comes off, it changes hands.
_Avoid_: flag, default, initial state

**Outside entrance / re-entrance** (s37, the two ways the interview page is
opened):
An *outside entrance* opens the page onto a browser history entry the
interview did not write — a typed address, a link, a bookmark, the step from
`/data/`. Nothing of the interview is held behind it, however many answers
the record brings back. A *re-entrance* opens the page onto an entry the
interview wrote — a reload, the browser's Back or Forward onto it, a restored
session — and that entry says how many held steps stand behind it. An outside
entrance that is reloaded is a re-entrance that still has nothing held behind
it; an entry whose count cannot be read counts as an outside entrance. The
*entry* is a browser history entry — one the page wrote with `pushState` or
`replaceState`, or one it did not; the *entrance* is how the page came to
stand on one.
_Avoid_: entry (for the way in — it is the history entry), arrival (a reader
sent from a country or route page), landing (s30's move of the question card),
return, fresh visit, reload (as the name of either)

**Held step / first held step** (s37):
A *held step* is a step of the interview's list the browser holds a history
entry for — one the browser's Back can land on without leaving the site. The
*first held step* is where they begin: every step from it to the one on screen
is held; the steps before it are the page's own, rebuilt from the record. Past
it the screen's "← Back" is the browser's Back; on it or before it, the
screen's Back shows the previous question in place and the browser's leaves
the site. It is read from the entry the page stands on — on load and on every
Back or Forward — and believed only when the step that entry names is the
step the page stands on. On load that is the list's last step: after the
record grew or shrank in another tab none is held, and one started over back
to the same length reads as unchanged. On a Back or Forward it is the entry's
own step wherever the list still has it, and every step behind is one the
list has too.
_Avoid_: history depth, history index, arrival screen; hold, hold state (the
s31 line a returning reader sees while the module draws — nothing to do with
the browser's history)

**Arrival / arrival line** (#56):
An *arrival* is a reader sent to the interview by a country page's or a route
page's call to action (`/?country=de`, `/?route=…`). The country the address
names goes on the record. Every other answer is kept while the new country
still asks it, and a route the address names sorts first in the verdict. An
arrival that changes nothing on the record changes nothing. The *arrival line*
says what the arrival did, on the first screen only. Start over on such an
address clears the record and arrives again.
_Avoid_: scope (as the name of the move — the *Scope statement* is what the
checker asks), entrance (how the page came to stand on a history entry),
landing (s30's move of the question card)

**Resumed line** (UI: "Continuing where you left off — 5 answers kept." and
Start over; s20, #56):
The line on the first screen of a return onto a kept record, a question or the
verdict, ending in the ledger's own Start over. It is never shown beside an
arrival line, and never after a gesture.
_Avoid_: returning line (the stand-in's words while the page loads), hold line

### Verdicts

**Verdict** (UI: the results screen):
The whole answer to one reader's answers: compared, or answered outright by a
Notice; its headline and subline; and every route placed in a group, in order.
Said once, from the dataset, the answers and the route the reader came from.
_Avoid_: decision, ruling (no authority is deciding anything)

**Met** (UI: "criteria met"):
Every criterion of the route passes on the declarations given.

**Within reach**:
The route misses only by bounded gaps — a known maximum distance ("up to
€4,766", "2 points short").
_Avoid_: almost, partial match

**Not yet**:
The route has a hard fail or an open unknown.
_Avoid_: rejected, ineligible, closed

**Unsettled** (UI: "unsettled for your passport"):
A route whose rules the reader meets while a Notice leaves open whether the
permit is open to their passport at all. Never counted as open; its badge
reads "Rules met".
_Avoid_: pending, maybe, open (for these)

**Written state** (s19; UI: "No route we check in France takes a research
hosting agreement."):
What a verdict with nothing open says when the reader's situation is one no
checked route in their country takes: the country and the situation, the
quoted route that would take it, and what the checked routes take instead.
In place of "Nothing open", never beside it.
_Avoid_: empty state, error

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
A plain-language condition the authority applies that the interview does not
score (a recognised sponsor, market-rate pay, a professional registration).
Shown on the card as "Also required — not checked here", never scored — so
"criteria met" cannot overpromise. Where a question's answer covers it, the
statement names that question in `field` and the card says "Asked in the
interview — you declared …" instead (s32; the shared sentence was the key
from s19 until then).
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
A not-yet route whose only genuine failure is a path answer. These collapse
into one group naming the path answers the group actually asks for.

**Fold** (UI: "4 routes need a job offer or an intra-corporate transfer"):
Not-yet rows gathered under one summary line the reader opens: three or more
Step-gated rows, named by the path answers they ask for, or the rows in a
country the reader is not looking at.
_Avoid_: group (a fold sits inside the not-yet group)

**Strip** (UI: "1 open · 0 within reach · 7 not yet"):
The plain line under the notices counting a verdict's routes by group. It
reads as a summary, never as a control.
_Avoid_: tabs, pills, counters

**Tally** (UI: a country's summary row, "2 open · 3 not yet · 2 unlocking
steps"):
One country's count on the several-country verdict, beside its name: its
groups, and its Leverage steps alone. Where the country's checked routes do
not take the reader's situation, the Written state's sentence stands in for
its not-yet count.
_Avoid_: score

### Change and leverage

**Field kind — attribute / path / improvable**:
attribute: a fixed fact (age, citizenship) — never counterfactualed.
path: the arrangement a route is built on (a job offer, a transfer, a hosting
agreement). Each answer is either a step or an Arranged answer (below).
improvable: closable through effort or time (language, funds, experience,
recognition).
_Avoid_: mutable/immutable, editable

**Job offer** (#179):
The one situation answer the reader can go and get: neither an Arranged
answer, nor "no offer yet", nor "I don't know". It is the answer the Job
offer line counts for a reader who has none.
_Avoid_: offer (in code, alone or in a longer name)

**Arranged answer** (#55):
A path answer someone else arranges for the reader: an intra-corporate
transfer is the employer's decision, a research hosting agreement the host's.
It is never offered as a step or named as the nearest one; what it would open
is said apart from the steps, as "a different situation". A job offer is not
one: the reader can go and get it.
_Avoid_: step (for a transfer or a hosting agreement); "situation" for these
alone — the situation question's answers include the job offer

**Arranged line** (UI: "With a different situation: an intra-corporate
transfer would open 1 route in Germany"):
The one line after the steps saying what each Arranged answer would open in a
country. Never a Leverage step: not counted in the headline or a Tally, never
named as the nearest.
_Avoid_: step card

**Leverage step** (UI: "steps that would unlock more"):
A provable single-step counterfactual: re-evaluating the declarations with
one improvable answer, or one path answer that is not an Arranged answer, changed,
and reporting only routes that verifiably turn met or within reach. Nothing
resting on unanswered questions is ever promised.
_Avoid_: suggestion, tip, recommendation (unqualified)

**Job offer line** (UI: "With a job offer in Germany: 4 more routes would be
checked — on …", #55):
What a job offer would do for a reader who has none: how many routes it frees
from their only hard fail, and what those routes would ask next. Never a
Leverage step — it promises a check, not a verdict.
_Avoid_: "would be met", step (for this line)

### Source watch

**Watchlist**:
The declared set of monitored official sources; coverage against the dataset
is enforced both ways, not promised. The coverage gate also asks each watched
address the trust line's entry question, so it refuses what the run would
refuse: an address that is malformed, carries a name and password, is not a
page, or is link-local. It fails at `npm run check`, where a person can fix it,
rather than on a morning. **How far a redirect may be followed is the strategy's to say**: one
whose bytes become a reading keeps to the same origin, because what a source
redirects to is not the source; a Learn link, which is fetched and never
compared, follows anywhere a person's browser would — including a downgrade to
plain http — because what it watches is that a click arrives somewhere.

**Value source**:
A watched page/document that backs specific dataset values.

**Sentinel**:
A watched signal that backs no value directly (an edition index, an
official-recheck reminder) but announces that values may have moved.
_Avoid_: extra source, misc

**Human tier**:
A source **no client here can read** — since s34 that means neither a fetch nor
a real browser reaches its operative text, because anything a browser reaches
is a Browser tier entry instead. A human-tier entry carries a verification age
and raises reminders instead of being fetched. It held nine entries after s14;
since 2026-09-23 it holds two, and exactly **one dataset sentence**
(`human_tier: 1`): the Conseil d'État decision on Legifrance, where headless
Chrome from the runner met a Cloudflare challenge — a wall against the client —
and the official statute recheck on gesetze-im-internet, reachable only through
a VPN, which is a geography and not a client. The tier measures the watch's
reach, not the source's standing, and the number is read that way.
_Avoid_: manual source, glyph-encoded PDF (a reason it once had), bot-walled
page (most are Browser tier now)

**Browser tier**:
A watched page read **as rendered**: headless Chrome opens it, performs the
entry's Watch steps, waits for it to settle, and hands back the document's
HTML — and from there it is the html strategy exactly, tag-stripped,
normalised and sliced, with a missing marker reported unreachable. It is for a
page whose operative text never reaches a fetch but does reach a browser: a
script-rendered requirement list, a cookie round-trip, a challenge that answers
a fetcher with an empty body. Seven entries since 2026-09-23 — the five IND
route pages, the Opportunity Card's BMI notice and the Blue Card directive on
EUR-Lex. It is a strategy that can fail where the human arm could not, and the
day it cannot open a browser is a red day, not a quiet one. **The origin is
part of the trust line**: a reading that ends on an origin the entry does not name —
by a redirect on load, or by a step that pressed its way there — is refused as
unreachable, because a third party's bytes must never be hashed as the
authority's. A move within the entry's own origin is read, and the address it
was read at travels back with the reading, logged as **`read_at`** on both
tiers when it differs from the address asked for — a redirect the fetcher
followed, a form that posts back to a sub-path, a script that swapped the
document. `read_at` is always an address, shortened past 200 characters
because the address is the page's to choose; the day a reading was taken is a
snapshot's `retrieved_at`. **The watch names itself to the source and to
nobody else**: the fetcher's User-Agent name and its contact header are added
to the source's own requests as they leave, so a host the page merely embeds
sees exactly what a visitor's browser would send — no extra header, and so no
preflight announcing one. Three gaps are known and stated rather than hidden. A
source that registers a service worker routes its fetches through a context
this reader does not intercept — the worker's own script request included, so
that one reaches the source unnamed. The session-wide User-Agent override
stays, because removing it changes which variant ind.nl serves, so a third
party still sees a plain Chrome string. And the reading is the **main frame's
document alone**: a source that moved its requirement list into a subframe
while its lede and footer stayed in the main frame would match its markers and
record a shell. None is closed; all three are written down.
_Avoid_: headless tier, rendered tier, scraping

**Trust line**:
Where the watch may go, one rule for both of its readers, asked at four
moments: the entry address, a redirect target, the addresses a name stands for,
and the page a reader ends on. A link-local address is never a source, since it is
where a hosted runner keeps its credentials. Beyond that, a source may not send
the watch somewhere it could not have gone itself, so a public page that points
into a private or loopback network is refused. An address carrying a name and
password, or on a scheme that is not a page, is never asked for. A reading
stays on its entry's own origin. Every spelling of an address is judged by
the one address it means, and an address inside a network operator's own
translation prefix is never the open web. Crossing the line is `refused-by-us`,
and the refusal names the kind of address, never the address. The coverage
gate asks the same entry question, so a curator hears it before the merge. One
gap is stated: a name the browser resolves for itself is not judged.
_Avoid_: floor, address policy

**Watch step**:
One declared thing a Browser tier entry does to a page before it is read, from
a closed vocabulary the coverage gate enforces: choose an option in a field
(`select`), answer a yes/no question (`answer`), press a control (`press`),
open every collapsed block **in the page's own content, never its furniture,
and never by pressing a link** (`expand`). Each names what it acts on by the
control's **accessible name**, never by a CSS selector: a class name is ours to
lose, a label is what the authority shows a person. An entry with no steps is
simply rendered; a step that cannot be performed makes the entry unreachable
with the step named, never a green day that read the wrong page — and a step
that moves the browser to another origin makes it unreachable too, because a
third party's bytes must never be hashed as the authority's.
_Avoid_: action, script, macro, recipe; plain "step" (taken by Step-gated row
and Leverage step)

**Failure class**:
Whose "no" a read met, in one of three words, decided by the reader that met
it. **Transient** — nobody refused anything and the reading simply did not
happen: the source asked for a moment, or called it its own fault, or nothing
answered at all. **Refused by the source** — the source answered, and the
answer was no or was not the page: a bot wall, a page that moved, a page
whose control the authority renamed. **Refused by us** — this watch declined
to make the request at all, because of where the address led or what it
carried. The split decides three things: what is read a second time, what
reddens the morning, and on which morning. A transient failure is read once
more after the pass; neither refusal is, because the source's answer will not
change in three minutes and ours must not.
_Avoid_: error type, severity, retryable

**Lapse**:
A source the run could not read on one morning of the last seven, and on no
other — one silent morning inside the week. It is reported unreachable like
any other, the page still says the last run did not reach it, and the run
itself stays **green**: four of the five runs before 2026-09-24 were red for
something that read clean the next morning.
_Avoid_: blip, hiccup (the cause, not the state), transient (a Failure class)

**Outage**:
A source the run could not read on two or more mornings of the last seven,
however those mornings fell — a source that goes quiet every other day is an
outage on the second one. The run is **red** — one of the two things a red
run means; the other is an **Overdue flag**. A refusal by us is red on its
first morning instead, because waiting a day changes nothing about an address
the watch will not request.
_Avoid_: downtime, failure, persistent lapse

**Flag**:
The artifact a detected change or due reminder produces — named source,
hashes, the page's *excerpt*; a human turns it into a dataset update. A flag is
**walked** when a person reads the changed page against every quote its entry
backs, corrects the dataset where a value moved, and closes the flag with what
was found — a value moved, the text moved and no value did, or the page came
back as it was.
_Avoid_: alert, notification; triage (a label role) or intake read for the walk

**Excerpt** (#14):
The page's own words around the first difference, as the run read them: cut
where the page goes on, with nothing that steers how text is drawn, and
otherwise never rewritten. It is set apart so nothing in it acts on the page it is shown in,
and every word around it is ours. An excerpt is not a *quote*: a quote is a
sentence the dataset stands on.
_Avoid_: quote, diff, context, snippet

**Overdue flag**:
A flag no person has walked by the second morning after the day it was
raised, counted in UTC days — a flag raised on the 16th is overdue on the
18th, whatever hour either run kept. The run that finds one is **red** on that
first overdue morning, as a refusal by us is: waiting a day changes nothing
about a flag nobody is reading. It stops being overdue when it is walked, and
not before.
_Avoid_: stale flag, unwalked flag, open flag; clock (what counts the days,
not what is overdue)

**Kept issue**:
One issue a run opens, comments on, reopens and closes by itself, because what
it says is the run's own state: `overdue flags`, `watch run failed`, `deploy
run failed`, `check failed on master`. A red run with nobody at the other end
says so there; the first green run of the same kind closes it with a line
naming that run. A person reads it, and never has to close it.
_Avoid_: alarm, status issue, notification

**Finding**:
What a run found, in its kept issue's terms, and the only thing a run tells
it: **red** (say so, with what failed), **green** (close it, naming the run),
or **unsaid** (leave it as it is, because the run could not tell, as when the
clock could not read the open flags). An unsaid run is neither red nor green.
_Avoid_: result, status, outcome (a job's own result, before it is a finding)

**Baseline**:
The first recorded snapshot of a source, against which change is measured.

### The deploy

**The site's address**:
The one URL the site is published under, and the only origin the deploy reads
the live site from. It is decided in reviewed code, never in a setting, because
whoever decides it decides where the site's own links and carried files come
from.
_Avoid_: site URL (as a setting), domain, host

**Carry** (verb):
To copy an asset the LIVE site still references into the fresh `dist/` about
to replace it — byte-identical, under the same name — so a page a reader's
browser cached still finds what it asks for. Its object is one asset; its
subject is the deploy (`scripts/carry-assets.mjs`, s33).
_Avoid_: mirror, backup, sync

**Build directory**:
The `dist/` a deploy has just built and is about to publish. The carry lists
its assets, writes the carried ones into it, and writes the digest list beside
its page.
_Avoid_: output folder, dist (as a word in prose)

**Generation** (of assets):
The set of content-hashed `/_astro/` files one deploy publishes. A deploy
carries exactly one previous generation forward.
_Avoid_: version, build (of the assets)

**The digest list** (`asset-digests.txt`):
The file a build publishes beside its page, one line per asset it put in
`_astro/`: that file's sha256 and its name. It is the only thing the next
deploy checks a carried byte against.
_Avoid_: manifest, checksum file, lockfile

**The three outcomes**:
The step's verdict on the page it read — nothing to do · could not look ·
looked and something is still missing. The third has three shapes and a run
may print more than one. Which outcome a run ended in is what its last lines
say, and what tells a healthy deploy from a silent one. The annotation for a
failed digest publish is not one of them: its subject is the next deploy.
_Avoid_: success/failure, pass/fail (the step has no failure)
