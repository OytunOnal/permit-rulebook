# s13 — the feedback door

**Status:** approved 2026-09-16 (human: "onaylıyorum"). Site #6; closes
site #7 by construction. Design: F in `docs/spine/design/s7-feedback-3.html`,
chosen 2026-09-16 with two amendments, drawing ratified ("tamamdır").
Decisions: "the feedback door is e-mail; GitHub stays beside it, named" and
"the feedback door sits as F, with two amendments" (DECISIONS, 2026-09-16).

## What happened

A reader told the maker the product should ask for feedback. Two shapes that
open were drawn and rejected; a line shipped as a default and was withdrawn
when the human said it had never been chosen. In the round that followed, the
human found the question underneath: a reader may want to say something
*without anything being wrong*, and the footer's feedback does not draw the
eye. The tracker has no door for that reader — blank issues are off, and the
only way in needs a GitHub account (site #7). So the door changes: it becomes
an address, and it moves to where it can be seen.

## What a reader gets

On every page, one word — **Feedback** — in the header, and on the results
screen the same word in a line under the verdict. It leads to a page of the
site's own, `/feedback/`, where three kinds of mail are offered — a value is
wrong, something is missing, anything else — each a link that opens their mail
app with the subject and a few headings already written, the address printed
in plain text beside them, a sentence saying what happens to a mail, and,
beneath, the GitHub tracker for a reader who has an account and wants the
public record. Nothing they declared in the interview is in the mail. Nothing
opens by itself, nothing dims, nothing is remembered.

## What must be true

1. **The page.** `/feedback/` is a built page, in the site's header and
   footer, with: eyebrow *Read by a person.*; h1 *Feedback*; the lede; three
   doors in this order and with these words —
   - **A value is wrong** · *The page says one thing; the source says
     another.* · button **Report a wrong value** · subject `Wrong value` ·
     body headings `Page:` `What it says:` `What the source says:` `Where
     (link):`
   - **Something is missing** · *A route, a question, a country, a case.* ·
     button **Say what is missing** · subject `Missing` · body headings
     `What:` `Where you looked for it:`
   - **Anything else** · *What helped, what confused you, what you would want
     next — a note of any length.* · button **Write a note** · subject `Note`
     · empty body;
   then the address on a line of its own, as text and as a `mailto:` link;
   then the note — *If a link opens nothing, copy the address. A person reads
   every mail. A wrong value, confirmed against its source, is changed and the
   change gets a history line with the date. No reply is promised; a fix is
   the reply.*; then, under a rule and the heading *If you have a GitHub
   account*, one sentence and the tracker's two links (*Report a wrong value*,
   *Suggest a route or a change*), external, as today's footer has them.
   Every button and link is at least the tap floor.
2. **The mail carries nothing the reader declared.** Each `mailto:` is a
   constant built from the copy alone — subject and headings — never from the
   record, the query string, or the screen. This is the bound that replaces
   the old "account said before the click".
3. **The address is one constant** (`site.ts`), used by the page and the
   footer, and it is **not set until the human says routing works** — the
   alias's routing is theirs (Cloudflare Email Routing, STATUS has the
   steps). Until then the branch builds with the proposed name and does not
   merge; merge is the deploy and the deploy names the address.
4. **The header.** The four countries sit under one word, *Countries*, as a
   `<details>` disclosure in the header's row, before the separator; the row
   is *Countries ▾ · | · Check yours · The data · Feedback*. The list opens
   under the word, centred on it, on the card ground with the card's top
   band, and closes on a tap outside it and on Escape (the menu script that
   already handles the phone menu; no country name enters any script). On a
   country page the word is that country's name and its row in the list is
   marked current, so the header still says where you are. *Check yours*
   stays *Check yours* everywhere (2026-09-08). On the phone the menu lists
   the four countries as rows under a small *Countries* heading, then *Check
   yours*, *The data*, *Feedback*. Nothing about the disclosure is remembered.
