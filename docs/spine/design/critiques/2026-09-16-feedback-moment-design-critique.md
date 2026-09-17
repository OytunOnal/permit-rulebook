# Design critique — the feedback moment, second round · 2026-09-16

**Variants:** `docs/spine/design/s7-feedback-2.html` — C (the closing line),
C′ (the same line under the verdict), D (the two doors), E (the door on the
card). **Judged rendered:** headless Chrome, 1240-wide mock page, each variant
screenshotted at its 390-px and 760-px frames and read as images before a word
was written. **Conditions:** run by the session that drew the variants (the
design-critique skill permits this; the selection is the human's gate and this
report opens none). The first round's A (docked slip) and B (centred modal)
were rejected by the human on 2026-09-10 and are not re-judged.

**The bounds every variant was drawn inside** (human, 2026-09-10; site #6):
nothing opens by itself, nothing dims the page, nothing is remembered on the
device, the reader is told before the click that filing needs a GitHub
account, no tap target is taken from a 390-px results screen, and nothing
appears before the reader has an answer. All four are static HTML with no
script and no state; all four meet the bounds. What separates them is *where*
the door is and *how loud* it is.

## C · The closing line

**What works.** It is in the page's voice — a sentence, not a widget — and the
soft rule above it separates it from the last card without announcing
anything. The mono aside (*Both open GitHub, where filing needs an account.*)
sits at the register the footer already uses for *code MIT*, so the account
requirement reads as a fact about the world, not a warning. At 760 it is a
line and a half and disappears into the page the way it should.

**Problems.** (1) *Its neighbour is the closed section.* On every passport that
has one, the sentence *Wrong about you?* sits directly under *Not open to your
passport*, and the first thing it invites is an argument with a closure the
authority made — the one kind of report the tracker cannot act on. (2) *It is
the footer, three lines early.* The footer's *Report a wrong value* and
*Suggest a route or a change* are 100 px below it on both frames; a reader who
reaches the end of the body finds the same two doors twice within one screen.
(3) At 390 the sentence runs four lines and the doors are underlined words in
the middle of the third — inline text links, about 20 px tall, the least
tappable form on a screen whose every other control is 44 px. (4) *"or
something this screen should do —"* is a parenthesis a tired reader skips,
and then the link text that follows starts lowercase mid-sentence.

**What to build on.** If it wins: shorten it to C′'s wording, and give the two
links tap height.

## C′ · The same line, under the verdict

**What works.** It is where the judgement is stated — *Two routes could fit* —
and a reader who expected three is looking at exactly this spot. One line at
390, not four. The closed section keeps its plain ending. It is far from the
footer, so the doors appear once at the top and once at the bottom of a long
screen rather than twice at the bottom.

**Problems.** (1) *It asks before the reader can answer.* The eye path is
headline → strip → first card; the question *Wrong about you?* arrives before
a single value has been read, which is the quiet cousin of the objection A
and B failed on — a prompt before the reader has anything to disagree with.
(2) It pushes the first card down by three lines on 390, on the screen the
reader waited thirteen questions for. (3) Same inline links as C, same 20 px.

**What to build on.** If it wins: one line, links at tap height, and the mono
note shortened to *(GitHub, account needed)* so the first card starts higher.

## D · The two doors

**What works.** The doors are doors: two 44-px buttons a thumb finds without
aiming, the heading is a heading, and the account note is read in the same
glance as the buttons — the bound "said before the click" is met best here.
At 760 it is a handsome block and reads as the page's closing statement.

**Problems.** (1) *It wears a route card's clothes.* The 3-px top band is the
route card's band; at a skim on 390 the block reads as one more route named
*Wrong about you?* — the hierarchy misleads at exactly the moment the reader
is skimming for route names. (2) *It is the tallest thing on the screen after
a route card* — about 470 px at 390 — and it is the same 470 px on every
result, for a door that most readers will never use. The site has never given
that much room to something that is not a value. (3) *"This screen is only as
right as the values behind it"* is the page talking about itself; the persona
did not ask. (4) The same two problems as C: it follows the closed section,
and the footer repeats it 100 px lower, quieter.

**What to build on.** If it wins: drop the band (a soft rule on all four sides
is enough), cut the body to one line, keep the buttons and the note.

## E · The door on the card

**What works.** *The door is where the judgement is.* A reader who thinks the
Blue Card's threshold is wrong taps on the Blue Card, and the issue arrives in
the tracker titled with that route — the report names its own subject, which
is the discipline every number on this site already follows. The closed card
carries the same door as the open one, so no section is singled out and the
closure-dispute problem of C and D does not arise. Nothing is added to the end
of the body; nothing sits between the reader and the first card except one
mono line. The link is set in the card's own record type (the rule line's
mono), so it reads as part of the card rather than furniture on it.

**Problems.** (1) *It repeats.* Every full card — met, near, unsettled, closed
— grows by a dotted rule and a 44-px row. A one-country result shows the
phrase two to six times; a four-country result perhaps sixteen. At 390 that
is several hundred pixels of *Wrong about this route?* on a screen that is
already long, and each repetition makes the phrase cheaper. (2) *"Suggest a
change" has no home.* A need — "you should ask about X" — is also a judgement
moment, and E gives it nothing but the footer; the reader's own suggestion
(site #6) named both doors. (3) *The account note is said once, twenty cards
before the click.* The bound is met literally and weakly: a reader on the
sixteenth card has not seen the note for a screen and a half. (4) The link is
the smallest type on the card, right-aligned, underlined mono — it looks like
a value until it is hovered, and *Wrong about this route?* under a closure
still reads a little like an invitation, though evenly across every card.

**What to build on.** If it wins: fold the link into the card's last row
(right of *read 2026-09-09*) instead of adding a foot, so the card grows by
nothing at 760 and one line at 390; give the note the second door too — *A
wrong value can be reported from its card; anything else, from the footer.
Both open GitHub, where filing needs an account.* — and let the link itself
carry *(GitHub)* so the requirement is beside the click.

## Verdict

C and D are the footer said early: both sit three lines above the two links
they duplicate, and both sit under the one section whose verdict is not ours
to change. Between the two that remain, **E** is recommended.

**Choosing E trades screen length and the second door for precision:** every
card grows by a row, the phrase repeats as many times as there are cards, and
*suggest a change* stays in the footer — in exchange for a report that
arrives named after the route it disputes, a door at the exact line the reader
is looking at when they disagree, and nothing added anywhere the reader has
not yet reached. C′ is the cheaper choice — one line, one place, no repetition
— and it costs the reader a question asked before they can answer it and a
door two screens away from the card they doubt.

The selection is yours. The build after it: the winner's markup into
`card.ts` through `copy.ts`, the s10-vacuous test from `20681e6` rewritten to
assert the rendered thing, a light-mode critique on the branch preview, your
walk, your word.
