# STATUS — Visa Navigator

## Where are we

Genesis, slice loop; scale **Product**; **v0.6** shipped, with **s5 · s5b · s5c** at mock-green (v0.7 stamps when the human pass lands). 9 candidates on the roadmap (5 unversioned).

```mermaid
flowchart LR
    A[Scale Gate ✓] --> B[Brainstorm ✓] --> C[One-pager ✓] --> D[Design ✓] --> E[Plan ✓]
    E --> F["Slice loop ◀ here<br/>v0.1–v0.6 ✓<br/>four countries · honest verdicts · exceptions"]
    F --> G[v1: public launch]
```

## What is happening now

**The human verification pass came back: 35 of 39 items confirmed at their
sources.** `verify-s5.md` is closed 21/21 — France, the Netherlands, the four
BOE articles, and the Spanish salary PDF, which is the tier no machine here can
read and the reason this pass was the gate. `verify-s5c.md` is 16/18. One
earlier finding is reversed by it: the Dutch top-200 mechanic that a report
called absent is in the source verbatim, two of three ranking publishers.

The one open question in that pass — whether to keep CLDR's country labels —
was answered **hand-edit them**. Twelve now read as the names people use:
"Saint Kitts and Nevis", not "St. Kitts & Nevis"; "Democratic Republic of the
Congo", not "Congo - Kinshasa"; "Hong Kong", not "Hong Kong SAR China". Every
displaced form survives as an alias.

Doing it uncovered a live defect the checklist was not looking for. Search
ignored diacritics but not punctuation, so "Côte d'Ivoire" — whose label
carries a typographic apostrophe — was unreachable to anyone typing a straight
one, and "guinea bissau" without its hyphen found nothing. That is the third
time this control has hidden a country from the person holding that passport.
Folding now drops punctuation entirely, and a test types each displaced form
and demands its country back. 178 tests green, `astro check` clean.

## What is expected from you

- [ ] **Open the s6 boundary when you want the launch slice.** It is the only thing left. Two gates wait there that are cheap now and expensive after launch: the **name** (never chosen — "visa-navigator" is the folder name) and the **dataset licence**. I bring roadmap promotions to it, the phone walk happens on the deploy preview before any announcement, and the v1 gate's full critique runs in isolation, not by me.

**Everything else from before v0.7 is closed:** both verification checklists
(39 items, including the Spanish PDF tier), the country-label gate, all four
learn links, and the two watch-flag verdicts. The slices stay **mock-green**
until their acceptance scenarios are walked with the human — those walks are
the first work of the s6 boundary, and the v0.7 stamp lands with them.
