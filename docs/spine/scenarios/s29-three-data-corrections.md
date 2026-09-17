# s29 — three data corrections

**Status:** approved 2026-09-17 (human: "tamamdır", on the researched
options). v1.2 fixes data #13, data #15 and the Algerian notice's learn label
(s28 light critique). Data only; the site changes by rebuilding.

## What happened

1. **Data #13.** Every route's *Official page ↗* goes to an authority — except
   the Opportunity Card's, which goes to handbookgermany.de. Read 2026-09-17:
   make-it-in-germany.com answers a plain GET with a Radware bot-check shell
   (200, no page); digital.diplo.de is a JS shell; BAMF and the Foreign
   Office have no Chancenkarte page at any found path (404); buzer.de is the
   statute. The Federal Ministry of the Interior's own English page —
   `https://www.bmi.bund.de/SharedDocs/kurzmeldungen/EN/2024/05/chancenkarte.html`
   — is an authority, English prose, static HTML, 200 on a plain GET.
2. **Data #15.** The `eu-free-movement` notice names the EU, Iceland,
   Liechtenstein, Norway and Switzerland, and its one quote covers EU
   nationals only. Read 2026-09-17, both 200 on a plain GET, visible prose:
   - ind.nl, *Staying in the Netherlands as an EU, EEA or Swiss citizen*:
     *"Nationals of the member states of the European Economic Area (EEA)
     and Switzerland have the same rights as citizens of the Union."* (the
     IND's member-state list names Iceland, Liechtenstein and Norway as
     EEA).
   - europa.eu, Your Europe — work permits: *"Under the EU-Switzerland
     agreement on the free movement of persons, Swiss nationals are free to
     live and work in the EU."*
   Europa.eu's own pages carry the EEA names only in a `title` attribute
   on "EU country" — not a quotable sentence; noted, not used.
3. **The Algerian notice's learn label** is a statement (*The page for
   Algerian nationals — certificat de résidence d'1 an*) rendered as its
   foot link — the shape s28 fixed for the four fields.

## What must be true

1. **`de-chancenkarte.info_url`** is the BMI page above (human: A of three —
   the one candidate that is an authority, readable and watchable). A watch
   entry for it (html tier, a sentinel the page holds — the builder picks
   the sentence and records it) so that the day it disappears the watch
   flags it; the route's `history` gains a line (`citation-corrected` or the
   reason the enum offers for an info-page move — the builder reads the
   enum and, if none fits, says so in the correction and uses
   `re-read-unchanged` with a note as s25 did before its enum grew).
2. **The notice carries the sentences that cover its groups.** `sources[]`
   on `eu-free-movement` gains the two quotes above, each with `source_url`,
   `retrieved_at: 2026-09-17`, `legal_basis` in the form the notice already
   uses (*EEA Agreement art. 28 — IND*; *EU–Switzerland Agreement on the Free
   Movement of Persons (1999) — Your Europe*), and a watch entry per new
   source (the IND general page fetches — it is not one of the five
   form-walled route pages; if the builder measures otherwise it goes to the
   human tier like those and the correction says so). The body does not
   change: it was right; it lacked evidence.
3. **The Algerian notice's `learn.label`** is an action in plain words —
   *Read the page for Algerian nationals (certificat de résidence d'un an)*
   — under CONTRIBUTING's step 9, which now says it binds notices' doors
   too; the s28 data test widens from fields' doors to every door.
4. **Dataset version** moves to the day (a data change); schema unchanged.
   Quote fidelity, watch coverage and the validator green.
5. **Nothing else changes.** No site code; the site rebuilds against the new
   pin: the Opportunity Card page's *Official page ↗* now goes to bmi.bund.de,
   the free-movement screen shows three quotes, the Algerian foot link reads
   the new words; `/data/` shows the new date and quote count; the route
   fingerprint moves for `de-chancenkarte` and regenerates with the reason.

## How it is proved

- Data: the validator and quote fidelity green (the two new quotes read from
  their pages at build); a test that every route's `info_url` host is not
  on the declared non-authority list (`handbookgermany.de`) — a decision
  the issue made; the s28 door test over every door.
- Site (no code): the existing tests green on the new pin; a read of the
  three screens on the local build — the Opportunity Card route page's
  official link, the EU/EEA/CH result (a Swiss passport, the Netherlands),
  the Algerian card's foot link.
- The human's read of the same three on the local build.

## What this slice is not

It is not the SEPE limb, not #16 (Spain's job-search visa waits on the
annual order), and not #17 (the browser-read strategy).
