# Product critique — Permit Rulebook v1 gate (2026-09-08) · PRODUCT_RUBRIC 1.2 · **isolated run**

Run by `spine:product-critique-agent` against the **deployed** product at
`https://permitrulebook.com`, not localhost. The agent built none of these
slices. The walk was blind: `DECISIONS.md`, `KANBAN.md`, `STATUS.md`,
`docs/spine/critiques/*` and the git log stayed closed until every score below
was written; only `docs/spine/one-pager.md` (personas) and `tokens.css` /
`identity.css` (design-fidelity lens) were open during the walk. The previous
report was opened afterwards, for the delta only.

Browser: headless Chrome over CDP, viewport set through
`Emulation.setDeviceMetricsOverride` at **1100×900** and **390×844** (mobile
emulation on). Screenshots were taken and then **looked at as images** — 14 of
them — with `tokens.css` beside them.

---

## Personas walked

The one-pager names one user (a non-EU knowledge worker looking at DE/FR/ES/NL,
with or about to have an offer; first user the project owner) plus two additive
exception cases (Türkiye agreement provisions, the DE privileged-access list).
Four personas were derived from it, plus the hostile walk and the launch's own
walks:

| | Persona | Profile carried into the walk |
|---|---|---|
| A | **Aylin**, 31, Turkish software engineer | Berlin offer at €58,000, MSc from a Turkish university, unsure whether it is recognised in Germany, A2 German, C1 English, 5 years' experience, no blocked account |
| B | **Niamh**, Irish passport, offer in Germany | The EU-citizen case — the one the record says was a blocker once |
| C | **Maya**, 26, Indian, just finished a Dutch master's | No offer, wants to know if she can stay and look |
| D | **Rahul**, 28, Indian, Amsterdam offer €4,000/month, university degree | The job-offer reader — and the same profile again as a **transferee** (contract stays abroad, €5,000/month) |
| E | **Hostile** | Skims, clicks fast, contradicts itself, back-tracks, edits answers, reloads, presses Start over |
| L | **Launch walks** | Cold search landings on three route pages, ten seconds each; an Irish passport on a German route page; a link pasted into a preview (OG meta + social card); the tab favicon; the README's first screen on GitHub |

---

## Screens walked, and the controls **operated** on each

A control is credited only if it was clicked (or focused and Enter-ed) and its
effect observed. Everything listed here was operated.

| Screen | Controls operated |
|---|---|
| `/` Q1 landing (1100 px and 390 px) | `Germany`, `Netherlands`, `Any of these four — show me everything`; Tab-order walk; **Enter** on a focused option |
| Q2 situation (DE / NL / all-four variants) | `I have (or am about to get) a job offer there`, `My employer is transferring me to a branch there`, `None of these yet — exploring my options`, `← Back` |
| Q3 qualification | `University degree`, `No completed qualification` |
| Q passport (combobox) | Typed `turk`, `irel`, `india`, `bangl`; clicked `Türkiye`, `Ireland`; **Enter** to record the highlighted match |
| Q shortage list | `Yes` |
| Q German recognition | `I don't know` |
| Q experience | `5+ years within the last 7` |
| Q salary (DE annual / NL monthly) | `€50,700 – €59,373`, `€3,122 – €4,357`, `€4,754 – €5,942` |
| Q German level / Q English level | `A2`, `C1 or higher` |
| Q monthly funds (DE) | `under €1,091` |
| Q age (NL) | `Under 30` |
| Q Dutch degree / Q designated institution | `Yes`, `No` |
| Review/correction screen | The `✎` row `Yearly salary` (mouse **and** keyboard Enter), `Keep this answer`, `← Back` |
| Results — Aylin (DE) | `Start over`; the `✎` rows; `The rules of this route`; country/status chips (inspected — see F9) |
| Results — Niamh (EU passport terminal) | `Start over` |
| Results — Maya (NL, 1 open) | scrolled and read in full |
| Results — Rahul (NL offer) and Rahul (NL transferee) | read in full |
| Results — hostile all-four profile (23 rule sets) | `FRANCE` accordion (expanded, read) |
| `/germany/eu-blue-card-general` (1100 px and 390 px) | `Check yours — Germany, EU Blue Card — general` (→ `/?route=de-blue-card-general`), `This route as JSON` (→ real JSON), masthead `PR PERMIT RULEBOOK` (→ `/`) |
| `/spain/intra-company-transfer/`, `/netherlands/orientation-year/` | read cold, ten-second test |
| `/nope-not-here` | loaded — see B4 |
| Footer, everywhere | `The dataset on GitHub`, `Report a wrong value`, `Open data · CC BY 4.0` — hrefs followed and verified `200` |
| Outbound trust links | `Official page` (arbeitsagentur.de, bamf.de, europa.eu, handbookgermany.de) and `Check your degree in the official Anabin database` — **all 7 resolve `200`** |
| Assets | `favicon.svg`, `favicon.ico`, `favicon-64.png`, `social-card.png` fetched and viewed; every route page's OG/Twitter meta read |
| `github.com/OytunOnal/permit-rulebook-data` | Repo landing screen loaded, README fetched raw and read |

