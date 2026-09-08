# Product critique — Permit Rulebook v1 gate, run 2 (2026-09-08) · PRODUCT_RUBRIC 1.3 · **isolated run**

Run by `spine:product-critique-agent` against the **deployed** product at
`https://permitrulebook.com`. The agent built none of these slices and applied
none of the previous run's adjustments.

**Blindness.** `DECISIONS.md`, `KANBAN.md`, `STATUS.md`, the git log and every
file in `docs/spine/critiques/` stayed closed until all ten scores were written
and locked. Open during the walk: `docs/spine/one-pager.md` (personas),
`docs/spine/design/site-map.md` (the map the Orientation lens reads against),
`tokens.css` and `identity.css` (design-fidelity lens). The previous report
(`2026-09-08-v1-gate-critique.md`, RUBRIC 1.2) was opened afterwards, for the
finding-level delta only.

**Rubric version reset.** The previous run scored **PRODUCT_RUBRIC 1.2** (9
lenses, 45 points). This run scores **1.3**, which adds lens 10 (Orientation).
**Scores across rubric versions are not comparable and are not diffed here.**
The *findings* are diffed, in full, below.

**Browser.** Headless Chrome over CDP through the repo's own harness
(`scripts/browser.mjs`), viewport set with `Emulation.setDeviceMetricsOverride`
at **1100×1000** and **390×844** (mobile emulation on), network events enabled
for the privacy probe. 60+ screenshots taken; the ones cited below were opened
**as images** with `tokens.css` beside them.

---

## Personas walked

The one-pager names one user — a non-EU knowledge worker looking at DE/FR/ES/NL
who has or is about to have an offer — plus two additive exception cases
(Türkiye agreement provisions, the DE privileged-access list). Six walks were
derived from it, plus the hostile walk and the cold landings.

| | Persona | Profile carried into the walk |
|---|---|---|
| A | **Arun**, 32, Indian, Munich offer | Degree, recognition confirmed, shortage occupation, 3+ years in 7, €50,700–€59,373, B1 German, €1,091+ funds |
| A′ | **Arun, honestly unsure** | Same person answering "I don't know" to shortage, recognition and salary — the state the product itself invites |
| B | **Niamh**, Irish passport, German offer | The EU-citizen case |
| C | **Lucas**, 33, Brazilian, Amsterdam **transferee** | Contract stays abroad, moved to the Dutch branch, €4,754–€5,942/month |
| C′ | **Lucas as a job-offer reader** | Same salary, Dutch employment contract instead |
| D | **Elif**, 31, Turkish, Madrid offer | Degree, recent graduate, €41,356.36–€45,630 |
| E | **Hostile** | "Any of these four", no qualification, contradictory Dutch-degree answer, fast clicking, Back-spamming |
| L | **Launch walks** | Cold landings, wrong URL, link-preview meta, both GitHub READMEs' first screen |

---

## Screens walked, and the controls **operated** on each

Every control listed was clicked (or typed into and activated) and its effect
observed. Controls named as *not operated* are declared, not credited.

**`/` — interview, 1100 and 390.** Operated: wordmark → `/`; `Menu` button at
390 (opened, `aria-expanded` true, closed, false); header `GERMANY`, `FRANCE`,
`SPAIN`, `NETHERLANDS`, `CHECK YOURS`, `THE DATA`; destination options
`de`, `nl`, `es`, `all`; situation `offer`, `ict`, `research`, `none`;
qualification `none`, `vocational`, `degree`; the passport combobox by typing
(`Ire`, `Turk`, `Holland`, `xyzzy`, `United`, `India`, `Ind`, `Nigeria`,
`Brazil`, `Turkey`, `Pakistan`) and by mouse **and** by keyboard
(ArrowDown + Enter); shortage `yes`/`unknown`; recognition `recognized`,
`partial`, `unknown`; experience `y2in5`, `y3in7`, `y5in7`; yearly salary
`band_6`, `band_3`, `band_2`, `band_0`, `unknown`; monthly salary `band_5`;
German `b1`; English `none`, `c1`; age `u30`, `a30to35`, `o40`; funds `band_1`,
`band_0`, `unknown`; the Dutch-degree and designated-institution yes/no; the
`← Back` button (twice, and confirmed absent on question 1); browser Back
(×7, to the point of leaving the site) and Back after a reload; the `✎`
correction row on `Yearly salary` (re-answered, verdict recomputed);
`Start over` (localStorage verified empty afterwards); the `You declared`
`<details>` toggle. **Not operated:** destination `fr`; yearly bands 1, 4, 5, 7;
German `none/a1/a2/b2plus`; English `b2`; age `a35to40`; recognition `not_yet`;
experience `lt2`.

**`/` — results.** Operated: five `The rules of this route` links (each landed
on the right route page); `Official page ↗` (bamf.de, arbeitsagentur.de,
ind.nl, europa.eu, handbookgermany.de); `Check your degree in the official
Anabin database ↗`; the `§ 18g AufenthG … ISCO-08` link; the collapsed
`NOT YET` route `<summary>` disclosures; the collapsed **country group**
`<summary>` rows in the "any of these four" result (`GERMANY 8 not yet · 2
unlocking steps`, `FRANCE`, `SPAIN`).

