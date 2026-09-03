# Product critique — Visa Navigator (2026-09-03) · PRODUCT_RUBRIC 1.1

First run of the skill on this product (no prior run to delta against; the
human's own evaluation golden set of 2026-09-03 was applied before this walk,
so its ten items do not reappear here). Product walked at `visa-navigator@2eb3fe2`
+ `visa-rules@e2250c2`, dev server, via a Chrome DevTools Protocol harness
(the extension was down): every control credited below was clicked or
keyboard-activated through CDP and its effect read from the DOM and a
screenshot. Screenshots: session scratchpad `crit/*.png`.

## Walks

| Walk | Persona (in character) | Controls operated |
|---|---|---|
| A | P1 — software engineer from Türkiye, offer in Germany at €48k, degree, **doesn't know if it's recognised**, IT (shortage) | every option Q1–Q8 · expand a collapsed hold row · declared-panel row "Recognition" (edit-jump) · learn links inventoried (href/target) · unlock cards read |
| B | P2 — nurse from the Philippines, 28, vocational training, 5+ yrs, offer in the Netherlands at €4,500/month | every option Q1–Q7 · cards + hold rows read |
| C | P3 — recent graduate from Nigeria, no offer, "show me everything", weak: no German, English B2, recognition unknown, <2 yrs, funds under €1,091 | every option Q1–Q14 · collapsed country sections opened (all four) · learn/unlock/hold inventoried |
| D | hostile — skims, wrong-ish answers, Back ×3, Start over, EU passport, France with no qualification, keyboard only | Tab focus order · focus ring · keyboard activation (via focused-element click; **real Enter keypress un-assessed**) · Back · Start over · dev probe at 390px |
| M | responsive — walks A and C at a true 390px CSS width (CDP device emulation) | overflow probe (w=390 sw=390 on both) · screenshots |

Not operated anywhere: the "Official page" links' destinations (target=_blank
verified, pages not visited); the Anabin/§18g pages themselves.

## Findings (pinned)

**Blockers**

1. **EU passport ends in a rejection screen.** Walk D, `G-eu.png`: an
   EU/EEA/Swiss citizen with a German offer reaches "0 routes look open. / 8
   NOT YET / Not met: citizenship" ×8. The true answer is "you don't need a
   permit — free movement". User cost: the one user with the best news gets
   the worst-looking screen and leaves thinking the tool is broken or that
   they are excluded.
2. **"Criteria met" on preconditions the user never declared.** Walk B,
   `B-results.png`: the HSM under-30 card says CRITERIA MET while its own
   summary lists "Employment contract with an IND-recognised sponsor; salary
   at market rate" — neither was asked. For a nurse the unasked precondition
   is bigger still: BIG registration for a regulated profession, absent from
   the screen entirely. User cost: a green verdict the authority will not
   honour; the product's own promise ("compares published values with what
   you declared") is contradicted by the card.

**Friction**

3. **Zero-open explorer lands on four closed doors.** Walk C, `C-results.png`:
   "0 routes look open." above four collapsed country headers; the hope
   (Germany: 4 unlocking steps, Spain: 2) is only in 10px tally text and only
   readable after clicking. Cost: the weakest user, who most needs the "what
   would change this" answer, sees a dead end first.
4. **Anabin box on routes Anabin cannot help.** Walk A, `A-results.png`: "You
   can find out yourself: Check your degree in the official Anabin database"
   repeats on 5 hold rows, including "EU Blue Card — general: Not met: salary",
   "Skilled worker — vocational: Not met: qualification" and "Opportunity Card:
   Not met: situation". Cost: the user goes to Anabin expecting it to unlock
   routes it can't; repetition also buries the one row where it matters.
5. **"Not met: situation" ×16 for one fact the user gave.** Walk C,
   `C-all-open.png`: every offer/transfer-gated route across four countries
   restates the same reason; and the Opportunity Card tells an offer-holder in
   walk A "✗ Situation — needs: None of these yet… · you declared: I have a
   job offer" (`A-results.png`). Cost: scanning noise; the CK line reads as
   nonsense advice ("lose your offer").
6. **Compound, jargon-heavy question early for explorers.** Walk C Q5:
   "In the last 3 years, did you graduate from (or do research at) a Dutch
   institution, or graduate from a top-200-ranked foreign university?" — two
   conditions, one answer, before the user has been asked anything about
   themselves; its panel label is "NL/top-200 degree". Cost: hesitation and a
   guessed answer at question five.
7. **Headline money has no unit.** Walk B: "One is within €1,585." (monthly)
   vs walk A's "€4,766" (annual) — same sentence shape, different units, the
   unit only discoverable in the card. Cost: an NL user reading an annual gap
   thinks they are €1,585 per year away.

**Polish**

8. Results subline still says "the date it was read" (`A-results.png`) while
   the first screen was fixed to "the date we read it from the source".
