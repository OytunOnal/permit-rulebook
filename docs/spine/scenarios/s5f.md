# s5f — "Launch-readiness sweep" · Acceptance scenario

Status: APPROVED (human, 2026-09-07).
Born from: the s6 boundary session — four backlog items promoted so that the
launch slice is launch and nothing else (forks A1, D1, D2, D3).
Screen change: none new. Cards gain sources on lines that had none; one
interview option changes.
Slice exits: `tdd` + `code-review` — mandatory.

## What this slice is for

Four things must not go public: a known wrong verdict, the last quotes no gate
verifies, the last sentences on a card with no source, and documents in a
language the public repository does not speak. Each is small; together they
are the difference between launching a product that keeps its promise and one
that keeps most of it.

## Design decisions this slice encodes (approved with this scenario)

1. **`es-highly-qualified` is measured against three years, not five.** Ley
   14/2013 art. 71.2 counts three years of professional experience. The
   interview's `experience` field gains an option that lets a person declare
   it, and the route's criterion reads that option. The option's wording, its
   `short`, its `subject` and its position in the band ladder are authored
   plain English under the s5d rules. **Every other route that reads
   `experience` keeps its verdicts** — the new option must map onto the
   existing bands so that Germany's "2+ years within the last 5" and the
   7-year IT limb are untouched. If that mapping cannot be made without a
   verdict moving elsewhere, the slice stops and reports it.
2. **The watch gains a `pdf-text` strategy.** It fetches the PDF, decodes the
   text layer behind its embedded fonts (the decoder written on 2026-09-07 is
   the starting point), normalises it, and stores it as `text` beside the
   byte-hash. The quote-fidelity gate then reads PDF quotes like html ones.
   **A PDF with no text layer reports `unverifiable — scanned-image`** (the
   enumerated Unsourced reason; review ruling 2026-09-07 — the old "pdf tier —
   no text layer" wording was a second spelling) — the strategy must not invent text from an image. A
   changed text layer with an unchanged hash cannot happen; a re-typeset PDF
   with the same words reports `unchanged` on text, which is the point.
3. **Every bare precondition becomes a sourced precondition statement, or a
   declared reading, or is deleted.** The 38 lines under "Also required — not
   checked here" that carry no source get the same three honest outcomes s5e
   gave the notes. The gate from s5e already enforces it once `preconditions`
   is a kinded slot: the slice makes it one. Where the authority's wording is
   on a page already watched, the quote is attached and machine-verified;
   where it is on the PDF tier, decision 2 verifies it; where no source states
   it, it is either ours (a reading) or gone.
4. **Every document under `docs/spine/` and every DECISIONS entry is English.**
   The one-pager, assumptions, research-01, scenarios s1–s3b and the older
   DECISIONS entries are translated **without changing meaning** — a
   translation that improves a decision's argument has changed the record.
   Quoted Turkish source text (none is expected) stays quoted. The
   conversation with the human stays Turkish; the disk is English.
5. **Nothing else changes.** No route appears or disappears, no threshold
   moves, no copy is polished beyond what decisions 1 and 3 require. The
   verdict SHA over 400 seeded profiles changes **only** on `es-highly-
   qualified`, and the slice reports exactly which profiles moved and in which
   direction — every one of them from `not yet` toward `within reach` or
   `met`, never the reverse.

## Seed data

No new routes. Decision 1 needs the BOE article 71.2 quote (already on the
watchlist, machine-verified). Decision 2 needs the two PDFs already watched.
Decision 3 needs the pages behind the 38 lines — all four countries' route
pages, all already watched after s5e.

## Steps

1. **The Spanish verdict moves, and only it.** A Spanish highly-qualified
   profile with three years' experience and everything else met resolves
   **met**; the same profile with two years resolves as it did before. Run
   the 400-profile verdict pin: the diff lists only `es-highly-qualified`
   rows, all moving toward the reader, and the count is reported.
2. **Germany does not flinch.** The DE experienced-worker route, the 7-year IT
   limb and the Chancenkarte points ladder return identical verdicts for every
   persona in the existing suites.
3. **The last human tier closes.** `npm run check` reports the PDF quotes as
   verified, `human_tier: 0`, and `verify-s5e.md` is marked closed by the
   machine with the date. Feed the strategy a PDF with no text layer: it
   reports `unverifiable — scanned-image` (the enumerated word; the message tail still says "no text layer" — review ruling 2026-09-07), never verified.
4. **The 37 lines** (the scenario said 38; the file held 37 at every commit s5f could start from — my miscount, DECISIONS 2026-09-07)**.** `npm run check` prints the prose-provenance line with
   every precondition accounted for — sourced, ours, or gone — and the count of
   each. Walk a German and a Dutch card and read "Also required" aloud: every
   line either carries a quote with a host and date or is under "Our reading".
5. **Edge profile (mandatory).** The all-unknown weak profile across four
   countries, plus "I don't know" everywhere it is offered: no card lost a
   line it needed, no card gained an empty block, the honesty line still shows
   where it did, and the new experience option appears in the ledger with a
   label a stranger understands.
6. **The repository reads English.** `git grep` for the Turkish characters
   `ğ`, `ş`, `ı`, `İ` under `docs/` and in `DECISIONS.md` returns only quoted
   source text or proper nouns (Türkiye, İstanbul). A reader opening the
   one-pager on GitHub reads it without translation.
7. **Regression.** All existing tests stay green except the ones that pin
   the Spanish verdict, which move with it and say why; `astro check` zero
   errors; watch coverage both ways; quote fidelity `ok`.

## Invariants (property tests)

- **Adding an option to a band field never changes a verdict on a route that
  does not read that option**, over generated profiles — the guard for
  decision 1's "every other route keeps its verdicts".
- **A PDF text strategy never reports `verified` for a document with no text
  layer**, over a generated set of PDFs with and without one.
- **No precondition reaches the screen without a declared kind**, over every
  route — the s5e invariant, now covering the slot it left out.
- Everything from the existing suites, re-run.

## Runs

- mock-green: 2026-09-07 — built and reviewed on both axes (15 findings
  applied); 323 engine + 70 navigator tests; `human_tier: 0`; 120 quotes
  verified; fixed-population differential 15 rows better, 0 worse.
- real-green: 2026-09-07 — walked by the session at the human's delegation
  (see DECISIONS): 15 / 15 moved rows agreed, two "met" cards read in the live
  interview, the s3b decision read against its Turkish original — pass.
  → **v0.10**
- (original condition, kept:) real-green requires the human: read the moved Spanish verdicts as a
  list and agree each moved the right way; read one translated decision
  against its Turkish original and confirm the argument is the same)

## De-mock births

- If decision 1's mapping cannot be made without a verdict moving elsewhere,
  the slice stops and the band redesign becomes its own scenario.
- Any precondition that ends up on the human tier despite decision 2 (a source
  that is neither html nor a text-layer PDF) joins a `verify-s5f.md`.