**Un-assessed, and named as such:** browser-native behaviour beyond
`history.back()` (a real hardware back gesture); the `target=_blank` tabs the
`Official page` links open (the href was followed by request instead); French and
Spanish *interview* branches beyond the country choice (FR/ES route pages were
walked, FR/ES question paths were not).

---

## Findings

### Blockers

**B1 — Every "within reach" card says the gap is *salary*, whichever rule was
actually missed.**
*Walk A, results, `shots/14-withinreach.png`.* The Opportunity Card
(Chancenkarte) card's one-line explanation reads:

> "The salary this route asks for sits above the band you declared."

Six lines below, the same card contradicts it three times: the rail legend says
`what this route asks — living costs`, the gap banner says **"Short by up to
€1,091/month on monthly funds"**, and the quote behind it is
*"Für den Aufenthalt in Deutschland müssen Ihnen monatlich mindestens 1.091 Euro
zur Verfügung stehen."* — living costs, not salary. Aylin declared a salary of
€50,700–€59,373; nothing about her salary is short of anything on this route.
The sentence is proven hard-coded by the control case: on Rahul's NL
`Highly skilled migrant — under 30` card and his `Intra-corporate transferee`
card the identical string is *correct*, because there the missed rule genuinely
is salary.
**User cost:** the summary line — the sentence a reader takes away — names the
wrong rule on a product whose entire claim is per-value precision. A user who
reads only the headline of the card walks away believing they need a raise when
they need a bank statement.

**B2 — Every route page is orphaned; the site cannot be indexed or browsed.**
*Verified by request against the live host.*
- `https://permitrulebook.com/sitemap.xml` → **404**
- `https://permitrulebook.com/robots.txt` → **404**
- `https://permitrulebook.com/germany/` → **404** (no country index; same for `/netherlands/`)
- The home page's full control inventory is: the masthead link, the five country
  buttons, the `YOU DECLARED` summary, and three GitHub links. **No route page is
  linked from the home page.**

A route page is reachable only from another route page's `ALSO IN <COUNTRY>`
list, or from a URL you already hold. The one-pager names "SEO long tail (micro-pages
generated automatically from the rules)" as the second distribution channel; that
channel currently has no entry point, no crawl directive and no index.
**User cost:** the 23 route pages — the best-built surface in the product — are
invisible to everyone who did not arrive with the URL.

**B3 — The launch's *primary* channel does not link to the product.**
*`shots/95-readme-fold.png`; README fetched raw (3,162 chars).*
On `github.com/OytunOnal/permit-rulebook-data`, the **About** panel reads, verbatim:

> "No description, website, or topics provided."

No description, no website field, no topics — so the repo appears in no GitHub
topic listing (`immigration`, `open-data`, `visa`, `europe`). The README is below
the fold at 1280×900 (the first screen is the file listing), and `grep` over the
raw README finds **no occurrence of `permitrulebook.com`**. Its only outbound
link is the issue tracker. The sentence "The site that reads this data lives in
the permit-rulebook repository" is plain text, not a link, and points at a
*repository* rather than at the running product.
**User cost:** the one-pager's stated first channel is "open data + GitHub/HN
first". A reader arriving from HN can read the dataset and cannot find the thing
to try. This is the cheapest blocker on the list and the one that costs the most.

**B4 — A wrong URL lands the user on GitHub's error page.**
*`https://permitrulebook.com/nope-not-here` → 404, body is
`<title>Page not found · GitHub Pages</title>`.* There is no `404.html`: a
mistyped, truncated, or stale link (a route slug that changes, a shared link that
loses a character) drops the visitor onto a page carrying **another company's
branding**, with no masthead, no "back to Permit Rulebook", and no search.
**User cost:** on a domain whose promise is "every route, quoted and dated", the
error state is unbranded, unexplained and terminal. The user is lost, and the
last thing they saw was someone else's logo.

### Friction

**F1 — On a route page the number the page exists for is 1.5 screens down on
desktop and 2.4 screens down on a phone.** *`shots/20-de-bluecard-fold.png`,
`shots/22-de-bluecard-m-fold.png`, measured.* On
`/germany/eu-blue-card-general` at 1100×900, the first occurrence of **€50,700**
is at **y = 1397 of a 2485 px page**; at 390×844 it is at **y = 2044 of 4582 px**.
The `Check yours` call to action is at y = 2184 (88 % down) and y = 3186 (70 %
down). What occupies the fold instead is a box headed **"WHAT THE CHECKER ASKS,
AND WHAT IT DOES NOT"** — a coverage disclaimer that names an interview the cold
visitor has never seen — followed by the EU-passport block and the job-offer
condition. The ten-second test: *what is the threshold* — not answered; *where
does the number come from* — answered superbly, once found; *when was it last
checked* — answered immediately by the `RULES READ 2026-09-07` stamp; *what do I
do next* — answered at the very bottom.
**User cost:** the search visitor this page was built for bounces before the
answer.

