# s8 — A route the authority closes to a passport, and a question the sources do not settle

**Why now.** France reads differently from the Netherlands and Germany. There
the product stated one condition too many. Here it may be showing a nationality
routes that do not exist for them — the heavier failure, because a reader acts
on a route, not on a condition.

**What the two reads found** (deep-researcher, 2026-09-10, issue #11 and a
second, narrower pass; every claim carries the authority's own sentence):

- **The intra-corporate transfer permit is closed to Algerian nationals, in the
  authority's own words.** `service-public.gouv.fr/particuliers/vosdroits/F33952`
  states the eligibility as *"Vous êtes étranger (sauf Européen ou Algérien)"*,
  and the page's own routing offers three doors — *"Vous êtes Européen / Vous
  êtes Algérien / Vous êtes d'une autre nationalité"* — sending an Algerian
  reader to a different fiche entirely. This is not an inference. The product
  currently offers `fr-ict` to Algerian passports.
- **For the four passeport-talent routes, the sources conflict, and the second
  read was told to report the conflict rather than resolve it.** On one side:
  the Conseil d'État holds that *"les dispositions du code de l'entrée et du
  séjour des étrangers et du droit d'asile qui sont relatives aux différents
  titres de séjour … ne sont pas applicables aux ressortissants algériens"*
  (CETATEXT000053612496) — though the case itself concerned a *commerçant*
  certificate, not a talent card; and service-public's own page for Algerian
  nationals (F35600) enumerates sixteen situations, read to the end, none of
  them a talent card or an EU Blue Card. On the other side: Directive (EU)
  2021/1883 Article 3 puts every third-country national in the Blue Card's
  personal scope, its eight exclusions name no bilateral-agreement class, and
  Article 4 lets a bilateral agreement be *more* favourable, never narrower —
  and the French transposition, CESEDA L421-11, says only *"L'étranger qui
  occupe un emploi hautement qualifié…"*, with no nationality carve-out.
- **No page says, in one sentence, that an Algerian may or may not hold a
  passeport talent.** That absence was searched for on service-public,
  france-visas, the ministry and the ANEF portal, and is recorded as
  "presence could not be verified" rather than as an answer.

## The scenario

**An Algerian passport, France.**

1. The reader answers the interview with an Algerian passport and a qualified
   job offer in France.
2. `fr-ict` is **not among the routes offered**. Where it would have been, the
   reason says the authority's own words: this permit's page states it is for a
   foreigner who is not European and not Algerian.
3. The four passeport-talent routes are shown **as they are today — scored, not
   hidden** — and above them stands a notice this reader alone sees: France
   applies the agreement of 27 December 1968 to Algerian nationals instead of
   the code these rules come from; the administration's own page for Algerians
   lists sixteen situations and none of them is one of these cards; the EU
   directive behind the Blue Card does include Algerian nationals in its scope;
   **no official page found says which way it falls**, and the product does not
   pretend to know. The notice links the reader to the page that is theirs.
4. A French passport, a Turkish passport, any other: nothing changes anywhere —
   `fr-ict` is offered as before, and the notice does not appear.
5. On the route pages, which have no reader: `fr-ict` states who it is not open
   to, with its quote and date; the four talent pages carry the same unsettled
   question in the same words, so a page is never quieter than a card.
6. `npm run check` in both repositories, quote fidelity over the new sources,
   and the name sweep stay green.

## The build

**Data repository.**

1. A criterion may exclude answers, not only require them: the criterion union
   gains `{ field, op: "not-in", values: string[] }`, with the same
   `CriterionExtras` (source, label) every other operator carries. It is the
   operator the dataset has needed since a route first had to say "not you":
   `eq` and `in` can only name who a rule is for, and an authority that writes
   "sauf Algérien" is naming who it is not for.
2. Validation refuses a `not-in` whose `values` are empty, whose field has no
   vocabulary, or that names an answer the field cannot take — the same rules
   `in` already lives under. Schema **0.7.0** (additive).
3. `fr-ict` gains that criterion for `DZ`, quoting F33952's own eligibility
   sentence with `retrieved_at: "2026-09-10"`. The verdict reason must read as
   the page reads: this permit is not for an Algerian passport, and here is
   where the page says so.
4. A notice for Algerian passports in France — `when: { field: "citizenship",
   op: "eq", value: "DZ" }`, the shape the Türkiye notice already uses. Its
   words carry the conflict without resolving it, and carry both quotes: the
   Conseil d'État's and the directive's. It points at
   `https://www.service-public.gouv.fr/particuliers/vosdroits/F35600/1?idFicheParent=F33952`,
   the page the administration itself sends an Algerian reader to.
5. Both new sources join the watchlist, each sliced to the section its quote
   comes from, **re-baselined in the same commit**
   (`npm run watch:sources -- --only=<id> --commit`).
6. `data/exclusions.md` records what an Algerian national with a qualified job
   offer actually applies for — the certificat de résidence under the 1968
   agreement — and that the talent question is open, with the date it was
   searched for and not found.

**Site repository.**

7. The notice renders where the Türkiye notice renders, with its quotes glossed
   like every other quote, and its link opening the page for Algerian readers.
8. A route the reader's passport is excluded from does not appear among the
   results as met, near or held — it is not "not yet", it is not theirs. Where
   the product would otherwise be silent about a route it has, the reason says
   why, in the authority's words.

**Tests, in both repositories.**

- An Algerian passport does not see `fr-ict`; a Turkish one does; a French one
  sees neither (free movement).
- The notice appears for an Algerian passport in France and for nobody else,
  and carries both quotes.
- A `not-in` criterion with an empty list, an unknown answer, or no source
  fails validation.
- The route page for `fr-ict` states who it is not open to.
- The four talent routes are still scored for an Algerian passport — the
  product does not decide an open question by hiding the routes.

## Runs

- mock-green: —
- real-green: —
