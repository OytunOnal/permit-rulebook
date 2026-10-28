# Product critique — Permit Rulebook · metric-reading full walk (2026-09-23) · PRODUCT_RUBRIC 1.3 · **isolated run**

**Trigger.** The scheduled metric reading came back today; the cadence brings an
isolated full walk the same day (steward-54).

**Target.** The live site, `https://permitrulebook.com`, walked over HTTP in a
real Chrome through `scripts/browser.mjs`'s launch and CDP contract. Nothing was
built, served or read from `dist/`.

**Isolation.** I did no work on this product. `docs/spine/one-pager.md` (for the
personas) and `docs/spine/design/site-map.md` (which lens 10 is read against)
were the only project files opened before the walk ended and the scores were
locked. `docs/spine/critiques/` was opened afterwards, for the delta only;
`DECISIONS.md`, `KANBAN.md`, `STATUS.md` and the git log were not opened at all.

**Widths.** 390×844 (primary), 1280×900, 375×667, 320×640.

**Rubric.** PRODUCT_RUBRIC **1.3** — the same version as the previous full run,
so the numbers are comparable and are subtracted.

---

## The walks

| Walk | Persona (from the one-pager) | Path |
|---|---|---|
| **P1** | **Priya**, 32, Indian passport, software engineer. Signed German offer, MSc she believes is recognised, ~6 years' experience, no German. *The core user: a knowledge worker from outside the EU with an offer.* | Germany → offer → degree → India → shortage Yes → fully recognised → 2+ yrs → €50,700–€59,373 → no German → English C1 → funds unknown. 11 questions. Re-run with the salary one band lower. |
| **P2** | **Amara**, 28, Nigerian passport, product designer. No offer, comparing all four, unsure of most official categories. *The A15 unknown-heavy profile.* | Any of these four → none of these yet → degree → Nigeria → "I don't know" wherever offered. 16 questions. |
| **P3** | **Oytun**, the project owner as first user. Turkish passport, Dutch offer, degree, 34. *Here to see whether the citizenship-specific TR data actually surfaces.* | Netherlands → offer → 30–35 → Türkiye → degree → €5,942+ → no → no. 8 questions. |
| **H** | **Hostile** — wrong-ish answers, back-tracking, skimming, contradictions, an EU passport, leaving and returning. | An EU (Polish) passport mid-interview; Back ×5 from question 4 and a destination switch at question 1; the pre-scoped `?country=` and `?route=` entries; leaving to `/data/` and returning; a deliberate contradiction (no qualification + a Dutch degree). |

Supporting sweeps, walked but not in character: France and Spain end-to-end
(for the non-German source languages), every page type at four widths, the
keyboard path, and 117 recorded arrivals for layout shift.

---

## Controls operated, per walked screen

A control is credited only where it was clicked or typed into and the result
observed. Everything else is named un-assessed at the end.

**Interview (`/`), 390 / 375 / 320 / 1280**
- Every `.opt` answer button on questions 1–16 across four destinations, by
  mouse; and questions 1–4 again by keyboard (Tab to the option, Enter).
- The passport combobox: typed `Ind`, `India`, `Türkiye`, `Turk`, `Nigeria`,
  `Poland`; picked from the listbox each time; and typed a non-match to see the
  empty state.
- `← Back` (×5 consecutively), and `Keep this answer` (the same control at the
  first question, in edit mode).
- The `You declared` summary (opened and closed, mid-interview and on results).
- A declared row — `role="button" tabindex="0" title="Change this answer"`,
  the `salary_eur_year` row — tapped, then a different band picked, then the
  verdict re-read.
- `Start over` (clicked on the results screen; confirmed `display:none`
  mid-interview at both 390 and 1280).
- The help links on the shortage and recognition questions (read, targets
  resolved; `anabin.kmk.org` and `buzer.de`).

**Results screen**
- All four not-yet `<details>` summaries (opened and closed; `open` state read
  back each time), including the one that arrives already open.
- `Read the rules of this route` → `/germany/eu-blue-card-shortage-occupation/`.
- `Official page` → confirmed `target="_blank" rel="noopener"`, new tab opened.
- `Something to say about this result? Feedback.` → `/feedback/`.
- The four country `<details>` on the all-four result (P2).

