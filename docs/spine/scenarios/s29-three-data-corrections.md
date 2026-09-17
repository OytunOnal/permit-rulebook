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

**Corrected 2026-09-17, by the build:** (1) *"200 on a plain GET"* is true of
a browser and false of this watch's fetcher: measured 2026-09-17 with its own
client, with a browser User-Agent and with none, the BMI URL answers HTTP 307
to `/cookie-check-d973` and sets an `AL_CHK-S` cookie; the check answers 307
back to the page, which is 200 (64,498 bytes, English, static) only when the
cookie is sent back. The fetcher follows redirects and keeps no cookie jar, so
it lands on HTTP 400 *Zugriff nicht möglich* — on the html tier the entry would
have failed the daily run every day. The entry `de-bmi-chancenkarte` is on the
human tier (`max_age_days: 90`, `last_verified: 2026-09-17`), `kind: sentinel`
— it backs no quote, and coverage would call a value-source entry there an
orphan — and its sentinel sentence, recorded in the note and in
`data/verify-s5e.md` §6 for the quarterly reader, is *The opportunity card is a
new type of residence permit for those coming to Germany to look for work.*
The road back to the machine is a fetcher that returns the cookie on one hop.
Also (1): a route has no `history` — `info_url` is a bare string in the schema
(`route` is `additionalProperties: false`) and the reason enum lives on
`textHistoryEntry`, a superseded reading of a provenanced text, which an info
page is not; with the schema unchanged (point 4) no reason from the enum can
attach to the move, `re-read-unchanged` included. The dated, append-only record
is the watch entry's own `history` line (`changed_at: 2026-09-17`, naming the
old URL, data #13 and the candidates passed over) — the one log this repository
keeps about a URL. (2) as predicted: the IND general page serves the sentence to
a plain GET (200, 51,875 bytes), so `ind-eu-eea-swiss-citizens` is html-tier,
sliced from *You are a citizen of the Union…* to *…tewerkstellingsvergunning or
TWV).* with its baseline read in the same change; the Swiss sentence sits
inside `eu-your-europe-work-permits`'s existing slice and its stored snapshot,
so that entry covers it unchanged. Both quotes verify (156, from 154). (4) The
version already read the day (`2026.09.17`, s23); the convention is the date
with no suffix, and a second change on the same day keeps it (s25, s28 — and
`CONTRIBUTING.md` is silent, practice decides). The newest read date moves to
2026-09-17, which retires seven older pins that said "nothing was read at a
source today" (s7, s8, s19, s23, s25, `engine.test.ts`) and the s14 verified
count. (5) Two files outside the list moved because gates asked: `src/lang.ts`
declares a language prefix per source and `info_url` is in its source set, so
the BMI path gained `en` and the `handbookgermany.de` prefix — a host a route
may no longer point at — left with it; `data/verify-s5e.md` gained §6, the
human-tier rule's checklist line for a page that carries no quote. And (5),
read in the site's code without touching it: `/data/` will not show a new
version date (unchanged) nor a new quote count — `quotedValues` counts route
values only, and the two new sentences are a notice's; what moves is the
*read* date, on `/data/` and on every route page's RULES READ stamp, because
`pageStamp` takes the audience notice's sources (s8), and the *changed* date
stays 2026-09-16 (values only). Neither fixture moves: both are computed over
`tests/fixtures/frozen-dataset.json`, which has no `de-chancenkarte` and one
free-movement quote.

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
