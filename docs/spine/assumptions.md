# Assumption list — Visa Navigator

Belief-based claims coming out of the grill half-round (2026-09-01). Statuses:
`untested` · `research-confirmed` · `research-refuted` · `slice-verified`
(only the acceptance surface confirms). Research evidence: `research-01.md`.

## Tested in research

- **A1 — The legal position is sufficient.** — `research-confirmed (conditional)`
  — the BGH Smartlaw (I ZR 113/20) pattern supports it; conditions: categorical
  output language (never "you are eligible"), no free-text case entry, an
  IRCC-style disclaimer. FR/ES/NL stand by analogy, not researched specifically.
- **A2 — Narrow+live beats broad+stale.** — `research-confirmed (with a weakened
  statement)` — The strong form collapsed (WhereToEmigrate publishes a provenance
  log + a staleness-penalty model; VisaMind stamps a page-level fetch date). The
  form left standing: **no competitor gives date+source+verbatim quote per value**
  and nobody offers open data on EU work permits. This is the differentiator.
- **A3 — Official pages can be watched.** — `partly: NL/FR confirmed, DE
  risky, ES refuted (as HTML)` — threat no. 1 is bot-blocking
  (make-it-in-germany Radware; france-visas 403). NL ideal; FR service-public
  F16922; DE values are in a yearly-URL bulletin; ES values are in a
  glyph-encoded PDF → a permanent human-reader tier.
- **A4 — Source language is not an obstacle.** — `research-confirmed (ES partial)` — the DE source
  is in 6 languages including TR; FR/NL fully EN; ES functional documents are Spanish PDFs.
- **A5 — 6-8 employment routes per country is realistic.** — bound to **s9**
  (2026-09-10): the five most searched of the excluded routes become pages that
  quote and date their rules without scoring them, which is the honest form of
  the gap this assumption's refutation left. — `research-refuted
  (revised: 8-12/country, ~40 total)` — the FR talent family pushes it to ~12,
  the NL official list to 20. What is needed: a written exclusion list per
  country; FR talent = a single route family + a sub-type discriminator.
- **A6 — CA/AU fit the model (wave 2).** — `untested` (out of scope this round)
- **A7 — An open, dated, sourced work-permit dataset still does not exist.** —
  `research-confirmed` — 10 searches, no new player. PathWise (US student status, 1★) is
  the one-person proof of the same discipline; its schema vocabulary will be harvested.
- **A8 — A static site can survive in SEO.** — `research-refuted on head terms, confirmed
  on the community channel (revised)` — the SERP is a lead-gen wall; distribution = open
  data + GitHub/HN first (run-abroad: 491★ in 3 weeks), SEO long tail after.

## Verifiable only with a slice (acceptance surface work)

- **A9 — The gap analysis is the most valuable output.** run-abroad's "almost
  there" category supports it; not verified with a real user. — `untested`
- **A10 — 6-7 questions are enough.** — `partly measured (S2, 2026-09-02)`: personas
  with an offer reached a result in 7 and 6 questions on the full DE set ✓; the points
  path (Chancenkarte without an offer) is ~13 questions by its nature — it was deemed
  acceptable because every click of the ladder produces a visible score, but the "6-7"
  claim does not hold for points paths. To be measured again at multi-country scale.
- **A11 — The band-boundary-threshold UX works.** The user has no difficulty declaring
  their salary with a band of "below €43,759 / between / above". — `untested`
- **A12 — Correctness of the third-country default.** Citizenship-specific provisions are additive
  exceptions; the general line produces a *wrong* answer for no citizenship. — `untested`
- **A13 — Watch+flag is sustainable solo.** Watching ~40-60 pages + manual
  quoted updating carries one person's promise of "I will process it within 24
  hours". Research note: because of bot-blocking the watch source-selection is
  delicate (see A3); ES requires a human read on every change. — `untested`
- **A15 — Criteria can be expressed as a multiple-choice declaration.** All route
  criteria can be reduced to an enum/band/yes-no declaration; criteria the user
  may not be able to know, such as equivalence, fall into the gap analysis as an
  open gap with the "I don't know" answer, and correctness is not broken. (Found
  by devils-advocate 2026-09-01; written into the one-pager.) — `untested`
- **A14 — Build-time polish stays in sync.** The LLM's polish of the question wording prevents the
  generated text from falling out of sync with the rule set through commit-review discipline. — `untested`


## The journey beyond the first permit (candidate bets, human's idea 2026-09-11)

Three roadmap candidates rest on these. None is tested, and the first is the
cheap one that would tell us whether the other two are worth paying for.

- **A16 — "and then what" is most of the value, and the timeline is not.** A
  single quoted, dated sentence per route — the years of holding it that count
  toward permanent residence, and whether they count in full — answers most of
  what a reader wants from a residency feature, without modelling time at all.
  `slice-verified` if the route pages carrying it are read more, or asked
  about more, than those without; refuted if readers ask for a date instead.
  — `untested`
- **A17 — PR rules fit this engine once it has a history.** Permanent-residence
  rules are thresholds this engine already handles (years, language level,
  income, no benefits) — the missing input is *which status those years were
  held under*, since study years often count half or not at all and a Blue Card
  shortens the track. The bet is that a history question set is an addition to
  the interview, not a rewrite of the engine. `slice-verified` by building one
  country's PR route end to end and measuring what it cost. — `untested`
- **A18 — a projection can be stated without becoming advice.** Work permits
  say "you meet this today"; PR says "you will, on this path, in N years",
  which is a stronger claim than this product has ever made and a more harmful
  one to get wrong. The bet is that a projection can be stated the way a rule
  is — the authority's sentence, the count it implies, the date it was read —
  and stay inside A1's no-advice line. Refuted the first time a reader takes a
  date as a promise. — `untested`
- **A19 — citizenship is mostly unscoreable, and that is why it waits.** A
  large part of a naturalisation surface would land in "quoted and dated · not
  scored": dual-nationality rules that turn on the reader's *other* passport,
  renunciation requirements and their exceptions, discretionary integration
  judgements. The bet is that this is worth shipping anyway — that a reader
  searching for citizenship rules is better served by quoted rules with no
  verdict than by nothing. Refuted if the quoted-not-scored pages built in s9
  go unread. — `untested`

## Pre-registered before the announcement (2026-09-08, devils-advocate pass)

- **A7 — the gap in open work-permit data is real.** Counter-evidence found
  before posting: wheretoemigrate.io/open-data offers CC BY 4.0 CSV snapshots
  (July 2026) including income thresholds for 34 countries, free, no signup —
  without a per-value source sentence or retrieval date, labelled an archival
  research release, not a live database. The weak claim ("nobody offers open
  work-permit data") is refuted; the strong claim (per value: the authority's
  sentence, the read date, re-read daily) stands. The announcement says the
  strong claim only.
- **Numbers that decide, written first (thirty days after the announcement):**
  A2 (organic traffic comes to open data) — `slice-verified` if Cloudflare
  Web Analytics shows ≥ 300 visits from search or referrals other than the
  announcement thread in days 8–30; `refuted` below 100. A7 — verified if a
  stranger files or comments on a data issue, or a route page is cited
  elsewhere with its date; refuted if no stranger touches the data in 30 days.
  A8 (a static tool plus open data earns links) — verified at ≥ 3 referring
  domains excluding the thread and the repositories; refuted at 0.
