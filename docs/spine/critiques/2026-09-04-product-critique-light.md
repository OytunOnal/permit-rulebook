# Product critique — light mode, s5c boundary (2026-09-04) · PRODUCT_RUBRIC 1.1

Light mode per the genesis anchors: the full walk ran on 2026-09-03 (29/40) and
runs again at the v1 gate. This one walks **only the flow s5c touched** — the
passport question, the notice beside the results, and the reduced-threshold
cards — and scores only the lenses that flow can move.

Walked at `visa-rules@ed55c92` + `visa-navigator@8bb1b61` via the CDP harness.
Controls operated: the filter input (seven different spellings), the result
rows (click), Tab through the list, Enter on an untouched box, Enter after
typing, the declaration panel, and the same flow again at 390 px.

## Findings

**Blocker — found and fixed in this pass**

1. **A country you know by another name was unreachable.** Typing "turkey" —
   the name a Turkish engineer has used their whole life, and the name every
   non-Turkish user will type — returned *"No country matches — check the
   spelling"*, when the spelling was fine. Same for "Holland", "Czech
   Republic", "Ivory Coast", "Burma". And because the cold list shows 60 of 198
   with no way to page, the user could not scroll to it either: they were
   stuck at the one question that decides whether they need a permit at all.
   Pinned: `crit-tr` walk, step "typed turkey".
   **Fixed:** the vocabulary carries `aliases` — search keys only, never
   displayed, so the label the tool prints stays the official name. Verified:
   turkey→Türkiye, holland→Netherlands, czech republic→Czechia, ivory
   coast→Côte d'Ivoire, burma→Myanmar, usa→United States. The empty-state copy
   stopped blaming the user's spelling.

**Friction**

2. **"extra rights" reads like a better passport.** The class hint beside
   Türkiye now says "extra rights — see the note with your results". At a
   glance, in a passport picker, that reads as *this passport gets you more* —
   while the note it points to says the opposite: the entry criteria are
   identical, the rights come after employment. Pinned: `crit-390.png`.
   Suggest "a note applies to this passport".
3. **Sixty rows of noise before the first keystroke.** The cold list opens on
   Afghanistan…Albania with "138 more — keep typing to narrow the list". It
   tells the user the shape of the control, but nobody scrolls it; a short
   prompt would be calmer. Low cost either way.

**Polish**

4. The Türkiye notice quotes the whole of Decision 1/80 art. 6 — ninety words
   of 11 px mono covering three separate rights. The card's own body already
   says the operative thing; the quote could be the first sentence with the
   rest behind the source link.
5. The class hint is the smallest text on the screen (10.9 px) and carries the
   only difference between two adjacent rows.

## Rubric scores — affected lenses only

| Lens | Score | Δ vs 2026-09-03 | Evidence |
|---|---|---|---|
| 2 Flow friction | 4 | = | Eight questions for a German offer-holder, unchanged by the country list; the picker is fast once a name matches — it was 2 before the alias fix, when a whole class of users could not answer at all. |
| 3 Copy & framing | 4 | +1 | "Which passport will you apply with?" is plain; the reduced card names the fact that earned the lower number; #2 is the one label that misleads. |
| 4 Trust surfacing | 5 | +2 | The met card quotes the €3,122 row it actually used, and the notice carries quote, host, legal basis (Decision 1/80 art. 6) and read date. |
| 6 Edge states | 4 | +2 | No-match is a designed state; zero-open still leads with the steps; an EU passport ends on the free-movement notice; the extra-rights notice never replaces results. |
| 7 Accessibility basics | 4 | = | Focus ring on rows, a hidden status announcing match counts, the result list out of the live region, Enter no longer answers on an untouched box. Not verified: a real screen-reader pass. |
| 8 Responsive | 5 | = | 390 px: no overflow, filter and rows legible, 54 px touch targets. |

Not re-scored (untouched by this slice): first-run clarity, result
actionability.

## Adoption verdict — the walked flow

The Turkish engineer now finishes and gets a strictly better answer than
before: the same verdicts as any other non-EU passport, plus a sourced note
about rights they probably did not know they had. Before the alias fix they
stalled at the passport question — which would have been the worst possible
place to lose them, since the tool's whole first exception is about them.

## Recommended Adjustments (pick-and-apply)

1. **Relabel the class hint** ("a note applies to this passport") and quote
   only the first sentence of the Türkiye passage on the card. Closes #2, #4.
2. **Open the list empty** with a one-line prompt instead of 60 rows. Closes #3.
3. Leave #5 with the standing contrast issue (tracker #1) — it is the same
   token, and worth one decision rather than two.
