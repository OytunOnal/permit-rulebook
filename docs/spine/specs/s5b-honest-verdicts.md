# Spec — s5b "Honest verdicts and designed edge states"

Origin: product-critique 2026-09-03 (`docs/spine/critiques/2026-09-03-product-critique.md`),
human picked "apply all" (adjustments 1–3). Scenario: `docs/spine/scenarios/s5b.md`
(held-out: make it pass, never edit it to fit).

Two repos: `visa-rules` (sibling, `../visa-rules`) owns data/schema/engine;
`visa-navigator` owns the page (`src/pages/index.astro`). Everything on disk in
English. Both must end green: `npm run check` in visa-rules, `npm run build`
(includes `astro check`) in visa-navigator. Do not touch STATUS/KANBAN/DECISIONS/CONTEXT.

## A. Data & schema (visa-rules)

### A1. Notices — dataset-level, provenanced (closes critique #1)
Add top-level `notices: Notice[]` to the dataset and schema:

```
Notice = {
  id: string,                       // ^[a-z][a-z0-9_-]*$
  when: { field: string, op: "eq" | "in", value?: string, values?: string[] },
  kind: "no-permit-needed",         // enum, room to grow
  title: string,                    // "No work permit needed"
  body: string,                     // plain-language explanation
  source: { quote, source_url, retrieved_at, legal_basis?, history: [] }  // same shape as provenancedAmount minus amount/currency
}
```
Ship one notice:
- id `eu-free-movement`, when `citizenship eq eu_eea_ch`, kind `no-permit-needed`,
  title "No work permit needed", body "EU, EEA and Swiss citizens can live and
  work in Germany, France, Spain and the Netherlands under free movement — the
  routes on this site are for other passports. Check registration rules after
  arrival (e.g. Anmeldung in Germany).",
  source quote **"As an EU national you generally don't need a work permit to work anywhere in the EU."**,
  source_url `https://europa.eu/youreurope/citizens/work/work-abroad/work-permits/index_en.htm`,
  retrieved_at `2026-09-03`, legal_basis "TFEU art. 45 (free movement of workers) — Your Europe", history [].
- Engine: `export function notices(dataset, profile): Notice[]` — matching notices
  for the answered profile (unanswered field → no match).
- `datasetSourceUrls` (watch coverage) must include notice sources; add a
  watch entry `eu-your-europe-work-permits` (html, value-source) so
  `watch:coverage` stays green; run `npm run watch:sources -- --commit` once
  to baseline it (fetch works via node fetch with a Mozilla UA; curl fails TLS).
- `provenancedValuesOf`/`routeProvenance` untouched (notices are not routes);
  `datasetMeta.newest_retrieved_at` must consider notice sources.

### A2. Route preconditions (closes #2)
Routes gain optional `preconditions: string[]` — plain-language conditions the
authority applies that the interview does NOT ask. Schema: array of non-empty
strings. Fill from the curation notes already in the dataset; do not invent:

- de-blue-card-shortage, de-blue-card-general: "Employment contract of at least 6 months", "Regulated professions (health, law…): the professional licence must be in hand"
- de-skilled-academic: "The job matches the recognised qualification"
- de-skilled-vocational: "German appropriate to the occupation", "Secured livelihood"
- de-experienced-worker: "The employer is collectively bound, or the salary threshold applies", "Qualification state-recognised where it was obtained"
- de-researcher: "A signed hosting agreement with a recognised research institution"
- de-ict-card: "At least 6 months with the undertaking before the transfer", "Transfer longer than 90 days, as manager, specialist or trainee"
- de-chancenkarte: "Part-time work limited to 20 hours/week while searching"
- fr-talent-qualifie: "Employment contract of more than 3 months"
- fr-talent-blue-card: "Employment contract of at least 6 months"
- fr-ict: "At least 6 months' seniority in the group", "Mission longer than 1 year in a senior-management or expert role"
- es-blue-card: "Contract or firm offer of at least 6 months", "Application through the UGE (Unidad de Grandes Empresas)"
- es-highly-qualified: "Qualifying employer: large company, strategic-sector SME, or a project of general interest (UGE assessment)"
- es-ict: "Real business activity of the group", "3 months' prior employment in the group"
- es-researcher: "Hosting agreement (convenio de acogida) or contract with the research entity"
- nl-hsm-30plus, nl-hsm-under30: "The employer is an IND-recognised sponsor", "Salary in line with the market rate (IND assessment)", "Regulated professions (e.g. nurses, doctors): BIG registration"
- nl-blue-card: "Employment contract of at least 6 months", "Regulated professions: BIG registration"
- nl-ict: "At least 3 months with the company outside the EU", "Role: manager, specialist or trainee"
- nl-researcher: "The research institution is an IND-recognised sponsor", "Degree giving access to a doctoral programme (or employer-declared equivalent)"
- nl-orientation-year: "Application within 3 years of graduation/research"

