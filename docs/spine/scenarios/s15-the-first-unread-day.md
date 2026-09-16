# s15 — the first unread day

**Status:** approved 2026-09-16 (human: "1", of two ways). No issue; the
deploy log of run 35098352421 is the record.

## What happened

The first watch state to carry a real unread source reached the site on
2026-09-16: `bamf-hochschulabsolvent` (*fetch failed* on the 16th, last read
09-07). The site said exactly what s11 built it to say — the footer *"(last
run 2026-09-16 · 1 source unread)"*, `/data/` *"One German source did not
answer on the last run…"* — and the deploy stopped anyway: six tests
failed. Five of them read the real state and assert the clean day's
sentence with **no** `unread` in it; they had passed for five days because
the state was clean for five days. The sixth is a real finding: at 390 px
the footer's parenthesis is 350 px wide in a 348-px column.

The site is right; the tests were written for the only days they had seen.
Live stays on s12; s13 and s14 wait on master.

## What must be true

1. **A "clean day" case measures a clean day, never today.** Every case in
   `tests/s11.test.ts` and `tests/footer.test.ts` that asserts the plain
   sentence (no exception clause, no `unread`) renders with an explicit empty
   unread list — `dataPage(ds, run, [])`, `footerFacts(ds, run, [])`,
   `routePages(ds, run, [])` or whatever the renderer's signature is — and
   never through the default that reads the real state.
2. **A "real state" case expects what the real state says.** The cases
   named for the state this site is built against derive the expectation
   from `unreadSourcesAt(dataset, lastWatchRun())`: if it is empty, the
   plain sentence and no `unread`; if it is not, the short form with the
   right count in the footer and the exception clause on `/data/` with the
   right adjective and date. One case, both branches, the branch taken
   printed in the assertion message so a reader of a red run knows which
   day it was.
3. **The footer's parenthesis may break at 390.** The `at 390 nothing that
   cannot break is wider than its column` case listed the last-run
   parenthesis among the things that cannot break; with a count in it, it
   can — allow a break before `·` (a `<wbr>` or a normal space in place of
   the non-breaking one, whichever the footer already uses for its other
   separators), and the case measures each half. Nothing else in the
   footer changes.
4. **Nothing else changes.** No copy, no s11 derivation, no fixture unless a
   footer byte moved (then regenerate with the reason).

## How it is proved

- The suite green **against today's state** (1 unread) and against a
  fabricated clean state — both run in CI's fonts locally before the push.
- The six cases named in run 35098352421's log, green.
- The deploy of master green; s13 and s14 live; read on the live host:
  `/feedback/` exists, the footer says *1 source unread* today.

## What this slice is not

It is not a change to what the site says on an unread day — that is s11,
and it was right. It is not a fix for BAMF's fetch failure — the next run
re-tries it.