**`/germany/`, `/france/`, `/spain/`, `/netherlands/`.** Operated: every route
link on `/germany/` and `/netherlands/`; `Check yours — Germany` and
`Check yours — France` (both as a first-time and as a returning reader);
`listed with their reasons` (destination inspected).

**`/germany/eu-blue-card-general/`, `/france/eu-blue-card/`,
`/germany/researcher/`, `/netherlands/orientation-year/`.** Operated:
`Check yours — Germany, EU Blue Card — general`; `This route as JSON` (fetched
and read); `The dataset on GitHub`; `Report a wrong value`; all seven
`ALSO IN GERMANY` neighbour links; every `Official page ↗`.

**`/data/`.** Operated: `The whole dataset as JSON` (165 KB fetched),
`countries.json`, `The dataset on GitHub`, `Report a wrong value`, and route
rows in the per-route list (destinations inspected).

**`/status/`.** Operated: redirects 200 → `/data/`.

**`/nope-not-a-page/`.** Operated: the four country links and
`Check your own situation`.

**Off-site.** `github.com/OytunOnal/permit-rulebook` and
`…/permit-rulebook-data` READMEs and About metadata fetched and read;
`social-card.png` fetched; `sitemap.xml` and `robots.txt` fetched and every
listed URL cross-checked against the site map.

---

## Findings

### Blockers

**B1 — Every salary band shares its edge with the threshold it decides, so the
same salary produces opposite verdicts depending on which of two correct labels
the reader picks.**
*Walk C, interview step 3 (`nl-ict-1100-q3`) and result
(`nl-ict-1100-final`).* The Dutch monthly bands are `under €1,635.90` ·
`€1,635.90 – €1,867.02` · `€1,867.02 – €3,122` · `€3,122 – €4,357` ·
`€4,357 – €4,754` · `€4,754 – €5,942` · `€5,942 or more`. The threshold this
walk is measured against is **€5,942** — the top edge of band 6 **and** the
bottom edge of band 7. Lucas, earning exactly €5,942, picked `€4,754 – €5,942`
because that band contains his number, and got:

> "**0 routes look open. One is short by €1,188/month.**"
> "Up to €1,188/month short of the monthly salary this route asks for — 30 or
> older, 2026."

Had he picked `€5,942 or more` — equally true of his salary — the same route
would read `CRITERIA MET`. The German yearly ladder has the same property at
every one of its seven internal edges (€33,085.09, €39,582, €41,356.36,
€45,630, €45,934.20, €50,700, €59,373 — each is the top of one band and the
bottom of the next), and Spain and France are measured on that same ladder.
**User cost:** on a product whose entire claim is a deterministic comparison of
a declared value against a published one, the reader at the threshold — the
only reader for whom the comparison is hard — is told the opposite of the truth
half the time, with nothing on the screen to tell them which label to choose.
*(Named as friction F4 in both previous runs, unchanged in the product; raised
to blocker here because this walk pinned the wrong verdict it produces.)*

**B2 — The pre-scoped "Check yours" — the one call to action on 27 of the 29
pages — is dead for anyone who has used the tool before, and shows them another
country's answer.**
*`returning-country-switch.png`, `returning-fr-full.png`.* Sequence, operated:
complete the interview for **Germany**; go to `/france/`; press the page's own
button, **"Check yours — France"**. It navigates to `/?country=fr` and renders,
unchanged:

> "**5 routes look open.** … **GERMANY** · EU Blue Card — shortage occupation ·
> CRITERIA MET"

The word "France" appears nowhere on the screen except in the header nav. No
notice, no offer to switch, no "you have a saved German record". The same holds
for `Check yours — France, EU Blue Card (talent — carte bleue européenne)` from
a French route page, and — differently but also wrongly — for
`/germany/researcher/` → `Check yours`, which lands on the full results page
with Researcher buried inside the collapsed `NOT YET (3)` group and nothing
scrolled to or marked. The first-time path is correct and even narrates itself
("Coming from EU Blue Card — general — Germany is already on the record"), which
is what makes the returning path read as breakage rather than design.
**User cost:** the route pages are the one-pager's second distribution channel
("SEO long tail"). Their only conversion control silently answers about the
wrong country for every returning visitor, and some of those readers will take
the German verdict as an answer about France.

**B3 — The "single step that would unlock more" is a machine enumeration of the
salary ladder.**
*Walk A′, `unlock-rail-1100.png`, hero `unknown-head-1100.png`.* Arun answers
"I don't know" to shortage, recognition and salary — three answers the product
itself offers. The result headline:

> "**Nothing open yet — 13 steps would change that.**"

Of those thirteen "steps that would unlock more — each re-checked against the
rules", **three are real** (an intra-corporate transfer, a research hosting
agreement, full German recognition) and **ten are the salary and funds ladders
printed out one rung at a time**, eight of them naming the *same route*:

> "With **under €33,085.09** — yearly salary → Experienced worker (§ 19c / § 6
> BeschV) — would come within reach (€45,630/year)"
> "With €33,085.09 – €39,582 — yearly salary → … within reach (€12,545/year)"
> … six more …
> "With €59,373 or more — yearly salary → … would be met"

