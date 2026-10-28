# Metrics

One row per metric, in Spine v2's shape (`skills/steward/references/metrics.md`
in the plugin). Targets confirmed by the human 2026-09-17 ("metrikler tamam");
rows 3–5 are the pre-registered numbers of 2026-09-08 (A2, A7, A8) and do not
move.

| # | Metric | Target | Kind | Source | Field | Cadence (days) | Next reading |
|---|---|---|---|---|---|---|---|
| 1 | Dataset liveness — open source-change flags older than 48 h | 0 | file | `docs/spine/readings/liveness.json` | `value` | 7 | 2026-11-04 |
| 2 | The daily watch finishes — failures in the last 7 scheduled runs on master | 0 (one single-day failure tolerated) | file | `docs/spine/readings/watch.json` | `value` | 7 | 2026-11-04 |
| 3 | Visits from search and referrals, days 8–30 (A2) | ≥ 300 | ask | Cloudflare Web Analytics, last 30 days, bots excluded, referrer not direct | — | 30 | 2026-10-09 |
| 4 | A stranger touched the data (A7) — issues, pull requests or forks by anyone but the owner | ≥ 1 | file | `docs/spine/readings/stranger.json` | `value` | 30 | 2026-11-16 |
| 5 | Domains linking to the site (A8) | as pre-registered 2026-09-08 | ask | Google Search Console → Links → Top linking sites | — | 30 | 2026-10-09 |
| 6 | CLS share of samples "good" (site #8) | > 92 % (the 2026-09-15 reading) | ask | Cloudflare Web Analytics → Core Web Vitals, last 7 days, bots excluded | — | 7 | 2026-09-30 |

Rows 1, 2 and 4 count what v2's `command` shape cannot say (an age, a
workflow and event, an author), so each reads a file its own writer keeps; the
writer is #36. Until it lands the session reads them as #36 describes. Rows 3,
5 and 6 wait on the human in #39, #40 and #41.

## Readings

