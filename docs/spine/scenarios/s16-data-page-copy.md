# s16 — `/data/` in the reader's words, and the last two tracker doors

**Status:** approved 2026-09-16 (human: "approve"). Site #10, plus
what s13 left behind.

## What happened

The light critique of s12 (2026-09-16) walked `/data/` as the persona and
found three polish items: a label in the provenance gate's own vocabulary
(*"46, declared and shown as ours"*), a sentence naming a tracker the
reader has not met (*"files an issue in the tracker"*), and two identical
dates side by side (a note, not a change). The same day s13 made e-mail the
reader's door and moved the tracker to `/feedback/`, named as the option
for a reader with an account — and left two doors pointing the old way:
the *Report a wrong value* link in `/data/`'s **Take it** section and the
same link in every route page's data door. The freshness sentence's
"tracker" is now not only unintroduced but wrong about where a reader goes.

## What a reader gets

`/data/` says what it holds in words that stand on their own, and every
place the site tells a reader where to say something wrong points at the
same door: `/feedback/`.

## What must be true

1. **The counts row:** *Sentences of ours* — *46, written by us and marked
   as ours* (the number derived, as now). "Declared" leaves the reader's
   view; the *Prose provenance* line further down keeps its own words.
2. **The freshness sentence's second half** becomes: *A source that has
   moved raises a flag and a person reads it: the values on this site, and
   the dates beside them, change when a person changes them, never on their
   own.* No tracker named; the exception clause before it is s11's and does
   not change.
3. **The two doors** — `/data/` **Take it** and the route pages' data door —
   become the site's door: the words **Report what is wrong** (the first
   door's button on `/feedback/`, `copy.ts`) linking to `/feedback/`
   (internal, no `target=_blank`). `TRACKER_WRONG_VALUE` goes if nothing
   else uses it; `TRACKER_URL` stays for `/feedback/`'s GitHub block. The
   `/data/` **Take it** section keeps *The dataset on GitHub* — that is the
   contributor's door and belongs there.
4. **The two dates stay.** *Dataset version* and *Newest value changed* are
   two facts that coincide today; no change, and the scenario records the
   critique's note so the question is expected.
5. **The words live in `copy.ts`**; templates type nothing. The route pages
   move, so the root-build fingerprint regenerates with the reason; the
   `/data/` clean-day fixture likewise.
6. **Nothing else changes** on `/data/`, the route pages, or `/feedback/`.

**Corrected 2026-09-16, by the build:** two things. (1) `TRACKER_WRONG_VALUE`
stays — `/feedback/`'s GitHub block uses it; point 3's "if nothing else uses
it" was answered. (2) The page's meta description also said "…and the
tracker" (typed in the template, not `copy.ts`); "no tracker in the page"
in the proof was read as reader-visible body only, and the build raised the
description rather than widening on its own. The session takes it: the
description ends "…with the downloads and the checks.", lives in `copy.ts`,
and the assertion covers the whole document outside style and script.

## How it is proved

- A case renders `/data/` and asserts the counts row's exact text, the
  freshness sentence's second half exactly, no `tracker` and no
  `github.com/.../issues` in the page outside the **Take it** repository
  link, and the **Take it** door's href is `/feedback/`.
- A case renders one route page and asserts the data door's link text and
  href, and that no route page carries an `issues/new` URL.
- The fingerprint and the clean-day fixture regenerated with their reasons;
  the existing 467 tests green.
- The human's read of `/data/` on the preview, cold.

## What this slice is not

It is not a redesign of `/data/`, and it does not touch `/feedback/`'s
GitHub block, which is where the tracker now lives on purpose.
