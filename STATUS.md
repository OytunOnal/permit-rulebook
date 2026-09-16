# STATUS — Permit Rulebook

## Where are we

**v1, public and announced** (2026-09-09). Genesis is done: the launch slice's
scenario is real-green, the product is live at https://permitrulebook.com with
23 routes across Germany, France, Spain and the Netherlands, and the
announcement went out on LinkedIn in the human's own words. The project is in
**Steward mode** from here: feedback — a tracker issue, a watch flag, a number
that comes back, a message from a stranger — enters through the steward
protocol, which decides what it is, which promise let it happen, and what to do
about it.

```mermaid
flowchart LR
    A[Scale Gate ✓] --> B[Brainstorm ✓] --> C[One-pager ✓] --> D[Design ✓] --> E[Plan ✓]
    E --> F["Slice loop<br/>v0.1–v0.10 ✓"]
    F --> G["s6 public launch ✓<br/>real-green 2026-09-09"]
    G --> H["Steward<br/>live, watched, answered"] --> I["v1.1 ✓<br/>stamped 2026-09-16"] --> J["next boundary ◀ here"]
```

Pace, from the ledger: s5e real-green 2026-09-07, s5f 2026-09-07, s6
2026-09-09, s7 building 2026-09-10 — about one slice a day while the human is
in the loop daily. v1.1 holds two ruled candidates beyond s7; at that pace it
is days, not weeks, but the nationality reads for three more countries sit in
front of it and each is a research day before a build day.

## What is happening now

**s12 is live** (2026-09-16, on your word: *"merge"*, after two walks and the
first light-mode critique this project ran on a branch before a merge). Site
`f5df33c`, 426 tests, deploy green in 2m26s, read on the live host after it
landed: `/data/`'s list is three rows — four dates, two counts, Routes alone —
every cell centred, *Newest value changed 2026-09-10* and *Last checked
2026-09-15* where *Newest value read* was, and the old label is nowhere on the
page.

**"Last checked 2026-09-15" is true, and it is the thing to watch today.** The
watch's 05:17 UTC run has **not fired yet** on 2026-09-16 — the newest run is
yesterday's failed one; GitHub has been running this schedule four to five
hours late, so it is due, not missed. When it runs it is the first since the
10th expected green (the User-Agent repair), and the first that writes s11's
unread list; the site's daily rebuild then pins it and the page says
*Last checked 2026-09-16* on its own. If by tomorrow it still says the 15th,
that is a finding, not a delay.

**s18 is live** (2026-09-16, deploy `de094a7` green on re-run — the first
run's only failure was `first-paint.test.ts` reading an `undefined` from
the browser after a 250 ms settle on a slow runner, a flake recorded on the
board): `/data/`'s Dataset block names its four countries as `Place`, the
type Google's parser reads. Site #11 closed. **v1.1's state is now on the
live site: s9 through s18.** **v1.1 is stamped** (2026-09-16, the versions ledger in `KANBAN.md`, quoted
by the README). The critic confirmed N1 and N2 cleared by operation on the
live site: no blocker open, so v1.1 ships on blocker-clearance; 39/50 on
RUBRIC 1.3 against v1's 36, four lenses up, none down. The stamp names
today's numbers — 29 routes (23 scored, 6 quoted), 192 quotes, 4 countries,
568 + 573 tests, 0 vulnerabilities. Ten slices reached the live site today
on your word: s13, s14, s15, s16, s17, s18, s19, s20, s21, s22.

**What waits on the board, in the order the critic put it:** the copy pass
(adjustment 3: the statute stutter, the job-search sentence only without an
offer, the route pages' liveness line, the points tally, the curator note —
*"3 sonra"*); the experience ladder (F2, an engine judgment); the
four-country headline's hierarchy (the France sentence sits third under
"Nothing open"); the hold-state blank on a finished-record arrival; focus
after a re-answer; `scrollbar-gutter`; a `field` on precondition
statements; data #15, #13, #17; the Spanish order at the end of December;
2026-10-09's readings with their isolated walk.