The first of them tells the reader that *earning under €33,085* is a step that
would unlock more. Every one of them is generated by walking the enum, not by
reasoning about the reader.
**User cost:** this section is the product's differentiating output and the
assumption the one-pager singles out for validation (A9, the value of the gap
analysis). In the unknown-heavy state — the most likely first-run state, because
the product invites it — it is unreadable, and the headline count it feeds
("13 steps") is inflated more than fourfold.

### Friction

**F1 — "A few quick questions." sits directly above "QUESTION 1 OF UP TO 24",
and the denominator then swings.** *`v1100-home-fold.png`, `v390-home-fold.png`
(both lines in one phone screen).* Across the walks the denominator moved
**24 → 15 → 15 → 14 → 14 → 12** (walk A, 12 questions actually asked),
**24 → 24 → 15 → 6 → 6** (walk E), **24 → 11 → 7 → 7** (walk C), **24 → 7 → 6**
(walk D). One walk ended after 4 questions. The opening screen overstates the
shortest walk by 6× and contradicts the sentence two lines above it.
*(Previous run F3 — unchanged.)*
**User cost:** the highest-bounce moment in the product carries the worst number
in the product.

**F2 — The read date and the language note are printed with no separator:
"read 2026-09-04German, from arbeitsagentur.de."** *`v1100-res-0.png`
(three times in one card), `v390-res-600.png`.* Whenever the citation line and
the language note fall on the same line — which is most of the time on a phone —
the date runs straight into the next sentence:

> "· § 18g AufenthG · read **2026-09-04German, from arbeitsagentur.de.** The
> source writes 45.934,20 where this page writes 45,934.20 — the same number."

It appears on every quote block on every results card and on the route pages.
**User cost:** the exact line that carries the product's differentiator — value,
source, statute, date — is the line that looks like a string-concatenation bug.
*(New: it arrived with the fix for the previous run's F2, which added the
"German, from …" label to the results page.)*

**F3 — Three of the five rule cards on a route page are tautologies carrying no
quote and no date, while the quote for one of them sits lower on the same page.**
*`v1100-route-900.png`, `/germany/eu-blue-card-general/`.* Consecutively:

> "**A job offer** — CONDITION — This route asks for a job offer."
> "**A university degree** — CONDITION — This route asks for a university degree."
> "**Full German recognition** — CONDITION — This route asks for full German recognition."

Each restates its own heading and adds "WHAT THE CHECKER ASKS: <the interview
question>". Two screens further down, under `ALSO REQUIRED — NOT CHECKED HERE`,
the page prints the arbeitsagentur.de sentence about the six-month job offer,
quoted and dated — the very condition the empty card above was about.
**User cost:** the page whose promise is "the rules, quoted and dated" spends
three of its five rule cards saying nothing, on a page a search visitor reaches
cold.

