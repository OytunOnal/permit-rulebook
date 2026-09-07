# Research 01 — Assumption testing (2026-09-01)

The Brainstorm Loop's first research half-round. Four parallel agents tested A1-A8 against
fetched sources. Every line is marked **found** (seen on the page) or **inferred** (an
inference from what was seen); those that could not be fetched are under "Unverified". The
agent reports are in full in the session record; what is here is what entered the decision.

---

## Decision input

**Recommendation: CONTINUE** — with positioning revisions. No finding emerged
that would kill the idea; three assumptions weakened but their weakened forms
still define a defensible position:

> **"An open, EU-work-permit rules dataset carrying a date per value + a verbatim
> quote from the official source"** — nobody is doing this combination (A2's
> weakened form + A7), its feasibility has been proven by a one-person repo
> (PathWise), the evidence of demand is strong (run-abroad: 491 stars in 3 weeks),
> and the distribution channel is not SEO but GitHub/HN first (A8 revised).

Revisions (to go into the one-pager):
1. **Scope count:** not 6-8 per country but **8-12 routes, ~40 total** (A5); a
   written **exclusion list** for each country (seasonal, trainee, seafarer,
   artist, investor) is necessary as a design artefact. The FR "talent" family
   should be modelled as a single route + a sub-type discriminator (the 2024
   reform merges the sub-types: source below).
2. **The pipeline reality:** threat number 1 is not JS but **bot-blocking**
   (A3). make-it-in-germany (Radware), france-visas + immigration.interieur
   (403) block a plain fetcher. Design: a *watchable* source selection per
   country (NL: ind.nl, FR: service-public.gouv.fr F16922, DE: BAMF text + the
   yearly value announcement, ES: the hash of the UGE PDF) + a "human reads
   after the changed-flag" tier. In ES the values are in a glyph-encoded PDF →
   Spain is permanently in the human-reader tier.
3. **Double citation in the schema:** in DE and ES the law gives a **formula** (the
   Beitragsbemessungsgrenze ratio; 1.4× the INE average), the euro value is announced
   elsewhere. Field: `value_source` (the announcement) + `legal_basis` (the law/article).
4. **The output language is a legal design requirement** (A1): never "you are
   eligible"; "threshold X, your declaration Y" + an IRCC-style disclaimer. No
   free-text case entry — this is the condition for staying outside the RDG's
   "rechtliche Prüfung des Einzelfalls" line.

---

## Assumption decisions

### A1 — The legal position → `research-confirmed` (conditional)
- **found:** § 2 Abs. 1 RDG: "Rechtsdienstleistung ist jede Tätigkeit in
  konkreten fremden Angelegenheiten, sobald sie eine rechtliche Prüfung des
  Einzelfalls erfordert." (https://dejure.org/gesetze/RDG/2.html)
