# STATUS — Permit Rulebook

Short by rule: the human follows the dashboard (`docs/spine/road.html`); this
file is the sessions' orientation at the door. History is in `DECISIONS.md`.

## Where are we

- Last boundary: 2026-09-18, s32 live (site `f7832f0`, data `295f204`).
- Current version: **v1.1** (stamped 2026-09-16); v1.2 open since 2026-09-17.
- In flight: nothing — the next slice is v1.2's queue head, data #17 (the
  browser-read strategy for the IND).
- v1.2: 9 of 12 planned steps passed for real (nine slices s23–s32); 3
  queued — #17, then two steward items (Back on a restored record; an unknown
  link's first paint). Roadmap: 21 candidates ahead, 9 unversioned under
  `later` (three moved from the old backlog; clock reset 2026-09-18).
- Pace: 10 slices real-green in two days (s23–s32, 2026-09-17 → 18), ≈ 0.2
  days per slice; 3 to go → under a week at this pace — but #17 is larger
  than the ones behind (a browser in CI, a new watch strategy), so read it as
  days, not hours.

## What is happening now

- Live: https://permitrulebook.com at `f7832f0`, dataset 2026.09.18, schema
  0.8.2; 694 site tests, 647 data tests; the daily watch read every source
  today.
- The one open thread: #17's scenario is next — a `browser` watch strategy
  (headless Chrome on the runner) bringing the five IND pages and the BMI
  sentinel back from the human tier.
- Skills reloaded 2026-09-18 (steward-64, v0.4): the road page is now
  drawn by Spine's generator (six tabs); STATUS short; KANBAN's backlog
  folded into the roadmap; ADRs folded into DECISIONS rows.
- Metrics: first readings due 2026-09-24 (liveness, the watch, the CLS
  after-reading); the pre-registered numbers on 2026-10-09 with the isolated
  walk.
- Nothing blocked on the human today.

## What is expected from you

- [ ] **Bing Webmaster Tools → IndexNow: confirm the submissions are listed**
      at https://www.bing.com/webmasters/indexnow (any day). Pass = the last
      deploy's date appears with 36+ URLs. Why yours: the tool is behind your
      Microsoft login.
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
