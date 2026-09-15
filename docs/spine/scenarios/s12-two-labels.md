# s12 — two labels that mean what they say

**Status:** approved 2026-09-15 (human: "approve"). Site #9.

## What happened

Walking `/data/` on 2026-09-15 the human read *"Newest value read 2026-09-10"*
as "last checked" and asked why the numbers were old. They were not: the
dataset holds 183 read dates, the newest is 2026-09-10, and nothing in it has
changed since — the daily watch confirms every source unchanged and, by
design, does not move a value's date when it does. The day it was last
**confirmed** is the line beside it: *"re-read daily — last run 2026-09-15"*.

Two facts sat side by side — last changed, last checked — and the label said
which one it was only to someone who already knew this product's meaning of
"read". A label the product's own author misreads has not earned its meaning.

## What a reader gets

On `/data/`, the "What it holds today" list says plainly when a value last
changed and when everything was last checked, each with its own label, so a
reader who wants either fact finds it under a word that means it.

## What must be true

1. **The row `Newest value read <date>` becomes `Newest value changed <date>`.**
   Same value, same source (`readRange(dataset).newest` — the newest
   `retrieved_at` in the dataset), new label. "Changed" is accurate: that date
   moves only when a person updates a value after a flag.
2. **A new row beneath it: `Last checked <date>`**, from the watch state's
   `last_run` — the same fact the freshness sentence already prints, read from
   the same place (`lastWatchRun()`), never a second copy. On a day the state
   carries an unread list (s11), this row is the run's date and the sentence
   below it carries the exception; the row does not repeat the exception.
3. **The words live in `copy.ts`**, like every other label on the site; the
   template types nothing.
4. **Nothing else changes.** The `read <date>` beside every quote, the RULES
   READ stamp and the footer's "values read between … and …" stay exactly as
   they are — there "read" means what it says: that sentence was taken from
   that page on that day. The route pages are not this slice: the root-build
   fingerprint does not move. The `/data/` clean-day fixture (s11) moves, on
   purpose, and says why.
5. **The rows stay dates, marked up as dates** — `<time datetime>` — like the
   rows around them.

**Corrected 2026-09-15, by the build** (the writing session's correction,
dated and marked): four things above were wrong or unsaid.

1. The row did **not** read `readRange(dataset).newest`; it read
   `siteReadDate(dataset)`, the newest page stamp across every route, which
   folds in the audience notice's and any route notice's dates. The two agree
   today (2026-09-10) and can diverge; under the word "changed" the row may
   only print a date on which a *value* changed, so its source becomes
   `readRange` in fact. The RULES READ stamp and the freshness paragraph keep
   the broader date on purpose: a notice's read date is also a page's.
2. "Read from the same place (`lastWatchRun()`)" is one level off: calling it
   in the row would make the list and the sentence disagree on any render asked
   about another run (the fingerprint renders 1970-01-01). The row reads the
   `lastRun` parameter the sentence reads, which defaults to `lastWatchRun()`.
3. "The existing 412 tests green" needs `npm run build` first: twelve of them
   read `dist/`, and a fresh worktree has none.
4. When the state carries no `last_run`, the row omits itself, as the
   freshness sentence already does — rather than an empty `<time>`.

## How it is proved

- A case renders `/data/` over the real dataset and asserts the list carries
  `Newest value changed` followed by the dataset's newest read date and no row
  labelled `Newest value read`; and `Last checked` followed by the watch's
  last run — the same string `lastWatchRun()` returns, so the two cannot drift.
- A case over the frozen dataset and a fixed run (the s11 fixture's shape)
  regenerates `/data/`'s clean-day hash on purpose, and its `source` line says
  this slice is why.
- The existing 412 site tests green; the root-build fingerprint unmoved.
- The human's walk on the preview: `/data/`, the two rows, read cold.

## What this slice is not

It does not touch the meaning of "read" anywhere else, and it does not add a
"changed" date beside individual values — that date is already there, beside
each quote, under the word that is right for it.
