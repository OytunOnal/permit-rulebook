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
| 6 | CLS after s10/s22 (site #8) — share of samples "good" | > 92 % (the 2026-09-15 before) | Cloudflare Web Analytics → Core Web Vitals, last 7 days, bots excluded | ask | once | 2026-09-24 |

## readings

| date | # | reading | target | on target? | note |
|---|---|---|---|---|---|
| 2026-09-22 | 2 | 2 failures in the last 7 runs (2026-09-20, 2026-09-21; both `schedule`) | 0, one single-day failure tolerated | **no** — two consecutive days | `gh run list -R OytunOnal/permit-rulebook-data --limit 10 --json conclusion,createdAt`. Causes from the run logs: 09-20 six sources HTTP 403 (buzer.de ×5, wetten.overheid.nl); 09-21 three `TypeError: fetch failed` (boe.es ×2, bamf.de). 09-22 green: 46 sources, 0 unreachable. Off target → the retry slice, v1.2 queue (data #21). |
| 2026-09-22 | 1 | 0 open source-change flags older than 48 h | 0 | yes | `gh issue list -R OytunOnal/permit-rulebook-data --state open --label source-change --json number,createdAt` — none open. |