**F2 — The results page strips the language scaffolding the route pages carry.**
*Walk A, results, compared with `/germany/eu-blue-card-general`.* On the route
page each quote is `<q lang="de">` and is followed by a visible label —
*"German, from arbeitsagentur.de. The source writes 50.700 where this page writes
50,700 — the same number."* On the results page, `document.querySelectorAll('[lang]')`
returns **only `<html lang="en">`**: roughly twenty sentences of German statute
are marked as English, with no "German, from …" label and no gloss. Aylin, who
declared A2 German, gets the proof of the product's differentiator as a wall of
untranslated legal German read aloud in an English voice.
**User cost:** the trust surface is unreadable to the reader it exists to convince.

**F3 — "A few quick questions" sits directly above "QUESTION 1 OF UP TO 24", and
the estimate then swings.** *`shots/70-m-home.png` (both lines on one phone
screen); walk A.* The denominator moved **24 → 15 → 7 → 14 → 11** inside one walk
(24 on landing, 15 after Germany, 7 after "no qualification + IT", 14 after
"university degree", 11 at the end). Aylin's actual walk was 11 questions —
the opening screen overstated it by 2.2×.
**User cost:** the highest-bounce moment in the product is given the worst number
in the product.

**F4 — The salary question is the threshold table, printed to the cent, with
shared boundaries.** *`shots/09-q8.png`; NL equivalent in walk D.* DE:
`under €33,085.09` · `€33,085.09 – €39,582` · `€39,582 – €41,356.36` ·
`€41,356.36 – €45,630` · `€45,630 – €45,934.20` · `€45,934.20 – €50,700` ·
`€50,700 – €59,373` · `€59,373 or more`. NL: seven bands including
`€1,635.90 – €1,867.02`. Every internal boundary is the top of one band **and**
the bottom of the next, so someone earning exactly €41,356.36 sees two options
that both contain their number. The cents are the derived thresholds showing
through; nobody's offer is €45,934.20.
**User cost:** eight options where two would do, and a genuine "which one is
mine?" pause at every boundary. *(Named in the v0.7 report as F4 — unchanged.)*

**F5 — Internal coverage vocabulary is printed on every user-facing card.**
*All results screens; both route pages.* `some conditions stated, not asked` and
`every deciding rule asked` appear in small lowercase monospace on every route
card and in bold inside the route pages' opening box. These are the schema's
coverage tiers, wearing user-facing clothes. Also: **"the checker"** as a heading
on a page a stranger reached from a search, and `Our reading, not the authority's
words: … **We model** the two that turn on where and when you studied`.
**User cost:** the reader is asked to parse the product's internal model in order
to understand how much of the answer to believe.

**F6 — Route descriptions are written as assertions about the reader, on cards
whose verdict is "not yet".** *Walk A results, `shots/14-notyet2.png`; also the
`ALSO IN GERMANY` list on every DE route page.* The `Skilled worker — academic
(§ 18b)` card, sitting under the heading **NOT YET (6)** and beside "You answered
'I don't know' about whether Germany recognises your qualification", opens:

> "Your university degree is recognised in Germany and the job matches it."

Likewise "Your vocational training is recognised in Germany and you have a job
offer that matches it" and "Your company moves you to its German branch".
**User cost:** a skimming reader takes the sentence as a finding about themselves.
It is the description of the *route's requirement*, phrased as a statement of
fact about the user.

**F7 — The engine returns "CRITERIA MET" on two declarations that cannot both be
true, and says nothing.** *Hostile walk E, `shots/64-weak-full.png`.* Declared:
`Qualification: No completed qualification`, `Dutch degree: No`,
`Designated institution: Yes`. Result: **"1 route looks open" — Orientation year
(zoekjaar) — CRITERIA MET.** Both contradictory answers are visible in the
`YOU DECLARED` sidebar at the same time. The engine takes the more specific
answer, which is defensible; nothing on the screen notices the contradiction.
**User cost:** a fast, skimming user — which is most of them — is handed a green
verdict resting on an answer they contradicted two screens earlier.

**F8 — `--color-hold` fails AA on the results page, including the safety
label.** *Walk A results, measured in-page against each element's resolved
background.* Eight failures, all `rgb(123,120,105)` = `--color-hold #7b7869`:

