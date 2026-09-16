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
    G --> H["Steward<br/>live, watched, answered"] --> I["v1.1 ◀ here<br/>s9 · s10"]
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

**s13, the feedback door, is building** (2026-09-16, your word:
*"onaylıyorum"*). The builder works in its own worktree
(`../permit-rulebook-s13`, branch `feedback-door`); this tree stays on master.
Next: the build report, a Standards/Spec review pair, the branch preview on
localhost, a light-mode critique, your walk, the alias, your word. The day's path: the second round's four shapes → your finding
that a reader may want to say something without anything being wrong → the
decision that **the door is e-mail** (an alias in plain text, three
`mailto:` templates, the GitHub tracker beside it, named) → the third round
in three placements → your pick, **F**, with two amendments (the third door's
words; the header's four countries under one word) → two walk corrections on
the open list → *"tamamdır"*. All of it is in DECISIONS as gates. The
scenario, `docs/spine/scenarios/s13-feedback-door.md`, says what must be
true: the `/feedback/` page with its three doors and their exact subjects,
a mail that never carries anything declared, one address constant set only
after you say routing works, the header's *Countries* disclosure (the country's
own name on its page), the footer's new column, the verdict line on both
layouts, the map and the sitemap, the 761-px row measured, every page's
fingerprint regenerated on purpose. Nothing is built until you approve it.

**Search Console's first reading is in** (2026-09-16, from the two exports
you downloaded; the numbers are in `docs/spine/assumptions.md` beside the
Cloudflare interim). Seven days after the announcement: 99 impressions, one
click (the home page, from Türkiye, position 2.7 — someone who knew the name).
Fifteen pages have been shown; the ones shown most are route pages, and the
queries that show them are Dutch and German source-language long tail —
*zoekjaar*, *gvva*, *kennismigrant*, *§ 21 AufenthG* — at positions 50–90,
with two pages already in the top ten (*researcher* at 8.6, *ICT card* at 3).
The dataset markup on `/data/` has been read as valid every day since the
11th; one non-critical warning (`spatialCoverage` typed `Country`, which
Google's Dataset parser does not accept) is site #11, a one-line fix for a
later slice. **"Page is indexed" against "Processing data" in the Pages tab
is not a contradiction:** the URL inspection tool reads the index live, the
Pages report is a batch that lags it by days on a new property — the Datasets
report's own chart shows the lag: zero until 09-11, then valid every day. It
resolves on its own; nothing to do.

**Five slices in seven days, each on your word:** s8, s9, s11, s10, s12. The
board is empty between slices.

**v1.1's scope is complete** — s9 and s10, both real-green and live — and the
stamp is yours: it brings the isolated full walk the cadence requires for a
version that reaches real users, and a versions-ledger line the README quotes.

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

**Nothing is blocked on you.** The alias is live and tested; s13 waits on its build, its reviews, and your walk.

- [x] **The amended F drawing** — ratified 2026-09-16 (*"tamamdır"*), after
      two corrections to the open list from your walk.
- [x] **s13's scenario approved** (2026-09-16, *"onaylıyorum"*); building.
- [x] **The alias exists** — `feedback@permitrulebook.com` (2026-09-16, your
      word: *"tamam"*); the SPF record Cloudflare adds is visible from here.
      MX (`route1/2/3.mx.cloudflare.net`) and SPF live at both public
      resolvers, and **a test mail arrived in your inbox** (2026-09-16, *"mail
      geldi"*). The address goes into the code as it stands.
- [x] **The alias, the steps.** Email Routing is no longer under the zone's *Email*
      tab (your finding, 2026-09-16); since mid-2026 it lives at account
      level: **Compute → Email Service → Email Routing** (docs updated
      2026-06-09). The domain qualifies — its nameservers are Cloudflare's and
      it has no MX record today. Steps: (1) *Onboard Domain* → pick
      permitrulebook.com → review the MX/SPF/DKIM records it adds → *Done*;
      (2) *Destination Addresses* → enter your inbox → open Cloudflare's
      mail → *Verify email address*; (3) the domain → *Routing Rules* →
      *Create routing rule* → local part `feedback` (or the name you prefer —
      tell me, it goes into the copy), action *Send to an email*, your inbox
      → *Save*. *Pass:* a mail you send to the alias from another address
      arrives in your inbox. Until it does, nothing on the site names the
      address and s13 does not merge.

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
- [ ] **v1.1 — stamp it, or say what it still needs.** Its scope was s9 and
      s10; both are real-green and live. A stamp brings the full critique walk
      (every persona, all nine lenses, delta against v1's 36/50 on RUBRIC 1.3)
      and a versions-ledger line the README quotes. *Say "stamp" and the walk
      runs in isolation; say what is missing and it goes on the board first.*
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
