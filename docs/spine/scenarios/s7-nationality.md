# s7 — A statement can name the nationalities it does not bind

**Why now.** The product asks which passport a reader would apply with, and
then scores them against conditions that, for some passports, the authority
itself sets aside. Found by the human on the live site (data #7), diagnosed as
a class (data #8): `citizenship` is used in exactly one way in all 23 routes —
`eq third_country` — so no route *can* say "for nationals of X this does not
apply", even where an authority says exactly that.

**What the Netherlands audit found** (deep-researcher, 2026-09-10, issue #9;
every claim below carries the authority's own sentence):

- The IND scopes its carve-out by naming the permits: *"Have you found work as a
  highly skilled migrant? Or work as a researcher under Directive (EU)
  2016/801? Normally, only recognised sponsors can apply for these residence
  permits."* followed by *"For employees with Turkish nationality, a recognised
  sponsor is not required. You can also submit the application yourself."*
  (https://ind.nl/en/turkish-citizens-and-living-in-the-netherlands, read
  2026-09-10). So the carve-out covers `nl-hsm-30plus`, `nl-hsm-under30` and
  `nl-researcher` — **not** the Blue Card and **not** the ICT permit, whose
  pages never name Turkish citizens at all.
- `nl-blue-card` was already right (the IND states recognition is not required
  for that permit, and the dataset says so). `nl-ict` states no sponsor
  condition. `nl-orientation-year` already carries an honest caveat and the
  audit found nothing more specific to resolve it with.
- **MVV is missing from the dataset entirely.** Every Dutch route's page states
  that a provisional residence permit is needed, and the IND lists eleven
  nationalities that need none: *"You do not need an MVV if you have the
  nationality of one of these countries. Australia / Canada / Japan / Monaco /
  New Zealand / Vatican City / United Kingdom / United States / South Korea /
  Switzerland / An EU/EEA Member State."* (https://ind.nl/en/mvv-exemptions,
  read 2026-09-10). Turkey is not among them.

## The scenario

**A Turkish passport, the Dutch highly skilled migrant route.**

1. The reader answers the interview with a Turkish passport and a salary above
   the threshold.
2. The results screen shows the highly skilled migrant route as it does today —
   and the line "Your employer must be a sponsor the Dutch immigration service
   (IND) recognises" **is not among the conditions stated for this reader**.
   In its place, under the heading "Not required for your passport" (the
   build's wording — one heading serves the Turkish carve-out and the ten MVV
   exemptions alike; the draft said "for a Turkish passport"), the IND's own
   sentence and the day it was read, glossed like every other quote.
3. The same reader sees, on the same card, that a provisional residence permit
   (MVV) is needed — because Turkey is not on the exemption list.
4. The reader changes the passport to Japanese and walks again: the sponsor
   condition is stated, and the MVV line is gone.
5. On the route page itself — which has no reader and no answers — both the
   condition and its carve-out are shown, each with its quote and date, so the
   page remains a full statement of the rules.
6. `npm run check` in both repositories, quote fidelity over both new sources,
   and the name sweep stay green.

## The build

**Data repository.**

1. `RouteStatement` gains an optional carve-out. Narrow on purpose — the only
   field a carve-out may key on today is the passport, because that is the only
   nationality answer the interview has:

   ```ts
   /** The passports the authority itself says this statement does not bind.
    * A carve-out is a rule like any other, so it carries its own quote. */
   except?: {
     /** Passport countries, as the `citizenship` field answers them. */
     citizenship: string[];
     /** Our plain English, in the register of the statement it qualifies. */
     text: string;
     source: ProvenancedText;
   };
   ```

2. Validation refuses: an empty `citizenship` list; a code the `citizenship`
   field cannot answer; a missing `text`; and — the point of the whole thing —
   a carve-out with no `source`. `unsourced` is not accepted here: a carve-out
   we cannot quote is a carve-out we do not ship.

3. The schema version goes to **0.6.0** (additive, optional field), and the
   dataset's `schema_version` with it.

4. The data:
   - `nl-hsm-30plus`, `nl-hsm-under30` — `employer-must-be-a-recognised-sponsor`
     gains the Turkish carve-out.
   - `nl-researcher` — `the-institute-must-be-a-recognised-sponsor` the same.
   - All six Dutch routes gain a `caveat` statement `mvv-needed`, quoting the
     route's own page for the requirement, with an `except` naming the ten
     non-EU exempt passports (AU, CA, JP, MC, NZ, VA, GB, US, KR, CH) and
     quoting the exemptions page. A free-movement passport never reaches these
     routes, so the EU/EEA half of the IND's list needs no entry.
   - Every new quote carries `retrieved_at: "2026-09-10"`.

5. The watch: two new entries, `ind-turkish-citizens` and `ind-mvv-exemptions`,
   each sliced to the section its quote comes from, **re-baselined in the same
   commit** (`npm run watch:sources -- --only=<id>` — the draft named a script
   that does not exist) — the rule written on 2026-09-09
   after our own slice change filed three false flags.

6. `data/exclusions.md` gains, each with the page read and the date: the
   Japan/US self-employment treaty clause and the Working Holiday permit (they
   govern permits this dataset does not model); the Turkish
   Association-Agreement paid-employment track and its relatives (Turkish-only
   permits parallel to the six, not modifications of them); the
   TWV-after-three-years rule and the 50%-of-social-welfare test (conditions of
   that track); and the Japan most-favoured-nation *employment* claim —
   investigated 2026-09-10, found on no official page, logged so it is not
   re-litigated from a blog next time.

**Site repository.**

7. A statement whose carve-out names the reader's declared passport is not
   listed among "Also required — not checked here" for that reader; the
   carve-out's sentence takes its place, with its quote and date.
8. A route page, which has no reader, shows both: the condition and, under it,
   who it does not bind.
9. The scope line stays true: a condition that does not bind this reader is not
   counted among the conditions stated but not asked.

**Tests, in both repositories.**

- A Turkish passport removes the sponsor condition from the three routes and
  shows the carve-out; every other passport keeps it.
- The MVV caveat shows for a Turkish passport and is absent for a Japanese one.
- A carve-out without a source fails validation; a carve-out naming a passport
  the field cannot answer fails validation.
- The route page renders both halves, and the quote gate covers the two new
  sources.

## Runs

- mock-green: 2026-09-10 — 466 tests in the data repository, 294 in the site,
  quote fidelity 137, both new sources on the watchlist and re-baselined.
- real-green: 2026-09-10 — walked on the live site with a seeded record. A
  Turkish passport on `nl-hsm-30plus`: "Also required" lists the market-rate
  salary, the BIG register and the provisional residence permit, and **not**
  the recognised sponsor; under "Not required for your passport", the IND's own
  sentence about Turkish employees. The same record with a Japanese passport:
  the sponsor condition is back under "Also required", the MVV requirement is
  gone from it, and the carve-out says the IND names that passport among the
  nationalities that need none. The scope line moves with the reader — six
  conditions stated with no passport, five for either of these two.
  The route page, which has no reader, shows both halves.