- **found:** BGH 09.09.2021 – I ZR 113/20 (Smartlaw): software producing standard
  output from multiple-choice answers is *not* within the scope of the RDG — "feste
  Routine", the user does not expect a "rechtliche Prüfung seines konkreten Falls"
  (https://www.lto.de/recht/juristen/b/bgh-izr11320-vertragsgenerator-smartlaw-legal-tech-keine-unzulaessige-rechtsdienstleistung-rdg-rechtsberatung).
- **found:** The German state's own Quick-Check carries no disclaimer; the
  protection is entirely a softening of wording: "you have good chances", "You may
  be eligible" (https://www.make-it-in-germany.com/en/visa-residence/quick-check).
- **found:** The IRCC template (to be harvested): "We won't make any
  immigration decision based on your answers. … They won't consider any result
  you get through this questionnaire in their decision."
  (https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=010&top=4)
- **inferred:** Visa Navigator's mechanism sits on the Smartlaw pattern, even more
  cleanly (it does not even produce a document). Conditions: categorical output language,
  no free-text case entry, no LLM/human interpretation, an IRCC-style disclaimer.
- **Limit:** no specific research was done for FR/ES/NL — analogy. Smartlaw is
  about a contract document, not migration. Not full proof, support.

### A2 — "Narrow+live > broad+stale" → `research-confirmed` (in weakened form)
- The strong form ("competitors show no date/source at all") **collapsed**:
  - **found:** The WhereToEmigrate methodology page publishes a provenance log: "Of
    the 12,275 individual visa-rule facts in our provenance log, 10,164 (83%) are
    attributed to a statutory public agency" + a staleness-penalty model ("6–12
    months · −5", "12+ months · −15") (https://wheretoemigrate.io/methodology).
  - **found:** VisaMind stamps a page-level date: "Fetched Jul 29, 2026"
    (https://www.visamind.com/en/united-states/tools/processing-time-tracker)
    — but its coverage is only US/CA/UK/AU.
- The weakened form **held everywhere**: no competitor gives the date + source
  URL + verbatim quote pair **per value**; Visaora gives none at all ("No
  links to official government sources, retrieval dates, or last-updated
  timestamps", https://visaora.io/), Workbeyond page-level "Updated Jun 2026".
- **The differentiator narrowed and became clearer:** per-value provenance ×
  open data × EU work permits.

### A3 — Official pages can be watched → partly; country-by-country table (`research-confirmed` NL/FR, `research-refuted` ES-HTML, DE risky)
| Country | Status | Evidence |
|---|---|---|
| NL | **The best.** A single stable EN HTML URL, all thresholds, with history | "€5,942.00" HSM 30+, ind.nl/en/required-amounts-income-requirements (**found**) |
| FR | Passes — france-visas 403, but service-public.gouv.fr F16922 carries all the talent thresholds in HTML | "39 582 €", "59 373,00 € brut annuel" (**found**) |
| DE | Risky — make-it-in-germany Radware bot wall; BAMF is clean but carries no numbers; the values are in the BA bulletin with a yearly URL | "50.700 Euro" / "45.934,20 Euro" (arbeitsagentur.de newsletter 03-2026, **found**) |
| ES | Fails as HTML — the values are in the UGE PDF, the PDF text layer is machine-unreadable (glyph-encoded) | The BOE order gives the formula: "1,4 veces la ganancia media anual bruta" (https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-2142, **found**) |

### A4 — Source language is not an obstacle → `research-confirmed` (ES partial)
- **found:** The BAMF page is in 6 languages including EN **and TR**; make-it-in-germany
  is a full EN portal (accessible to a human, not to a bot). FR: F16922 has an EN
  toggle. NL: ind.nl/en a full portal. ES: UGE has EN HTML pages but the functional
  documents are Spanish PDFs; there is no make-it-in-germany-style EN aggregator.

### A5 — 6-8 routes per country → `research-refuted` (revised: 8-12, ~40 total)
- **found:** DE 8-9 (BAMF categories + Blue Card + Chancenkarte + job-seeker). ES
  7-8. FR: the talent family ~8 variants + 4 non-talent ≈ 12 (service-public N110;
  info-droits-etrangers.org; the 2024 merger reform). NL: the IND official list
  has **20** entries, main employment ~10 (ind.nl/en/residence-permits/work).
- **inferred:** No explosion, but the honest number is ~40; an exclusion list is essential.

### A6 — CA/AU fit → `untested` (wave 2, out of scope this round)

### A7 — The open-dataset gap still stands → `research-confirmed`
- **found:** 10 GitHub/web searches; no new player. The closest: **PathWise**
  (https://github.com/SandeepMadhavarapu/PathWise, 1 star) — "Every regulatory value …
  lives in a versioned rule pack carrying its authority, source URL and verification
  date" — but its field is US student status. Not a competitor; proof that the pattern
  can be set up by one person, and a source for the schema vocabulary.

### A8 — A static site survives in SEO → `research-refuted` on head terms, `research-confirmed` on the community channel (revised)
- **found:** The results returned for the query "blue card germany salary threshold
  2026" are a lead-gen/law-firm wall (jobbatical, savoryandpartners, aldaglegal...);
  no official sites. In the NL query there is no ind.nl, there is the Big-4.
- **found:** run-abroad **491 stars, opened on 12 August 2026** (~3 weeks)
  (https://api.github.com/repos/RadishXN/run-abroad); awesome-immigration
  **1,491 stars**; Visalist Show HN "565 points, 252 comments".
- **inferred (revised positioning):** distribution = open data + GitHub/HN first; SEO
  long tail as the second channel; zero expectation from head terms in the first year.

---

## Harvest (harvesting list)

1. **The WhereToEmigrate staleness-penalty model** → verification age as a first-class
   field in the schema; instead of silently serving the old value the UI lowers confidence.
2. **VisaMind's "Fetched <date>; <agency> data updates monthly. View official table"
   line pattern** → UI language to be copied verbatim in its per-value version.
3. **IRCC + relokate disclaimer texts** → a ready template (their verbatim
   quotes are in the research).
4. **The PathWise vocabulary** → "versioned rule pack carrying its authority,
   source URL and verification date" + saying the unknown ("it says so when it
   doesn't know") + coverage tiers (fully modeled / partial /
   source-captured-only) — the ES human-reader tier sits on this triple.
5. **The Workbeyond per-visa page structure** (threshold table+fee+duration+FAQ)
   → a consumable route page shape; our difference is date+quote+source per cell.
6. **Visaora's micro-page SEO pattern** → route/question pages generated
   automatically from the rules (for the long-tail channel).
7. **awesome-immigration** → the first scanning source for the route inventory (not a competitor).

## New findings (loop-until-dry input)

This round **produced new findings** (bot-blocking, the ES PDF problem, the FR talent
family, the formula/value distinction, SERP composition) — by the rule the loop is
not dry. But all of the findings are *design/plan level* constraints; none of them is
of the kind that puts the concept in question and all of them can be addressed in the
one-pager + plan stages. As the skeleton pace requires, the loop closes here; if the
need for a second research round arises (if the one-pager devils-advocate or the plan
stage shows evidence) it is returned to with a back-edge.

## Unverified (what could not be fetched this round)

- gesetze-im-internet.de (ECONNREFUSED ×4) — the §18g formula claim is inferred.
- BGH I ZR 113/20 court text (relayed via LTO).
- Current ES euro thresholds (≈€41,356 / €33,085 — search results only; the
  official carrier is the unreadable UGE PDF).
- Per-value dating inside the WhereToEmigrate paid report (paywall).
- IAA practice note PDF (UK, not a target country).
- FR/ES/NL unauthorised-legal-service rules (A1 stands by analogy).
