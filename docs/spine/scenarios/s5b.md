# s5b — "Honest verdicts and designed edge states" · Acceptance scenario

Status: APPROVED (human, 2026-09-03: "apply all" on the product-critique
recommendations — the critique's pinned findings are this scenario's steps).
Screen change: notice card, precondition line, zero-open headline, grouped
hold rows — additions inside the s5 layout (mock deltas in `s5-results.html`).
Slice exits: `tdd` (builder) + `code-review` (main session) — mandatory.

## Seed data

The four critique personas:
- **A** engineer, Germany, offer at €48k (band €45,934.20–€50,700), degree,
  recognition "I don't know yet", shortage yes, 2+ years.
- **B** nurse, Netherlands, 28, vocational, 5+ years, €4,500/month.
- **C** explorer, "any of these four", no offer, degree, recognition unknown,
  shortage unknown, <2 years, German none, English B2, under 30, no DE stay,
  no partner, funds under €1,091, not a Dutch/top-200 graduate.
- **E** EU passport, Germany, offer, degree.

## Steps

1. **EU passport (E):** after the citizenship answer the interview ends on a
   screen headed "No work permit needed." with one notice card quoting
   "As an EU national you generally don't need a work permit to work anywhere
   in the EU." with source host and read date; no summary strip, no "Not met:
   citizenship" rows, no unlock section. Start over works from there.
2. **Nurse (B):** the met HSM card shows, under its summary, "Also required —
   not checked here: The employer is an IND-recognised sponsor · Salary in
   line with the market rate (IND assessment) · Regulated professions (e.g.
   nurses, doctors): BIG registration". The headline reads "One is within
   €1,585/month." The 30+ HSM hold row reads "Not met: age — for 30 or older,
   monthly salary".
3. **Engineer (A):** the Anabin learn box appears on the two rows where
   recognition is the only open question (Blue Card shortage, §18b) and on the
   bounded-gap Blue Card general row — and NOT on §18a (hard fail:
   qualification) nor on the Opportunity Card row, whose reason now reads
   "not needed with a job offer" and whose detail line reads "Not needed — you
   already have a job offer". Clicking the Recognition row in the panel
   returns to that question with the earlier answers intact.
4. **Explorer (C):** headline "Nothing open yet — 6 steps would change that."
   and subline "Nearest: …" naming an unlock step; Germany's section is open
   (first section with unlocking steps), the other three collapsed. Inside
   Germany the routes gated on the step **alone** sit in one group — measured:
   "5 routes need a job offer, a research hosting agreement or an
   intra-corporate transfer — see the steps above" (the step list is derived
   from the dataset, so it never names a step the group doesn't ask for; §18a
   and §19c keep their own rows because they also fail on qualification and
   experience). The Opportunity Card stays an individual row ("Not met:
   monthly funds") with its Anabin box.
   _(Corrected 2026-09-03 after the build: this line originally said "7
   routes … job offer, transfer or hosting agreement" — an arithmetic slip of
   mine (8 DE routes minus the Opportunity Card) that contradicted the spec's
   own predicate and the critique's pinned count of 16 grouped rows across
   four countries. Evidence: the built page measures DE 5 · FR 3 · ES 4 ·
   NL 4 = 16. Recorded in DECISIONS.)_ The NL question came as two plain questions ("Dutch
   graduate", "Top-200 graduate"), the second offering "I don't know".
5. **Edge (mandatory):** explorer C with English "below B2" and no other
   change — every route hard-fails or stays hold; if no unlock row survives,
   the headline reads "Nothing open on these answers." with the
   change-an-answer subline; no empty "Steps" header renders.
6. **Regression:** s5 personas unchanged in verdicts and question counts
   (destination-first; DE offer ≤ 8 questions); property suites green over
   the new dataset; watch coverage both ways includes the europa.eu source.

## Invariants (property tests)

- Everything from s5.
- New: for every profile, `notices()` is non-empty only when the matching
  field is answered with the matching value.
- New: `hard_fail` is true iff the existing hasHardFail predicate is true.

## Runs

- mock-green: 2026-09-03 — all six steps walked on the running product
  (CDP harness, `crit/`+`s5b/` screenshots): EU notice screen with its quote
  and no rejection list; nurse card carrying the three unasked preconditions
  and "€1,585/month"; engineer's learn boxes on exactly the three rows where
  the unknown still binds and "Not needed — you already have a job offer" on
  the Opportunity Card; explorer's "Nothing open yet — 6 steps would change
  that. Nearest: an intra-corporate transfer in Germany." with Germany open
  and per-country groups; the no-steps branch verified on a reachable NL
  profile; 113 engine tests + `astro check` green. Review round after the
  build: 6 findings verified by measurement and fixed (below).
- real-green: — (rides on the s5 human pass; the europa.eu quote is
  human-verifiable without VPN)

## Review round (main session, after the builder's report)

Verified on the running page, then fixed: (1) a bounded gap propagated out of
an `any` disjunction lost its field — NL ICT read "Gap: up to €2,490 — ." with
no period and no rail; (2) the verdict line still promised "an open gap, not a
no" on hard-failed routes while the strip, auto-open and learn box called it
moot; (3) the rail label fix didn't fire — labels still overprinted (measured
boxes), now the second label drops to its own line; (4) unlock rows printed
bare amounts ("€4,766") while cards printed "/year"; (5) the group summary was
fixed copy telling a user who had declared a transfer that they needed one —
now derived from the dataset's own step names; (6) the notice screen hardcoded
its headline instead of using the notice's title.