| ratio | needs | element |
|---|---|---|
| **3.82** | 4.5 | the `NOT YET` section label (11.84 px, w900) |
| **4.21** | 4.5 | `6 NOT YET — 3 HAVE AN OPEN UNKNOWN` chip (12.48 px, w600) |
| **4.21** | 4.5 | **`Also required — not checked here:`** — repeated on six route cards (13.28 px, w700) |

The home page, the DE Blue Card route page and the NL orientation-year route page
each returned **zero** failures on the same probe, so this is confined to
`--color-hold` on the results screen. `tokens.css` already records that
`--color-muted` was raised from `#6f6c5d` to `#5a5747` for exactly this reason
(tracker #1); `--color-hold` did not get the same pass.
**User cost:** the lowest-contrast text on the page is the disclosure that stops
a user over-reading "CRITERIA MET".

**F9 — The results page has no live region and no section headings.**
*Walk A results.* During the interview there is a `role="status" aria-live="polite"`
region announcing "Question 1 of up to 24" and "Passport recorded: Türkiye" —
good work. On the results page `[aria-live],[role=status]` returns **nothing**:
a screen-reader user taps the last option and hears silence while the page
becomes a 10,242-character result. The heading outline is `H1 → H3 → H3 → H4`
with no `H2` — the four biggest structures on the page (`OPEN — CRITERIA MET
(1)`, `WITHIN REACH (1)`, `STEPS THAT WOULD UNLOCK MORE`, `NOT YET (6)`) are not
headings at all, so the result cannot be navigated by section.
**User cost:** the product's whole output is unnavigable and unannounced to
assistive technology.

**F10 — On a phone the outbound proof link is 84 × 16 px.**
*Walk A results at 390×844.* Every visible interactive element on the interview
and on the route pages clears 44 px — the v0.7 finding is genuinely fixed there.
On the results page, seven `Official page ↗` links measure **84 × 16 px**, the
three `Check your degree in the official Anabin database` links **303 × 38 px**,
and the collapsed route rows **330 × 41 px**. `tokens.css` states the rule
itself: *"The tap-target floor … No interactive row may go below this value"*,
`--tap-min: 44px`.
**User cost:** the link that proves the quote is the hardest thing on the page to
tap, on the device most people will use.

**F11 — Questions are worded for a situation the user has already ruled out, with
no way to say "not applicable".** Two pinned instances:
- *Walk A, Q11:* "Monthly funds you can evidence for **the job-search stay** (a
  blocked bank account, or a sponsor's formal undertaking)?" — asked of someone
  who declared, at Q2, that she has a job offer. Two options, neither of them
  "doesn't apply to me".
- *Walk D transferee, Q4:* "Gross monthly salary **in the offer** (or monthly
  income you can evidence)?" — asked of someone who declared that their contract
  stays with the company abroad and there is no offer.

Both also carry source-language residue: *"a sponsor's formal undertaking"* is
*Verpflichtungserklärung*, and *"you can evidence"* uses evidence as a verb.
**User cost:** the user either answers something untrue or stalls; there is no
third door.

**F12 — The results page tells Aylin she holds a job-search permit and needs to
land an offer.** *Walk A results, `shots/14-steps.png`, closing line of
"STEPS THAT WOULD UNLOCK MORE":*

> "Your job-search permit above is exactly for this — lawful time in the country
> to land that offer."

She declared a job offer at Q2, and the Opportunity Card above is listed as
*within reach*, not held. Two false statements in one sentence, at the end of the
section that is supposed to tell her what to do.
**User cost:** the most action-shaped sentence on the page is the least true one
for this profile.

**F13 — The help for "German recognition" arrives after the answer, not at it.**
*`shots/07-q6.png` vs `shots/14-steps.png`.* Q6 asks "Where does German
recognition of your qualification stand?" with four options and **no link, no
definition, and no "what is this?"**. The excellent
`You can find out yourself: Check your degree in the official Anabin database ↗`
appears three screens later, on the result cards — and on the route page, which
also carries it at the condition itself. The interview is the only surface that
does not.
**User cost:** the user is made to guess, then told where they could have looked.