5. **The footer's Feedback column** becomes: the address (text, `mailto:`);
   *How to write, and what happens* → `/feedback/`; *Sponsor this work*. The
   tracker's two links leave the footer — they live on the page, named.
6. **The results screen**, both layouts, directly under the strip and before
   the first section: *Something to say about this result? **Feedback** — a
   wrong value, something missing, or anything else.*, the word a link to
   `/feedback/`, at the tap floor. It appears only on a results screen — never
   on a question, never before an answer.
7. **The words live in `copy.ts`**; templates type nothing. The three subject
   strings, the body headings, the door lines, the note, the verdict line and
   the footer row are all there.
8. **The map and the sitemap.** `docs/spine/design/site-map.md` gains the
   page and its exits (header, footer, results line → `/feedback/`;
   `/feedback/` → tracker, → mail client); `sitemap.xml` lists it. A page
   reachable from the header is not an orphan.
9. **The header is measured, not assumed.** The row at 761 px with the fonts
   CI has: four items, no wrap, the disclosure open not covering *Check
   yours*. The existing 761-px assertions in `identity.test.ts` and
   `footer.test.ts` stay green or are rewritten to the new row, with the
   reason in the test.
10. **Every page's bytes move — on purpose.** The header and footer are on
    every page, so the root-build fingerprint regenerates once, and its
    `source` line names this slice; `/data/`'s clean-day fixture likewise.
    `/data/`'s own copy (*tell us it is wrong*, *files an issue in the
    tracker*) is **not** this slice — site #10 holds it.
11. **Nothing else changes.** The interview, the record, the route pages'
    bodies, the country pages' bodies, the watch, the data package.

**Corrected 2026-09-16, by the human's walk** (dated and marked, as the
held-out-scenario rule allows): on the preview every door opened nothing —
the human's desktop has no mail application, Gmail lives in the browser,
and a `mailto:` there is inert. Their word: *"insanların çoğu gmail
kullanıyor, mailto'dan ziyade gmail'e yönlendirmek daha sağlıklı."* So point
1 changes: **each door's button opens Gmail's compose screen** in a new tab
(`https://mail.google.com/mail/?view=cm&fs=1&to=<address>&su=<subject>&body=<headings>`),
with the same subject and headings as before; **under the button, one small
line — *or with your own mail app* — is the `mailto:` with the same
subject and body**, for a reader whose mail is not Gmail or who is on a
phone; the plain-text address stays. The note becomes: *If Gmail is not
yours, the second link opens your mail app; if that opens nothing, copy the
address. A person reads every mail. …* (the rest unchanged). Point 2 holds
for both links: the Gmail URL and the `mailto:` are each a function of the
copy and the address constant only — nothing declared, nothing from the
query string, nothing from the screen reaches either; the tests that assert
the `mailto:` equals its constant now assert the same of the Gmail href.
The footer row keeps the bare `mailto:` beside the plain address. What this
costs, accepted with the word: the page names a vendor, and a reader who
taps the button without a Google account meets Google's sign-in — the
second link and the address are there for them.

**Corrected 2026-09-16, second walk:** the third door's subject is
**Feedback**, not *Note* (human: *"bu note değil feedback"*). Heading, line,
button (*Write a note*) and the empty body stay; the template line under the
button follows the subject.

**Corrected 2026-09-16, second walk, two:** the open list, 176 px wide and
centred under a 78-px word, ran 28 px under *Check yours* on the preview
(human: *"countries'i biraz daha sola alalım"*). The word moves left by a
spacing token so the list ends before the separator; the browser case
asserts the open list intersects neither the separator nor any nav item.