**Header, every page type**
- `MENU` → opens, relabels to `CLOSE`, `aria-expanded` flips (390).
- `COUNTRIES` disclosure (1280) → opened, then `GERMANY` clicked →
  `/germany/`; and confirmed the closed popover is neither click-through
  (click at its coordinates did nothing) nor in the tab order.
- `CHECK YOURS`, `THE DATA`, `FEEDBACK`, and the wordmark → all followed.

**Country page (`/germany/`, `/france/`, `/spain/`, `/netherlands/`)**
- `Check yours — Germany` → `/?country=de`, and `Check yours — France` over a
  saved German record → `/?country=fr` with the destination correctly overridden.
- A route card (`Opportunity Card`) → `/germany/opportunity-card/`.
- `listed with the reasons` — target read, not followed off-site.

**Route page (`/germany/eu-blue-card-general/`, `/netherlands/eu-blue-card/`)**
- `Check yours — Netherlands, EU Blue Card` → `/?route=nl-blue-card`.
- `This route as JSON` → served JSON read.
- `Official page ↗` (×3 instances) → new tab.
- `Also in <country>` → `/netherlands/orientation-year/`.

**`/data/`** — `The whole dataset as JSON` (255 KB served), `countries.json`,
one per-route JSON row, `tell us`, and the footer's data link.

**`/feedback/`** — `REPORT WHAT IS WRONG` (new tab opened to Gmail compose,
observed via the browser's target list), `with your own mail app` (`mailto:`
— no handler in this browser, no error, which is what the page's own copy
warns about), and the address button (`Copied` announced in a live region).

**404 (`/no-such-page/`)** — real 404 status; `Check your own situation` → `/`;
the `France` link → `/france/`.

**Footer, every page** — the four countries, `CHECK YOURS`, `The data`,
`How to write, and what happens`, and the wordmark.

**Un-assessed** (named, not credited): the outbound GitHub destinations
(repository, licence, sponsor, the two tracker templates, `exclusions.md`) —
hrefs read and the `_blank`/`noopener` behaviour observed, but the GitHub pages
themselves not loaded; the official-source pages behind `Official page ↗` and
the two "Not sure?" links, for the same reason; `/status/` beyond confirming it
301s to `/data/`; the seven route pages of Spain and the five of France
individually; a real touch device and a real screen reader.

---

## Findings

No blocker. Sixteen findings, each pinned to a screen in
`docs/spine/critiques/2026-09-23-metric-reading-full/`.

### Friction

**F1 — The evidence that carries the whole promise arrives in a language most
of the audience cannot read, and nothing at the point of impact helps.**
*`22-p1-390-results-band1.png`, `22-p1-1280-results-band1.png`,
`141-es-390-results-card.png`, `141-fr-390-results-card.png`.*
On every Germany, France and Spain result card the criterion's English line is
followed by two to six verbatim paragraphs in German, French or Spanish, set in
mono italic, filling most of the card. On the *EU Blue Card — shortage
occupation* card the evidence block is 21 lines, of which 18 are German. The
only accommodation is the trailing `· German, from arbeitsagentur.de.` The
policy behind this is deliberate and well argued — "Quotes are shown in the
authority's own language and are never translated: a translation would be our
words beside theirs, and the original is the record" — but it is stated only on
`/data/` (`162-390-data-translation-policy.png`), which the interview never
sends anyone to. Priya, the core persona, is handed the differentiator as a
wall she must copy into a translator. The Netherlands cards have none of this
because `ind.nl` publishes in English (`81-p3-390-results-top.png`) — so the
defect is invisible on exactly the country whose walk reads cleanest.
**Cost:** the one thing no competitor does lands on the majority of the
audience as noise.

**F2 — "A few quick questions." and "QUESTION 1 OF ABOUT 24" are in the same
viewport, and the estimate then falls to 11.** *`01-home-390-arrive.png`,
`54-1280-home.png`.* Recorded counters on the Germany walk: about 24 (Q1) →
about 16 (Q2–Q3) → about 15 (Q4–Q6) → about 11 (Q7–Q11); eleven asked. France:
about 24 → about 10 → about 8 → about 7; seven asked. **Cost:** the largest
number in the sequence is the only one that is never true, and it is shown at
the exact moment a reader decides whether to begin — directly under a deck
promising the opposite. *(Carried: this was P6 of the 2026-09-16 run, then
worded "UP TO 24".)*

