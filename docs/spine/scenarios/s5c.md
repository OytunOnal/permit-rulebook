# s5c — "Exceptions and reduced thresholds" · Acceptance scenario

Status: PROPOSED (written 2026-09-04, amended the same day on the human's
call to ask the passport as a country rather than as a yes/no about Türkiye —
"ilerisi için elimizde veri olur"). Born from the human's s5 verification
report: three scope items taken in full.
Screen change: one new control — the country question (mock:
`docs/spine/design/s5c-country-question.html`). The notice-beside-results
path that s5b built as a guard also gets its first real user; everything else
is existing cards, questions and gap rows.
Slice exits: `tdd` (builder) + `code-review` (main session) — mandatory.

## The three things this slice buys

1. **Reduced salary thresholds** stop being invisible. NL €3,122 (highly
   skilled migrant) and €4,754 (Blue Card), ES €33,085.09 (Blue Card).
2. **The passport question asks a country.** Not "are you Turkish?" but
   "which passport?" — so every agreement we add later hangs on an answer the
   interview already has, and the question never has to change again. The
   EU–Türkiye rights are the first thing hung on it, stated with source and
   date.
3. **Two French talent routes** the dataset had excluded on a wrong reason
   (entreprise innovante, salarié en mission) are modelled.

## Design decisions this slice encodes

1. **A reduced threshold is a second path inside the same route, never a new
   card.** IND and the UGE issue one permit with two salary criteria; showing
   "Highly skilled migrant" twice would invent a distinction the authority
   does not make. The salary criterion becomes an `any`: full threshold, or
   reduced threshold together with the fact that earns it. Bounded gaps keep
   working through the disjunction (the s5b review fix), so a graduate €200
   under €3,122 still reads "within reach", measured against the *reduced*
   number.
2. **One new declarable fact carries all three reduced criteria**:
   `qualification_recent` — "did you graduate, take your doctorate, or did
   your research permit end, in the last 3 years?" It is referenced only by
   the reduced paths, so information-gain pruning asks it only when it can
   change a verdict.
3. **The country is the answer; the rules read it through classes.** A new
   `implies` on a field option lets every country imply its class
   ("Türkiye" → third country, "Ireland" → EU/EEA/CH): all twenty-one
   `citizenship eq third_country` criteria keep passing untouched, and the
   next agreement is one line of data, not twenty-one edits. Nobody answers an
   extra question — the existing question gains a real answer set.
   The list lives in `data/countries.json` (ISO 3166 code, name, class), so
   `dataset.json` stays readable; the field declares `options_from:
   "countries"` and the engine expands it at derive time. The EU/EEA/CH
   membership in that file is itself a claim, so it carries a source and a
   read date like any value, and joins the watch.