### A3. Route result carries `hard_fail: boolean` (for #4)
`evaluate()` results gain `hard_fail` — true iff some failing criterion is a
hard fail under the existing `hasHardFail` semantics (no bounded gap, not
improvable-only). Export nothing new beyond the field.

### A4. Money fields carry a period (for #7)
`FieldDef` gains optional `period: "month" | "year"` (schema enum). Set
`salary_eur_year: "year"`, `salary_eur_month: "month"`, `funds_eur_month: "month"`.
Add `formatEURPer(amount, period?)` → "€1,585/month" / "€4,766/year" / "€X" when
period absent. Engine-side only; the page uses it.

### A5. Criterion `short_reason` (for #9)
All criterion shapes gain optional `short_reason: string` (schema). Set:
- nl-hsm-30plus age criterion: "for 30 or older"
- nl-hsm-under30 age criterion: "for under-30s"
- nl-ict age criteria inside the any-paths: same two strings.

### A6. Split the NL orientation-year question (for #6)
Replace field `nl_grad3y` with two fields:
- `nl_recent_grad` — label "In the last 3 years, did you graduate from — or do research at — a Dutch university or research institution?", options `yes` ("Yes") / `no` ("No"); panel SHORT "Dutch graduate".
- `top200_grad` — label "In the last 3 years, did you graduate from a university ranked in the global top 200?", learn = the IND orientation-year page (existing learn object), options `yes` / `no` / `unknown` ("I don't know", is_unknown). SHORT "Top-200 graduate".
- nl-orientation-year criterion becomes an `any` with two paths (`nl_recent_grad eq yes` | `top200_grad eq yes`), label "recent graduate or top-200 graduate", note carried over.
- Update tests that reference `nl_grad3y` (countries.test.ts; properties are dataset-agnostic). Keep destination-pruning invariant green.

### A7. Versions
`dataset_version` → `2026.09.03`; `schema_version` → `0.3.0` (new top-level
key + field split). Update `engine.test.ts` meta expectation.

### Tests to add (visa-rules)
- notices(): EU profile matches; third-country doesn't; unanswered citizenship doesn't.
- coverage: notice source is watched (existing both-way test will fail until the watch entry exists — good).
- validate: notice without quote fails; preconditions must be non-empty strings.
- hard_fail: walk-A profile (recognition unknown, band_4) — de-blue-card-general.hard_fail === false; de-skilled-vocational.hard_fail === true.
- formatEURPer three cases.
- orientation year: `top200_grad: yes` alone passes; `unknown` leaves the route undecided, not failed.

## B. Page (visa-navigator `src/pages/index.astro`)

### B1. Notice screen (closes #1)
When `notices(ds, answers)` is non-empty and no route is met/near: render the
results as — headline "No work permit needed." (no route count sentence),
subline "Your passport gives you free movement in all four countries; the
routes this site checks are for other passports.", then one `.notice` card per
notice: title, body, provenance line (quote · host · legal_basis · read date)
in the existing `.src` style, and NO strip / NO hold list / NO unlock section.
The declaration panel and Start over stay. Stamp shows. If a notice matches
but some route is still met/near (cannot happen today; guard anyway), render
the notice card above the normal layout.

