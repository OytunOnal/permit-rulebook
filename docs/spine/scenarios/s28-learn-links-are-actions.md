# s28 — a learn link says what the reader does there

**Status:** proposed 2026-09-17. v1.2 fix from the human's walk (2026-09-17):
*"§ 18g AufenthG (§ = section; AufenthG = the Residence Act) lists the
shortage groups by ISCO-08 code (132, 133, …) — bu link çok garip duruyor."*

## What happened

Four fields carry a `learn` door — a place the reader can find an answer
they do not know. The site renders its `label` as the link text on three
surfaces: under the question (*Not sure? …*), in the result card's box
(*You can find out yourself: …*) and on the route page (*You can find this
out yourself: …*). One label is an action (*Check your degree in the
official Anabin database*); three are statements about a source:

- *§ 18g AufenthG lists the shortage groups by ISCO-08 code (132, 133, 134,
  21, 221, 222, 225, 226, 23, 25)* — buzer.de
- *service-public.fr sets out the talent card's innovative-company route*
- *The Dutch immigration service (IND) lists the designated foreign
  institutions on its orientation-year page*

And two of the three surfaces gloss the label (`glossSection`), so the link
reads *§ 18g AufenthG (§ = section; AufenthG = the Residence Act) lists …* —
a sentence with an explainer inside it, underlined end to end. A link names
where it goes and what the reader does there; a statement is prose.

## What must be true

1. **Every learn label is what the reader does there, in the reader's
   words.** One sentence, an action first, no statute shorthand (the label
   may name the law in words: *section 18g of the Residence Act*, never
   `§ 18g AufenthG` — a symbol in a link would want a gloss, and a link is
   not glossed). The four, decided:
   - `recognition_de` — *Check your degree in the official Anabin database*
     (unchanged).
   - `occupation_shortage` — *Check the shortage groups in section 18g of the
     Residence Act (ISCO-08 codes 132, 133, 134, 21, 221, 222, 225, 226, 23,
     25)*.
   - `fr_innovative_employer` — *See the talent card's innovative-company
     route on service-public.fr*.
   - `top200_grad` — *See the designated foreign institutions on the IND's
     orientation-year page*.
   These are our sentences, not quotes: no `history` line; the dataset
   version moves (a data change), the schema does not. `CONTRIBUTING.md`
   gains the rule in one sentence beside `learn`.
2. **Link text is never glossed.** The three surfaces render the label
   verbatim (escaped) — `glossSection` leaves the card box and the question
   line, as it already is absent from the route page. The screen's
   first-use explainer counts prose only; nothing else about glossing
   changes.
3. **The three surfaces agree**: the same label, the same href, the external
   mark where the surface already draws one; no new copy.
4. **Nothing else changes.** The route fingerprint moves for the routes whose
   pages carry one of the three labels (the *What the checker asks* block)
   and regenerates with this reason; `/data/` shows the new dataset date.

## How it is proved

- Data: a test that every `learn.label` opens with a verb from the declared
  set the contract names (*Check*, *See*, *Read*, *Find*) — a decision the
  contract states, keyed to the field's own kind — and carries no `§`.
- Site: a unit case that a label containing `§` renders in the link text
  verbatim on the card box and the question line; a browser walk at 390×844
  to a Germany result with the shortage question unanswered — the card's box
  carries the new sentence as one link — and the route page for the shortage
  Blue Card shows the same sentence.
- The human's read on the local build: the three surfaces.

## What this slice is not

It is not a change to what any authority is quoted as saying, not to the
gloss mechanism, and not to the *Official page ↗* links.
