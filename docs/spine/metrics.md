# Metrics — read at the intake door

One row per metric: target · source · kind (`command` | `file` | `ask`) ·
cadence in days · next reading. A `command` row is one read-only `gh`
invocation and runs unattended at the intake read; an `ask` row is read by
the session in the human's browser when it can be, else asked of the human
with its date. A reading is a number (or a word from the row's closed set)
or `unreadable`; a number off target opens a steward entry. Targets
confirmed by the human 2026-09-17 ("metrikler tamam"); rows 3–5 are the
pre-registered numbers of 2026-09-08 (A2, A7, A8) and do not move.

| # | metric | target | source | kind | cadence | next |
|---|---|---|---|---|---|---|
| 1 | Dataset liveness — open source-change flags older than 48 h | 0 | `gh issue list -R OytunOnal/permit-rulebook-data --state open --label source-change --json number,createdAt` | command | 7 | 2026-09-29 |
| 2 | The daily watch finishes — failures in the last 7 runs | 0 (one single-day failure tolerated) | `gh run list -R OytunOnal/permit-rulebook-data --limit 10 --json conclusion,createdAt` | command | 7 | 2026-09-29 |
| 3 | Visits from search and referrals, days 8–30 (A2) | ≥ 300 | Cloudflare Web Analytics, last 30 days, bots excluded, referrer ≠ direct | ask | 30 | 2026-10-09 |
| 4 | A stranger touched the data (A7) — issues, PRs or forks by a non-owner | ≥ 1 | `gh issue list -R OytunOnal/permit-rulebook-data --state all --limit 100 --json number,author,createdAt` (the session filters out OytunOnal and app/github-actions) | command | 30 | 2026-10-09 |
| 5 | Domains linking to the site (A8) | as pre-registered 2026-09-08 (STATUS: "how many domains link to it") | Google Search Console → Links → top linking sites | ask | 30 | 2026-10-09 |
| 6 | CLS after s10/s22 (site #8) — share of samples "good" | > 92 % (the 2026-09-15 before) | Cloudflare Web Analytics → Core Web Vitals, last 7 days, bots excluded | ask | 7 | 2026-09-30 |

## readings

| date | # | reading | target | on target? | note |
|---|---|---|---|---|---|
| 2026-09-23 | 6 | good **88 %** · needs improvement 12 % · poor 0 % (Cloudflare Web Analytics → Core Web Vitals, permitrulebook.com, bots excluded, 16–23 Sep; read by the human, PDF export in Downloads — the export is an image, so the number is the human's reading, not re-derived here) | > 92 % good (the 2026-09-15 before: good 92 %, needs improvement 2 %) | **no** — 4 points under, and the 12 % band is new | The poor band is gone (s10's defect did not return). Session's own measurements the same day, all on the live site: 12 landing pages × 390×844 and 1280×900 → CLS 0 everywhere but `?country=zz` at 1280 (0.009); the s10 gate's five arrivals on Slow 3G and Fast 3G → 0; a trusted tap on the first answer moves 0.2841 (`#app` 539→445, `#decl` 0→445, `#stamp` 389→294) but Chrome attributes it to the input at ×1, ×6 and ×20 CPU throttling, so it does not count. Not reproduced here → entry opened, fork to the human. The isolated full walk of the same day measured 117 more arrivals (90 seeded: 5 arrivals × 9 pages × 2 widths; 27 page-to-page at 1280) — CLS 0 on every one; one 0.004 reflow of the header row on `/data/` at 1280 on a cold profile, not reproduced in the 117 that followed. |
| 2026-09-22 | 2 | 2 failures in the last 7 runs (2026-09-20, 2026-09-21; both `schedule`) | 0, one single-day failure tolerated | **no** — two consecutive days | `gh run list -R OytunOnal/permit-rulebook-data --limit 10 --json conclusion,createdAt`. Causes from the run logs: 09-20 six sources HTTP 403 (buzer.de ×5, wetten.overheid.nl); 09-21 three `TypeError: fetch failed` (boe.es ×2, bamf.de). 09-22 green: 46 sources, 0 unreachable. Off target → the retry slice, v1.2 queue (data #21). |
| 2026-09-22 | 1 | 0 open source-change flags older than 48 h | 0 | yes | `gh issue list -R OytunOnal/permit-rulebook-data --state open --label source-change --json number,createdAt` — none open. |
