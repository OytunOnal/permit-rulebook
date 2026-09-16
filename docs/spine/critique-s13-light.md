# Product critique — s13, light mode · 2026-09-16

**Rubric:** PRODUCT_RUBRIC 1.3 · **Mode:** light — scope from the diff, lenses
scored only for that scope; scores are not product-wide and do not enter the
trend. **Conditions:** run by the session that orchestrated the slice (wrote
the scenario, directed the reviews; did not build it). Light mode permits
this and opens no gate; the merge stays the human's word. Not blind of the
slice; blind of no prior critique of these screens.

**Surface walked** (the diff's scope, on the branch preview `feedback-door`,
http://localhost:4500, headless Chrome at 1240 and 390): the header on `/`,
`/france/`, `/germany/`, `/data/`, `/feedback/` — the *Countries* disclosure
closed and open, the phone menu open; the results screen with a complete
all-countries record at `/` (four country sections) and the line under the
strip; the `/feedback/` page top to bottom; the footer's Feedback column.
**Controls operated:** the disclosure's summary (click), Escape on it, a
click outside it (four pages), the phone *Menu* button, the results line's
*Feedback* link (href read, page reached), the three door buttons and the
address link (hrefs decoded and read), the two GitHub links (href and
target read), the footer's three Feedback rows (hrefs read). Not operated:
the mail client itself — a `mailto:` opens outside the page, and headless
Chrome has none; that step is the human's walk.

**Persona** (one-pager): a knowledge worker from outside the EU with an
offer in DE/FR/ES/NL, on the results screen, who thinks one value is wrong
and wants to say so — and the same person a week later, with nothing wrong,
who just wants to say the site helped. Plus one hostile skim.

## Findings

No blockers. One friction, three polish.

- **friction · The results line reads as one long grey sentence, and the
  door is the least visible word in it.** Screen: results, 390 and 1240.
  *Something to say about this result? Feedback — a wrong value, something
  missing, or anything else.* The link *Feedback* is underlined but set in
  the same muted grey as the rest, in the same weight; at 390 it is the
  second-to-last word of the first line and the eye slides past it to the
  country sections below. The persona who wants the door finds it on the
  second read, not the first. The sentence is the scenario's, so this is not
  a build defect; it is the line's colour. *Adjustment:* the link in ink, not
  muted (`.say a { color: var(--color-ink) }` — the closing line in the
  09-10 default had this), or the word before the dash in the header's
  weight. One rule, no copy change.
- **polish · "Where (link):"** as the fourth body heading of the wrong-value
  mail. Screen: `/feedback/`, first door's template line and the mail body.
  The parenthesis is instruction dressed as a label; *Where (the page's
  address):* or simply *Source address:* says the same to a stranger. The
  scenario chose it; recorded, not pushed.
- **polish · The disclosure's arrow is tiny.** Screen: header, 1240. The
  `▾` after *Countries* is set at .9em of a .72rem label — about 8 px. It
  reads as a speck beside the word, and a reader may not know the word
  opens. Nothing else on the row has an arrow, so it is the only signal.
  *Adjustment:* the arrow at 1em, or a thin rule under the word on hover.
- **polish · The results line's second half repeats the page it leads to.**
  *— a wrong value, something missing, or anything else* is the three
  doors' names, which the reader is about to see as three cards. On the
  phone that is a second line for a list the next screen shows better. If
  the line ever shortens, this is the half to drop.

**A false alarm, kept so the next critic does not repeat it:** the first
probe of the outside-click close used `main h1`, which matches nothing —
the page's `<h1>` is in the masthead, not in `<main>` — so `.click()` ran on
nothing and the list stayed open. With `h1` the list closes on every page
tried (`/`, `/germany/`, `/data/`, `/feedback/`). The build is right; the
probe was wrong.

**Label pass** (read aloud in the persona's voice): *Countries* — fine;
*France ▾* on France's page — the persona reads it as "you are on France,
and here are the others", which is the intent. *Feedback* — the one word
every site uses; no hesitation. *Report a wrong value* / *Say what is
missing* / *Write a note* — the third is the one the persona with nothing
wrong reaches for, and it does not ask them to have a complaint; good. *If
you have a GitHub account* — honest; the persona without one skips it
without feeling excluded. *How to write, and what happens* in the footer —
slightly odd as a link label, but it says what the page is.

**Prose pass** (the slice's strings read away from the screen): READ BY A
PERSON. · Feedback · One address, three kinds of mail. The link fills in the
subject and a few headings; the rest is yours. Nothing you declared in the
interview is sent. · A value is wrong / The page says one thing; the source
says another. / Report a wrong value / Subject: Wrong value · Page · What it
says · What the source says · Where (link) · Something is missing / A
route, a question, a country, a case. / Say what is missing / Subject:
Missing · What · Where you looked for it · Anything else / What helped, what
confused you, what you would want next — a note of any length. / Write a
note / Subject: Note · feedback@permitrulebook.com · If a link opens
nothing, copy the address. A person reads every mail. A wrong value,
confirmed against its source, is changed and the change gets a history line
with the date. No reply is promised; a fix is the reply. · IF YOU HAVE A
GITHUB ACCOUNT · The tracker is where changes are recorded in public and
where contributors work. The same things can go there instead: · Report a
wrong value ↗ · Suggest a route or a change ↗ · Something to say about this
result? Feedback — a wrong value, something missing, or anything else. ·
How to write, and what happens. — Source-language residue: none. Modelling
vocabulary: *history line* in the note is the dataset's own term (a value's
change record); a stranger reads it as "a line in the history", which is
close enough. *Declared* in the lede ("nothing you declared") is the site's
word since s1 and appears on the screen the reader just left. Unexplained
abbreviations: none.

**Screenshot pass** (the pictures beside `tokens.css`): `/feedback/` at
1240 — three cards on the card ground with the ink left band, buttons in
the label type at the tap floor, the address in mono, the GitHub block under
a soft rule; nothing off-palette. 390 — the cards stack, the template lines
wrap to two, the page scrolls without horizontal overflow. Header, France
open — the list under the word, centred, card ground, top band, France in
stamp red; the list clears *Check yours* by 130 px. Phone menu — the
*Countries* heading in muted label type, four rows indented, then the
bordered *Check yours*, *The data*, *Feedback*; the focus ring lands on
Germany when the menu opens (the menu's existing behaviour). Results at 390
and 1240 — the line sits directly under the strip in the muted body type;
the friction above is visible in the picture: the link does not stand out.

**Hostile skim:** on `/feedback/` the eye lands on three bold headings and
three buttons and knows what to do; the address is found on the second
pass. On the results screen the skim lands on the country rows and never
sees the line — which is the friction finding from the other side.

## Scores (light — scope: the door and its three placements only)

| lens | score | evidence |
|---|---|---|
| Copy & framing | 4/5 | every label earns its meaning and the third door welcomes the reader with no complaint; *Where (link)* is the one label that instructs instead of naming |
| Trust surfacing | 5/5 | the page says what a mail carries, what it does not (nothing declared), who reads it and what a fix looks like — before the click |
| Orientation | 5/5 | *Feedback* reachable from the header, the results screen and the footer on every page; the country's own name in the header says where you are; `/feedback/` marks itself current |
| Responsive | 5/5 | four items on one line at 960, folded behind Menu below; cards stack at 390; every control at the tap floor |
| Design fidelity | 4/5 | tokens honoured, the mock's shapes on screen; the results line's link colour and the disclosure arrow are the two places the build is quieter than the drawing needs |

No lens at 2 or below. No previous light run on this scope; no delta.

## Adoption verdict

The persona with a wrong value finds the door on the results screen on the
second read, reaches a page that tells them exactly what to write, and gets
a mail with the headings already there. The persona with nothing wrong finds
*Write a note* and is not asked to invent a complaint. Both would finish;
neither would be stopped. The single thing most likely to stop the first is
not seeing the line at all: the link is the same grey as the sentence.

## Recommended adjustments

1. **Before merge, one rule:** the results line's link in ink
   (`--color-ink`), so the door is the darkest word in the sentence. No copy
   change, no test change; the light critique's one friction.
2. **Merge s13** after 1 and the human's walk — the doors, the header, the
   phone menu, and one real mail from a real mail client, which no headless
   run can do.
3. Tracker, later: the disclosure arrow's size and *Where (link)* as a
   label, one `design-flaw` for the next copy pass.
