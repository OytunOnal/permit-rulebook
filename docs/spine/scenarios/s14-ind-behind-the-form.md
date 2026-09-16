# s14 — the IND's requirements moved behind a form

**Status:** approved 2026-09-16 (human: "approve"). Data #20.
The human's finding on the page: *"url sabit"* — the result of the *Your
situation* form has no address of its own.

## What happened

On 2026-09-16 the watch's first green-fetching run since the User-Agent
repair found the IND's highly-skilled-migrant page **changed** and four
sibling IND pages **unreachable** (the slice marker gone). The site's deploy
of s13 then stopped at the quote-fidelity gate: twelve quotes on the two HSM
routes are no longer in the page's text. Read the same day: every one of
the five IND route pages — HSM (*last update 11 September 2026*),
orientation year (*16 September*), Blue Card and ICT (*15 June*), researcher
(*18 August*) — is now a Drupal form, *"Your situation — we will first ask
you a few questions"*, and the requirements are rendered after a
nationality and a situation are chosen. The served HTML holds an intro and
the form: about 700 characters, none of them ours. The human answered the
form in a browser and the URL did not change: **there is no address the
watch could fetch.** Only the salary-amounts page is still plain text.

Four of the five had been in this state for weeks: their snapshots were the
old page, so their quotes still verified against it, and the run's
"unreachable" line was read as a fetch problem. It was the page.

## What a reader gets

Nothing changes on the site for a reader today: the sentences on the five
Dutch route pages are the ones the IND published, read on their dates, and
the site keeps saying so. What changes is *how* they are kept honest: a
person now reads them, quarterly, where the machine cannot — and the site's
`/data/` freshness paragraph, the footer and the route pages say which
sources those are, through the mechanism s11 built.

## What must be true

1. **The five IND route-page entries become human-tier.** In
   `watch/watchlist.json`, `nl-ind-highly-skilled-migrant`,
   `nl-ind-orientation-year`, `nl-ind-blue-card`, `nl-ind-ict` and
   `nl-ind-researcher` take `strategy: "human"`, `max_age_days: 90`,
   `last_verified: <the day the human reads them — point 5>`, and a `note`
   in the shape the two 09-10 entries have: what it backs, why human (the
   requirements are rendered behind a *Your situation* form whose result
   has no address; measured 2026-09-16 with the watch's client and a
   browser UA, both 200 with a ~700-character shell), what would move it
   back (a headless-browser strategy, data #17), and the quarterly re-read.
   `nl-ind-work-index` (cited by nothing) and `nl-ind-required-amounts`
   (still plain text) are untouched.
2. **The quote gate reports them as unverifiable, not verified and not
   missing.** `npm run check` prints `human_tier: 37` (7+7+9+8+7+6 — the
   builder confirms the count from the dataset) and `ok: true`, with the
   twelve HSM quotes moved from `missing` to `unverifiable` with the human
   reason. Nothing is deleted from the dataset; no `retrieved_at` moves.
3. **The state carries no stale IND snapshot.** The five entries' snapshots
   are removed from `watch/state.json` (a human-tier entry has no text
   snapshot by definition; `core.ts` already treats a missing snapshot as
   the human arm). The HSM entry's new snapshot — the shell — must not stay
   as if it were the page.
4. **The checklist gains the five.** `data/verify-s5e.md` opens a section
   *"3. Quotes that need a person — form-gated web tier (5 pages, 37
   sentences), opened 2026-09-16"*, one subsection per page: the URL, how
   to reach the requirements (which nationality, which situation), and
   every sentence to find, verbatim from the dataset. The 09-10 section's
   shape is the template.
5. **A person reads them before it ships.** The human opens each of the
   five pages, answers the form, and confirms every sentence is still there
   (or says which is not — a sentence that moved is a value change with a
   history line, not this slice). `last_verified` is that day. **This is
   the gate on the merge**, and it is the human's.
6. **The watch runs green again.** With the five on the human arm the run
   has no unreachable IND entry; the one remaining failure of 2026-09-16,
   `bamf-hochschulabsolvent` (*fetch failed*), is re-tried by the next run
   and is not this slice unless it fails again.
7. **The site says so.** No site code changes: s11's `unread` derivation
   already names sources whose values are older than the run; a human-tier
   entry is not "unread" (it was never a machine read) and must not appear
   in the freshness clause — the builder confirms with the s11 tests that
   five human entries produce no exception clause, and if they do, that is
   a finding for the session, not a fix in this slice.
8. **`docs/spine/design/site-map.md`, `exclusions.md`: untouched.**
   `CHANGELOG`/history: one dataset history line under each of the five
   routes' sources is *not* added — no value changed. The watchlist's notes
   are the record.

**Corrected 2026-09-16, by the build** (the writing session's correction,
dated and marked): three numbers above were wrong. (1) Point 2's
"`human_tier: 37` (7+7+9+8+7+6)" — the sum is 44, the dataset holds **38**
IND quotes (12 + 8 + 7 + 6 + 5, 30 distinct sentences), and `human_tier`
counts the two 09-10 notice quotes too, so the gate prints **40**. (2)
"`verified` = 171" was today's number *with* 26 IND quotes still verified
against stale snapshots; with those snapshots gone it is **145**, pinned
with the reason. (3) Point 4's "which nationality, which situation" — the
form asks no situation: nationality, then whether you hold a valid Dutch
permit, then whether one expired under two years ago; the checklist says
what it asks. Two things the build found and left for the session: the
`never_read` measurement cannot tell a human-tier entry from a never-fetched
one when a stale `unread` list names it (the four IND ids were removed from
the list; the next run rewrites it; `state.ts` untouched), and the Blue
Card and ICT pages' "Last update: 15 June" does not date the form (both
served full lists on 09-07).

**Point 5, as it happened (2026-09-16):** the human asked the session to do
the read in Chrome (*"bunları chrome'u kullanarak kontrol edemiyor musun"*).
The session opened the five pages in a real Chrome, answered the form as the
checklist says, opened every collapsed block, and searched each sentence
word for word: **26 of 26 distinct sentences (38 quotes) present.** One
false alarm on the HSM page — the MVV sentence sits in a collapsed *Check
requirements* block and the first search read only the visible text — was
resolved before any page was called a fail. The checklist carries the read
with its date; `last_verified` is 2026-09-16 on all five. What "a person"
means for this tier from here: a real browser and a reader who can open the
blocks — the session qualifies, the fetcher does not.

## How it is proved

- `npm run check` in the data package green: `quote fidelity ok: true`,
  `missing: []`, `human_tier: 37`, `verified` = 171.
- A test over the watchlist: the five ids have `strategy: "human"`,
  `max_age_days`, `last_verified`, a `note` naming the form; and the state
  carries no `text` for them.
- The existing watch tests green; the s11 sentence tests green with the
  five human entries in the state (no exception clause).
- The site's deploy of master (`f06badd`, s13) goes green on the next data
  pin — the twelve quotes are no longer missing — and s13 is live. Read on
  the live host after it lands: `/feedback/` exists, the header says
  *Countries*, the footer has no address.
- **The human's read of the five pages** (point 5), the day of the merge.

## What this slice is not

It is not the headless-browser strategy (data #17) — that is the road back
to machine-checking the IND, gated on the bot-wall measurement already
taken (headless Chrome reads IND: yes). It is not a value change: every
sentence stays as read, with its date. It does not touch the site.