4. **The Türkiye rights land as a notice beside the results**, not as a route
   and not instead of the results (that screen is reserved for "you need no
   permit"). Source: the same europa.eu page the EU free-movement notice
   already rests on — machine-watched, so the quote-fidelity gate covers it.
   The tool states the rights; it never claims they change a verdict it
   computed. The notice's own wording says so: the criteria are the same, the
   agreement adds rights *after* legal employment.

4b. **A long answer list gets a control that fits it.** Above a dozen options
   the question renders a filter box over the list instead of a wall of
   buttons (mock approved with this scenario); at or below a dozen, nothing
   changes. It is still a choice from the dataset's own options — no free
   text, no guessing at spellings.

4c. **Scoring must not walk two hundred options.** Question ordering scores a
   candidate by averaging the live-route count over its options; with a
   country list that is ~200 route evaluations per scoring pass, on every
   question of every interview. Options that are indistinguishable to the
   rules (every third-country passport, today) collapse into one equivalence
   class and are scored once — provably the same ordering, at the old cost.
   Guarded by a test that fails if the interview's timing regresses.
5. **ES ships only the limb it can source.** The reduced Spanish threshold has
   two limbs: a CNO 1–2 shortage occupation, and a qualification obtained
   within three years. Only the second is declarable today — the SEPE
   catalogue URL is still unverified — so the first is stated as a
   precondition, not modelled. No number ships on an unverified rule.
6. **The French subtypes are separate routes** (the prefecture issues distinct
   cards), each gated by one narrowly-referenced fact:
   `fr_innovative_employer` and `fr_local_contract`.

## Seed data — all quotes verified in the watched snapshots before writing this

- NL reduced HSM: "Highly skilled migrants reduced salary criterion € 3,122.00"
  plus the three qualifying cases the page spells out ("applied for during the
  residence permit for an orientation year…", "…within 3 years of the
  graduation date or date of the doctoral defence ceremony…").
- NL reduced Blue Card: "Reduced salary criterion European Blue Card
  € 4,754.00" and "The reduced EU Blue Card salary criterion applies to
  graduates who have completed a higher education programme."
- ES reduced: "– Umbral reducido: 33.085,09 €" (UGE PDF, human tier) with the
  Orden's two limbs in the note.
- FR entreprise innovante: « Être recruté dans une jeune entreprise innovante
  ou une entreprise reconnue innovante par le ministère de l'économie » +
  « Avoir un contrat de travail qui prévoit une rémunération brute annuelle
  supérieure ou égale à 39 582 € ».
- FR salarié en mission: « …mobilité entre établissements d'une même
  entreprise ou entre entreprises d'un même groupe » + « Avoir un contrat de
  travail avec l'entreprise qui vous emploie en France » + « Percevoir une
  rémunération brute annuelle supérieure ou égale à 39 582 € ».
- Türkiye: "As a national of Türkiye, your rights to live and work in an EU
  country depend entirely on the national rules of that country. When employed
  legally in the EU, you enjoy the same working conditions as the nationals of
  that country…" (europa.eu, watched).

## Steps

1. **Fresh graduate, Netherlands, €3,400/month.** Degree obtained last year,
   job offer in Amsterdam, age 28. The highly-skilled-migrant card reads
   **criteria met** on the reduced criterion, and its provenance line quotes
   the €3,122 row. Before this slice the same person was told "not yet".
2. **The same graduate at €2,900/month** reads **within reach** with a gap
   measured to €3,122 per month — not to €4,357, and never a bare number
   without its period.
3. **Non-graduate, Netherlands, €3,400/month.** Still "not yet": the reduced
   path needs the fact, and the card says which one. `qualification_recent` is
   asked exactly once, and never appears for a German or Spanish flow.
4. **Turkish passport, Germany, job offer.** The passport question offers a
   country list with a filter; typing "tür" finds Türkiye. Every German route
   then evaluates exactly as it does for any other third-country passport (no
   verdict moves), and a notice sits above the results stating the Türkiye
   rights with its quote, source and read date. Picking Brazil shows no notice
   and identical verdicts; picking Ireland ends the interview on the
   free-movement notice, exactly as "EU / EEA / Switzerland" did before.
5. **French innovative-company hire, €40,000.** "Talent — salarié d'une
   entreprise innovante" reads met; the R&D-link condition and the ministry
   recognition are stated on the card as required-but-not-checked. Answering
   "I don't know" about the employer leaves the route honestly undecided with
   a learn link, never a false met.
6. **French intra-group mission, €40,000, French contract.** "Talent —
   salarié en mission" reads met and the 3-month group seniority is stated as
   a precondition. Without a French contract the route holds and names that
   reason, while the ICT card stays available.
7. **Edge (mandatory):** a Turkish-passport explorer with no offer, no recent
   qualification and unknown recognition, destination "all four" — completes
   the interview, sees the Türkiye notice beside a zero-open result whose
   headline still carries the unlocking steps, and no reduced path claims
   anything.
8. **Regression:** every s5 and s5b persona reaches the same verdicts and the
   same question counts (a German offer-holder still answers ≤ 8); property
   suites green; quote fidelity green with the new quotes included.

## Invariants (property tests)

- Everything from s5 and s5b.
- New: an option that `implies` another value satisfies every criterion the
  implied value satisfies — for any profile and ANY country in the list,
  swapping the passport for another country of the same class changes no route
  verdict anywhere in the dataset. (This is the invariant that makes the
  country list safe to grow.)
- New: every country in `countries.json` carries exactly one class, and every
  class the dataset's criteria reference exists in that file — the same
  both-ways gate the watch coverage uses.
- New: a reduced path never produces a verdict better than the full path would
  for the same salary; and no route reports a gap measured against a threshold
  whose path the profile cannot reach.
- New: `qualification_recent`, `fr_innovative_employer` and `fr_local_contract`
  are asked only while a route that references them is alive and undecided.

## Runs

- mock-green: —
- real-green: — (the NL and FR quotes are machine-verified; the ES reduced
  number is PDF tier and joins the human checklist)

## De-mock births

- Expected: none. Every value in this slice already has its verbatim quote.