9. "Not met: age" for a 28-year-old on "HSM — 30 or older" (walk B hold row);
   technically true, reads as a verdict on the person. Suggest "for 30+".
10. Rail labels collide: the own-threshold label and "your band" overprint
    when the band starts at the threshold (`A-results.png` §19c rail; also
    `res-nl.png` earlier).
11. Muted text (#6f6c5d) on the page ground measures 4.55:1 at 10.9–12.8px
    (tally, hold-why, source lines) — passes AA by a hair; the small mono
    source lines are the hardest read on the page.
12. "Up to 19 quick questions" on the first screen for every user; the count
    then drops to 15, 9, 8 as answers land (a good progress signal) — but 19
    is the first number a skimmer sees.

## Label pass (choice screens, in persona voice)

- Destination — clean; "Any of these four — show me everything" is clear.
- Situation — "I have (or am about to get) a job offer there": P1 hesitates on
  "about to get" (is a verbal offer enough?) but selects.
- Citizenship — "Any other country" reads neutral (golden G4 applied).
- Qualification — "Vocational training, 2+ years (state-recognised where
  completed)": the nurse (B) hesitates — is a Philippine nursing diploma
  "vocational" or a "degree"? No "not sure" option here, unlike recognition
  and shortage. Folded into the #2/#6 class.
- Recognition — "Assessed as partial — additional measures required": P1
  doesn't know what "measures" are, but "I don't know yet" exists, so no
  resentment.
- Age bands fine. Funds — "blocked account or formal obligation" is jargon
  for C, but the question is honest about what counts.

## Adoption verdicts

- **A (engineer, recognition unknown):** finishes; comes back after Anabin;
  recommends. Stopper: the Anabin link on rows it can't help (#4) sends them
  down the wrong path first.
- **B (nurse, NL):** finishes fast (7 questions); recommends — **wrongly
  confident**. Stopper: discovering BIG / recognised-sponsor at the IND desk
  after trusting "Criteria met" (#2).
- **C (weak explorer):** may stop at "0 routes look open" (#3). If they open
  Germany they find "with full German recognition → Opportunity Card within
  reach" and stay. Recommends only if they got that far.
- **D (hostile):** Back / Start over / edit-jump all behave; the keyboard path
  works; no dead ends found (France + no qualification continues honestly to
  the 5-year experience path). Would not recommend after the EU screen (#1).

## Rubric scores — PRODUCT_RUBRIC 1.1

| Lens | Score | Evidence |
|---|---|---|
| 1 First-run clarity | 4 | The first screen names the outcome, the trust mechanism and privacy in three lines (`A-00-first.png`); "19" is the only number a skimmer sees. |
| 2 Flow friction | 4 | 7–8 questions for offer-holders, 14 for the explorer, with a shrinking "of up to N"; edit-jump and Back both work; #6 is the one rough step. |
| 3 Copy & framing | 3 | Labels clean after the golden pass, but #5 (CK "needs: none of these yet") and #9 read as verdicts on the person; #7 unit ambiguity. |
| 4 Trust surfacing | 3 | Quotes + read dates land on every card; undermined by #2 (green on undeclared preconditions) and #8. |
| 5 Result actionability | 4 | Unlock cards are the product's best moment ("with full German recognition → …"); #4 mis-aims the learn link, #3 hides the steps behind closed sections. |
| 6 Edge states | 2 | EU passport (#1) and the zero-open explorer (#3) are leftovers; France-without-qualification and unknown-heavy profiles are designed. |
| 7 Accessibility basics | 4 | Tab reaches options in order, a 2px maroon focus ring is visible, focus continues onto the next question; contrast 4.55:1 on small mono text (#11). Enter-key activation not verified by a real keypress. |
| 8 Responsive | 5 | 390px: no horizontal overflow on question, single-country and four-country result screens (probe-measured), single column, wrapping buttons (`M-*.png`). |

Total 29/40. No previous run → no delta.

## Recommended Adjustments (pick-and-apply)

1. **Designed edge states for "nothing to check" and "nothing open".**
   EU/EEA/CH passport → a single free-movement card (with a source quote) and
   no "not met" list; zero-open results → the headline carries the unlock
   count and the nearest step, and the first country with unlocking steps
   opens by default. Closes #1, #3.
2. **Honest cards: "Also required, not checked here" + learn-link targeting.**
   Each route's unasked preconditions (recognised sponsor, market rate,
   regulated-profession registration) render as a labelled line under the
   verdict; learn boxes only on rows where the unknown field is the binding
   reason; the Opportunity Card hold line becomes "not needed — you already
   have an offer". Closes #2, #4, #5.
3. **Copy sweep**: money units in headlines ("€1,585/month"), results subline
   wording, "for 30+" age reason, split the NL orientation-year question into
   two plain ones, rail label collision. Closes #6–#10.

Remaining (#11, #12) → tracker issues under `design-flaw`.