**Corrected 2026-09-16, second walk, three:** point 5 changes — the footer's
Feedback column loses the address row (human: *"footer'daki
feedback@permitrulebook.com linkini kaldırsak mı, feedback sayfası yeterli…"*
→ *"kaldır"*). A `mailto:` in a footer opens nothing for a browser-mail
reader, and a plain address on every page is thirty-seven copies for a
harvester. The column is two rows: *How to write, and what happens* →
`/feedback/`, *Sponsor this work*. The address lives on the page only.

**Corrected 2026-09-16, second walk, four:** point 6 changes — the results
line under the strip *"looks odd at the very top of the results"* (human),
which is the critique's two polish findings from the reader's side: it asks
before a value has been read, and its second half lists the page it leads
to. Chosen from three (end-and-shorten / keep-and-shorten / remove): **the
line moves to the end of the results body**, after the last section in
both layouts, above the footer's rule, and becomes one sentence —
*Something to say about this result? Feedback.* — the word the link. It no
longer says "wrong about you", so its neighbour being the closed section
is not the invitation the 09-10 default's was.

**Corrected 2026-09-16, second walk, five:** the first door drops the
word *value* (human: *"A value is wrong yerine an info diyebiliriz"* → of
three correct forms, *"1"*): heading **Something is wrong**, button
**Report what is wrong**, subject `Wrong information`; the line and the
four body headings stay; the note's *A wrong value, confirmed…* becomes
*Something wrong, confirmed…*. The GitHub block's *Report a wrong value*
stays — it is the tracker's own template. The three headings now share one
shape: *Something is wrong / Something is missing / Anything else*.

**Corrected 2026-09-16, second walk, six:** on `/feedback/` the address
line is plain selectable text and a **Copy** button beside it (human: *"linke
tıklanınca kopyalansa olmaz mı"* → the drawn shape, *"tamamdır"*): the
button puts the address on the clipboard and reads *Copied* for two seconds;
with no clipboard API it selects the text. A third inline script, generic —
no address, no string, no storage, no request — hashed into `/feedback/`'s
policy. The note's *copy the address* becomes *the Copy button puts the
address on your clipboard*. The address is no longer a `mailto:`; the
doors' own-app links carry that.

## How it is proved

- A case renders `/feedback/` and asserts the three `mailto:` links, in order,
  with the exact subjects and the exact body headings, the address in text and
  as a link, the note, and the two external tracker links under their heading.
- A case renders the results screen in a browser **with a saved record and a
  `?country=` arrival** and asserts the verdict line is present in both
  layouts, its link goes to `/feedback/`, and no `mailto:` on the results
  screen or on `/feedback/` reached from it contains any declared value or
  any part of the record — the page's `mailto:` hrefs equal the constants.
- A case asserts the verdict line is absent on every question screen and on
  the empty first paint (the s10 fixture: the cold `/` HTML has no *Feedback*
  line in `#main`).
- A case renders the header on `/`, on `/france/` and on `/feedback/`:
  *Countries* on the first, *France* with `aria-current` in the list on the
  second, *Feedback* marked on the third; the phone menu groups the four.
- A browser case at 761 px and 390 px: the row holds four items on one line;
  opening the disclosure at 761 px covers no other nav item (bounding boxes
  do not intersect); Escape and an outside click close it.
- The footer case (`footer.test.ts`) updated to the new column; the
  fingerprint and the clean-day fixture regenerated with their reasons.
- The existing site tests green; `record.test.ts` (answers never leave the
  device) green, because it is the promise point 2 restates.
- **The human's walk on the preview:** header → *Feedback* → the page → each
  of the three doors opens their mail app with the subject written; the
  results line; *Countries* open on the interview page and *France* open on
  France's page, at desktop and on the phone.
- **The gate before merge:** a mail sent to the alias from another address
  arrives in the human's inbox. Then the address constant is set, then
  "merge".

## What this slice is not

It is not a form and not a backend: no request leaves the page. It is not a
change to the tracker's templates or CONTRIBUTING — contributors keep their
door. It is not the `/data/` copy pass (site #10). It does not touch the
route or country pages beyond the header and footer they share.
