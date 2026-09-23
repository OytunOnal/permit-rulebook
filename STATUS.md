# STATUS — Permit Rulebook

Short by rule: the human follows the dashboard (`docs/spine/road.html`); this
file is the sessions' orientation at the door. History is in `DECISIONS.md`.

## Where are we

- Last boundary: 2026-09-23, s33 merged and live — the deploy publishes
  `asset-digests.txt` and carries the previous generation against it. Nine
  delta rounds; the record is `docs/spine/reviews/s33.md`.
- Current version: **v1.1** (stamped 2026-09-16); v1.2 open since 2026-09-17.
- In flight: **s34 — the watch reads the IND itself again** (data #17),
  approved 2026-09-23 (human: "onaylıyorum"), building in two worktrees
  (data `../permit-rulebook-data-s34`, site `../permit-rulebook-s34`).
- v1.2: 10 of 14 planned steps passed for real (ten slices s23–s33); 4
  queued — #17, the watch retry (from #21), then two steward items (Back on
  a restored record; an unknown link's first paint). Roadmap fork 2026-09-23:
  all six `later` candidates kept, clock reset. Roadmap: 23 candidates ahead, 11 unversioned under
  `later` (two added 2026-09-23 from s33: the digest-list split, and a
  Security-only read of the launch code — human: "uygula") (three moved from the old backlog; clock reset 2026-09-18).
- Pace: 10 slices real-green in two days (s23–s32, 2026-09-17 → 18), ≈ 0.2
  days per slice; 3 to go → under a week at this pace — but #17 is larger
  than the ones behind (a browser in CI, a new watch strategy), so read it as
  days, not hours.

## What is happening now

- Live: https://permitrulebook.com at `1cc7800` (s33), dataset 2026.09.18,
  schema 0.8.2; 757 site tests, 647 data tests. The daily watch did **not**
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
- A local trap found while merging, recorded in DECISIONS: the suite reads
  `dist/` and the sibling data clone, so after any data change it must be
  `git pull` in the data repo and `npm run build` before `npm test`, or it
  goes red for a reason that is not a defect. CI already does both in order.
- One Security finding stays open and only the human's word can close it:
  the step fetches from `$SITE_URL`, a repository variable, so whoever can
  set it can have bytes of their choosing published from our own origin,
  where `script-src 'self'` covers them and there is no SRI. Narrowed over
  six rounds, not closed; it is the record's `open with reason:` line.

## What is expected from you

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
