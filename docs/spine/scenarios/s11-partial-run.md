# s11 — a partial run says so

**Status:** approved 2026-09-15 (the human chose the wording; see "The sentence").

## What happened

The watch failed on 2026-09-11, 12, 13, 14 and 15 — five consecutive days —
and every failure was the same two sources refusing the CI runner:

- `es-uge-umbral-pdf`, Spain's salary-threshold PDF, last read **2026-09-07**
- `es-uge-index`, the UGE requirements page, last read **2026-09-02**

Both answer a developer machine with HTTP 200 the same day (702 KB of PDF,
299 KB of HTML), so the pages are up; it is the runner they refuse.

The failure is not the defect. The defect is what the site said while it
failed: `/data/` read **"Every source is re-read daily — last run 2026-09-15."**
That sentence is printed from a state the workflow commits *before* the
unreachable check fails the run. The ordering is deliberate and still right —
42 fresh sources reaching the site beats none — but nobody foresaw that the
sentence would turn a partial run into an unqualified claim. It was true of 42
sources and false of two, and the two back values on live pages.

## The sentence (the human's words, 2026-09-15)

On a day when something went unread, `/data/` says:

> Every source is re-read daily — last run 2026-09-15. Two Spanish sources have
> not answered since 2026-09-07; the values they back still show that date.

On a day when everything read, it says exactly what it says today:

> Every source is re-read daily — last run 2026-09-15.

The exception clause **disappears** when nothing is stale. It names the
countries the unread sources back — "Spanish", not "es-uge-index" — and the
date it gives is the oldest last-read among them.

## What must be true

1. **The fact is derived, not declared.** A watch entry whose snapshot
   `retrieved_at` is older than the state's `last_run` was not read in that
   run. `core.ts` already carries the previous snapshot forward untouched when
   a source is unreachable, so this is on disk today and nothing new needs
   writing at watch time. Do not add a field the run has to remember to set.
2. **The data package owns the derivation**, beside the other things that read
   the state, and returns for each unread entry: its id, its url, the day it
   was last read, and the countries whose routes cite that url. A source no
   dataset value cites is not reported — the reader is being told about values,
   not about our plumbing.
3. **Both places that print the claim take it.** `/data/`'s paragraph
   (`data-page.ts`) carries the full sentence above. The footer on every page
   (`identity.ts`) has room for a short form only: after `re-read daily`, in
   the same parenthesis as the last run, name the count — e.g.
   `(last run 2026-09-15 · 2 sources unread)`. Propose the exact short form in
   the build report; it is the one piece of copy not yet settled.
4. **A clean day is byte-identical to today.** With no stale entry, every page
   this build produces must equal what the current template produces. The
   root-build fingerprint is the check, and it must not need regenerating for
   the clean case.
5. **Counting words, not digits, in prose.** "Two Spanish sources" — the
   sentence is prose and this product spells numbers in prose
   (`countedWords`). The footer's short form is a label and counts in figures.
6. **One country, two countries, many.** The clause reads naturally when the
   unread sources span one country ("Two Spanish sources"), two ("A Spanish and
   a Dutch source"), or none of them citable to a country (then they are not
   reported at all). Decide the joining with the vocabulary already in the
   dataset package (`joinAnd`), and test all three shapes.
7. **The stale dates are the sources', not the run's.** "since 2026-09-07" is
   the oldest last-read among the unread sources, never today's date.

## How it is proved

- A test over a fabricated state where one entry's `retrieved_at` predates
  `last_run`: the derivation names it, its country, and its date.
- A test where every entry is current: the derivation is empty and the rendered
  sentence has no exception clause.
- A test over **today's real state**, which has two stale Spanish entries: the
  `/data/` page contains the human's sentence, with "Two Spanish sources" and
  "2026-09-07" in it. This is the case that would have caught the defect.
- The existing quote-fidelity and fingerprint gates stay green.

## What this slice is not

It does not change the workflow. Whether a failed run should still deploy its
partial state is settled: it should, and now the page says so. It also does not
touch the per-value read dates on cards — those were already honest, and are
what the new sentence points at.