**F14 — Untranslated German administrative language in an option label.**
*`shots/07-q6.png`, Q6 option 2:* "Assessed as partial — additional measures
required" — *Ausgleichsmaßnahmen*, rendered word-for-word. Read aloud in Aylin's
voice it is not a sentence about her life. Neighbours in the same prose pass:
`BeschV`, `AufenthG`, `TVG`, `§ 19c`, `§ 20a`, `§ 18g`, `IELTS`, `BIG register`
and the CEFR ladder `A1 / A2 / B1 / B2 / C1` — none expanded on the interview
screens. (`IND` **is** expanded on first use — "The Dutch immigration service
(IND)" — which is exactly the treatment the others need.)

**F15 — The hero overstates its own numbers.** *Walk A results,
`shots/13-results-fold.png`:* "**One is short by €1,091/month.**" The card it
refers to says "Short by **up to** €1,091/month" — Aylin declared "under €1,091",
which could be €1,090 or nothing; the true shortfall is unknown and the card
knows it. In walk D the hero reads "0 routes look open. **One** is short by
€1,235/month" directly above the chip "**2** WITHIN REACH".
**User cost:** on a product that will not say "you are eligible", the headline is
the one place that asserts more than the data supports.

**F16 — Answers are written to disk and restored on the next visit, undisclosed.**
*Hostile walk E.* `localStorage['permit-rulebook.record.v1']` holds
`{"version":1,"answers":{"destination":"all","situation":"none","qualification":"none","citizenship":"BD",…}}`.
Navigating away and returning to `/` restores the completed result immediately.
The copy says "Your answers stay on this device" — true, and read by most people
as "nothing is sent", not as "written down and shown again later". `Start over`
does clear the key completely (verified: 0 keys afterwards) but it is a small
link at the foot of the sidebar and is not framed as an eraser, and it wipes
eleven answers with no confirmation.
**User cost:** on a shared or public machine the next person sees a stranger's
passport, salary band and qualification.

**F17 — The record cannot be kept, shared or reopened.** *All results screens.*
The page stamps itself `RECORD GENERATED 2026-09-08` and `location.href` never
leaves `https://permitrulebook.com/`. Among the 43 controls on the results page
there is no print, no save, no copy, no permalink. *(v0.7 F10 — unchanged.)*
**User cost:** the thing the product calls a record cannot be given to the
employer, the lawyer or the spouse who is going to ask.

**F18 — Overlapping experience bands with no rule for choosing.** *`shots/08-q7.png`:*
`Under 2 years` · `2+ years within the last 5` · `3+ years within the last 7` ·
`5+ years within the last 7`. Someone with five recent years satisfies the last
three. Nothing says "pick the highest that applies", and the choice changes which
routes light up.

**F19 — The free-movement note gives a German example on Spanish and Dutch
pages.** *`shots/50-es-ict-fold.png`; same string in `/netherlands/orientation-year/`.*
"Check registration rules after arrival (**e.g. Anmeldung in Germany**)" appears
in the `A non-EU passport / WHO THIS IS FOR` block on every country's route
pages, including Spain's and the Netherlands'.

### Polish

- **P1** The threshold comparison rail draws three ticks on an unlabelled track
  (`shots/23-m-threshold.png`); the two lower ones nearly overlap as `||` and
  nothing connects a tick to its row below. `tokens.css` calls the rail "the
  standard module for every numeric criterion"; here it renders as decoration.
- **P2** Country tag is `GERMANY` on open and within-reach cards and `DE` on
  not-yet cards, in the same column of the same page.
- **P3** At 390 px the route-page breadcrumb wraps so the separator `·` starts
  the second line: `PR PERMIT RULEBOOK · GERMANY` / `· EU BLUE CARD — GENERAL`.
- **P4** Multi-line declared values orphan the `✎` on its own line ("Situation",
  "German recognition", "Yearly salary", "Experience" —
  `shots/110-edit.png`). *(v0.7 P11 — unchanged.)*
- **P5** `favicon.svg` draws live `<text>` with
  `font-family: Consolas, 'DejaVu Sans Mono', ui-monospace, monospace` and
  `letter-spacing: -1.6` tuned for Consolas. The mark's letterforms therefore
  depend on the viewer having that font; on a machine with neither Consolas nor
  DejaVu the spacing shifts. `favicon.ico` is present as a fallback.
- **P6** One global `social-card.png` for all 23 route pages (the per-route
  `og:title` and `og:description` are correct and specific — the card itself is
  generic and hard-codes `RULES READ 2026-09-08` and `23 routes`).
- **P7** The EU-passport terminal screen leaves roughly 600 px of empty right
  column at 1100 px (`shots/30-ie-result-fold.png`), and offers Niamh nothing
  onward but one generic europa.eu link — the Anmeldung it mentions is not a link.
- **P8** The `✎` correction rows are `div[role=button][tabindex=0]` with no
  `aria-label`; the accessible name is `"Yearly salary€50,700 – €59,373 ✎"`,
  which never states the purpose ("change this answer"). Mouse and keyboard
  activation both work.
- **P9** `--color-band` still carries hover, the search-result highlight, the
  Anabin callout, the "your band" rail and the unlock-step rules. *(v0.7 P9 —
  unchanged.)*
- **P10** Age is the most personally sensitive question in the set and the only
  one with no "why we ask" note; the passport question, which is less sensitive,
  has two.
- **P11** No skip link (low impact — five focusable items precede the content).
- **P12** `schema 0.5.0` sits in the footer between two dates that are meaningful
  to users. *(v0.7 P7 — unchanged.)*

### What is working, and must not be traded away

These were operated and verified, not assumed:

- **The EU-passport terminal state.** Ireland → "No work permit needed", with the
  TFEU art. 45 quote, the read date, and the Anmeldung note. The blocker on the
  record is gone.
- **The passport combobox.** Typing `india` announces "1 match. India highlighted
  — press Enter to record it"; Enter records it; a live region confirms "Passport
  recorded: India". The v0.7 blocker (recording a country the user did not
  choose) is gone.