**F3 — Nine salary bands with two-decimal edges, and the band list is not
scoped to the country the reader chose.** *`21-p1-390-q8-salary.png`.*
The Germany-only interview offers: `under €33,085.09` / `€33,085.09 – under
€39,582` / `€39,582 – under €41,356.36` / `€41,356.36 – under €45,630` /
`€45,630 – under €45,934.20` / `€45,934.20 – under €50,700` / `€50,700 – under
€59,373` / `€59,373 or more` / `Doesn't apply to me, or I don't know`. Germany
has exactly three yearly thresholds — €45,630, €45,934.20, €50,700, per
`/germany/` (`40-390-germany.png`). Four of the seven edges cannot change any
German outcome; €59,373 is the *French* 1.5×-reference figure. The France-only
and Spain-only interviews are offered the identical nine, including the German
edges, while Spain's own threshold is €41,356.36. **Cost:** the hardest question
in the interview is made harder by four edges that carry no information for that
reader — the rubric's "an answer that changes nothing the user sees", four
times on one screen.

**F4 — The precise gap in the headline is taken from the bottom of a band the
reader only estimated.** *`28-p1-390-reanswered-results.png`,
`30-p1-390-within-reach.png`.* Declaring `€45,934.20 – under €50,700` produces
the h1 "3 routes look open. **One is short by €4,766/year.**" and the step
"With **€4,766/year more** — yearly salary". The card itself is correctly
hedged — "**Up to** €4,766/year short of the yearly salary this route asks
for" and "up to €4,765.80 short" — so the hedge exists and is dropped in the
two most prominent places. A reader on €50,000 is €700 short, not €4,766.
**Cost:** on a product whose entire claim is per-value exactness, the number a
reader will repeat to an employer is a worst case presented as a fact.

**F5 — "Steps that would unlock more" lists things that are not steps, and the
verdict's "Nearest:" promotes one of them.** *`30-p1-390-within-reach.png`,
`71-p2-390-results-top.png`.* For Priya the block reads: "With at least
€1,091/month — monthly funds", "With an intra-corporate transfer", "With a
research hosting agreement". Two of three are alternative *situations*, not
actions. For Amara — no offer, all four countries — the verdict reads "Nothing
open yet — 4 steps would change that." with the lede "Nearest: **an
intra-corporate transfer in Germany**": the single most prominent piece of
advice on her screen is a thing she cannot do. **Cost:** the product's best
feature gives its top slot to a non-action. *(Carried: F1 of 2026-09-16.)*

**F6 — Mid-interview there is no way to start a clean check, and every route
back into the interview resumes the old one.** *`170-390-mid-interview.png`,
`170-1280-mid-interview.png`, `96-hostile-390-return-to-home.png`,
`97-hostile-390-check-yours-again.png`.* `#restart` ("Start over") computes
`display:none` at 390 and at 1280 until the interview finishes, including with
the `You declared` panel genuinely open. The record persists in `localStorage`
as `permit-rulebook.record.v1`; leaving to `/data/` and returning to `/` resumes
at the same question with no notice, and the header's `CHECK YOURS` from
`/feedback/` does the same. **Cost:** a reader checking for a partner, or who
misread question 2, must walk Back through every answer or finish a run they no
longer want; on a shared machine the next person opens the previous person's
declarations. *(Carried and extended: F5 of 2026-09-16 named the silent resume;
the missing restart is new.)*

