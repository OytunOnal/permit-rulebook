# STATUS — Permit Rulebook

Short by rule: the human follows the dashboard (`docs/spine/road.html`); this
file is the sessions' orientation at the door. History is in `DECISIONS.md`.

## Where are we

- Last boundary: 2026-09-24, s34 merged and live — the watch reads the IND
  itself through a browser strategy (`docs/spine/reviews/s34.md`); its
  real-green is the first scheduled run.
- Current version: **v1.1** (stamped 2026-09-16); v1.2 open since 2026-09-17.
- In flight: **s34** is merged and live (data `5a28fee`, site `3bceff0`);
  its real-green waits on the first scheduled watch run on data master — the
  seven browser entries read with no `unreachable`, the state committed, the
  site's pin landing with `human_tier: 1`. Nothing is being built.
- v1.2: 10 of 14 planned steps passed for real (ten slices s23–s33), one
  live and waiting on its real-green (s34); 3 queued — the watch retry (from
  #21, the queue head), then two steward items (Back on a restored record;
  an unknown link's first paint). Roadmap fork 2026-09-23:
  all six `later` candidates kept, clock reset. Roadmap: 24 candidates ahead, 12 unversioned under
  `later`, every one with an `after:` since the fork of 2026-09-24 (ten on
  the readings of 2026-10-09, two on s34's real-green) (three moved from the old backlog; clock reset 2026-09-18).
- Pace: 10 slices real-green in two days (s23–s32, 2026-09-17 → 18), ≈ 0.2
  days per slice; the two after took a day each (s33 approved and live
  2026-09-23; s34 approved 2026-09-23, live 2026-09-24); 3 to go → days at
  the recent pace, the retry slice the size of s33, not s34.

## What is happening now

- Live: https://permitrulebook.com at `3bceff0` (s34), data pinned at
  `5a28fee`, dataset 2026.09.18, schema 0.8.2; 757 site tests, 741 data
  tests; `/data/` says *re-read daily* of the IND's pages. The daily watch did **not**
  read every source today: `bamf-hochschulabsolvent` is unread on
  2026-09-23 — the third red day in four (09-20, 09-21, 09-23); the retry
  slice is queued beside #17.
- Metric 2 (the daily watch finishes) is off target: two red days, 09-20 and
  09-21, both source-side (403s, timeouts); 09-22 read all 46 clean. The
  retry slice is queued beside #17.
- s33 is live and its carry is not yet exercised: the slice touched nothing
  under `src/`, so the deploy's carrier logged `0 asset(s) carried, 2
  already in this build, 0 left behind` — the quiet outcome, correct — and
  published the first `asset-digests.txt` (live, two sha256 lines matching
  the local build). The carry is first exercised on the deploy after the
  first `src/` change; the reading is your calendar item below.
- s34 is live and not yet real-green: the runner read the seven browser
  entries three times on the branch; the scheduled run on data master is the
  one that counts, and it is your calendar item below. Until the retry slice
  lands, a browser entry that meets the runner's slow minute is a red day.
- One Security finding stays open and only the human's word can close it:
  the step fetches from `$SITE_URL`, a repository variable, so whoever can
  set it can have bytes of their choosing published from our own origin,
  where `script-src 'self'` covers them and there is no SRI. Narrowed over
  six rounds, not closed; it is the record's `open with reason:` line.

## What is expected from you

- [ ] **Read s34's real-green after the first scheduled watch run.** Open
      https://github.com/OytunOnal/permit-rulebook-data/actions, the newest
      `watch` run started by schedule after 2026-09-24, and its log: the
      seven browser entries (the five `nl-ind-*`, `de-bmi-chancenkarte`,
      `eur-lex-blue-card-directive`) read `ok`, none `unreachable`, and the
      state commit landed; then
      https://permitrulebook.com/data/ still says *re-read daily* of the
      IND's pages. Pass = "yeşil" if both hold, or the failing line pasted
      here. Why yours: the run is calendar-spaced and lands while no
      session is open. asked: 2026-09-24 entry: s34
- [x] 2026-09-24 **s34's last corner**: the IPv6 transition prefixes. Pass =
      "sınır", "önek" or "ayrı" — answered "sınır": the floor's boundary is
      declared in its header; the four prefixes join the resolve-time candidate.
      asked: 2026-09-24 entry: s34


- [x] 2026-09-24 **s34's brake**: the three corners went to the human with the
      three options. Pass = "sınır", "düzelt" or "ayrı" — answered "düzelt": one
      delta with its round, then the change closes. asked: 2026-09-24 entry: s34


_(s34 approved by the human 2026-09-23: "onaylıyorum".)_



_(s33 closed on the human's three words, 2026-09-23: "merge", "tamam" on point 1's narrowing, and "waive" — the ten pre-record waivers re-stated naming the one open Security entry, `.github/workflows/pages.yml:67`.)_
- [ ] **s33's real-green cannot be read on its own deploy**, and the record
      says so: the slice touches nothing under `src/`, so both live assets
      rebuild under the same hashes and the proof-list bullet passes with no
      byte carried. Read it in two parts — on the first deploy after this one
      that changes a file under `src/`, `/asset-digests.txt` answers 200
      and the log says `published asset-digests.txt: N asset(s)`; on the
      deploy after **that**, the previous generation's two `/_astro/` names
      still answer 200 and the log names them as carried. Pass = those two
      readings. Why yours: they are calendar-spaced, not session-spaced.
- [ ] **Pick from the walk's three adjustments** (report §Recommended
      adjustments): 1 the foreign-quote handle · 2 country-scoped salary bands
      and the honest count · 3 *Start over* mid-interview and the resumed word.
      Pass = "apply all", "apply 1 and 2", "apply 1", or none with a reason;
      each stands alone and each becomes a queue item under v1.2. Why yours:
      adjustment 1 changes a promise (what the reader is shown of a foreign
      source), and priority against #17 is a versioning call.
- [ ] **Three checks only you can make** (report §For the human): tap a
      declared row on a results screen on a real touch device (does it open
      that question in one tap, with the ✓ on your old answer?); run a screen
      reader over the results screen and say whether the announcement order
      makes sense; and say which populations `/data/`'s two counts describe
      ("QUOTED VALUES — 185" against "Prose provenance — 163 sourced, 52
      ours") — the screen does not tell a reader, and the session could not
      derive it from the page. Pass = three answers; the third may become a
      copy fix.


_(Bing → IndexNow confirmed by the human 2026-09-22: the submissions are listed.)_

- [ ] **On 2026-10-09, read the pre-registered numbers**: Cloudflare Web
      Analytics (visits from search and referrals, days 8–30, target ≥ 300),
      Search Console → Links (linking domains), and whether a stranger has
      touched the data repository — then say "readings"; Spine runs the
      isolated walk the same day. Pass = three numbers with their dates in
      `docs/spine/metrics.md`. Why yours: two of the three are dashboards
      behind your accounts.
- [ ] **At the end of December 2026, say "read the Spanish order"**: the
      annual order that opens Spain's job-search visa quota (data #16 is held
      on it). Pass = the order read, #16 classified. Why yours: the date is a
      calendar you keep; the read is Spine's.
- [ ] **`DISPATCH_TOKEN` expires 2027-09-09**: renew it in GitHub before
      then. Pass = the watch's dispatch still rebuilds the site the next day.
      Why yours: the token is your credential; it is never pasted here.