- **Correction.** `✎` on any declared row returns to that question under
  "YOUR ANSWER — PICK ANOTHER TO CHANGE IT, THE REST ARE KEPT", with a
  `Keep this answer` escape. Works by mouse and by keyboard. The v0.7 dead end is
  gone.
- **Back and reload.** `history.length` grows one entry per answer; browser Back
  steps back one question; a reload restores the walk. The v0.7 "Back destroys
  everything" is gone.
- **Engine vocabulary.** "Not met: situation" and "Points 7 of 6" are gone,
  replaced by "6 points — 6 needed · German +1 · English +1 · Experience +3 ·
  Shortage list +1" and "Needs a job offer".
- **`The source writes 50.700 where this page writes 50,700 — the same number.`**
  The single best sentence in the product.
- **`Our reading, not the authority's words:`** on the zoekjaar card, naming the
  three of five qualifying situations the site does not model, and saying so on
  the card that just returned CRITERIA MET.
- **`Also required — not checked here:`** on every card, and
  `No salary or points threshold on this route — nothing here to fall short of.`
- **The route-page deep link.** `Check yours — Germany, EU Blue Card — general` →
  `/?route=de-blue-card-general` → "Coming from EU Blue Card — general — Germany
  is already on the record.", starting at Q2.
- **All seven outbound official links resolve `200`.** Anabin, arbeitsagentur.de,
  bamf.de, europa.eu, handbookgermany.de, and both GitHub targets.
- **No horizontal overflow at 390 px on any walked screen** (`scrollWidth`
  390/390 everywhere).

---

## Rubric scores — PRODUCT_RUBRIC 1.2

| Lens | Score | Δ vs v0.7 | Evidence (one sentence) |
|---|---|---|---|
| 1 First-run clarity | **4** | = 4 | The mechanism, the privacy promise, the read-date stamp and what the end looks like are all above the first question — only "QUESTION 1 OF UP TO 24" under "A few quick questions" undercuts it (F3). |
| 2 Flow friction | **3** | = 3 | One tap per question against a live ledger, with Back, per-answer `✎` correction that keeps the rest, and a `Keep this answer` escape — against a denominator that swings 24→15→7→14→11, cent-precise salary bands with shared boundaries, and questions worded for a situation the user has excluded (F3, F4, F11). |
| 3 Copy & framing | **3** | **▲ +1** (was 2) | Raw engine field names are gone and the verdict vocabulary is careful, but coverage tiers are still printed to users ("some conditions stated, not asked"), route requirements are asserted about the reader on not-yet cards, and *Ausgleichsmaßnahmen* survives as "additional measures required" (F5, F6, F14). |
| 4 Trust surfacing | **4** | **▲ +1** (was 3) | Per-value quote, source domain, statute and read date on every threshold, plus "The source writes 50.700 where this page writes 50,700", "Our reading, not the authority's words" and "Also required — not checked here" — held off 5 because the results page drops the `lang` attribute and the "German, from …" label the route pages give the same quotes (F2). |
| 5 Result actionability | **4** | **▲ +1** (was 3) | "Steps that would unlock more — each re-checked against the rules" names the routes each change would open, the Anabin link sits on every "I don't know" card, and the route-page deep link carries context into the interview — held off 5 by a closing line that tells a user with an offer they hold a job-search permit, and a record that cannot be saved or shared (F12, F17). |
| 6 Edge states | **3** | **▼ −1** (was 4) | The EU-passport terminal screen, the open-unknown treatment and the no-threshold card are all designed and written — but a mistyped URL lands on GitHub's own 404 page, and the engine returns CRITERIA MET on two mutually exclusive declarations without noticing (B4, F7). |
| 7 Accessibility basics | **3** | **▲ +1** (was 2) | `lang=en`, header/main/footer/nav landmarks, a `role=status` live region through the interview, a 3 px ink focus ring, and a complete keyboard path including the combobox and the `✎` control — but `--color-hold` fails AA at 3.82–4.21:1 on eight results-page elements including "Also required — not checked here", and the results page has no live region and no `H2` (F8, F9). |
| 8 Responsive | **4** | **▲ +1** (was 3) | A full walk at true 390×844 gives `scrollWidth` 390 on every screen and **zero** sub-44 px controls on the interview and route pages — the v0.7 34/22/20 px correction controls are gone; the exceptions are the results page's 84×16 px `Official page` links and 330×41 px route rows (F10). |
| 9 Design fidelity | **4** | **▲ +1** (was 3) | Palette, type scale, rule language, stamp geometry and the identity pair all match `tokens.css` and `identity.css`, and the shared `.masthead-with-stamps` placement holds at both widths — the deviations are small: the comparison rail's ticks map to nothing, `DE` and `GERMANY` disagree in one column, and `--color-band` still carries five jobs (P1, P2, P9). |

