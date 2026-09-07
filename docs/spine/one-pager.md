# Visa Navigator — One-pager (2026-09-01)

## Problem

Someone looking to work in Europe cannot find a reliable answer to the question "which
permit routes am I eligible for, what am I missing". Official sources are scattered,
their languages mixed, and threshold values change every year; most commercial tools are
lead-gen (the calculator a pretext, the sale the real thing), and even the best of them
offer either page-level dating (VisaMind — and no EU coverage) or closed+paid provenance
(WhereToEmigrate). Nobody says, **per value**, "this number is from that official page,
on that date, with that quote"; when a rule changes the user cannot notice it.

## User

A knowledge worker from outside the EU looking at DE/FR/ES/NL — one who has an offer or is
about to have one. First user: the project owner. No limitation by citizenship: everyone gets
the correct answer from the general "third country" line; citizenship-specific provisions (TR
agreement provisions, the DE privileged-access list) are additive exception data. Interface EN.

## Product

Multiple-choice questions (target 6-7 — A10, to be verified with a slice) → which routes'
criteria appear to be met + **gap analysis** ("€4,000 to go to the Blue Card threshold;
if the occupation is on the shortage list the lower threshold applies"). Code computes
eligibility (not an LLM); every value carries an official source URL + verbatim quote +
retrieval date. The output language is categorical: never "you are eligible" — "threshold
X, your declaration Y" + an IRCC-style disclaimer (a legal condition, see A1/Smartlaw).
Criteria that do not fit into multiple choice (e.g. diploma equivalence/recognition —
Anabin) are asked by declaration ("recognised / not recognised / I don't know"); the tool
makes no equivalence decision, it points to the official equivalence source and shows the
"I don't know" answer as an open gap in the gap analysis (A15). Personal data does not
leave the machine: static site, engine in the browser, no backend.

## Positioning (against research-01)

**"An open EU-work-permit rules dataset carrying a date + a verbatim official quote
per value"** — this combination is empty. WhereToEmigrate publishes provenance but
closed+paid+spread over 200 countries; VisaMind stamps a per-widget date but only
US/CA/UK/AU; Visaora/Workbeyond are blanket-dated; there is no new player on GitHub
(10 searches, 2026-09-01). Evidence of demand: run-abroad 491★ in 3 weeks,
awesome-immigration 1,491★. Distribution: open data + GitHub/HN first (SERP head terms
are a lead-gen wall, no expectation in the first year); SEO long tail as the second
channel (micro-pages generated automatically from the rules). The product is a "tool",
not selling but citing sources; cross-referral with JobRadar in a later period.

## Scope

- **v1:** DE/FR/ES/NL, employment-based routes, 8-10 per country (~35-40 total; counting
  FR "talent" as a single family + a sub-type discriminator), a written exclusion list
  per country (seasonal/trainee/seafarer/artist/investor). A one-person side project:
  the first fill ≈ over a hundred sourced data points (route × criterion ×
  URL+quote+date) — the plan stage spreads this over slices (country-by-country launch).
- **Pipeline v1:** watch + hash/diff + flag (opens an issue, a human updates it with
  quote+date). Source selection according to the bot wall: NL ind.nl (ideal), FR
  service-public F16922, ES the hash of the UGE PDF + a permanent human-reader tier.
  **DE's stable value source is an open problem** (make-it-in-germany is bot-walled,
  the BA announcement has a yearly URL): a spike in the plan stage — candidates:
  headless fetch, watching the BA/BMI announcement index page, or taking DE into the
  human-reader tier as well. Full automation (LLM extraction + code verification) v1.x.
- **Wave 2:** CA + AU (points systems). **Wave 3:** the rest of Europe
  (community + pipeline). **USA:** a separate decision, a separate route type
  (the lottery breaks determinism).
- **Structure:** two repos — `visa-rules` (schema+dataset+engine+pipeline;
  dataset CC-BY-4.0, code MIT, TS+JSON Schema) + `visa-navigator` (Astro
  static site). LLM only for build-time polish of the question wording; no
  runtime RAG ("ask the route a question" v1.x backlog).

## Viability (required by Product; middle back-edge 2026-09-02, decisions through the human gate)

- **Audience (order of magnitude, grounded):** In Germany alone **41,000+ first Blue
  Cards** were issued in 2023; ~113,500 active holders at the end of the period (BAMF
  statistics page, read 2026-09-02). The Blue Card is only one of the 8 DE routes we
  model; with the four target countries and all employment routes the addressable
  audience is of the order of **hundreds of thousands of applicants per year** (*this
  extrapolation is an inference*, the anchor number is only the DE Blue Card).
- **Money:** Transparent **affiliate** (services mandatory for the user's route:
  Sperrkonto, visa insurance, language — labelled "affiliate", multi-provider,
  the disclosure next to the disclaimer) + **GitHub Sponsors** from day one.
  Tracking-free advertising is only reconsidered at the 25-50k visits/month
  threshold; AdSense/tracking networks never (consultant advertising + tracking
  break the positioning and privacy lines). Affiliate integration is a v1.x slice
  — it does not delay v1, revenue starts after v1. **Limit:** affiliate links
  never affect the eligibility result (the decision is in the code, the links
  come after the result) and carry no personal data (a plain outbound link).
- **Success metric (primary):** **Dataset liveness** — the target for the time it
  takes an official change to be written into the dataset is **≤48 hours** (measured
  from the watch slice s4 onwards; before that, manual spot checks) + coverage: in
  v1 4 countries, ~35-40 routes, 100% with quote+date. Secondary: organic usage
  (once a non-data-collecting counter is set up). *Single-curator risk (A13):* on
  holidays/under load ≤48h falls back to "best effort"; a violation is not hidden —
  the read date of every value is already public, the delay is visible on the page.
- **Targets (the human's tempo):** **v1 ≈ 1 week** (remaining slices: gap
  analysis, watch+flag, the FR/ES/NL fill, launch — the slippage risk is in the s5
  curation; if it slips it opens country by country, FR first). **Wave 2 (CA+AU) ≈
  +2 weeks.** 6-12 month horizon: the liveness promise is kept in a measurable
  way, waves 2-3 are live; outside contribution is not a target but a by-product.

## Harvest

WhereToEmigrate's staleness-penalty model (verification age first-class in the
schema) · VisaMind's "Fetched <date>; view official table" UI pattern (pushed
down to per-value) · IRCC+relokate disclaimer texts · the PathWise rule-pack
vocabulary + coverage tiers (fully modeled / partial / source-captured-only) ·
Workbeyond's per-route page shape · the awesome-immigration route inventory (a
scanning source).

## Assumptions

`docs/spine/assumptions.md` (A1-A15; with their research statuses). The most
critical ones to be verified with a slice: A9 (the value of the gap analysis),
A10 (6-7 questions are enough), A13 (watch+flag is sustainable solo), A15
(criteria can be expressed by declaration).
