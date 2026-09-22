# STATUS — Permit Rulebook

Short by rule: the human follows the dashboard (`docs/spine/road.html`); this
file is the sessions' orientation at the door. History is in `DECISIONS.md`.

## Where are we

- Last boundary: 2026-09-23, metric 6 read off target (CLS good 88 %); the
  isolated full walk is running now (its report and screenshots land in
  `docs/spine/critiques/2026-09-23-metric-reading-full*`).
- Current version: **v1.1** (stamped 2026-09-16); v1.2 open since 2026-09-17.
- In flight: nothing — the next slice is v1.2's queue head, data #17 (the
  browser-read strategy for the IND).
- v1.2: 9 of 13 planned steps passed for real (nine slices s23–s32); 4
  queued — #17, the watch retry (from #21), then two steward items (Back on a
  restored record; an unknown link's first paint). Roadmap fork 2026-09-23:
  all six `later` candidates kept, clock reset. Roadmap: 21 candidates ahead, 9 unversioned under
  `later` (three moved from the old backlog; clock reset 2026-09-18).
- Pace: 10 slices real-green in two days (s23–s32, 2026-09-17 → 18), ≈ 0.2
  days per slice; 3 to go → under a week at this pace — but #17 is larger
  than the ones behind (a browser in CI, a new watch strategy), so read it as
  days, not hours.

## What is happening now

- Live: https://permitrulebook.com at `f7832f0`, dataset 2026.09.18, schema
  0.8.2; 694 site tests, 647 data tests; the daily watch read every source
  today.
- Metric 2 (the daily watch finishes) is off target: two red days, 09-20 and
  09-21, both source-side (403s, timeouts); 09-22 read all 46 clean. The
  retry slice is queued beside #17.
- The one open thread: #17's scenario is next — a `browser` watch strategy
  (headless Chrome on the runner) bringing the five IND pages and the BMI
  sentinel back from the human tier.
- Skills reloaded 2026-09-23 (standards.md, the three gate words, the reviews'
  Dismissed list): `docs/spine/standards.md` written from what the repos do.
  Before that, 2026-09-22 (steward-66/67 and the roadmap's `after:`): forks
  are four at a time and every default is said in the message; a worktree's
  exit checks the directory gone — the leftover `_preview` worktrees (223 MB,
  from s12) were removed today. Before that, 2026-09-18 (steward-64, v0.4): the road page is now
  drawn by Spine's generator (six tabs); STATUS short; KANBAN's backlog
  folded into the roadmap; ADRs folded into DECISIONS rows.
- Metrics: 1 and 2 read 2026-09-22 (liveness on target, the watch not); 6
  read 2026-09-23 (good 88 %, off the 92 % target; poor 0 %), next read
  2026-09-30 — the breakdown is with the human, no slice queued until it and
  the re-read agree on a target; the pre-registered numbers on 2026-10-09 with the isolated
  walk.
- Nothing blocked on the human today.

## What is expected from you

- [ ] **Break the CLS reading down once** at Cloudflare → Web Analytics →
      Core Web Vitals for permitrulebook.com: switch the view to per-page and
      to device/browser for 16–23 Sep, bots excluded, and say which page and
      which device carry the 12 % "needs improvement". Pass = a page path and
      a device class (or "the view does not break down", which is an answer
      too). Why yours: the dashboard is behind your Cloudflare login; the
      session measured everything it could reach and found no counted shift.

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
