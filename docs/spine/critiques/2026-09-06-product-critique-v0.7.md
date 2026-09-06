# Product critique — Visa Navigator v0.7 (2026-09-06) · PRODUCT_RUBRIC 1.2 · **isolated run**

Run by `spine:product-critique-agent`, which built none of these slices. Walk was
blind: `DECISIONS.md`, `KANBAN.md`, `STATUS.md`, `docs/spine/critiques/*` and the
git log stayed closed until the scores below were written; only
`docs/spine/one-pager.md` was read first, for the personas. Product walked live at
`http://localhost:4321` (Astro dev server, untouched).

Desktop walks driven through the Chrome extension (real clicks, real keystrokes).
The 390 px walk driven through a CDP harness with
`Emulation.setDeviceMetricsOverride` (390×844, dsf 3, `mobile:true`, touch
emulation, Android UA) — a real device emulation, not a resized window; every
control in that walk was clicked with `Input.dispatchMouseEvent`.

Screenshots (desktop) `C:\Users\hoyti\AppData\Local\Temp\claude-chrome-screenshots-xhAMKN\`,
(phone) `…\038ad315-…\scratchpad\phone\`. Harness:
`…\scratchpad\phonewalk.mjs`. Every screenshot referenced below was reopened as
an image, with `tokens.css` beside it, after the walk.

## Personas

The one-pager defines one user — a non-EU knowledge worker looking at DE/FR/ES/NL,
with or about to have an offer — plus two named additive exception cases (TR
agreement provisions, the DE privileged-access list). The three personas below are
that user and those two cases, walked in character.

## Walks and controls operated

| # | Walk | Screens | Controls **operated** |
|---|---|---|---|
| A | **Amina**, 31, Nigerian data engineer, Berlin offer €58k, degree not assessed | Q1 destination → Q2 situation → Q3 qualification → Q4 passport → Q5 shortage → Q6 recognition → Q7 experience → Q8 salary → results (DE) | "Germany"; "I have (or am about to get) a job offer there"; "University degree"; passport search field (typed "niger"), **↓ arrow**, **Enter**; declared-panel "Change this answer" on Passport; ctrl+A + retype; suggestion row "Nigeria"; "Yes"; "I don't know yet"; "5+ years within the last 7"; "€50,700 – €59,373"; tally chip "1 OPEN" (inert); "Official page" (opened `_blank`); page reload |
| B | **Emre**, 34, Turkish product manager, Amsterdam offer €5,200/month | Q1 → Q2 → Q3 age → Q4 passport → Q5 qualification → Q6 recent-qualification → Q7 monthly salary → results (NL) | "Netherlands"; "I have (or am about to get) a job offer there"; "30 – 35"; passport search (typed "türkiye"); suggestion "Türkiye"; "University degree"; "No"; "€4,754 – €5,942" |
| C | **Dana**, 29, US citizen, no offer, exploring all four | Q1 → Q2 → Q3 → **← Back** → **Keep this answer** → Q4 passport → Q5 German recognition → Q6 experience → Q7 shortage → Q8 Dutch graduate → Q9 top-200 → Q10 German → Q11 English → Q12 age → Q13 funds → results (4 countries) | "Any of these four — show me everything"; "None of these yet — exploring my options"; "University degree"; **"← Back"**; **"Keep this answer"**; passport search (typed "usa"); "United States"; "Not assessed / not recognised"; "5+ years within the last 7"; "I don't know"; "No"; "I don't know"; "A2"; "C1 or higher"; "Under 30"; "€1,091 or more"; **Tab** ×2 (focus-order + ring); country disclosure headers **GERMANY**, **FRANCE**, **SPAIN**, **NETHERLANDS**; the FR and ES grouped-roll-up disclosures |
| D | **Hostile** — skimming, wrong-ish answers, back-tracking, "I don't know" | Spain-only dead end; EU-passport short-circuit; DE unknown-heavy | "Start over" (×3); "Spain"; "None of these yet"; empty-state roll-up disclosure; **browser Back**; "Germany"; "No completed qualification"; "Yes" (IT); passport search typed **"zzz"** (no-match state), **"germany"** (EU case), suggestion "Germany"; "Change this answer" on Passport; typed **"sudan"** + **Enter**; "Under 2 years"; "under €33,085.09" |
| M | **Phone**, 390×844 true device emulation, walk A repeated by clicking | all 8 DE question screens + results | "Germany"; "I have (or am about to get)…"; "University degree"; passport field + "Nigeria"; "Yes"; "I don't know yet"; "5+ years within the last 7"; "€50,700 – €59,373"; overflow + tap-target probe on every screen; full-page capture |

**Un-assessed — named, not credited.** The France-only single-country flow (France
was seen only inside walk C's four-country result). Situation options "My employer
is transferring me to a branch there" and "I have (or expect) a hosting agreement
with a research institution there". Qualification option "Vocational training, 2+
years". Recognition options "Fully recognised" and "Assessed as partial". Age bands
"36 – 40" and "Over 40"; German levels other than A2; English levels other than C1;
"under €1,091"; salary bands other than the three chosen. The print path (Ctrl+P /
print stylesheet). **External link destinations** — every "Official page", the
Anabin link and the europa.eu link were *clicked* and open `target=_blank
rel=noopener` with the hrefs recorded below, but this environment has no outbound
network, so whether those pages load and still carry the quoted sentence is the one
thing only the human can check.

---

## Findings

### Blockers

**B1 — The passport picker records a country the user did not choose, silently.**
*Walk A, Q4 (`ss_3016s2yan` → `ss_3186je0b1`); walk D (`…-26.jpg` →
`…-27.jpg`, "South Sudan").*
The combobox has no arrow-key navigation: pressing ↓ leaves the highlight on the
first row, and Enter commits that first row. The first row is not the exact match.
Typed `niger` + Enter → **Niger** (Nigeria is second). Typed `sudan` + Enter →
**South Sudan** (Sudan is second). The only feedback is a small monospace line in
the side panel; the walk continues normally.
*User cost:* the passport field is what selects the citizenship exception data
(TR agreement, EU/EEA free movement, DE privileged access). A keyboard user, or
anyone who types and hits Enter out of habit, gets a whole eligibility record
computed for the wrong nationality and is never told. This is also the whole
keyboard path through the one screen that is not a button list.

**B2 — The Dutch/Spanish "reduced salary criterion" is unlocked by a question that
never says where you graduated.**
*Walk B, Q6 (`ss_1347jwx6i`): "Did you graduate, take your doctorate, or did a
research permit end, within the last 3 years?" versus walk C, Q8 (`ss_0569toyag`):
"In the last 3 years, did you graduate from — or do research at — a Dutch
university or research institution?"*
Two different questions for the same concept, and the loose one is the one that
governs money. In the NL-only and ES flows the question omits any country, so a
user who graduated two years ago in Lagos or Istanbul answers **Yes** in good
faith — and that answer is what gates the reduced threshold on `nl-hsm-30plus`,
`nl-hsm-under30`, `nl-blue-card` and `es-blue-card` (a €3,122/month path instead of
€5,942/month). The strict wording already exists in the product, on the very next
screen of the four-country flow.
*User cost:* a "within reach" or "criteria met" verdict on the flagship NL route
for someone the rule excludes — the exact failure mode a source-quoted tool exists
to prevent. Walk B's results even reprint the loose phrasing as a route summary:
"A lower salary counts within three years of graduating, defending a doctorate, or
a research permit ending."

**B3 — Engine field names are shipped as the user-facing verdict.**
*Walk B results (`ss_5829enkar` + page text): "Not met: situation, **hsm salary
criterion for your age**". Walk C, France section (`…-15.jpg`): "Not met:
situation" ×5. Walk D (`…-28.jpg`): "Not met: qualification, salary". Walk A:
"Unknown (you answered "I don't know"): **recognition** — an open gap, not a no";
"reduced criterion, 2026"; "top-200 graduate".*
On 22 of the 23 route cards in the four-country walk, the only thing telling the
user *why* a route is closed is a bare internal field id. "hsm salary criterion for
your age" is an internal rule identifier with the modelling word *criterion* in it,
lowercase, mid-sentence. Reading walk C's France block aloud in Dana's voice: five
foreign route names, each answered "Not met: situation", five times.
*User cost:* the reason column — the thing the user came for after the verdict —
teaches nothing and reads like debug output leaking through, which corrodes the
"code compares published values" claim the masthead makes. France in particular is
a wall of jargon that gives the user no reason and no next step.

**B4 — After "Start over", the page states a false claim about what it compared.**
*Walk C → D transition (`ss_40575plhu`, `ss_3259i4tze`, `ss_1385qbddf`,
`ss_175508sow`).*
Clicking "Start over" resets the answers but not the subtitle. Question 1 of a
brand-new interview reads: **"Code compared your 13 answers against 23 published
rule sets. Every value below shows its official quote and the date we read it from
the source."** — past tense, a count of answers the user has not given, and "below"
pointing at an empty page. It persists through the entire restarted interview. The
same bug fires from the edit flow: after the EU short-circuit, the question screen
carried "Nothing to compare: the published rule below answers your situation
directly." (`…-27.jpg`). A browser reload clears it; nothing in the UI does.
*User cost:* the product's single differentiating promise is that it is exact about
what it compared and when. The first screen a returning user sees makes a precise,
checkable, false statement about exactly that.

### Friction

**F1 — "A few quick questions" over "QUESTION 1 OF UP TO 24".** *Landing
(`ss_9036e38a7`), phone `00-q1-landing.png`.* The headline and the counter sit
four lines apart and contradict each other. The denominator then jumps 24 → 15 → 9
→ 8 within four taps (walk A), so the one progress signal on screen is also the one
number that keeps changing. Walk C's exploring path really does run to 13 questions.

**F2 — Browser Back and reload destroy the whole interview, with no warning.**
*Walk D (`ss_4750v9uh0`); walk A reload (`ss_3796qxogd`).* No history entries are
pushed and no state is persisted; Back from a 13-question result lands on Question
1, empty. On Android the hardware Back button is the standard "previous question"
gesture. There is no resume, no draft, no URL that holds the answers.

**F3 — Correcting a country hits an immediate dead end.** *Walk A
(`ss_2619u4aod`).* "Change this answer" on Passport pre-fills the box with the old
value and puts the caret at position 0, so typing produces `nigeriaNiger` and the
grey monospace line **"No country matches. Try fewer letters, or the country's own
name."** The user's first attempt to fix a mistake tells them their country is not
in the list.

**F4 — The salary question is the threshold table, not a question.** *Walk A, Q8
(`ss_34219c95z`); walk B, Q7 (`ss_2561g29la`).* Eight bands, boundaries carried to
the cent: "under €33,085.09", "€45,934.20 – €50,700". Endpoints are shared, so a
€39,582 offer belongs to two bands and a €5,942/month offer to two more — with no
rule on screen for which. There is no "I don't know yet / would rather not say",
though the situation option two screens earlier was "I have (or **am about to get**)
a job offer".

**F5 — Country-specific questions asked without their country.** *Walk C, Q5
(`ss_3042u6jmo`) "Where does **German** recognition of your qualification stand?"
and Q7 "Is your occupation on **Germany's** shortage list…?", both asked of a user
who chose "Any of these four".* One answer is applied across four jurisdictions,
and nothing says so. Related: Germany asks **gross annual** salary, the Netherlands
asks **gross monthly**, with no unit warning between them — in a flow whose whole
point is comparing the four.

**F6 — A question the user cannot possibly answer.** *Walk C, Q9
(`ss_1340poqgo`): "In the last 3 years, did you graduate from a foreign institution
that the **IND** designates for the orientation year?"* Unexplained abbreviation, an
administrative designation, and no link to the list — while the same results page
proves the pattern is solvable ("You can find out yourself: Check your degree in the
official Anabin database ↗").

**F7 — The emptiest result loses the product's best feature.** *Walk D, Spain
(`…-20.jpg` / `…-21.jpg`).* "Nothing open on these answers." after two questions:
four route rows, all "Not met: situation", **no "Steps that would unlock more"
block at all** — while the identical Spain section inside walk C's four-country
result does carry one ("With an intra-corporate transfer in Spain → would be met").
The subtitle also says "see each **country's** reasons below" on a single-country
result. This state also carries zero quotes and zero read-dates, so the
differentiator never appears for the user who got the worst news.

**F8 — On a phone the question is always below the fold.** *Phone walk,
`04-q4-typed.png` … `08-q8-salary.png`, measured at 390×844.* The single column
stacks masthead → the same 7-line intro → the growing "You declared" ledger →
question. By Q8 the ledger is eight rows and the question heading sits at ≈600 CSS px
with one option visible; the other seven salary bands are off-screen. Every question
costs a scroll past content the user has already read. Tap targets measured on
device: declared-panel edit rows **34 px**, "← Back" **22 px**, "Start over"
**20 px** — the three correction affordances are the three smallest targets.
(The layout itself is sound: `scrollWidth` = 390 on every screen, no overflow, no
clipping.)

**F9 — Things that look interactive and are not.** *Results, all walks.* The tally
strip "1 OPEN | 0 WITHIN REACH | 7 NOT YET — 3 HAVE AN OPEN UNKNOWN" is drawn as a
segmented control with coloured left borders; clicking it does nothing (operated,
`ss_33858gv94`). Inside unlock cards, "an intra-corporate transfer", "full German
recognition" and "2+ years of related experience" are bold `--color-band` blue —
verified `<b>`, `cursor:auto`, not links — while real links come in *two* colours:
stamp red for "Official page"/"Start over" and band blue for the Anabin link
(`.learn a{color:var(--color-band)}`). Blue no longer means "clickable" and
clickable no longer means one colour.

**F10 — The record cannot be kept.** *All result screens.* The page stamps itself
"RECORD GENERATED 06 · 09 · 2026" and calls itself an ELIGIBILITY RECORD, but the
only actions on it are "Start over" and outbound links. No save, no print, no
share, no permalink; a reload erases it (F2). A user who spent thirteen questions
has nothing to take to a lawyer, an employer or tomorrow.

### Polish

- **P1** "0 routes look open. **One is within €1,188/month.**" (`…-9.jpg`) reads as
  "under €1,188/month" on first pass. The gap-distance sense needs a preposition.
- **P2** "**Points 7 of 6** — German +1 · English +1 · Experience +3 · Age +2"
  (`…-11.jpg`) looks like an off-by-one bug on the one route that was open.
- **P3** Two unlock steps with identical outcomes: "With 2+ years of related
  experience → would come within reach (€45,630/year)" and "With 5+ years of
  related experience → would come within reach (€45,630/year)" (`…-28.jpg`).
- **P4** Same escape hatch, two labels: "I don't know" (shortage) vs "I don't know
  yet" (recognition) — and the results then quote the user as having answered
  *"I don't know"* when the button said *"I don't know yet"*.
- **P5** The passport hint "199 countries — former names work too, try "Holland"."
  offers a *destination* country as the example on a *passport* question, in
  monospace.
- **P6** Panel labels drift from their questions: "Recent qualification" for
  "did a research permit end…"; "Top-200 graduate" for a question that says only
  "that the IND designates". The panel is more informative than the question.
- **P7** `schema 0.3.0` in the footer is build metadata beside two things that are
  genuinely for the user (`dataset 2026.09.04`, `newest value read 2026-09-04`).
- **P8** "2+ years within the last 5" / "5+ years within the last 7" — the unit is
  elided; a non-native reader has to infer "years".
- **P9** Token drift: `--color-band`, documented in `tokens.css` as *"the user's
  declaration"*, now also paints unlock cards and their bold text, passport-notice
  cards, the "You can find out yourself" boxes, the "Keep this answer" control, the
  tally numerals and one class of link. Separately, `.opt:hover` and `.opt.sel`
  share `--color-band-soft`, so on the review screen hovering any option looks as
  chosen as the actual answer. `--color-hold` / `--color-hold-soft` appeared on no
  screen in five walks.
- **P10** Unglossed vocabulary that a first-time non-European reader cannot parse:
  `45% BBG`, `IND`, `BIG`, `EEA`, `PAC nacional`, `kennismigrant`, `zoekjaar`,
  `carte bleue européenne`, CEFR levels `A1–C1`, and "blocked account or formal
  obligation" (Sperrkonto / Verpflichtungserklärung in English clothes). The German,
  Dutch and Spanish verbatim quotes are the differentiator and are right to be
  verbatim — but they carry the numbers with no English gloss beside them, at
  12.8 px grey monospace.
- **P11** Multi-line declared values orphan the ✎ pencil on its own line ("I have
  (or am about / to get) a job offer / there ✎"); on the NL result the label
  "Monthly / salary" wraps while its value does not (`…-8.jpg`).
- **P12** Two questions that cannot apply: a US passport holder is asked to grade
  their English on a CEFR scale with no native-speaker option (`ss_12638ojlb`); a
  user who answered "No completed qualification" is then asked for "Skilled work
  experience related to **your qualification**" (`…-27.jpg`).
- **P13** The provenance line — the whole product — is the smallest, greyest,
  lowest-contrast element on every card (12.8 px Consolas, 6.26:1). It reads as a
  footnote, not as the point.

### What is working, and should not be traded away

The honest-verdict vocabulary is genuinely good and rare: "looks open", "an open
gap, not a no", "Also required — **not checked here:** …", "No numeric threshold on
this route, so there is no dated value to quote", "Not needed with a job offer",
"Nothing open yet — 4 steps would change that." The EU/EEA passport case is a fully
designed short-circuit with its own quote (`…-25.jpg`). The Türkiye exception lands
exactly as the one-pager promised, with a europa.eu quote and a read date
(`…-9.jpg`). "Steps that would unlock more — each re-checked against the rules" is
the best screen on the site. Contrast, focus ring and focus hand-off to the next
question are all sound. And 390 px produced no overflow anywhere.

---

## Rubric scores — PRODUCT_RUBRIC 1.2

| Lens | Score | Evidence (one sentence) |
|---|---|---|
| 1 First-run clarity | **4** | The masthead states the mechanism, the privacy promise and what the end looks like before the first click (`ss_9036e38a7`); only "QUESTION 1 OF UP TO 24" under "A few quick questions" undercuts it (F1). |
| 2 Flow friction | **3** | One tap per question with a live ledger, ← Back and per-field editing that keeps the rest — against a denominator that moves 24→15→9→8, a 13-question exploring path, a browser Back that wipes everything (F2) and an edit box that dead-ends on the first correction (F3). |
| 3 Copy & framing | **2** | Careful, non-promissory verdicts share the page with raw engine output — "Not met: situation" ×5, "hsm salary criterion for your age", "reduced criterion", "Points 7 of 6" (B3, F6, P10). |
| 4 Trust surfacing | **3** | Every threshold carries a verbatim quote, source, statute and read date, and "not checked here" is unusually honest — but the quotes are 12.8 px grey monospace in German/Dutch/Spanish with no gloss, and the emptiest result carries none at all (F7, P13). |
| 5 Result actionability | **3** | "Steps that would unlock more" and "You can find out yourself → Anabin" are excellent, but the state that most needs steps has none (F7) and a page stamped "RECORD GENERATED" cannot be saved, printed or shared (F10). |
| 6 Edge states | **4** | EU/EEA passports, "nothing open", unknown-heavy profiles, no-threshold routes and no-match search all have designed, written states; the gaps are the missing unlock steps on the emptiest one and salary bands whose shared endpoints belong to two bands at once (F4, F7). |
| 7 Accessibility basics | **2** | Contrast is comfortably AA (6.26:1 muted, 5.09:1 heading accent), focus moves to each new question and `:focus-visible` draws a 2 px stamp-red ring — but the one non-button control has no arrow-key path and Enter commits the wrong country (B1). |
| 8 Responsive | **3** | A full eight-question walk at true 390×844 produced `scrollWidth` 390 on every screen with no clipping — but from Q4 the question opens below the fold behind the intro and the growing ledger, and the three correction controls measure 34/22/20 px (F8). |
| 9 Design fidelity | **3** | The chosen stamped-panel variant survives intact — paper ground, double rules, rotated record stamp, threshold rail, on-palette status pills — but `--color-band` now carries seven meanings, hover and selected share a fill, and the tally strip is drawn as a control that does nothing (P9, F9). |

**Total 27/45.** No lens scored 2 or below is unsupported: Copy & framing rests on
B3/F6, Accessibility on B1.

### Delta against the previous run

**Not comparable, and not subtracted.** The last scored run
(`2026-09-03-product-critique.md`) used **PRODUCT_RUBRIC 1.1** — eight lenses,
29/40, with no Design fidelity lens at all. The intervening run
(`2026-09-04-product-critique-light.md`) withdrew its own scores. Diffing 27/45
against 29/40 would be arithmetic on two different instruments.

What can honestly be said is qualitative, and it is good:

- 1.1's blocker #1 — **EU passport ends in a rejection screen** — is closed. Walk D
  reached a designed "No work permit needed." screen with its own europa.eu quote
  and read date (`…-25.jpg`).
- 1.1's blocker #2 — **"criteria met" on preconditions never asked** — is closed.
  Every card in every walk carried "Also required — not checked here: …".
- 1.1's #3 — *the zero-open explorer's steps hidden behind closed sections* — is
  **partly recurring in a new place**: country sections now open sensibly for the
  first country, but the single-country empty state has no steps at all (F7).
- 1.1's #7 (unit ambiguity) survives in a new form: DE annual vs NL monthly with
  no warning in the four-country flow (F5).
- 1.1 scored Copy 3 and Responsive 5 on RUBRIC 1.1; this run finds copy worse than
  that number implies once the *prose pass* is done away from the screen (B3, P10),
  and finds Responsive genuinely good on overflow but poor on above-the-fold
  ordering and tap-target size, which an overflow probe alone never sees (F8).
  Neither statement is a diff; both are new evidence.

---

## Recommended Adjustments (pick-and-apply)

**1 — Make the interview record the answer the user actually gave.**
Give the country combobox real listbox semantics: ↑/↓ move an `aria-activedescendant`
highlight, Enter commits the *highlighted* row, exact matches sort first, and the
committed country is echoed back in the question card rather than only in the side
panel. Focus the edit field with its text selected, so the first keystroke replaces
rather than prepends. Then split the graduation question so the country that governs
the rule is in the question: reuse the wording the product already has
(`nl_recent_grad`) for the NL and ES reduced-threshold paths, or add the country
clause to `qualification_recent`. *Closes B1, B2, F3.*

**2 — Never show a field id, and never show a stale claim.**
Every `not_met` / `unknown` reason renders as the sentence a person would say
("Needs a job offer, an intra-corporate transfer or a research hosting agreement" —
the wording the France roll-up already uses), never as a field name, and never with
the word *criterion* in it. Same sweep for `reduced criterion` / `general` /
`top-200 graduate` in quote metadata, for `45% BBG` / `IND` / `BIG` / `EEA` /
`PAC nacional` (expand on first use), and for `Points 7 of 6` → "7 points — 6
needed". In the same pass, reset the subtitle on "Start over" and on entering the
edit flow, so a question screen never claims a comparison that has not happened.
*Closes B3, B4, F6, P2, P4, P10 (partly).*

**3 — Give the phone, and the dead end, somewhere to stand.**
On narrow widths put the question card first and collapse "You declared" to a
one-line summary that expands on tap; drop the intro to a single sentence below the
question after Q1; raise the edit rows, "← Back" and "Start over" to ≥44 px. On the
results, put unlock steps on *every* state that has any — including the
single-country "Nothing open" — and give the record one way to survive: a print
stylesheet, or answers encoded in the URL hash so Back, reload and sharing all work.
*Closes F7, F8, F10, and most of F2.*

Remaining findings → tracker issues: F1, F4, F5, F9 and P1, P3, P5–P9, P11–P13
under `design-flaw`; "no way to say *I don't know my salary yet*" (F4) and "no
'why do you ask?' affordance on age/salary" under `new-need`.

## For the human only

The one thing this run could not do is leave the machine: every "Official page",
the Anabin link and the europa.eu link were clicked and open `target=_blank
rel=noopener`, but there is no outbound network here. Two of them need a human eye:

1. On walk A's open card, the quote line reads *"mind. 45.630 Euro im Jahr 2026" ·
   **arbeitsagentur.de** · 45% BBG · § 6 BeschV · read 2026-09-02* while the
   "Official page ↗" beside it goes to
   `https://www.bamf.de/EN/Themen/MigrationAufenthalt/ZuwandererDrittstaaten/Arbeit/FachkraefteOhneAusbildung/fachkraefte-ohne-ausbildung-node.html`.
   **A pass looks like:** the linked page contains that German sentence, or the card
   makes clear that the link is a route overview and not the source of the quote.
2. Spot-check that `https://anabin.kmk.org/anabin.html` still resolves and is not
   behind a bot wall — it is the only self-service next step the product offers, and
   it is offered three times per result.
