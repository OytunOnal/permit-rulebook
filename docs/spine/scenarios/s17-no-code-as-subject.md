# s17 — the comparison has no subject called "Code"

**Status:** approved 2026-09-16 (human: "2", of the forms offered).

## What happened

The home masthead says *"Code compares your answers against published
rules — …"* and the results screen says *"Code compared your 3 answers
against 4 published rule sets. …"* The human raised the second on
2026-09-15 and withdrew it the same hour; on 2026-09-16, walking the s16
preview, raised it again: *"bu code hala duruyor."* The word "Code" as a
sentence's subject reads oddly to them. Of three forms — *We compared…*,
the passive, *The rules compared…* — they chose the passive: the subject
leaves the sentence, the claim (a comparison by code, not a judgement by a
person) stays.

## What must be true

1. **Results screen** (`src/lib/screen.ts`): *Your 3 answers were compared
   against 4 published rule sets. Every value below shows its official
   quote and the date we read it from the source.* — the counts, the
   singular/plural, the *Nearest:* and explore sentences unchanged.
2. **Home masthead, before anything is compared** (`INTRO_SUBLINE`): *Your
   answers are compared against published rules — every value shows its
   official quote and the date we read it from the source. Your answers
   stay on this device. At the end: …* (the rest unchanged).
3. **The started-interview line** (the short subline after question 1):
   read it; if it carries "Code" too, the same treatment; if not, untouched.
4. **Nowhere else.** `grep -n "Code compar"` over `src/` finds nothing
   after; the social card, `/data/`, the country and route pages are read
   for the same subject and reported, not changed, unless one carries it.
5. **The words stay in `screen.ts`/`copy.ts`** as they are today; the
   first-paint HTML of `/` moves (the masthead is server-rendered), so the
   s10 fixture regenerates with the reason; the root-build fingerprint does
   not (route pages untouched).

## How it is proved

- The existing masthead cases (`tests/screen*.test.ts` or wherever
  `masthead()` is tested) updated to the new sentences with the reason; a
  case asserting no `Code compar` in any built page.
- `first-paint.test.ts` green (the cold `/` HTML carries the new intro).
- The human's read of the interview's first screen and a results screen on
  the preview.

## What this slice is not

It does not change the claim, the counts, or the tense logic (present
before, past after) that product-critique v0.7 fixed.