| Date | Metric | Value | Source | n |
|---|---|---|---|---|
| 2026-10-17 | 1 | 0 | `gh issue list -R OytunOnal/permit-rulebook-data --label source-change --state open --json number,createdAt`, after #12 walked data #23–#27 | 0 open |
| 2026-10-28 | 1 | 2 | `gh issue list -R OytunOnal/permit-rulebook-data --state open --label source-change --json number,createdAt` (#36's fallback) | 2 open, both raised 2026-10-23: OytunOnal/permit-rulebook-data#44 and #45, waiting on the human |
| 2026-10-28 | 2 | 6 | `gh run list -R OytunOnal/permit-rulebook-data --workflow watch.yml --event schedule --branch master --limit 10 --json conclusion,createdAt` (#36's fallback); causes in #283 | 7 runs (10-21 to 10-27), only 10-23 green |

**Trends (third readings, 2026-10-28):**
- Row 1: 0 (09-22) → 4 (10-17) → 2 (10-28). Off target again: flags wait for a person for days, and get walked in bursts.
- Row 2: 2 (09-22) → 1 (10-17) → 6 (10-28). Worsening and off target. Bug #283 holds the causes: two sources that fail most mornings, the watch's Chrome failing to start once, and the two unwalked flags.

### Before the tracker (to 2026-10-17)

| date | # | reading | target | on target? | note |
|---|---|---|---|---|---|
| 2026-10-17 | 1 | **4** open source-change flags older than 48 h (#23 nl-ind-orientation-year 10-07; #24 and #25 fr-f2215-certificat-algerien 10-08 and 10-09, a change and its reversal; #26 fr-f33952-ict 10-15); #27 nl-ind-blue-card 10-16 is younger | 0 | **no** — the oldest has waited ten days | `gh issue list -R OytunOnal/permit-rulebook-data --state open --label source-change`. Nobody walked a flag since 2026-10-07: the site said *re-read daily* while four changed sources went unread by a person. #26 is the FR ICT floor, which its own intent line says is SMIC-indexed. Off target → a steward entry, held for the human's word on how this project now runs (Spine updated to v2 the same day). |
| 2026-10-17 | 2 | **1** failure in the last 7 scheduled runs (10-11 to 10-17: 10-16 red, the rest green) | 0, one single-day failure tolerated | **yes** | Read with the row's own command (scheduled runs on master). The one red run named two **outages** and nothing else: `wetten-wav-artikel-8` 403 on 10-14 and 10-16, `de-bmi-chancenkarte` a browser timeout on 10-15 and 10-16 — s35's rule doing what it was built for. Since s35's merge: 21 scheduled runs, 20 green; 09-25 to 09-29 all five green. This is the reading s35's real-green was registered against. |
| 2026-10-17 | 4 | **0** — no issue, pull request or fork by anyone but the owner (0 forks; one star, which the row does not count) | ≥ 1 | **no** | The 2026-10-09 pre-registered reading (A7), taken eight days late with the row's commands. |
| 2026-09-23 | 6 | breakdown (the human, Cloudflare Debug View): the whole 12 % band is **2 pageviews of `/`** — `html>body>div.wrap`, CLS 0.181, rect 897×0 before and after, `footer.site-foot` moving as the wrapper fills; width 897, Chrome/Edge on Windows/Linux, no mobile. ~15–17 CLS samples in the window, so one visit ≈ 6 points | — | — | Not a statistic: a lead. The session then tried to reproduce it at the field's own width and conditions — 880 / 896 / 897 / 910 / 1024 px, cold profile and cleared cache, Slow 3G + CPU ×6, the observer installed before first paint, three record states each: **the only counted shift anywhere was 0.0034** (the resumed line lifting `footer.site-foot` 18 px on a half-done record, at every desktop width; the s10 gate already reads this arrival at 0.003). A trusted tap with the main thread frozen 0 / 700 / 2200 ms still carries `hadRecentInput` at 897, 1280 and 390, so the interview's own reflow (0.0332 desktop, 0.2808 phone) cannot be it. 0.181 not reproduced. |
| 2026-09-23 | 6 | good **88 %** · needs improvement 12 % · poor 0 % (Cloudflare Web Analytics → Core Web Vitals, permitrulebook.com, bots excluded, 16–23 Sep; read by the human, PDF export in Downloads — the export is an image, so the number is the human's reading, not re-derived here) | > 92 % good (the 2026-09-15 before: good 92 %, needs improvement 2 %) | **no** — 4 points under, and the 12 % band is new | The poor band is gone (s10's defect did not return). Session's own measurements the same day, all on the live site: 12 landing pages × 390×844 and 1280×900 → CLS 0 everywhere but `?country=zz` at 1280 (0.009); the s10 gate's five arrivals on Slow 3G and Fast 3G → 0; a trusted tap on the first answer moves 0.2841 (`#app` 539→445, `#decl` 0→445, `#stamp` 389→294) but Chrome attributes it to the input at ×1, ×6 and ×20 CPU throttling, so it does not count. Not reproduced here → entry opened, fork to the human. The isolated full walk of the same day measured 117 more arrivals (90 seeded: 5 arrivals × 9 pages × 2 widths; 27 page-to-page at 1280) — CLS 0 on every one; one 0.004 reflow of the header row on `/data/` at 1280 on a cold profile, not reproduced in the 117 that followed. |
| 2026-09-22 | 2 | 2 failures in the last 7 runs (2026-09-20, 2026-09-21; both `schedule`) | 0, one single-day failure tolerated | **no** — two consecutive days | `gh run list -R OytunOnal/permit-rulebook-data --limit 10 --json conclusion,createdAt`. Causes from the run logs: 09-20 six sources HTTP 403 (buzer.de ×5, wetten.overheid.nl); 09-21 three `TypeError: fetch failed` (boe.es ×2, bamf.de). 09-22 green: 46 sources, 0 unreachable. Off target → the retry slice, v1.2 queue (data #21). |
| 2026-09-22 | 1 | 0 open source-change flags older than 48 h | 0 | yes | `gh issue list -R OytunOnal/permit-rulebook-data --state open --label source-change --json number,createdAt` — none open. |