**Total 32/45** (v0.7: 27/45, same rubric version).

No lens scored 2 or below. Every lens at 3 is backed: Flow friction by F3/F4/F11,
Copy by F5/F6/F14, Edge states by B4/F7, Accessibility by F8/F9.

### Delta against the previous run

The last full run — `2026-09-06-product-critique-v0.7.md` — used **PRODUCT_RUBRIC
1.2**, the same instrument, so these numbers *are* comparable and are diffed
above. (The run before that, `2026-09-03`, was RUBRIC 1.1 at 29/40 and is not
diffed against anything; `2026-09-04` withdrew its own scores.)

**Six lenses up, two level, one down.** Four of v0.7's four blockers are cleared
and verified by operation (passport picker, engine field names, the false claim
after Start over, and — with B2 of v0.7 — the reduced-salary criterion, which now
renders as "lower amount for a recent graduate, 2026 · **does not apply to you**"
with its own quote). Three of v0.7's frictions are cleared (F2 Back/reload, F3
correction dead end, F8 tap targets on interview and route pages).

**No silent regression, one recorded regression:**

> **Edge states 4 → 3.** The drop is owed two findings, and has them: **B4** (no
> `404.html`; the site's error state is GitHub's) and **F7** (CRITERIA MET on
> contradictory declarations). Neither state was probed in the v0.7 run, so this
> is at least partly a coverage difference rather than a change in the product —
> but the rule is the rule: this needs either a fix or a DECISIONS.md entry
> recording it as a deliberate trade-off. It must not pass silently.

**Carried over unfixed from v0.7, and named again:** F1→F3 (the "up to 24"
counter), F4→F4 (the salary question as threshold table, including the shared
boundaries), F10→F17 (the record cannot be kept), P9→P9 (`--color-band`
overloaded), P11→P4 (the orphaned `✎`), P7→P12 (`schema` version in the footer).

---

## Adoption verdicts

**A — Aylin (Turkish engineer, Berlin offer).** *Would finish; would come back;
would recommend with a caveat.* The Türkiye note at the top of her result is the
best thing that happened to her all day, and "Check your degree in the official
Anabin database" is a concrete next step she did not have an hour earlier. **The
single thing most likely to stop her:** being told her *salary* is short on the
Opportunity Card (B1) when her salary is fine and her bank statement is the
issue — she is exactly the reader who will notice, and the noticing is what costs
the trust.

**B — Niamh (Irish passport).** *Would finish in four taps and leave satisfied.*
"No work permit needed", quoted and dated, is the right answer delivered
correctly. **What stops her going further:** there is nothing further — the
screen is a full stop with one generic link, and the Anmeldung it names is not
clickable (P7).