**F4 — Non-English quotes are never rendered in English, on a product whose
interface language and audience are explicitly English.** *`v390-res-600.png`
— the lower half of the first result card on a phone is three untranslated
German sentences; the Experienced-worker card carries six.* The `lang`
attributes and the "German, from arbeitsagentur.de." label are now present
(good, and new), and an English paraphrase precedes the block ("This route asks
for at least €50,700/year"), so nothing is *wrong* — but for a reader from
India, Nigeria or Brazil the proof itself is decoration, and `/data/` states no
translation policy.
**User cost:** the trust surface is unreadable to the reader it exists to
convince. *(Previous run F2, partially addressed — the scaffolding landed, the
gloss did not.)*

**F5 — The schema's coverage tiers are still printed on every user-facing card,
and the string got longer.** *`v1100-de-0.png`, `v1100-res-0.png`,
`v1100-data-0.png`.* Every route card, on the country pages and in the results,
carries one of:

> "quoted and dated · **scored, two conditions stated but not asked**"
> "quoted and dated · **scored, two in our own reading, not asked**"
> "quoted and dated · **scored against your answers**"
> "quoted and dated · **scored, four conditions stated but not asked and one in our own reading**"

`/data/` adds "SENTENCES OF OURS — 36, declared and shown as ours" and
"94 sourced, 36 ours, **0 standing on a dated reason**". The route pages keep
"WHAT THE CHECKER ASKS, AND WHAT IT DOES NOT" and "the checker" as a heading for
a stranger who has never seen an interview.
**User cost:** the reader must parse the product's internal model to know how
much of the answer to believe. *(Previous run F5 — the previous string was
"some conditions stated, not asked"; the replacement is longer and no plainer.)*

**F6 — Tap targets below the floor `tokens.css` says may never be crossed.**
*Measured on the 390×844 results screen.* Five `Official page ↗` links at
**84 × 16 px**, and every collapsed route `<summary>` row at **330 × 41 px**,
against `--tap-min: 44px` and its own comment: *"No interactive row may go
below this value."* The interview and the route pages clear it everywhere.
**User cost:** the link that proves the quote is the hardest thing on the page
to tap, on the device most readers will use. *(Previous run F10 — unchanged.)*

**F7 — The two language questions offer only CEFR letters, with no plain-language
anchor and no "I don't know".** *`p1-1100-q8`, `p1-1100-q9`.*
"Your German level? — None / below A1 · A1 · A2 · **B1** · B2 or higher" and
"Your English level? — Below B2 · B2 · C1 or higher". Every neighbouring
question a reader might not know the answer to (shortage list, recognition,
salary, funds) offers an unknown door and the result treats it as an open gap;
these two do not, and the answer feeds the Opportunity Card's points table.
**User cost:** a reader who has never sat a language exam must guess, and the
guess silently decides a route.

**F8 — The help offered on the shortage question is a statute and a list of
numeric codes.** *`p1-1100-q4`.*

> "Not sure? **§ 18g AufenthG (section 18g of the Residence Act) lists the
> shortage groups by ISCO-08 code (132, 133, 134, 21, 221, 222, 225, 226, 23,
> 25)**"

Compare the recognition question one screen later, which offers "Check your
degree in the official Anabin database ↗" — an actual way to find out.
**User cost:** the "I don't know" door is there, but the way to stop not knowing
is a citation, so most readers will take the door and lose the answer.

**F9 — `/data/`'s route list looks like a route index and leads to raw JSON.**
*`v1100-data-900.png`.* Twenty-three rows reading "EU Blue Card — general ·
read 2026-09-08", styled like the country pages' route list, each linking to
`/germany/eu-blue-card-general.json`. There is no link from `/data/` to any
route page or country page in `main`.
**User cost:** `THE DATA` is one header tap from every page; a reader who taps a
familiar route name there gets a wall of JSON, and cannot reach the human page
for it without going back through the header.

**F10 — The country search records a substring match on Enter.**
*`irish-search.png`; live status region, verbatim:* typing `Ire` produces
"**4 matches. Côte d'Ivoire highlighted — press Enter to record it**" (Côte
d'Ivoire, DR Congo, Ireland, United Kingdom, in alphabetical order). The picker
is otherwise excellent — synonyms work ("Holland" → Netherlands), the empty
state is written, the answer is echoed ("Passport recorded: Indonesia"), and the
whole thing is keyboard-complete.
**User cost:** three letters and Enter records the wrong passport, and passport
is the answer that decides whether the reader is shown any routes at all.

**F11 — Both READMEs open on a screenshot of a build the product no longer is.**
*`readme-hero.png`, fetched from
`permit-rulebook/master/docs/media/results-2026-09-08.png`.* The hero image
shows the coverage line as "**some conditions stated, not asked**" (the live
site now prints "quoted and dated · scored, two conditions stated but not
asked"), carries no "German, from …" language note, and shows a **`Passport —`**
row with no value in a rail that claims 10 answers — a state the live interview
can no longer produce, because it asks for the passport. The About metadata, the
description, the homepage field and the topics are all now correct (the previous
run's B3 is cleared); it is the picture that is stale. Both READMEs also open
their "What it does now" block with an internal ledger line — "the experience
ladder made ordinal (y3in7 implies y2in5) after the review caught a regression
the guard could not see; pdf-text watch strategy — human tier 0" — on the
project's stated first distribution channel.
**User cost:** the first screen of the launch's own first channel is a picture
of an older product with an empty field in it, under a paragraph written for the
build log.

**F12 — The salary ladder is the union of all four countries' thresholds, shown
to every reader.** *Walk D, step 5.* Elif, who chose **Spain**, is offered
eight bands cut at €33,085.09, €39,582, €41,356.36, €45,630, €45,934.20,
€50,700 and €59,373. Only two of those seven cut points are Spanish
(€33,085.09 and €41,356.36); €45,630, €45,934.20 and €50,700 are German and
€39,582 and €59,373 are French.
**User cost:** five of the seven decisions she is asked to make are about
numbers that cannot affect her answer — and it is this same shared ladder that
B3 prints back to her as "steps".

**F13 — The zero-open state has two different headlines.** *Walk A′ vs walk C.*
"**Nothing open yet** — 13 steps would change that." and "**0 routes look
open.** One is short by €1,188/month." The second is the weakest sentence in the
product at its hardest moment.

**F14 — The hero asserts a precision the card it summarises refuses.**
*Walk `funds`, results head, against the card six lines below:* hero
"**One is short by €1,091/month**"; card "Up to €1,091/month short of the
monthly funds this route asks for — living costs". The reader declared "under
€1,091", so the true shortfall is unknown and the card says so. In walk C′ the
hero reads "**One** is short by €1,188/month" directly above the chip
"**2 WITHIN REACH**". *(Previous run F15 — the wrong-rule half is fixed and
verified; the overstatement half is unchanged.)*

**F15 — Entering the interview from a country page skips question 1 with no
explanation; from a route page it explains.** *`country-checkyours.png` vs
`route-checkyours.png`.* Route page → "Coming from EU Blue Card — general —
Germany is already on the record." above "Question 2 of up to 15". Country page
→ "Question 2 of up to 15" and nothing else. Same mechanism, one of them
narrated.

**F16 — The results page still has no live region and no heading above H3.**
*Measured on walk A results.* `[aria-live], [role=status]` returns **nothing**
(the interview's own live region is exemplary and disappears at the moment the
answer arrives); the heading outline inside `main` is `H3 … H3, H4, H4` with no
H1 or H2, so `OPEN — CRITERIA MET (5)`, `STEPS THAT WOULD UNLOCK MORE` and
`NOT YET (3)` are not headings at all. *(Previous run F9 — unchanged.)*

**F17 — The result cannot be kept, shared or reopened.** All results states live
at `https://permitrulebook.com/` with no print, save, copy or permalink among
the controls, on a page that stamps itself `RECORD GENERATED 2026-09-08`.
*(Previous run F17, v0.7 F10 — unchanged, third run.)*

**F18 — Answers are written to disk and restored, and the results screen never
says so.** *Walk A, then reload.* Reloading `/` renders the completed result
immediately; the string "device" appears **nowhere** on the results page, so a
returning or second reader sees a stranger's passport, salary band and
qualification with no privacy line in view. `Start over` does clear
`localStorage` completely (verified: 0 keys), but it is a small link at the foot
of the rail and wipes ten answers with no confirmation.
*(Previous run F16 — unchanged.)*

**F19 — Overlapping experience bands with no rule for choosing.**
`Under 2 years` · `2+ years within the last 5` · `3+ years within the last 7` ·
`5+ years within the last 7`. Someone with five recent years satisfies the last
three and nothing on the screen says "pick the highest that applies".
*(Previous run F18 — unchanged.)*

**F20 — The free-movement note still gives a German example on Dutch and Spanish
pages.** Verified on `/netherlands/orientation-year/`: "Check registration rules
after arrival (**e.g. Anmeldung in Germany**)". *(Previous run F19 — unchanged.)*

**F21 — Route descriptions are still assertions about the reader on cards whose
verdict is "not yet".** *Walk A′ results.* Under `NOT YET (8)`, beside "You
answered 'I don't know' about whether Germany recognises your qualification":
"**Your university degree is recognised in Germany and the job matches it.**"
*(Previous run F6 — unchanged.)*

### Polish

- **P1** — `Skilled worker — academic (§ 18b, section 18b)` reads as a stutter
  on the country page, the route page and the results rail; the gloss lands on
  whichever route happens to be first on that page, so the same route is glossed
  in one place and bare in another (`ICT Card — intra-corporate transfer
  (§ 19, section 19)` in one rail, `(§ 19)` in the list below it).
- **P2** — `listed with their reasons` on every country page opens
  `github.com/…/data/exclusions.md`, a raw markdown file, and is the **only**
  external link on the site without the `↗` marker every other one carries. The
  one-pager makes the written exclusion list part of v1 scope; it lives off-site.
- **P3** — `p.unlock-hint` — "Your job-search permit above is exactly for this —
  lawful time in the country to land that offer." — is rendered as the sibling
  immediately after "With **a research hosting agreement** → Researcher (§ 18d)
  — would be met", so it reads as a note about the research step, and it is
  shown to a reader who declared at question 2 that they already have an offer.
  *(Previous run F12 — unchanged, and now also mis-attached.)*
- **P4** — Country tag is `GERMANY` on open and within-reach cards and `DE` on
  not-yet cards, same `.country` class, same column, same page.
  *(Previous run P2 — unchanged.)*
- **P5** — Multi-line declared values orphan the `✎` on its own line
  ("Situation", "German recognition", "Yearly salary"). *(Previous run P4, v0.7
  P11 — unchanged, third run.)*
- **P6** — A trailing `·` is left dangling before the wrapped
  `The rules of this route` link on every card at 390.
- **P7** — The header's current-country marker is `aria-current="page"` on a
  country page and `aria-current="true"` on a route page. The site map states
  the nav comes from one source "so it cannot differ between pages"; this is the
  one place it does.
- **P8** — The 404 uses a solid black filled button (`Check your own situation`);
  nowhere else in the product is a primary action filled, and `tokens.css`
  defines no filled-button token.
- **P9** — Unexpanded on user-facing screens: **BeschV** (inside a route *name*,
  on five screens), **AufenthG** (glossed on route pages, bare in results),
  **BIG register**, **ISCO-08**, and the CEFR ladder. `IND` is expanded on first
  use, which is exactly the treatment the others need. *(Previous run F14 —
  unchanged; "Assessed as partial — additional measures required"
  (*Ausgleichsmaßnahmen*) also survives verbatim.)*
- **P10** — At 390 the first question begins ~1,030 px down; the hero and the
  stamp fill the entire first screen, so the product's one action is never
  visible on landing.
- **P11** — At 1100 on question 1 the left `YOU DECLARED` panel is a
  near-empty box containing "Destination —".
- **P12** — On the EU-passport terminal screen the only onward control is one
  generic europa.eu link, and the `Anmeldung` it names is not a link.
  *(Previous run P7 — unchanged.)*
- **P13** — The site README's clone command names the dataset directory
  `visa-rules`, the project's superseded internal name.

### What is working, and must not be traded away

Operated and verified, not assumed:

- **Nothing is sent while you answer.** With `Network.enable` on and the request
  log cleared at question 1, a complete ten-answer interview produced
  **zero requests**. The counter fires one beacon per page load and nothing else.
- **The EU-passport case is a designed screen, not a rejection.** "No work
  permit needed", with the europa.eu TFEU art. 45 quote, its read date, the
  Anmeldung note, and the editable `You declared` rail intact.
- **Contradictory answers are now caught and named**: "You told us you have no
  completed qualification, and also that you graduated from a Dutch institution
  in the last three years. **Both cannot be true.**" *(Clears the previous run's
  F7.)*
- **Browser Back is correct everywhere**, including after a reload: seven
  presses walked the interview backwards, question by question, with each
  current answer marked `✓`, and then left the site.
- **Zero AA contrast failures** across five screens measured against each
  element's resolved background; the closest is 4.89:1. One `:focus-visible`
  rule for the whole site, no `outline: none` anywhere, `lang="de"` on German
  quotes, and a complete keyboard path through the country combobox
  (type → ArrowDown → Enter) with a live status region narrating it.
  *(Clears the previous run's F8.)*
- **`Also required — not checked here`** on every card, naming the preconditions
  the engine cannot see — and **"The official page also says:"** volunteering
  the collective-agreement exception and the Opportunity Card's 20-hour limit.
- **The Türkiye note**, sourced and dated, above the result for a Turkish
  passport, and the honest "Where an authority states that its own requirements
  differ for Turkish citizens, that route's card says so".
- **Zero horizontal overflow** at 390 on every walked screen
  (`scrollWidth` 390/390), and the phone `Menu` control works in both directions.
- **The route pages now lead with the number.** `WHAT THIS ROUTE ASKS FOR ·
  €50,700/year` is the first block under the hero. *(Clears the previous run's
  F1.)*

---

## Rubric scores — PRODUCT_RUBRIC 1.3

Locked before any previous report was opened.

| Lens | Score | Evidence (one sentence) |
|---|---|---|
| 1 First-run clarity | **4** | What it is, how it decides, where the answers go and what the end looks like are all above the first question at both widths — undercut only by "QUESTION 1 OF UP TO 24" sitting directly under "A few quick questions." (F1). |
| 2 Flow friction | **3** | One tap per question, a working `← Back`, browser Back, per-answer `✎` correction that keeps the rest and recomputes the verdict — against a denominator that reads 24 → 15 → 14 → 12, a forced CEFR guess with no unknown door, and bands whose shared edges make a wrong answer both easy to give and costly (F1, F7, B1). |
| 3 Copy & framing | **3** | The verdict vocabulary is careful and honest ("an open gap, not a no", "Also required — not checked here", "Both cannot be true") but every card still prints "scored, two in our own reading, not asked", not-yet cards still assert their requirements as facts about the reader, and BeschV sits unexpanded inside a route's name (F5, F21, P9). |
| 4 Trust surfacing | **4** | Quote, source domain, statute, read date and a numeral-format note on every value, four named build gates and a per-route read date on `/data/`, and a measured zero requests while answering — held off 5 because the proof is three untranslated German sentences per card and the date line reads "read 2026-09-04German" (F4, F2). |
| 5 Result actionability | **3** | "Steps that would unlock more — each re-checked against the rules" names the exact route each real change would open and the gap in euros, and every "I don't know" card carries the Anabin link — but in the unknown-heavy state the section is ten enumerated salary bands, five "open" routes arrive unranked with no next step, and the record cannot be kept (B3, F17). |
| 6 Edge states | **4** | The EU-passport screen, the contradiction notice, the no-threshold card, the empty search state and the 404 are each *designed and written*, several with their own sourced quote — the boundary profile is the one that is not (B1). |
| 7 Accessibility basics | **4** | Zero AA failures measured across five screens, one global focus ring, no `outline: none`, `lang` on foreign quotes, and a complete keyboard path with a narrating live region through the interview — against 84 × 16 px "Official page" links, 41 px summary rows, and a results page with no live region and no heading above H3 (F6, F16). |
| 8 Responsive | **4** | Every screen holds at 390 with no horizontal overflow and a working `Menu`, and the interview and route pages clear the tap floor — but the first question starts a full screen below the fold and the mono citation lines break mid-token (P10, F2). |
| 9 Design fidelity | **4** | The rendered product is variant D as `tokens.css` describes it — paper ground, stamp geometry, serif verdicts, mono values, the threshold rail, the raised `--color-hold` — and the deviations are small and local: the glued date/language line, the dangling `·`, `DE` beside `GERMANY`, the 404's one-off filled button (F2, P4, P6, P8). |
| 10 Orientation | **3** | One header on all 29 pages with the current country marked, `/status/` folded into `/data/`, `sitemap.xml` and `robots.txt` present, and **no orphan** — every URL in the sitemap is reachable in one step from the header or from a country list — but the one action the country and route pages offer answers about the wrong country for returning readers, and `/data/`'s route list leads to JSON instead of the pages (B2, F9). |

**Total 36/50.**

Every lens at 3 is backed by a finding: Flow friction by B1/F1/F7, Copy by
F5/F21/P9, Result actionability by B3/F17, Orientation by B2/F9. No lens scored
2 or below.

### Delta against the previous run

The previous full run — `2026-09-08-v1-gate-critique.md` — scored
**PRODUCT_RUBRIC 1.2** (9 lenses, total 32/45). This run scores **1.3**, which
introduces the Orientation lens. **The numbers are not comparable and are not
subtracted.** The findings are:

**Cleared, and verified by operation:**

| Previous finding | State now |
|---|---|
| **B1** within-reach card names *salary* whichever rule was missed | **Cleared.** The funds walk returns "Up to €1,091/month short of the **monthly funds** this route asks for — **living costs**." |
| **B2** route pages orphaned; no sitemap, robots, or country index | **Cleared.** `sitemap.xml` (29 URLs) and `robots.txt` present; four country pages live; a header nav on every page. |
| **B3** the GitHub channel does not link to the product | **Cleared.** Both repos carry a description, `homepage = https://permitrulebook.com`, topics, and a README whose first lines link the site. |
| **B4** a wrong URL lands on GitHub's 404 | **Cleared.** `/nope-not-a-page/` returns the product's own 404 with masthead, four country links and a CTA. |
| **F1** the number is 1.5 screens down on route pages | **Cleared.** `WHAT THIS ROUTE ASKS FOR · €50,700/year` is the first block. |
| **F7** CRITERIA MET on contradictory declarations, unnoticed | **Cleared.** "Both cannot be true." now heads the result. |
| **F8** `--color-hold` fails AA on eight results elements | **Cleared.** Zero AA failures measured; `tokens.css` records the raise. |
| **F11** questions worded for a situation the reader excluded | **Cleared.** The funds and NL salary questions are reworded and both offer "Doesn't apply to me, or I don't know". |
| **F13** the Anabin link arrives after the question | **Cleared.** "Not sure? Check your degree in the official Anabin database ↗" now sits on the recognition question. |
| **P3** breadcrumb wraps at 390 · **P12** `schema 0.5.0` in the footer | **Cleared** (crumbs removed by design; the footer now carries only dates and the dataset version). |
| **F2** the results page drops `lang` and the "German, from …" label | **Half cleared.** Both are present now — and the fix introduced this run's F2, the glued "read 2026-09-04German". |
| **F15** the hero overstates | **Half cleared.** The wrong-rule half is fixed; "One is short by €1,091" above a card that says "up to" is unchanged. |

**Carried over unfixed, and named again so nothing passes silently:** previous
**F3** → this run's **F1** (the "up to 24" counter, third run); **F4** → **B1**
(shared band boundaries — third run, and now with the wrong verdict it produces
pinned); **F5** → **F5** (coverage tiers on user cards, and the string is longer
than it was); **F6** → **F21**; **F9** → **F16** (no live region, no H2 on
results); **F10** → **F6** (84 × 16 px links, third run); **F12** → **P3**;
**F14** → **P9**; **F16** → **F18**; **F17** → **F17** (the record cannot be
kept, third run); **F18** → **F19**; **F19** → **F20**; **P2** → **P4**;
**P4** → **P5** (third run); **P7** → **P12**.

**No score regression can be reported** — the instrument changed. The
finding-level picture is: **four blockers cleared, three new blockers found**,
two of them (B2, B3) on surfaces the previous run could not see because they did
not exist yet (the country pages' CTA, the reworked unlock rail), and one (B1)
an escalation of a friction that has now survived three critiques.

---

## Adoption verdicts

**A — Arun (Indian engineer, Munich offer, everything known).** *Would finish,
would come back, would recommend.* Twelve taps to five sourced verdicts with the
exact threshold beside his declared band, and "Also required — not checked here"
told him about the six-month contract clause his recruiter had not.
**The single thing most likely to stop him:** being handed five "open" routes
with no ranking and no next step — he still does not know which one to apply
for, and he cannot send the screen to his employer (F17).

**A′ — Arun, answering honestly that he does not know.** *Would finish and would
not come back.* "Nothing open yet — 13 steps would change that", followed by
eight variations of his own salary, one of which suggests earning less.
**What stops him:** B3. The product punished him for using the door it opened.

**B — Niamh (Irish passport).** *Would finish in four taps and leave satisfied.*
"No work permit needed", quoted, dated, with her declarations still editable
beside it — the right answer, delivered correctly. **What stops her going
further:** there is nothing further; one generic europa.eu link, and the
Anmeldung it names is not clickable (P12).

**C — Lucas (Brazilian transferee, Amsterdam, exactly at the threshold).**
*Would finish and would be told the wrong thing.* "0 routes look open. One is
short by €1,188/month" for a salary that meets the threshold, because he picked
the band whose top edge is his number. **What stops him:** B1 — and he is the
reader least likely to notice he was mislabelled, because the number in the band
is his.

**C′ — Lucas as a job-offer reader.** *Would finish; would come back when his
salary moves.* The kennismigrant card quotes the IND telling transferees to use
the other permit, which is genuinely useful. **What stops him:** the hero says
"One is short" above a chip that says "2 WITHIN REACH" (F14).

**D — Elif (Turkish, Madrid offer).** *Would finish, come back, recommend.* The
Türkiye note at the top of her result, sourced and dated and honest about what
the agreement does and does not do, is the best thing on the screen.
**What nearly stopped her:** being asked to place a Spanish salary among eight
bands cut mostly at German and French thresholds (F12).

**E — Hostile.** *Would finish, and would be caught.* Fast clicking,
Back-spamming, reloading and editing all behaved; the contradiction between "no
completed qualification" and "Dutch degree" was named on the result screen in
plain words. The previous run's green-light-on-contradiction failure is gone.

**L — Launch walks.** *Would arrive, and would land on an old picture.* Sitemap,
robots, 404, country indexes, per-route OG title and description, the topics and
homepage on both repos — all correct, all new since the last run. The remaining
failure is F11: the first screen of both READMEs is a screenshot of a build with
a coverage string the site no longer prints and an empty `Passport —` row.

---

## Recommended Adjustments (pick-and-apply)

**1 — Fix the band language and the step rail together; they are one bug wearing
two coats.** Give every band an unambiguous edge — "€5,942 **or more**" against
"**under** €5,942", and the same at every one of the seven yearly cut points —
so no salary appears in two labels; and derive the ladder from the **selected
destination's** thresholds rather than the union of all four (F12). Then stop
the unlock rail enumerating an enum: for a numeric field emit **one** step — the
nearest band that changes a verdict, phrased as the gap the card already
computes ("with €4,274/year more, Experienced worker would be met") — and never
a step that moves the reader downwards. Recount the headline from the steps that
survive. *Clears **B1**, **B3** and **F12**, and makes **F13**'s zero-open
headline worth writing once.*

**2 — Make the pre-scoped entry mean something for a reader who already has a
record.** `/?country=xx` and `/?route=…` currently lose to the saved record in
silence. Either re-scope the record to the country in the URL and re-run, or
land on the results with a written line — the route page already has the
sentence pattern: "Coming from EU Blue Card — general — Germany is already on
the record." Give the country page the same line it gives the route page (F15),
and when the arrival names a route, scroll to that route's card and mark it.
*Clears **B2** and **F15**.*

**3 — One prose-and-pixels pass over the citation line and the coverage line.**
Put a separator between the read date and the language note ("read 2026-09-04 ·
German, from arbeitsagentur.de.") — it is one string and it appears on every card
in the product (F2). Replace the coverage tiers with a sentence a reader would
say: "Every rule that decides this route is asked. Two more the authority states
are listed below, not asked." (F5). Give the results page an `H2` per section
and a `role="status"` line announcing the verdict (F16). Raise the
`Official page ↗` links and the collapsed rows to the 44 px floor `tokens.css`
declares (F6). And retake `docs/media/results-*.png` from today's build (F11).
*Clears **F2**, **F5**, **F6**, **F11** and **F16**.*

Pick: **apply all**, **apply 1 and 2**, **apply 1 only**, or name a subset.
Adjustment 1 is the one that protects the promise — a deterministic comparison
that returns opposite answers at the threshold is the failure this product
cannot carry into launch. Adjustment 2 is the cheapest of the three and is the
difference between the route pages converting and not.

Remaining findings become tracker issues. `design-flaw`: F1, F3, F4, F7, F8, F9,
F10, F13, F14, F18, F19, F20, F21, P1, P3–P8, P10, P11, P13. `new-need`: F17 (a
keepable, shareable record), P2 (the exclusion list as a page on the site), P12
(an onward step for EU passport holders).

---

## For the human only

Everything below is a device, a region or a judgment this run could not reach.
Nothing here is a control the agent could have operated and skipped.

1. **The link preview, actually rendered.** The OG and Twitter tags were read
   and are correct and per-route; `social-card.png` fetched at 200, 81,728
   bytes. No preview was rendered. Paste
   `https://permitrulebook.com/germany/eu-blue-card-general/` into Slack,
   WhatsApp and LinkedIn. **A pass** = the per-route title ("EU Blue Card —
   general · Germany · Permit Rulebook") and the per-route description (the one
   naming €50,700) appear above a card that is legible at thumbnail size.
   **A fail** = the generic site title, or a card whose text is unreadable
   small — the route pages are the SEO channel and the preview is their
   shopfront.

2. **The social card's baked date.** `social-card.png` is a single global image
   for all 29 pages, and the footer claims "re-read daily". Check that the deploy
   pipeline regenerates that PNG on every data refresh, not only on a manual
   build. **A pass** = a link pasted tomorrow shows tomorrow's date.
   **A fail** = a card that says "checked daily" over a date a week old, which is
   the one claim this product cannot afford to have go stale in public.

3. **The `PR` favicon on a non-Windows device.** `favicon.svg` is served and
   loads; its letterforms depend on the viewer's monospace font. Open the site
   on a Mac and on an Android phone and look at the tab. **A pass** = the two
   letters sit centred inside the tilted square with clear margin on both sides.
   **A fail** = letters touching or overflowing the frame at 16 px.

4. **Whether "5 routes look open" should be ranked, and on what published
   basis.** A product judgment, not a defect: Arun is handed five open routes —
   two Blue Cards, a skilled-worker permit, an experienced-worker permit and a
   *job-search* card he does not need — in dataset order, with no statement of
   which one a person in his position actually applies for. Deciding whether the
   product may say "start with this one", and what published source could carry
   that, is the human's call, and it is the largest remaining gap between "which
   routes fit" and "what do I do next".

5. **Whether the German, French and Spanish quotes should carry an English
   rendering.** Adding one means publishing a sentence that is *not* the
   authority's, next to one that is — which cuts against the positioning. The
   alternative is a stated policy on `/data/` ("we never translate; the original
   is the record"). Either is defensible; the current state — no gloss and no
   policy — is the only one that is not.
