# Spec — s5c "Exceptions and reduced thresholds"

Scenario (held-out, approved 2026-09-04): `docs/spine/scenarios/s5c.md`.
Mock (approved with it): `docs/spine/design/s5c-country-question.html`.
Origin: the human's s5 verification report, all three scope items taken.

Repos: `visa-rules` (sibling `../visa-rules`) owns data/schema/engine;
`visa-navigator` owns the page. English on disk. Both must end green:
`npm run check` (visa-rules) and `npm run build` (visa-navigator, runs
`astro check`). Do not touch STATUS/KANBAN/DECISIONS/CONTEXT — those are the
main session's. Do not commit or push.

Environment: no python. Use node for scripted edits or the Edit tool. Never
write JSON with PowerShell `Out-File` (a cp1252 round-trip double-encoded
`state.json` once; the guard test now catches it, don't trip it). The watch
CLI is `npm run watch:sources -- --commit`; `npm run check` = build + validate
+ coverage&quotes + test.

**Every quote below was verified in the watched snapshots before this spec was
written. Extract quotes from `watch/state.json` programmatically — never
retype them.** Where a new source is needed, fetch it, quote it, and add it to
the watchlist in the same change (a marker/source edit without a re-baseline
is what made a false flag on 2026-09-02).

---

## A. Engine and schema (visa-rules)

### A1. `implies` on a field option
`FieldOption` gains `implies?: string[]` (schema: array of non-empty strings).
Semantics: an answer satisfies a criterion when its own value matches **or**
its `implies` list contains the criterion's value. Applies to `eq` and `in`,
and to notice `when` matching (A5) — one predicate, used everywhere, so a
country can never satisfy a route but miss a notice.

Points tables key on the raw answer value only (no `implies` expansion) —
today no points item reads `citizenship`; add a comment saying why, so a later
reader doesn't "fix" it.

### A2. The country list — `data/countries.json` (new file)

```
{
  "classes": {
    "eu_eea_ch": { "label": "...", "source": <ProvenancedText>, "members": ["AT","BE",...] },
    "third_country": { "label": "..." }          // everything not in eu_eea_ch
  },
  "countries": [ { "code": "TR", "name": "Türkiye" }, ... ]   // ISO 3166-1 alpha-2
}
```

- `countries` carries the full ISO 3166-1 list (names as commonly written in
  English; "Türkiye", not "Turkey"). It is a vocabulary, not a rule — no
  per-country provenance.
- `classes.eu_eea_ch.members` **is** a rule: it decides who needs a permit.
  It carries a `ProvenancedText` source like any value.
  - EU-27: fetch `https://european-union.europa.eu/principles-countries-history/eu-countries_en`
    (verified fetchable, ~5 kB of text) and quote the sentence that establishes
    the membership list.
  - Switzerland: already in a watched snapshot — quote verbatim from
    `eu-your-europe-work-permits`: "Under the EU-Switzerland agreement on the
    free movement of persons, Swiss nationals are free to live and work in the
    EU."
  - Iceland / Liechtenstein / Norway (EEA): try, in order, an official EEA
    source that a plain fetch can read. **If none is fetchable**, still classify
    the three as `eu_eea_ch`, record the EU-countries source for the class, and
    add (a) a human-tier watch entry for the EEA source and (b) a line in a new
    `data/verify-s5c.md` naming exactly this gap. Do not silently classify
    without saying what is unsourced.
- Every source added here joins `watch/watchlist.json` as `value-source` and is
  baselined in the same change. `datasetSourceUrls`/`checkQuotes` must cover
  the class sources, so the fidelity gate protects them like any threshold.

### A3. `options_from` on a field
`FieldDef` gains `options_from?: "countries"` (schema: enum with that single
value for now). `deriveQuestions` expands such a field into one option per
country: `{ value: <ISO code>, label: <name>, implies: [<class>] }`, ordered by
name. `dataset.json` keeps only the field declaration — the list stays in its
own file.

`citizenship` becomes that field:
```
{ "id": "citizenship", "label": "Which passport will you apply with?",
  "type": "enum", "options_from": "countries" }
```
Its two hand-written options go away. **No route criterion changes** — they
keep reading `eq third_country` / `eq eu_eea_ch`, satisfied through `implies`.

Validation: every class referenced by a criterion or notice must exist in
`countries.json`; every country must have exactly one class. Enforce in
`validateDataset` (semantic errors, like the route-id and threshold checks).

### A4. Scoring must not walk the list
`orderByEliminationPower` scores a candidate by averaging live-route count over
its options. Group options into equivalence classes first — options whose
`(value + implies)` set is indistinguishable to every criterion that reads the
field — score one representative per class, weight by class size. The ordering
must be identical to the naive computation; prove it with a test that compares
both on the shipped dataset, and keep the suite's runtime in the same
ballpark (it was 146 s once; it is ~6 s now).

### A5. Notices match through `implies`
`notices()` uses the A1 predicate. The existing `eu-free-movement` notice keeps
`when: { field: citizenship, op: eq, value: eu_eea_ch }` and now fires for
"Ireland" as it did for the old EU option.

New notice:
```
id: tr-ankara-rights
when: { field: citizenship, op: eq, value: "TR" }
kind: "extra-rights"                      // new enum value in types + schema
title: "Türkiye: extra rights once you are legally employed"
body:  the route criteria are the same as for any other non-EU passport; the
       EU–Türkiye agreement adds rights after legal employment, not different
       entry criteria. Keep it plain and non-advisory.
source: quote verbatim from the watched europa.eu snapshot, starting
       "As a national of Türkiye, your rights to live and work in an EU country
       depend entirely on the national rules of that country." — include as
       much of the passage as reads cleanly; retrieved_at 2026-09-04.
```
Rendering rule (already built in s5b): a notice fires **beside** the results
unless nothing is open, in which case the no-permit notice replaces them. An
`extra-rights` notice must **never** replace results — guard it by kind, and
test that a Turkish passport with zero open routes still sees the normal
zero-open screen plus the notice.

### A6. Reduced thresholds — a second path, not a second card
New field, placed after `qualification`:
```
{ "id": "qualification_recent", "kind": "improvable", "type": "enum",
  "label": "Did you graduate, take your doctorate, or did a research permit
            end, within the last 3 years?",
  "options": [ {yes, short: "a qualification from the last 3 years"}, {no} ] }
```
Turn the salary criterion of these routes into an `any` (keep the existing
criterion verbatim as the first path):

| Route | reduced path criteria | amount | quote source |
|---|---|---|---|
| nl-hsm-30plus | `qualification_recent eq yes` + `salary_eur_month gte 3122` | 3122 | `nl-ind-required-amounts`: "Highly skilled migrants reduced salary criterion € 3,122.00" |
| nl-hsm-under30 | same | 3122 | same |
| nl-blue-card | `qualification eq degree` + `qualification_recent eq yes` + `salary_eur_month gte 4754` | 4754 | `nl-ind-required-amounts`: "Reduced salary criterion European Blue Card € 4,754.00" |
| es-blue-card | `qualification_recent eq yes` + `salary_eur_year gte 33085.09` | 33085.09 | UGE PDF (human tier, no text snapshot): "– Umbral reducido: 33.085,09 €" — take the wording the human verified on 2026-09-04 |

Notes to carry (not preconditions — they explain the path):
- NL HSM: the page states three qualifying cases (during an orientation-year
  permit; having held one; or applying within 3 years of graduation, doctoral
  defence, or a research permit expiring). Quote the case list in the path's
  `note`; the modelled fact is the 3-year window.
- NL Blue Card: "The reduced EU Blue Card salary criterion applies to graduates
  who have completed a higher education programme."
- ES: the Orden gives two limbs. Only the qualification-within-3-years limb is
  modelled; add a **precondition** to es-blue-card naming the other:
  "Reduced threshold also applies to shortage occupations in CNO-2011 groups
  1–2 (SEPE catalogue) — not checked here."
- `nl-ict` restates the HSM amounts. Leave it on the full criterion; add a
  route note saying the reduced criterion is not evidenced for ICT.

The threshold-consistency validator keys on `field + quote`, so each new quote
is its own entry — no conflict with the existing ones.

### A7. The two French talent routes
New fields (each referenced by exactly one route, so pruning hides them):
```
fr_innovative_employer: enum yes / no / unknown(is_unknown), learn ->
  https://www.service-public.gouv.fr/particuliers/vosdroits/F16922
  label: "Is the French employer a recognised innovative company (jeune
          entreprise innovante, or recognised by the ministry of the economy)?"
fr_local_contract: enum yes / no
  label: "Will you have an employment contract with the French entity you are
          moving to (not only with your employer abroad)?"
```
Routes (mirror the existing FR routes' citizenship / destination /
localization criteria exactly):

**fr-talent-innovante** — "Talent — employee of an innovative company"
- `situation eq offer`, `fr_innovative_employer eq yes`,
  `salary_eur_year gte 39582`
- quote for the threshold: « Avoir un contrat de travail qui prévoit une
  rémunération brute annuelle supérieure ou égale à 39 582 € » (extract from
  the `fr-f16922-talent` snapshot, entreprise-innovante block)
- preconditions: "Duties directly linked to the company's research and
  development project"; "The employer's innovative status is recognised by the
  ministry of the economy"
- info_url: F16922

**fr-talent-mission** — "Talent — employee on assignment (salarié en mission)"
- `situation eq ict`, `fr_local_contract eq yes`,
  `salary_eur_year gte 39582`
- quote: « Percevoir une rémunération brute annuelle supérieure ou égale à
  39 582 € » (same snapshot, salarié-en-mission block)
- preconditions: "At least 3 months' seniority in the group that employs you";
  "The move is between establishments of the same company or group"
- info_url: F16922

`data/exclusions.md`: remove these two rows from the France table and add one
line recording that they were modelled in s5c (keep the table honest about
what is still out).

---

## B. Page (visa-navigator `src/pages/index.astro`)

### B1. The long-list question control
When a question has **more than 12 options**, render the mock's control instead
of the button stack: a text input that filters, and a scrollable list of
matching options (`.csearch`, `.clist`, `.copt` — class names and styles from
`docs/spine/design/s5c-country-question.html`, moved into the page's style
block; the mock file itself is not shipped).

- Filtering is case- and diacritic-insensitive on the label ("turk" finds
  "Türkiye"). Do it with `localeCompare`-style folding, not a hand-rolled map.
- Keyboard: typing filters; Enter picks the first match; Tab reaches the list;
  each option stays a real `<button>` so the existing focus ring applies.
- Show at most 60 matches at a time; when nothing matches, say so in the list
  area ("No country matches — check the spelling") rather than showing an empty
  box.
- The class of the highlighted option renders on the right in mono
  (`extra rights under the EU agreement` / `non-EU passport` / `EU, EEA or
  Switzerland — free movement`), derived from the option's `implies`, never
  hardcoded per country.
- 12 or fewer options: unchanged button stack. No other question may change
  shape.

### B2. Labels
`SHORT`: `citizenship: "Passport"`, `qualification_recent: "Recent
qualification"`, `fr_innovative_employer: "Innovative employer"`,
`fr_local_contract: "French contract"`. The declaration panel shows the
country name (the option label), as it does for any answer.

### B3. Notices beside results
No new code expected — verify the `extra-rights` notice renders above the strip
with results intact, and that the zero-open branch still shows its steps.

---

## C. Tests (visa-rules unless noted)

Write these first; they are the scenario turned into assertions.

1. `implies`: a country answer satisfies `eq third_country` / `eq eu_eea_ch`;
   an answer without `implies` behaves exactly as before.
2. **Class invariance (the one that makes the list safe to grow):** for a set
   of generated profiles, swapping the passport for any other country of the
   same class leaves every route's status, gap_max and gap_points identical.
3. Notices: `TR` fires the extra-rights notice; `BR` fires none; `IE` fires the
   free-movement notice. An extra-rights notice never suppresses results.
4. Question count: the interview never gains a question because of the country
   list (a German offer-holder still answers ≤ 8); `qualification_recent` is
   asked only when a reduced path can decide something; the FR fields only in
   FR flows.
5. Scoring: equivalence-class ordering equals the naive ordering on the shipped
   dataset, for several partial profiles.
6. Reduced thresholds: the scenario's steps 1–3 as unit assertions, including
   the gap being measured to the reduced number and carrying `/month`.
7. FR routes: steps 5–6, including "I don't know" on the innovative employer
   leaving the route undecided (not failed) with a learn link.
8. Validation: a country with no class fails; a criterion referencing an
   unknown class fails; a notice whose `when` value is not a country or class
   fails.
9. Coverage/fidelity: the class sources are watched and their quotes verify.

Navigator: no test framework there — verification is the acceptance walk, run
by the main session.

---

## Out of scope
The ES shortage-catalogue limb (SEPE URL unverified); citizenship exceptions
beyond Türkiye (the mechanism ships, the data does not); the FR Blue Card's
3-in-7 profession list (arrêté not fetched); reduced criteria for `nl-ict`.