**C — Maya (Dutch master's, no offer).** *Would finish, come back, and
recommend.* Four questions to a verdict, and the zoekjaar card volunteers that
the site models two of the five qualifying situations and names the three it does
not. **What nearly stopped her:** having to describe herself as "None of these
yet — **exploring my options**" at Q2 when she is not exploring — she has a
specific, recent, qualifying degree, and no option says so.

**D — Rahul (NL, offer, and the same profile as a transferee).** *Would finish;
would come back once his salary changes.* Both runs produce clean, correct,
well-sourced near-misses with exact gaps, and the kennismigrant card even quotes
the IND telling transferees to use the other permit. **What stops him:** as a
transferee he is asked "Gross monthly salary **in the offer**" when he has no
offer (F11), and the result he would forward to his relocation contact cannot be
forwarded (F17).

**E — Hostile.** *Would finish, and would be given a wrong green light.* Clicking
fast produced "1 route looks open — CRITERIA MET" on a profile that had declared
no completed qualification two screens earlier (F7). Back, reload, editing and
Start over all behaved correctly under abuse.

**L — Launch walks.** *Would not arrive.* The route pages answer three of the
four ten-second questions well and the fourth (the number) too far down (F1); the
OG title/description are per-route and accurate and the social card is on-brand;
the favicon is the identity mark. But there is no sitemap, no robots.txt, no
country index and no home-page link to any route page (B2), and the GitHub repo
that is supposed to be the first channel has an empty About box and a README that
never names the site (B3). The launch's own walks fail before the pages get a
chance.

---

## Recommended Adjustments (pick-and-apply)

**1 — Make the results page say which rule was missed, in that rule's own words.**
Replace the hard-coded "The salary this route asks for sits above the band you
declared" with the label the card already computes one block lower
(`what this route asks — living costs` / `— under 30, 2026`), and carry the
card's own "**up to**" into the hero. While in the same file: give the German and
Spanish quotes on the results page the `lang` attribute and the "German, from
arbeitsagentur.de." label that the route pages already give them, and raise
`--color-hold` the way `--color-muted` was raised in tracker #1 so that
"Also required — not checked here" clears AA. *Clears **B1**, **F2**, **F8**,
and half of **F15**.*

**2 — Make the product findable: one commit of plumbing, one paragraph of prose.**
Add `sitemap.xml` and `robots.txt`; add a `404.html` in the product's own design
with a masthead and a link home; add a country index at `/germany/` (etc.) and
link the four of them from the home page footer so no route page is orphaned. On
`permit-rulebook-data`: fill the About box (description, **website =
https://permitrulebook.com**, topics), and open the README with a line that links
the live site. *Clears **B2**, **B3**, **B4**.*

**3 — Move the number above the fold on route pages, and stop asking questions
the user has already answered.** Lift the threshold — the figure, the read date
and the `Check yours` link — above the "WHAT THE CHECKER ASKS, AND WHAT IT DOES
NOT" box (currently the number is at y=1397/2485 desktop, y=2044/4582 mobile);
drop the coverage box below the rules it qualifies. In the interview: word the
salary and funds questions from the declared situation ("in the offer" only when
there is an offer; skip the job-search-funds question, or give it a "doesn't
apply to me", when a job offer has been declared), move the Anabin link onto the
recognition question itself, and add a one-line contradiction notice when two
declarations cannot both be true. *Clears **F1**, **F11**, **F13**, and the
skimming failure in **F7**.*

Pick: **apply all**, **apply 1 and 2**, **apply 2 only**, or name a subset.
Adjustment 2 is the cheapest and unblocks the launch's own distribution;
Adjustment 1 is the one that protects the differentiator.

Remaining findings become tracker issues: `design-flaw` — F3, F4, F5, F6, F9,
F10, F12, F14, F15, F16, F18, F19, P1–P4, P8–P12. `new-need` — F17 (a keepable
record), P5 (outline the favicon's letterforms), P6 (per-route social cards),
P7 (an onward step for EU passport holders).

---

## For the human only

Everything below is a device, a region or a judgment this run could not reach.
Nothing here is an un-operated control the agent simply skipped.

1. **The favicon on a non-Windows device.** `favicon.svg` draws its "PR" as live
   `<text>` in `Consolas, 'DejaVu Sans Mono', ui-monospace, monospace` with
   `letter-spacing: -1.6`. Open `https://permitrulebook.com` on a Mac and on an
   Android phone and look at the tab icon. **A pass** = the two letters sit
   centred inside the tilted square with a clear margin on both sides, as they do
   on Windows. **A fail** = the letters touch or overflow the frame, or the tilt
   reads as a rendering error at 16 px. If it fails, the fix is to convert the
   text to outlined paths.

2. **The social card's baked date.** `social-card.png` hard-codes
   `RULES READ 2026-09-08` and `23 routes`, and the card claims `checked daily`.
   Confirm the deploy pipeline regenerates that PNG on every data refresh, not
   only on a manual build. **A pass** = a link pasted into Slack tomorrow shows
   tomorrow's date. **A fail** = a card that says "checked daily" above a date
   that is a week old, which is the one claim this product cannot afford to have
   go stale in public.

3. **The link preview itself.** The OG tags were read but no preview was
   rendered. Paste `https://permitrulebook.com/germany/eu-blue-card-general` into
   Slack, WhatsApp and X. **A pass** = the per-route title
   ("EU Blue Card — general · Germany · Permit Rulebook") and the description
   naming €50,700 both appear beside the card image. **A fail** = the generic
   site name only, or a cropped card.

4. **23 routes against a v1 scope of 35–40.** The social card and the README both
   state **23 routes** across four countries. The one-pager's v1 scope says
   "8–10 per country (~35–40 total)". Whether v1 ships at 23 with the exclusions
   list carrying the difference, or the number moves, is a scope judgment, not a
   critique finding — but the two documents currently disagree in public.

5. **The French and Spanish interview branches.** FR and ES *route pages* were
   walked; their *question paths* were not (only the country choice). If either
   carries a question set as long as Germany's, F3, F4 and F11 should be
   re-checked there before launch.

6. **Whether the Edge-states drop is accepted.** Lens 6 went 4 → 3 against the
   same rubric version. Under the no-silent-regression rule that needs either the
   two fixes (B4, F7) or a DECISIONS.md entry recording it as a deliberate
   trade-off for the v1 gate. This is the human's call, not the agent's.