**s21 and s22 are live** (2026-09-16, deploy `fc783ca` green; read on the
live host: the four-country path marks France at question 3, the pre-paint
script carries the verdict bit). The v1.1 re-score's blocker N1 and its
friction N2 are cleared; the last step before the stamp is the critic's
confirmation of both, running now, and the versions line.

**The v1.1 re-score is in: 39/50 — and one new blocker keeps the stamp
waiting.** The same critic re-walked the two blockers' screens on the live
site: **B1 cleared** (the mark, the written state, the chercheur page, the
Spanish card's *Asked in the interview*), **B2 cleared** (✎ lands on the
question with its first option focused at 390×844, 390×1400 and 1240; the
answer returns to the headline and announces it; the resumed line and
*Start over* work; focus follows every answer). Flow friction 3→4, Edge
states 3→4, Accessibility 4→5, Responsive 3→4; nothing fell. **N1, blocker:**
the same researcher on the *"Any of these four"* path — research, then
*France* at question 3 — gets sixteen questions and *"Nothing open on these
answers"* with no word of the researcher permit: the mark is not on
question 3's France option, and the four-country result's France line says
only *5 not yet*. **N2, friction:** a reader returning with a *finished*
record sees the masthead move — CLS 0.65 at 390×844 — and the s10 gate never
measured it, because its "finished record" seed uses field names the
product no longer writes and replays as a half record. Polish: the mark is
not announced to a screen reader; *read it here* wears the external glyph
on an internal link.

**s19 and s20 are live — the v1.1 gate's two blockers are cleared**
(2026-09-16, deploy `1ca9e2c` green, read on the live host: France →
research now carries the mark and lands on *No scored route in France
takes a research hosting agreement.* with the door to
`/france/talent-researcher/`; `/data/` is schema 0.8.0, 23 scored / 6
quoted). The first deploy of the merge failed on a gate I had not run
locally — `assets:check`: the social card said 5 quoted, the dataset 6 —
regenerated and recorded. **Both blockers were verified cleared by the
session's own walk on the preview before the merge** (three viewports for
✎; France, Spain and the chercheur page for the mark), and B1 again on the
live host. What the stamp needs now is the delta: the v1.1 report scored
35/50 with Edge states and Responsive at 3 for these two blockers; with
them cleared those lenses stand at their v1 value, 4 — a re-score by the
same critic, not by me, is the honest number. **Then the versions line.**

**The isolated full walk is in, and v1.1 does not stamp yet: two blockers.**
(`docs/spine/critiques/2026-09-16-v1.1-gate-critique.md`, RUBRIC 1.3, blind,
on the live site.) **35/50 against v1's 36/50**: Orientation +1 (v1's
wrong-country entry is cleared and narrated), Edge states −1 and Responsive
−1, each backed by a blocker. All three v1 blockers verified cleared by
operation. **B1:** a researcher with a French hosting agreement — a
persona the one-pager names — is offered that answer at question 2 and
then shown *"Nothing open on these answers"* with no word that France's
researcher permit is not scored (`exclusions.md`: *Talent — chercheur*,
"candidate for a later modeling pass"); the same two answers for Spain give
CRITERIA MET. **B2:** on a phone, tapping a *You declared ✎* row leaves the
question off-screen (card top −1,366 px, footer in view, focus on body); the
control looks dead on the device half the readers use; desktop is fine.
Eight friction items and four polish behind them, in the report. **A
version ships when its blockers are cleared, not when a number is reached**
— the pick below is yours.

