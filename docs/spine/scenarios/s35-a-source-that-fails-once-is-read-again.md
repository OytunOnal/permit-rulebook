# s35 — a source that fails once is read again

Data #21's slice (intake #21, 2026-09-22; #22, 2026-09-23, the same class),
v1.2's queue head after s34. Written 2026-09-24, before any code; approved
when the human says so.

## What happened

The daily watch reads 46 sources and gives up on the first `unreachable`:
one source that does not answer makes the run red, opens or extends the
*watch run failed* issue, and counts against metric 2 (*the daily watch
finishes* — failures in the last 7 runs, target 0, one single-day failure
tolerated). Four of the last five runs were red, and none of them for a
reason that was still there the next morning:

- 2026-09-20 (run 35503406538): six sources answered `HTTP 403` — five on
  buzer.de, one on wetten.overheid.nl. All six read clean on 09-21.
- 2026-09-21 (run 35590580988): three `TypeError: fetch failed` — two on
  boe.es, one on bamf.de. (The queue line calls these timeouts; the log does
  not say — `fetch failed` is Node's wrapper and the cause underneath it was
  never printed.)
- 2026-09-22: all 46 read clean.
- 2026-09-23 (run 35846386408): `bamf-hochschulabsolvent`, `fetch failed`.
- 2026-09-24 (run 35985154468, the first after s34): `bamf-hochschulabsolvent`
  and `bamf-selbstaendige-taetigkeit`, `fetch failed`; the seven browser
  entries read clean, the job took 3 min 12 s.

Each red day is honest — the source was unread, the site said so — and each
was a source's own hiccup, over by the next run. The watch has no second
try, in the run or across runs, and it cannot tell a hiccup from an outage
because every failure is one word.

## What a reader gets

Nothing on the page changes. `/data/` and a route page keep saying *re-read
daily; the last run did not reach N* on a day a source went unread, because
that is true. What changes is behind the page: a source that does not answer
is asked again, and the alarm — the red run, the issue, the metric's failure
— is raised for an outage, not for a minute.

## What must be true

