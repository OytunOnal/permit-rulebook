# Product critique — s12, light mode · 2026-09-16

**Rubric:** PRODUCT_RUBRIC 1.3 · **Mode:** light — scope from the diff, lenses
scored only for that scope; scores are not product-wide and do not enter the
trend. **Conditions:** run by the session that orchestrated the slice (wrote
the scenario, directed the fixes; did not build it). Light mode permits this
and opens no gate; the merge stays the human's word. Not blind of the slice;
blind of no prior critique of this page.

**Surface walked:** `/data/` on the branch preview (`two-labels` `8f859bc`,
http://localhost:4500/data/) — the "What it holds today" list (three groups,
centred, day-form dataset version) and the freshness paragraph beneath it.
Desktop 1920 wide and a 390-px frame. **Controls operated:** none — the scope
contains no link or button; nothing is credited that was not operated.

**Persona** (one-pager): a knowledge worker from outside the EU with an offer
in DE/FR/ES/NL, reading `/data/` to decide whether to trust the numbers the
interview gave them. Plus one hostile skim.

## Findings

No blockers. No friction. Three polish items, two of them older than the slice
and walked because the slice's scope includes the strings.

- **polish · "Sentences of ours — 46, declared and shown as ours."** Read as a
  stranger: "sentences of ours" is the prose-provenance gate's own vocabulary
  wearing a label. The persona understands it only after reading the *Prose
  provenance* gate line further down. Pre-dates s12. Screen: the counts row.
- **polish · Two identical dates side by side.** *Dataset version 2026-09-10*
  beside *Newest value changed 2026-09-10*. Both true and different facts (a
  version stamp; the day a value last moved); today they coincide, and the
  persona's first thought is "why say it twice". Not actionable now — they
  will separate the first time a value changes without a version bump, or the
  reverse — but worth knowing the row pair invites the question. Screen: the
  dates row.
- **polish · "files an issue in the tracker"** in the freshness paragraph names
  a tracker no stranger has been introduced to on this page; the footer's
  "Report a wrong value" is the link they would want here. Pre-dates s12.
  Screen: the freshness paragraph.

**A false alarm, kept so the next critic does not repeat it:** the first probe
read `text-align: start` on the cells and concluded the centring was not in the
page. It is on `dt` and `dd`, not on the cell; the desktop screenshot and the
390-px probe both show every cell centred, the two-line Routes value included.

**Label pass** (the seven labels read aloud in the persona's voice): none the
persona would hesitate at or resent. *Newest value changed* can be heard two
ways — "the newest value, changed" or "the date the newest value changed" —
the human approved this wording on 2026-09-15 and the second reading is the one
the row beneath it ("Last checked") makes natural; noted, not pushed.

**Prose pass** (the scope's strings read end to end, away from the screen):
DATASET VERSION 2026-09-10 · SCHEMA VERSION 0.7.0 · NEWEST VALUE CHANGED
2026-09-10 · LAST CHECKED 2026-09-15 · QUOTED VALUES 176 with a source and a
date · SENTENCES OF OURS 46, declared and shown as ours · ROUTES 23 scored, 5
quoted and dated but not scored, in 4 countries · "Every source is re-read
daily — last run 2026-09-15. A source that has moved files an issue in the
tracker and a person reads it: the values on this site, and the dates beside
them, change when a person changes them, never on their own." — Source-language
residue: none. Modelling vocabulary: *scored / not scored* is the site's
declared vocabulary since s9 and is explained on the page (accepted);
*declared* in "declared and shown as ours" is the finding above. Unexplained
abbreviations: none.

**Screenshot pass:** desktop — three rows, even heights (46 px each), every
cell centred under its dotted rule, the label type and value type the token
set's, nothing off-palette. 390 px — dates 2×2 with both values on one line
under a wrapped label, counts stacked, Routes on two centred lines, no
horizontal overflow (scrollWidth 371 < 386). Nothing rendered that the design
did not intend.

**Hostile skim:** the eye lands on the numbers — 23 / 5 / 4, 176, 46 — and the
two dates; the meaning survives skimming. Nothing to back-track from in scope.

## Scores (light — scope: `/data/` facts list and freshness paragraph only)

| lens | score | evidence |
|---|---|---|
| Copy & framing | 4/5 | the two new labels earn their meaning without the word "read" being explained; one older label ("declared … as ours") still speaks the gate's language |
| Trust surfacing | 5/5 | last changed and last checked are now two plain facts a layperson reads at a glance, and the paragraph under them says why the dates behave as they do |
| Responsive | 5/5 | 2×2 / stacked / two lines at 390 px, no overflow, values aligned on one line under a wrapped label |
| Design fidelity | 5/5 | tokens honoured, consistent centring, rules and type as designed; nothing broke in the build |

No lens at 2 or below. No previous light run on this scope; no delta.

## Adoption verdict

The persona reads this section, understands how fresh and how big the dataset
is without asking anyone, and goes back to their result. Nothing here would
stop them finishing, returning, or recommending. The one thing most likely to
give them pause is the older label "declared and shown as ours" — a phrase for
the gate, not for them.

## Recommended adjustments

1. **Merge s12 as it stands** — no blocker, no friction; the polish items are
   older than the slice and belong on the tracker, not in this branch.
2. Tracker: the three polish items above as one `design-flaw` on `/data/`'s
   copy (site tracker), to be taken with the next copy pass on that page.