**s16 and s17 are live too** (2026-09-16, deploy `7d5ef51` green, read on
the live host): `/data/` in the reader's words — *46, written by us and
marked as ours*; *raises a flag and a person reads it*; the lede's *and if
something is wrong, tell us* linking `/feedback/`; no "tracker" on the page
— and the last two *Report a wrong value* doors (`/data/`'s Take it, every
route page's data door) now *Report what is wrong* → `/feedback/`. And the
home masthead and the results subline lose *Code* as their subject: *Your
answers are compared against published rules…* / *Your 3 answers were
compared against 4 published rule sets.* Site #10 closed. Five slices live
today on your word: s13, s14, s15, s16, s17.

**s13, s14 and s15 are live** (2026-09-16, deploy `6fe4eb5` green, read on
the live host afterwards). Three merges on your word in one afternoon, each
forced by the one before:

- **s13 — the feedback door** (`f06badd`). Live: one word, *Feedback*, in
  the header, at the end of a result and in the footer, leading to
  `/feedback/` — *Something is wrong · Something is missing · Anything
  else*, each a button that opens Gmail with the subject written, the
  mail-app link under each, the address with a copy glyph, the tracker
  beneath for a reader with an account; the header's four countries under
  *Countries* (the country's name on its pages); the footer's Feedback
  column two rows. Seven corrections from your two walks are in it. Site
  #6 and #7 closed; #9 closed too (s12 was live).
- **s14 — the IND's requirements moved behind a form** (data `b2488b9`).
  s13's first deploy stopped at the quote gate: the IND had rebuilt its
  five route pages around a *Your situation* form with no addressable
  result. The five entries are on the human tier (90-day re-read); all 38
  quotes read in Chrome the same day, 26/26 sentences present. Data #20
  closed; the road back is data #17.
- **s15 — the first unread day** (`5f7d1fb`). s13's second deploy stopped
  on s11's own tests: the first state with a real unread source (BAMF,
  *fetch failed*) reached the site, the site said the right thing, six
  tests that had only seen clean days went red. Clean-day cases now measure
  a clean day; real-state cases expect what the state says; the footer's
  parenthesis may break at 390, after the dot.

Live today: the footer says *(last run 2026-09-16 · 1 source unread)*, and
`/data/` says *A German source did not answer on the last run; the values
it backs were read on 2026-09-07.* — s11 doing its work on its first real
day. Tomorrow's watch re-tries BAMF; if it answers, the clause disappears
on its own.


**Five slices in seven days, each on your word:** s8, s9, s11, s10, s12. The
board is empty between slices.

**v1.1 is everything live today** (your word, 2026-09-16): s9 through s18,
against v1 at s6. The stamp comes after s18's merge — the isolated full
walk, then the versions line and the README.

**Queued, in order:** the feedback moment's build, once you pick a shape (site #6); **site
#10** (three copy polish items on `/data/`, from the light critique); **data
#15** (the free-movement notice's evidence for four passports); **data #13**
(the Opportunity Card's link); **data #17** (the IND shell — the browser
strategy's gate read 2 of 5); the Spanish job-search order to re-read at the
end of December; the pre-registered numbers on **2026-10-09**, which now bring
an isolated full walk the same day (steward-54).

What runs without anyone asking:

- **The daily watch** (05:17 UTC nominal, ~10:00–12:00 in practice) — repaired
  yesterday; today's run not yet fired at the time of writing.
- **The site's daily rebuild** — pinned and deployed fresh data every day since
  the 11th; today's waits on the watch.
- **The counter** and **the pre-registered numbers** (A2, A7, A8 on 2026-10-09;
  interim reading at day 6 in `docs/spine/assumptions.md`).

## What is expected from you

**The 48-hour window closes 2026-09-11 09:00 (GMT+3)** — the announcement
went out 2026-09-09 around 09:00. Until then the live site is frozen: it is
touched only for a blocker (a wrong verdict confirmed against its source, a
value gone stale on a live page, a legal objection to a quote) — s7 is one, the
CLS fix is not. The three lines, left here until the window closes:

- *Watch:* the counter (visits, entry pages), both trackers, the watch's
  issues, the post's comments.
- *Where:* Cloudflare Web Analytics → permitrulebook.com; `gh issue list` on
  both repositories; the LinkedIn post.
- *Pull if:* a confirmed wrong verdict, a stale live value, or a legal
  objection — fix the value with its history line, let the rebuild land, edit
  the post to say what was wrong and what it says now.

**Nothing is blocked on you** until s23 is on the preview.

- [x] **s23 approved** (2026-09-17, *"onaylıyorum"*); **data half built** (579 tests): the notice ends at *that route's
      card says so*; the curator's remark was in a citation the card prints
      and now lives in the watch entry's note. Site half building.

- [x] **s21 and s22 walked and merged** (2026-09-16, your word; the session
      walked both on the preview). Live.

- [x] **N1 and N2 picked** (2026-09-16, *"ikisi de şimdi"*): s21 (the mark on
      question 3's country and on the four-country result's France line,
      plus two polish items) and s22 (the s10 gate re-seeded with a real
      finished record, then the finished-record arrival painted once). **s21 is built** (541 tests): question 3 marks France under a declared
      research situation, the four-country result's France line is the
      sentence with the route's name the link, the mark is announced, the
      glyph is gone. **s22 is built** (555 tests on its own): the gate re-seeded and red at
      0.58 / 0.72 / 0.46, then the verdict arrival painted once — CLS 0 — by
      extending s10's stand-in to the frame; the record carries one bit.

- [x] **s19 and s20 walked and merged** (2026-09-16, your word; the session
      walked both on the preview at your ask, three viewports for ✎). Live.

- [x] **Picked** (2026-09-16, *"1 ve 2 yapalım, 3 sonra"*): the two
      blockers now, the copy pass as its own slice after (on the board as a
      roadmap card).
- [x] **s19 approved** (2026-09-16, *"approve"*). **Data half built** (569
      tests, fidelity 154 verified): *Talent — chercheur* is a tab of F16922,
      not a fiche of its own; the fiche states a €2,200 gross pay floor the
      exclusions row had denied — corrected with the date; nine quotes,
      dated. **Site half built** (503 tests): the mark under *research* for France
      with the link, the written state, F8's *Asked in the interview* block.
      One contradiction it exposed goes back to the data before the merge:
      `scope.not_asked` was hand-kept and named sentences a criterion asks —
      now validated (a sentence a criterion quotes is asked), seven routes'
      lists corrected, scope lines honest; 573 data tests.
- [x] **s20 approved** (2026-09-16, *"approve"*) and **built** (511 tests):
      ✎ lands on the question with its first option focused, the answer
      returns to the masthead and announces the headline, every answer
      moves the focus, a resumed interview says *Continuing where you left
      off — N answers kept.* with *Start over* in the line. Two things to
      know: the line costs 44 px of footer travel on a record arrival at
      390 (CLS 0.037, under the 0.1 bound; a recorded trade), and the build
      found and fixed an s10-era defect — a reader returning with a finished
      record had a blank card on ✎ since s10.

- [x] **The IND path is decided** (2026-09-16, *"url sabit"*): the form's
      result has no address, so the five IND route pages go human-tier.
- [x] **s14's scenario approved** (2026-09-16, *"approve"*); the builder is
      working in `../permit-rulebook-data-s14` (branch `ind-behind-the-form`).
- [x] **The five IND pages are read** (2026-09-16, in Chrome, by the session
      at your request): 26 of 26 sentences present, word for word, on every
      page; recorded in the checklist with the date. s14 is ready: 555 tests,
      `npm run check` green, the quote gate `ok' with 145 verified and 40
      human-tier.
- [x] **s14 merged** (2026-09-16, your word): data `b2488b9`, the site
      pinned to it in `c4c3b04` (the lock's stray conflict markers cleaned
      with it — the workflow reads only the sha line, so they never bit).
      **The deploy stopped again — this time on s11's own tests.** The first
      state with a real unread source (BAMF, *fetch failed* on the 16th)
      reached the site; the site said the right thing (*1 source unread*),
      and six tests that assumed a clean day went red, plus one real
      finding (the footer's parenthesis is 2 px too wide for a 390 column
      with a count in it). You chose to fix the tests now (*"1"*): **s15**,
      scenario `docs/spine/scenarios/s15-the-first-unread-day.md`, building
      in its own worktree — **built**: 467 tests green against today's
      state, the clean day and the unread day both proved with fabricated
      states, one production change (the footer's parenthesis may break at
      390). The build caught my scenario putting the break before the dot,
      against the footer's own 09-08 rule; corrected, the one-token flip is
      landing. Then your word, and the deploy carries s13 + s14 + s15. Live
      stays on s12 until it lands.

- [x] **First walk of s13** (2026-09-16): the doors opened nothing on your
      desktop — decided: Gmail first, the mail app second. Building.
- [x] **s13 walked and merged** (2026-09-16, your word), **s14 merged**
      (your word, after the five IND pages were read in Chrome at your
      request), **s15 merged** (your word). All three live in `6fe4eb5`.
- [x] **s18 merged and live** (2026-09-16, your word). *One click of
      yours, when you like:* Search Console → Datasets → the spatialCoverage
      warning → *Validate fix*. A pass is the warning leaving the report in
      the days after; nothing is blocked on it.
- [x] **s16 and s17 walked and merged** (2026-09-16, your word; three
      corrections from your reads are in s16). Live in `7d5ef51`.
- [ ] **Look at the live site once, when you like:** https://permitrulebook.com/feedback/
      — tap *Report what is wrong*; Gmail should open with the subject.
      Nothing is blocked on it.

These are the things only you can see, when you want to look:

- [x] **The daily rebuild needs nothing from you.** This list asked you to run
      one by hand if a day passed without one. It was written on a false
      premise: the site's schedule has fired every day, about five hours late
      (11:49 UTC on 2026-09-09, 11:48 on 2026-09-10, both green).

- [x] **The card's quote cap, 10 → 11** (human, 2026-09-10): ratified for
      `nl-hsm-under30`. Twelve would have to be argued again.
- [x] **The human-tier number is 2** (human, 2026-09-10: "tamamdır", after the
      alternatives were laid out). Two of s8's sources ship human-tier with
      their sentences in `verify-s5e.md` and a 90-day re-read. Checked in a
      real browser the same day: both pages open and both sentences are there
      — the limit is this fetcher, not the page. A browser-driven read for
      bot-walled sources is on the roadmap, gated on a headless-Chrome
      measurement from the runner.
- [ ] **Switch on the preview address** (once, ~5 minutes):
      `docs/spine/preview.md` has the six steps — connect Cloudflare Pages to
      `OytunOnal/permit-rulebook`, project name `permit-rulebook`, production
      branch `preview-only` (a branch that does not exist, so this project can
      never publish the live site), build command
      `bash scripts/preview-build.sh`, output `dist`, and two preview
      variables. *Pass:* `feedback-line` builds and
      https://feedback-line.permit-rulebook.pages.dev shows the site with the
      new line at the end of a results screen. *If the build fails:* paste the
      last twenty lines here.
- [x] **s8 walked and merged** (2026-09-10, your word). Live, and walked again
      on the live host afterwards.
- [x] **s9 walked and merged** (2026-09-11, your word). Live, and checked on
      the live host afterwards.
- [x] **Spain's annual ministerial order is read** (2026-09-11, your word:
      *"ispanyayı oku ve okut"*). It opens nothing this year, by two independent
      reads of the BOE text. Recorded, with the date to re-read it: the next
      order, end of December.
- [x] **"Code compared"** — raised on 2026-09-15 while walking, withdrawn the
      same hour (*"yok düzelmiş tamam"*): the page was already right, and no
      record of an earlier ask exists. Nothing changed.
- [x] **Two joins on `/data/` got their breath** (your walk, 2026-09-15): the
      masthead's *"…tell us it is wrong."* sat 0px above `<main>`, and the
      checks section's *"…never on their own."* sat 0px above the Take-it
      box's rule. Both 26px now, from two rules on this page only, so no other
      page's bytes moved; the pre-s11 fixture was regenerated on purpose.
- [x] **s11 walked and merged** (2026-09-15, your word). Live, and read on the
      live host afterwards.
- [x] **s10 scenario approved** (2026-09-15, your word: *"approve"*). The
      builder is on it, in a worktree of its own on the branch `first-paint`
      — the first slice built under steward-53.
- [x] **s10 walked once, and the walk changed it** (2026-09-15): a returning
      reader saw question one for a moment before their own screen replaced
      it. Built and gated (`first-paint` `fc7ea94`, **412 tests**, fingerprint
      unmoved): with a record on the device the box shows *"Your answers are
      on this device — bringing them back."* at question one's exact height
      until the module lands; a link arrival shows *"Setting up your
      questions."*; a fresh visit is unchanged; a screen reader gets the
      sentence and not the covered question.
- [x] **s10 walked twice and merged** (2026-09-15, your word). Live, and read
      on the live host afterwards.
- [x] **s12 scenario approved** (2026-09-15, your word: *"approve"*). Being built.
- [x] **s12 walked once, and the walk changed it** (2026-09-16): "What it
      holds today" read untidily — 3 + 3 + 1 with an orphan, a three-line
      "Routes" beside one-liners, dates and counts interleaved, one dotted
      date among dashed ones. You chose the layout on a live prototype; built
      and gated (`two-labels` `8f859bc`, **426 tests**, fingerprint unmoved).
      At a phone's width the counts stack rather than sit two across — two
      across broke each value over three lines, the thing being fixed.
- [x] **s12 walked twice, critiqued, merged** (2026-09-16, your word). Live,
      and read on the live host afterwards.
- [x] **v1.1's scope decided** (2026-09-16, *"v1.1 bugün yaptıklarımızı
      kapsasın"*): everything live today, s9 through s18, against v1 at s6.
      The stamp follows s18's merge: the isolated full walk runs, its
      findings come to you, the versions line is written with today's
      numbers, and the README quotes it.
- [ ] **Walk s10, then say merge** — two previews, both holding the module
      back 700 ms the way a phone network does: **http://localhost:4500** is
      the fix (`f6b9a37`), **http://localhost:4501** is master. *What to look
      for:* hard-reload each on a phone-width window. On :4501 the page paints
      with an empty box and then, a beat later, the first question drops in and
      everything below jumps. On :4500 the first question is there from the
      first paint and nothing moves; you should not be able to tell when the
      script arrived. Then the two harder cases on :4500 only: press "Check
      yours — France" from http://localhost:4500/france/ (a link arrival), and
      reload :4500 with a record you have already started. On both, the
      masthead — headline, promise, stamp — must not move at all; the box
      changes contents, and on the link arrival the footer moves below the
      fold, which is the default recorded in DECISIONS for you to overrule.
      *Pass:* nothing you can see moves after it has painted, on any of the
      three.
- [ ] **Walk `feedback-line`, then say merge** (site #6; this one waits for the
      window to close at 09:00 tomorrow). One line under your results: "Wrong
      about you? A value that does not match its source, or something this
      screen should do — report a wrong value or suggest a change. Both open
      GitHub, where filing needs an account." *Pass:* you would let it sit under
      your own results. *If not:* say what it should say instead.
- [x] **The four country reads are done** (2026-09-10): the Netherlands and
      France produced fixes (s7 is live, s8 waits on your walk), Germany and
      Spain produced findings with dates on them and nothing to change.
- [ ] **A third human-tier source, or not** (your call, and only yours). The
      French employee card's page states the labour-market test in
      service-public's words. The statute's own word for it — CESEDA L414-13,
      « la situation du marché de l'emploi est **opposable** au demandeur » —
      is on Legifrance, which answers this fetcher 403. You ratified the
      human-tier count at **two** this morning; carrying that sentence would
      make it three, with a person re-reading it every 90 days. *Say yes and it
      goes on the page; say no and it stays where it is now — recorded in
      `exclusions.md` with the reason.*
- [ ] **The post's replies.** Anything a reader says that is a bug, a missing
      need or a design flaw is worth pasting here — the steward protocol turns
      it into a fix or a recorded decision, rather than a note that gets lost.
- [ ] **In thirty days (2026-10-09):** the counter's visits from search and
      referrals, whether a stranger has touched the data, and how many domains
      link to it. The numbers that decide A2, A7 and A8 were written before the
      post so they cannot be moved afterwards.
- [ ] **The token expires 2027-09-09** (`DISPATCH_TOKEN`). GitHub e-mails
      first; an expired one turns the watch red and files an issue, so it
      cannot fail quietly.

Ledgers: this file (now), `KANBAN.md` (the board and the versions),
`DECISIONS.md` (why anything is the way it is), `docs/spine/` (the scenario,
the threat model, the architecture, the critiques, the announcement).