**F17 — On the all-four result, two countries arrive expanded and two
collapsed, and the one with a live unknown is among the collapsed.**
*`71-p2-390-results-top.png`, `74-p2-390-band3.png`.* Amara asked for "Any of
these four — show me everything". Germany (`8 not yet — 1 has an open unknown ·
2 unlocking steps`) and Spain (`4 not yet · 2 unlocking steps`) render open;
France (`5 not yet`) and the Netherlands (`6 not yet — 1 has an open unknown`)
render closed. The apparent rule is "open if it has unlocking steps", which puts
Germany's open unknown in view and the Netherlands' behind a tap. **Cost:** the
answer to "show me everything" is half shown, and two readers with the same kind
of gap get two different treatments on one screen. *(Carried: F7 of 2026-09-16.)*

### Polish

**F7 — "scored" is internal vocabulary carrying public headings, and it
collides with a real points score on the same page.** *`40-390-germany.png`
(h1: "Germany: 8 routes scored, 1 quoted."), `160-390-data-holdings.png`
("ROUTES — 23 scored, 6 quoted and dated but not scored"),
`22-p1-390-results-band1.png` ("quoted and dated · scored — 2 conditions this
interview did not ask").* Siblings on the same screens: "scored against your
answers", "not scored", "in our own words, not the authority's", "Our reading,
not the authority's words:", "rule sets", "Quoted here, not scored". Meanwhile
the Opportunity Card card really does print "2 points — 6 needed"
(`74-p2-390-band0.png`), so *scored* means two different things within one
results page. The country-page h1 is the first sentence a search arrival reads —
the one-pager's second distribution channel. *(Carried: P4 of 2026-09-16.)*

**F8 — Statutory shorthand is glossed on route pages and bare everywhere
else.** *`40-390-route-bluecard.png` — "§ 18g AufenthG (AufenthG = the Residence
Act)", "TFEU (the Treaty on the Functioning of the European Union) art. 45" —
against `22-p1-390-results-band1.png`, where "§ 18g AufenthG" appears bare four
times on one card, and `90-hostile-390-eu-passport.png`, where the EU-passport
screen prints a bare "TFEU art. 45".* Never glossed anywhere found: **BeschV**
(which is inside a route *title*, "Experienced worker (§ 19c / § 6 BeschV)"),
**TVG**, **ISCO-08**, **CNO-2011**, **GVVA**, and the "DE"/"FR"/"ES"/"NL"
eyebrows.

**F9 — The same country is "GERMANY" on an open card and "DE" on a not-yet
card, one scroll apart.** *`30-p1-390-within-reach.png` — both visible in one
screen: "GERMANY / EU Blue Card — general" above, "DE / Skilled worker —
vocational (§ 18a)" below.*

**F10 — At 390 the "Criteria met" badge sits in two places on sibling cards.**
*`22-p1-390-results-band0.png` (below the route name) against
`22-p1-390-results-band1.png` (on the eyebrow row).* Measured x across the four
open cards: 36, 244, 36, 36 — the odd one is the card whose title fits on one
line. At 1280 it is consistently top-right (`22-p1-1280-results-band1.png`).
**Cost:** the one status element on the screen has no fixed place to look.

**F11 — The card's primary door is the only blue underlined link on the page,
and blue already means "your answer" 200 px below it.**
*`22-p1-390-results-band1.png`, `113-320-results-card.png`.* Measured:
`a.door` ("Read the rules of this route") renders `rgb(49, 81, 154)` with
`text-decoration: underline` — that is `--color-band`, which `tokens.css`
defines as *"the 'your band' blue — the user's own declaration"*, and which the
same card spends on the declared-salary swatch and rail. Every other link is ink
or `--color-stamp` (`a.next` "Official page" measures `rgb(140, 43, 43)`).
Contrast is not the issue (15.9:1). **Cost:** the next action on every card
reads as unstyled browser boilerplate, and the palette's "you" colour is spent
on something that is not the reader.

**F12 — "Not sure?" help is pitched at a lawyer on one question and a person on
the next.** *`130-390-q-shortage-list.png`.* The shortage question's help reads,
in full: "Check the shortage groups in section 18g of the Residence Act
(ISCO-08 codes 132, 133, 134, 21, 221, 222, 225, 226, 23, 25)" → `buzer.de`, a
German-language statute mirror. The next question's help reads "Check your
degree in the official Anabin database" → `anabin.kmk.org`. Same furniture, two
different readers assumed. Priya is a software engineer and cannot tell from
that link whether her occupation is in group 25. *(Carried: F9 of 2026-09-16.)*

**F13 — The 404's button is printed above the sentence that explains it.**
*`41-390-404-full.png`.* Page order: the `Check your own situation` button,
then "**Or start from your own situation.** The questions are answered on this
device only — nothing is sent anywhere." "Or" opens a sentence that follows what
it is an alternative to. The same page puts the site tagline "Every route,
quoted and dated." as the deck under "This page does not exist."

**F14 — Two different "when we read it" dates, on the same page, both attached
to the differentiator.** *`160-390-data-holdings.png` — the masthead stamp
"RULES READ 2026-09-17" sits directly above the panel "NEWEST VALUE CHANGED
2026-09-16"; the footer of the same page reads "values read between 2026-09-02
and 2026-09-16 · re-read daily (last run 2026-09-22) · dataset 2026-09-18".*
Four dates, three verbs, no key. The stamp/footer pair repeats on every page
(`01-home-390-arrive.png`, `41-390-404-full.png`).

**F15 — At 390 and below, the threshold rail's caption breaks into
right-aligned fragments.** *`113-320-results-card.png` (320),
`22-p1-390-results-band1.png` (390).* "what this route asks — lower amount for /
shortage occupations / · above the amount" runs ragged-right across four lines
against a left-aligned value, and "· above the amount" — the part that answers
the question — ends up alone on the last line.

**F16 — The declared summary wraps mid-phrase at 390.**
*`22-p1-390-results-band0.png`, `28-p1-390-reanswered-results.png`:
"11 answers — tap to review or / change".*

### Layout shift — nothing found

The metric reading flagged layout shift on seeded arrivals of `/`; this walk
looked for movement on **every** page, arrival and width.

- **5 seeded arrivals × 9 pages × 2 widths = 90 arrivals**, each with a
  `buffered: true` `layout-shift` observer installed before first paint:
  **CLS 0.00000 on every one** — `/`, the four country pages, a route page,
  `/data/`, `/feedback/`, the 404.
- **27 further arrivals** at 1280 walked page-to-page in one tab, as a reader
  clicks: **CLS 0 on all 27**.
- One shift was seen once, and once only: `/data/` at 1280, `value 0.004` at
  `t = 77 ms`, source `NAV.nav`, previous and current rect both `y 26, h 44`
  (a horizontal reflow of the header row as a font settled), during the first
  cold-profile pass of the day. It did not reproduce in the 117 arrivals that
  followed.
- Nothing appeared late, moved or jumped in any persona walk, at any width.

The one thing that *does* change position between renders is content, not
layout: the hero paragraph is rewritten after the first answer (from "Your
answers are compared against published rules — … At the end: which routes look
open, how close the near-misses are, and which single step would unlock more."
to "Every value at the end shows its official quote and the date we read it.
Your answers stay on this device."), which moves the question card up. It is
tied to a tap, so it never counts as an unexpected shift, and the card top
measured a stable 539–550 px throughout.

### What is working, and must not be traded away

- **The EU-passport end state.** A Polish passport ends the interview with
  "No work permit needed." and three sourced quotes, not a rejection
  (`90-hostile-390-eu-passport.png`). The blocker this project once shipped is
  gone and stayed gone.
- **The contradiction catch.** Declaring no qualification *and* a Dutch degree
  produces: "You told us you have no completed qualification, and also that you
  graduated from a Dutch institution in the last three years. Both cannot be
  true. The rules read each answer where it applies, so change whichever one is
  wrong before you rely on what is below." That is better than most commercial
  products manage.
- **Correction.** Tapping a declared row opens that question with the meta
  "YOUR ANSWER — PICK ANOTHER TO CHANGE IT, THE REST ARE KEPT", a ✓ on the
  current answer and a "Keep this answer" exit; picking a new band recomputed
  the verdict from "4 routes look open." to "3 routes look open. One is short
  by €4,766/year." (`26-p1-390-edit-one-answer.png`,
  `28-p1-390-reanswered-results.png`).
- **The Türkiye path.** The passport option itself reads "Türkiye — a note
  applies to this passport"; the result opens with a sourced panel; and the
  Dutch card carries "Not required for your passport: Your employer does not
  have to be a recognised sponsor…" (`80-p3-390-passport-turkiye.png`,
  `81-p3-390-results-top.png`). The one-pager's additive-exception idea is real
  on the screen. The 2026-09-16 P7 — the Türkiye notice naming a Dutch route to
  a Germany-only reader — is **fixed** (`190-390-turkiye-germany-panel.png`).
- **The keyboard path.** Five header stops, then the first option; Enter
  answers and focus lands on the next question's first option; the stamp-red
  2 px ring is on every stop with `:focus-visible` true. The 2026-09-16 F6
  (focus dropping to `<body>` after every answer) is **fixed**
  (`61-1280-focus-option.png`, `62-1280-keyboard-progress.png`).
- **Contrast.** Every text node on six page types and the results screen
  measured against its painted background: **zero below AA**.
- **The numeral reconciliation.** "The source writes 45.934,20 where this page
  writes 45,934.20 — the same number." Exactly the right sentence.

---

## Rubric scores — PRODUCT_RUBRIC 1.3

Locked before `docs/spine/critiques/` was opened.

| Lens | Score | Evidence (one sentence) |
|---|---|---|
| 1 First-run clarity | **4** | The arrival names the thing, the promise, the privacy line and what the end looks like in one paragraph beside a dated stamp, at both widths (`01-home-390-arrive.png`, `54-1280-home.png`); the one thing working against it is "A few quick questions." directly above "QUESTION 1 OF ABOUT 24" (F2). |
| 2 Flow friction | **3** | Back, in-place editing, per-row pencils, "Keep this answer" and a branch-aware counter make correction genuinely cheap — against nine salary bands of which four edges cannot change that country's outcome (F3), a total that falls 24 → 11 as you answer (F2), and no way to start a clean run until you finish one (F6). |
| 3 Copy & framing | **3** | The plain-English writing is better than the field ("Both cannot be true", "an open gap, not a no") and no label demeans — but "scored" carries a public h1 while colliding with a real points tally on the results page (F7), statute shorthand is glossed on route pages and bare on results (F8), and one help link asks a software engineer to read ISCO-08 codes on a German statute mirror (F12). |
| 4 Trust surfacing | **3** | Quote, source, section, language and read date sit on every criterion, the numeral-format difference is reconciled in words, and `/data/` shows four named gates — but for DE/FR/ES the quotes are unreadable to the target reader with nothing at the point of impact to help (F1), and the same page carries "RULES READ 2026-09-17" above "NEWEST VALUE CHANGED 2026-09-16" (F14). |
| 5 Result actionability | **3** | The gap analysis is real and re-checked ("With €4,766/year more → EU Blue Card — general — would be met"), with a route door and an official page on every card — but the headline drops the "up to" the card keeps (F4), and the top step, including the verdict's "Nearest:", is routinely a situation the reader cannot act on (F5). |
| 6 Edge states | **4** | An EU passport ends with "No work permit needed" and three sources, a contradiction is caught and named, "I don't know" becomes "an open gap, not a no" and auto-opens that card, the empty search reads "No country matches. Try fewer letters, or the country's own name.", and the 404 is designed — held from 5 because the all-four result opens two countries and collapses two, the live unknown among the collapsed (F17). |
| 7 Accessibility basics | **5** | Zero text below AA across six page types and the results screen (every node measured against its painted background), one stamp-red 2 px `:focus-visible` ring on every stop, the whole interview operable by Tab and Enter with focus landing on the next question, declared rows exposed as `role="button" tabindex="0"` with a title, the closed header disclosure out of the tab order and not click-through, and live regions on the counter and the copied address. |
| 8 Responsive | **4** | No horizontal overflow on any page or on the results screen at 1280, 390, 375 or 320; the header folds to MENU and the desktop declared-sidebar becomes a panel — the losses are at the small end, where the rail caption fragments (F15), the declared header wraps mid-phrase (F16) and the not-yet rows go ragged. |
| 9 Design fidelity | **4** | Everything measured sits on `tokens.css` — ground, card, ink, stamp, the met/near/hold trio, the rail blue, one focus ring, 44 px targets throughout — and the deviations are semantic rather than off-palette: the card's primary door spends `--color-band` ("the user's own declaration") on a link that reads as default browser blue (F11), and the met badge has two positions at 390 (F10). |
| 10 Orientation | **5** | One header on all seven page types with the same four items, the current country marked with `aria-current` and named in the disclosure's own label, one footer everywhere, `/status/` 301ing to `/data/` so nothing is orphaned, every route reachable from its country page, `/data/`, the result cards and "Also in <country>", and pre-scoped `?country=` / `?route=` entries that correctly override a saved destination. |

**Total 38/50.**

Every lens at 3 is backed by a friction finding: Flow friction by F2/F3/F6,
Copy by F7/F8/F12, Trust by F1/F14, Result actionability by F4/F5. No lens
scored 2 or below. **No blocker was found.**

### Delta against the previous full run

Previous full run: `2026-09-16-v1.1-gate-critique.md`, PRODUCT_RUBRIC **1.3**,
final column ("after s21–s22") **39/50**. Same rubric version — comparable, and
subtracted.

| Lens | 2026-09-16 | 2026-09-23 | Δ | Reading |
|---|---|---|---|---|
| 1 First-run clarity | 4 | 4 | 0 | Same screen, same single contradiction; "UP TO 24" is now "ABOUT 24", which does not change it. |
| 2 Flow friction | 4 | 3 | **−1** | See below — coverage, not regression. |
| 3 Copy & framing | 3 | 3 | 0 | The named findings (modelling vocabulary, the two hints) are still on the screen. |
| 4 Trust surfacing | 4 | 3 | **−1** | See below — weighting, not regression. |
| 5 Result actionability | 3 | 3 | 0 | The unlock steps still open with two the reader cannot take, and "Nearest" is still an ICT for a person with no employer. |
| 6 Edge states | 4 | 4 | 0 | F7 (the four-country fold) still reproduces, as F17. |
| 7 Accessibility basics | 5 | 5 | 0 | Focus-after-answer stayed fixed; contrast clean. |
| 8 Responsive | 4 | 4 | 0 | No overflow at any of four widths; the small-end fragments remain. |
| 9 Design fidelity | 4 | 4 | 0 | Different deviations named, same magnitude. |
| 10 Orientation | 4 | 5 | **+1** | See below — strictness, not improvement. |
| **Total** | **39** | **38** | **−1** | |

**The two drops are not evidence that the product got worse, and I will not
report them as if they were.**

- **Lens 2 (4 → 3).** My −1 rests on F3 (the un-scoped nine-band salary
  question) and F6 (no restart mid-interview). Neither is new code. The
  2026-09-16 run's own "Not operated" list names most of what F3 and F6 sit on,
  and its lens-2 note holds the lens at 4 on a different finding entirely (the
  experience ladder — which, for the record, still asks "Related skilled work
  experience in the last five years?" and "And in the last seven years?" as two
  non-exclusive questions). **This is a coverage difference: an isolated walk
  operated surface the last run declared un-walked.**
- **Lens 4 (4 → 3).** My −1 rests mainly on F1, and the 2026-09-16 run already
  knew about verbatim source text ("F3 still verbatim on the new route page")
  and still scored 4. **This is a weighting difference between critics**, not a
  change in the product: I judge that untranslated evidence on the *results*
  screen — where the reader actually meets it, and where the never-translate
  rationale is absent — costs the lens more than it did on a route page.
- **Lens 10 (4 → 5).** The 2026-09-16 run held it at 4 on two gaps I also
  observed and am not disputing: `/data/`'s route names open JSON, and a phone
  route page's header does not name its country (it is behind `MENU`). Read
  against the lens's own wording in 1.3 — orphans, single-step reach, a
  navigation that differs between pages — I score those as small; that is a
  **strictness difference, not a proven improvement**, and the trend line
  should not be read as a rise.

Per the no-silent-regression rule, the two drops are on the table as findings
(F1, F3, F6, F14) for the human either to fix or to record in `DECISIONS.md`
as deliberate trade-offs. My recommendation is that **F1 is the one worth a
decision** — it is a live consequence of a documented policy, and the policy is
right; it is the delivery that is missing.

---

## Adoption verdict, per persona

**P1 — Priya (Indian, German offer, phone).** *Would finish, would come back,
would recommend with a caveat.* Eleven taps to four open routes, each with a
threshold rail showing exactly where she stands, and a one-change gap analysis
that named the exact euro amount when she moved a band. She would trust it more
than any blog. **The single thing most likely to stop her:** the evidence under
her verdict is in German. She can read the English condition lines and the rail,
so she is not blocked — but the reason to believe the product, the thing it
advertises on the first screen, is the part she cannot read, and nothing on that
screen offers her a way through it (F1).

**P2 — Amara (Nigerian, no offer, all four countries).** *Would finish; would
not come back soon; would not recommend yet.* Sixteen questions — including her
German level, her lawful stay in Germany, and whether her spouse is also
applying for an Opportunity Card, a permit she has never been told about — end
in "Nothing open yet — 4 steps would change that." The verdict is honest and
the roll-ups ("5 routes need a job offer, a research hosting agreement or an
intra-corporate transfer") are genuinely useful. **The single thing most likely
to stop her:** the one piece of advice in her lede is "Nearest: an
intra-corporate transfer in Germany" — something she has no employer to give
her (F5) — and half of what she asked to see arrives collapsed (F17).

**P3 — Oytun (Turkish, Dutch offer).** *Would finish in eight taps, would come
back, would recommend.* The Türkiye panel, the passport option's own "a note
applies to this passport", and the Dutch card's "Not required for your passport"
are the product doing exactly what the one-pager promised, with sources. Every
quote on his screen is in English because `ind.nl` publishes in English.
**The single thing most likely to stop him:** nothing on this path — which is
worth saying out loud, because it means the owner's own walk is the one walk
that does not surface F1.

**H — hostile.** *The product holds.* An EU passport gets a correct terminal
screen instead of a rejection; five consecutive Backs never lose an answer;
switching the destination at question 1 keeps the rest and re-derives the
remainder; a contradiction is caught and named; the pre-scoped entries override
a stale saved destination. **The one thing a hostile reader finds:** there is no
way to start over until you finish, and returning to `/` silently resumes
someone's previous session (F6).

---

## Recommended adjustments

Three, prioritised, in pick-and-apply form. **Apply all**, **apply 1 and 2**, or
**apply 1** — each stands alone.

**1 — Put an English handle on every foreign quote, without translating it.**
*(Closes F1; lifts lens 4. The largest single gain available.)*
The never-translate policy is right and should not change. What is missing is
delivery at the point of impact. Smallest version that would work: give each
quote the English condition it backs as its own label — the words already exist
on the card ("A concrete job offer from an employer in Germany, for work of at
least six months") — so the reader sees *which* English sentence each German
paragraph is evidence for instead of three unlabelled blocks; and put one line
of the `/data/` rationale beside the first foreign quote on a results screen
("Quoted in the authority's own language — a translation would be our words
beside theirs"), linked to `/data/`. Larger version, if the human wants it: a
per-quote "what this says" in the product's own voice, marked as ours the way
"Our reading, not the authority's words" already is. This is a decision about
the promise, not a bug fix, and belongs in `DECISIONS.md` either way.

**2 — Scope the salary bands to the country, and make the first screen's count
honest.** *(Closes F3 and F2; lifts lens 2.)*
Derive the band edges from the thresholds of the destination actually chosen —
Germany would drop from nine options to five, Spain to four — and round the
displayed edge while keeping the exact value in the comparison the card already
prints. In the same pass, either take "about 24" off the first screen (show the
counter from question 2, once the branch is known) or change the deck so the two
sentences stop contradicting each other. Both are small, and both sit on the two
screens every reader sees.

**3 — Give "Start over" a home mid-interview, and say when a session is
resumed.** *(Closes F6; hardens the hostile path.)*
Show `#restart` inside the `You declared` panel at every step, not only on the
results screen, and when a saved record is restored on arrival, say so in one
line above the question ("Picking up where you left off — 4 answers kept ·
Start over"). The record and the panel already exist; this is a visibility
change, not a new mechanism.

Remaining findings for the tracker: **F4, F5, F17** as `design-flaw`; **F7–F16**
as `design-flaw` (copy and rendering); no `new-need` raised by this walk.

---

## For the human — only what I could not check myself

1. **A real touch device.** Every tap target measured at or above 44 px and the
   `.done` rows are `role="button"`, but hover state is what marks the option
   under the pointer in this harness; on a phone, check that tapping a declared
   row on the results screen does not require a second tap to register, and that
   the option you tapped is the one that highlights. A pass looks like: one tap,
   the question opens, the ✓ is on your old answer.
2. **A screen reader on the results screen.** The live regions and roles are
   right on inspection, but the results screen is ~7,200 px of nested cards and
   `<details>`; a real pass through it is the only way to know whether "4 open,
   0 within reach, 4 not yet" and the per-card badges are announced in a usable
   order.
3. **The `/data/` numbers.** "QUOTED VALUES — 185 with a source and a date" sits
   four lines above "Prose provenance — … 163 sourced, 52 ours"
   (`160-390-data-holdings.png`, `161-390-data-gates.png`). I believe these count
   different things, but a reader cannot tell, and I could not verify which is
   which from the screen. If they are different populations, say so on the page.