### B2. Zero-open results (closes #3)
When met+near are both 0 (across visible countries) and unlock rows exist:
- Headline: "Nothing open yet — N step(s) would change that." where N = number
  of unlock rows (qualifier rows count individually).
- Subline gains: "Nearest: <unlockTitle of the best row>." Best row = first by
  (has a route with status met) desc, then (count of routes) desc, then
  dataset order.
- Multi-country: no country has open/near → the FIRST country section that
  contains unlock rows renders `open`; others stay collapsed.
- When met+near are 0 and no unlock rows exist: headline "Nothing open on
  these answers." and subline "Change an answer on the left to explore — or
  see each country's reasons below." (no false hope).

### B3. Preconditions line (closes #2)
On every full card (met/near) and inside every expanded hold body: if the
route has `preconditions`, render
`<div class="precond"><b>Also required — not checked here:</b> item · item · item</div>`
directly under `.why` (before rail/points). Style: `.precond{font-size:.83rem;color:#54513f;border-left:3px solid var(--color-hold);padding:.45rem .75rem;margin-top:.55rem;max-width:34rem}`.
The met chip text stays "Criteria met"; the card's summary sentence must not
restate items that are now in the precondition line (trim summaries of nl-hsm
routes: drop "Employment contract with an IND-recognised sponsor; salary at
market rate." from `summary`).

### B4. Learn boxes only where the unknown binds (closes #4)
`learnBoxFor(r)` renders only when `!r.hard_fail`. (A bounded-gap or
improvable-only fail still qualifies — resolving the unknown can still change
the verdict.) Hold rows auto-open (`open` attribute) only under the same
condition.

### B5. Fallback-required criteria read as "not needed" (closes #5a)
In `failDetail` and `whyFor`: when a failing `eq` criterion's required option
has `is_fallback` and the user's current answer on that field has a `short`,
render the detail line as "Not needed — you already have <short>" and the
summary reason as "not needed with <short>" instead of "Not met: situation".

### B6. Group the situation-gated hold rows (closes #5b)
Within each rendered hold group (per country section, or the flat list):
hold rows whose ONLY failing criteria are on `kind: "path"` fields (i.e.
`situation`) and that have no open unknowns are collected into one
`<details class="hold-group">` whose summary reads "N routes need a job offer,
transfer or hosting agreement — see the steps above" (drop "— see the steps
above" when the section has no unlock rows); the rows render unchanged inside.
Groups form only when N ≥ 3; below that, rows stay individual.

### B7. Copy sweep (closes #7–#10)
- Headline/near note and gap notes use `formatEURPer(amount, fieldDef.period)`:
  "One is within €1,585/month." / "Gap: up to €4,766/year".
- Results subline: "…its official quote and the date we read it from the source."
- `whyFor`/`failDetail`/hold-why: when the failing criterion has `short_reason`,
  show it instead of the field name ("Not met: for 30 or older" → render as
  "Not met: age — for 30 or older"; keep the field name for the panel row).
- Rail: when |pct(own) − bandCenter| < 8, place the "your band" label at
  `left: bMax%` with `transform: translateX(-100%)` and keep it on the second
  line; otherwise unchanged.
- SHORT map: add `nl_recent_grad: "Dutch graduate"`, `top200_grad: "Top-200 graduate"`; remove `nl_grad3y`.

### B8. Dev hooks stay
`?dev-profile=` and `?dev-probe=` remain DEV-only (import.meta.env.DEV).

## C. Mock updates
`docs/spine/design/s5-results.html` gets a precondition line on one card and
the zero-open headline variant as a second `<h1>` example at the bottom
(marked "// variant: zero open"). No new mock file.

## Out of scope
Contrast retune (#11), first-screen "19" (#12) — tracker issues.
Turkish UI, printing/export (s6).