1. **A failure has a class, and the fetcher names it.** `FetchResult`'s
   failure arm gains `failure: "transient" | "refused-by-source" |
   "refused-by-us"`. *Transient*: a network error (Node's `fetch failed`
   with a cause code — `ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`,
   `ENOTFOUND`, `EAI_AGAIN`, undici's `UND_ERR_*`), the source's budget spent
   (`AbortSignal.timeout`, 30 s), `HTTP 408`, `425`, `429`, any `5xx`, an
   empty body. *Refused by the source*: any other `4xx` (`403`, `404`, `410`
   — a bot wall or a moved page answers the same a minute later).
   *Refused by us*: everything the floor declines to request — a
   credentialled or malformed address, an off-origin redirect, a private or
   loopback target, too many hops. The browser reader classes the same way:
   the page never settling within the budget is transient; a step that finds
   no field is refused by the source (the page changed); an off-origin
   navigation, or no Chrome on this machine, is refused by us — our
   environment, not the source's minute. The error text keeps its shape and gains
   the cause: `fetch failed` becomes `fetch failed (ECONNRESET)` — the code,
   never the cause's message, which can carry an address.
2. **A transient failure is retried once, in the run, after the pass.**
   `runWatch` finishes the pass over every entry first, then asks each
   transient failure again — the same reader, the same budget, one more
   time. The gap is the rest of the pass (about three minutes on the
   runner), not a sleep. A second answer replaces the first report; a
   second failure stands. Refusals are not retried in the run: the source's
   answer will not change in three minutes, and ours must not.
3. **One unread day is a lapse; two in a row are an outage.** The state's
   `unread` list, already written on every run, gains `since` on each item:
   the first day the source went unread. A source unread today that was not
   in the previous run's `unread` is a *lapse* — reported `unreachable` as
   now, listed with `since: today`, logged at `warn` as `watch:lapse`, and
   the run stays green. A source unread today that was already unread in
   the previous run's list is an *outage* — logged at `error` as
   `watch:outage` with both dates, and the run is red, exactly as every
   unread source reddens it today. A source that answers drops off the list
   and its `since` with it. `--only` runs merge the list as they do now and
   keep `since` for the entries they did not touch.
4. **A refusal by us is red the same day.** Waiting a day changes nothing
   about an address the watch will not request; a source that starts
   redirecting off-site, or an entry that carries credentials, is a finding
   for the curator now. The lapse rule of point 3 applies to transient
   failures and to refusals by the source; not to ours.
5. **The verdict is the CLI's; the workflow does not learn to count.** The
   exit code stays the one signal the workflow reads (`Fail the run if any
   source was unreachable` keys on the step's outcome and is not touched):
   `1` when any source is in outage or refused by us, `0` otherwise, lapses
   included. The `watch complete` line grows `lapsed` and `outages` beside
   `unreachable`, so a green day with a lapse is visible in the log and not
   only in the state. The *watch run failed* issue's body is the workflow's
   and does not change; the run's log names the source and its two dates.
6. **The site reads what it read.** The data package's `unreadSources` and
   the site's `dailyCheck(unread)` count the `unread` list as before; `since`
   is an added field they ignore. A reader on a lapse day still sees *the
   last run did not reach 1*. Nothing under the site's `src/` changes, and
   no user-facing string does.
7. **Metric 2 measures what it said.** The metric's target already tolerates
   one single-day failure; from this slice the run's own verdict tolerates
   the same one day, so the reading of 2026-09-29 counts red runs that name
   an outage or a refusal, and nothing else. The metric's row in
   `docs/spine/metrics.md` does not change; its *readings* note says which
   rule the run was under.
8. **The words.** `CONTRIBUTING.md`'s watch section says what a lapse and
   an outage are and when the run goes red; the site's `CONTEXT.md` gains
   **Lapse** and **Outage** under the watch's terms, and **Failure class**
   naming the three. `data/verify-s5e.md` is not touched.

## How it is proved

Seed: a fixture fetcher that answers by script — `[fail(transient),
ok]`, `[fail(transient), fail(transient)]`, `[fail(refused-by-source)]`,
`[fail(refused-by-us)]` — and a fixture state whose `unread` carries one
entry with `since: "2026-09-23"`.

- `tests/s35.test.ts`, asserting decisions: a transient failure answered on
  the retry reports `unchanged`/`changed`/`baseline`, not `unreachable`, and
  the fetcher was called twice for that entry and once for every other; the
  retry happens after the last first-pass call, not before it; a
  refused-by-source failure is called once; a transient failure that fails
  twice is a lapse (`unread` with `since: today`, exit 0 through the CLI's
  own rule, `watch:lapse` at `warn`); the same entry unread in the previous
  state is an outage (`watch:outage` with both dates, exit 1); a
  refused-by-us failure is exit 1 on its first day; a source that answers
  drops its `since`; `mergeTargetedRun` keeps `since` on untouched entries;
  the `watch complete` line carries `lapsed` and `outages`.
- `tests/s34-fetcher.test.ts` gains the classes: a connection reset by the
  fixture server is transient with its code in the text; `403` is
  refused-by-source; an off-origin redirect is refused-by-us; the budget
  spent is transient. `tests/s34-browser.test.ts` gains one case: a missing
  field is refused-by-source, a browser retry is one more open.
- `tests/rebuild-dispatch.test.ts` unchanged and green: the workflow's
  steps are not touched, and the test says so by not changing.
- `npm run check` green; the runner's watch dispatched once with
  `commit=false` on the branch, reading all 46 (the seven browser entries
  among them) with the new line's fields, before the merge.
- **Real-green: the metric-2 reading of 2026-09-29** over the seven runs
  ending that day — every red run among them names an outage (a source
  unread on two consecutive runs) or a refusal by us, and no run is red for
  a source that read clean the next morning. The first scheduled run after
  the merge is read the morning after for its `watch complete` line, but the
  slice's claim is about a week, and a week is what proves it.
- The docs of point 8, read.

## What this slice is not

- Not a way past a bot wall: a `403` is a refusal and stays one; no
  user-agent games, no proxies (the 2026-09-15 measurement in
  `fetch-source.ts` stands: the watch's plain name is what got Spain's page
  to answer).
- Not a backoff loop: one retry, one gap, one run. A source down for the
  day is unread for the day.
- Not a change to what a reader sees: the unread count on `/data/` is the
  truth of the run and stays it.
- Not the resolve-time address check (v1.2's next queue item, versioned
  2026-09-24): a hostname that resolves to a private address is refused by
  us there; here it is whatever the fetcher says today.
- Not a longer budget: 30 s per source stands (s34's default, DECISIONS
  2026-09-24); the retry spends a second budget, not a bigger one.

**Corrected 2026-09-24, by the build:** three things in *How it is proved*
turned out to be smaller or other than written. The budget spent is not
proved end to end in `tests/s34-fetcher.test.ts`: `BUDGET_MS` is one number
both readers borrow and is not a parameter, so making it injectable to keep
the case fast would be changing the code to suit the test — the class is
asked of the error path instead, of exactly what `AbortSignal.timeout`
rejects a `fetch` with. The browser case cannot be one case: a missing field
is refused by the source and is therefore never retried, so “a browser retry
is one more open” is shown against a page the fixture server answers `503`
to, which is transient by point 1's own rule — the missing field proves the
class and the 503 proves the second open. And the brake is a week, not
the run before: a run is red when a source went unread on two or more of
the last seven mornings, however they fell. The states on disk carry no
days at all, and a source they list was unread on that run, so the two
`bamf` entries of 2026-09-24 start with one silent morning each.
