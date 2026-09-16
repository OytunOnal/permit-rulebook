# Design critique — the feedback door, third round: where it sits · 2026-09-16

**Variants:** `docs/spine/design/s7-feedback-3.html` — F (one word, one
page), G (the footer is the door), H (the page, from the chrome only).
**The door itself is settled** (DECISIONS 2026-09-16, "the feedback door is
e-mail; GitHub stays beside it, named"): one alias address in plain text
beside every link, three `mailto:` templates, the tracker's two links beside
them as the option for a reader with an account. Every variant carries the
same door; what differs is where a reader meets it. **Judged rendered:**
headless Chrome, each variant screenshotted at its full height and read as an
image before a word was written. **Conditions:** run by the session that drew
the variants; the selection is the human's gate and this report opens none.

**What the human asked this round to answer** (2026-09-16): the popup's
appeal was visibility; of the earlier shapes D was closest but sat at the end
of the interview and asked "wrong about you?"; a reader may want to say
something *without anything being wrong*; the footer's feedback "does not
draw the eye". So the lenses here are: is the door **seen** without being
pushed, is it **not at the end**, does it **welcome the reader who has no
complaint**, and does it stay **inside the site's voice**.

## F · One word, one page

**What works.** One word — *Feedback* — in three places, all leading to one
address on the site: the vocabulary is learned in a glance and never
contradicts itself. The page has room, and uses it well: each of the three
doors explains itself in a sentence, the template is printed under the button
in mono so the reader knows what the mail will carry *before* the click, the
address stands on a line of its own, "what happens to your mail" is said once,
and GitHub sits under its own rule and heading — beside, named, not first. The
line under the verdict reads as an offer (*Something to say about this
result?*), not an accusation, and it is where the judgement is stated, not at
the end. On desktop the word is in the header the moment any page opens.

**Problems.** (1) *A hop.* Tap *Feedback*, land on a page, tap again: two taps
to a mail where G has one. (2) *The header's seventh item is unmeasured at
761 px* — six items filled 94 % of that row on CI's fonts; the build must
measure before it ships, and may have to shorten a label. (3) *On the phone
the header word is behind Menu*, so the visibility the human asked for is
desktop visibility; on the phone the door that is seen is the verdict line.
(4) *The verdict line is two lines at 390* and pushes the first card down by
about 60 px. (5) *The fallback comes last:* the plain-text address — the thing
a desktop reader with an inert `mailto:` needs — sits under all three door
cards, two and a half screens down at 390. (6) The footer column's *Feedback —
how to write, what happens* repeats the column's own heading.

**What to build on.** Address first: the plain address directly under the
lede, the three doors beneath it. Shorter cards at 390 (the template line can
collapse into the button's `title` — no: it must be visible; keep it, lose the
one-sentence description instead). One line under the verdict, not two:
*Something to say about this result? Feedback.* The footer row becomes *How
to write, and what happens.*

## G · The footer is the door

**What works.** One hop fewer: the tap on *Feedback ↓* lands on the door
itself. No new page, no new node on the site map, nothing for the header to
measure beyond one word. The door is on every page, identical, and the
address is the first thing in the column. The template lines under each link
say before the click what the mail will carry.

**Problems.** (1) *The footer grows into a page.* At 390 the Feedback column
is about 800 px tall — nine rows against the four and three of its
neighbours; on a country page the footer becomes the longest thing on it.
(2) *A footer states; it does not explain.* The column now carries three
sentences of prose dressed as list items (*Read by a person. Nothing you
declared is sent…*) and three mono subject lines that make the column read
like a spec. (3) *The anchor jump.* From the header, *Feedback* scrolls a
reader from the top of a long route page to its bottom; the way back is a
scroll, and on a phone the jump lands with no sense of where. (4) At 1000 the
three-column grid is lopsided: two short columns beside one tall one.

**What to build on.** If it wins: keep only the wrong-value subject line, cut
the prose row to one clause (*Read by a person; nothing you declared is
sent*), and accept the footer as the site's longest block.

## H · The page, from the chrome only

**What works.** The results body stays the results: the product does not
speak about itself on the screen the reader waited thirteen questions for.
The frame carries the door on every page alike; the phone's menu shows the
word as a seventh row without crowding; the page is F's page.

**Problems.** (1) *On the phone the door is invisible* until Menu is tapped or
the footer is reached — the visibility the human asked for is absent
exactly where most readers are. (2) *The results screen says nothing.* A
reader who disagrees with a verdict has to know to look in the menu; the
moment the judgement happens has no door, which is the finding site #6 was
opened on. (3) All of F's page problems apply.

**What to build on.** None beyond F; H is F minus the line.

## Verdict

**F** is recommended. **Choosing F trades one more hop and one more page —
a node on the site map, a header item to measure at 761 px — for a door that
explains itself before the click, an address that stands on its own line, a
verdict line that is an offer rather than a charge, and a footer that stays a
footer.** G is the cheaper build and the louder footer: it saves the hop and
spends it on 800 px of footer on every page. H keeps the results untouched and
loses the door on the phone.

Against the human's four asks: F is seen (header on desktop, verdict line on
the phone), it is not at the end, its third door is for the reader with no
complaint, and nothing in it opens, dims, or remembers. What F does not do is
put the door *in* the reader's hand on the phone without a tap — that was the
popup's only real promise, and it is the one this product declined on 09-10.

The selection is yours. After it: the alias and its routing are yours to set
up (the steps go on the STATUS list); the build is a site slice — a page,
three `mailto:` templates in `copy.ts`, a header item measured at 761 px, the
footer column, the verdict line — with a light-mode critique on the branch
preview, your walk, your word.
