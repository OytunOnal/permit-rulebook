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

**s11 is live** (2026-09-15, on your word: *"s11 merge"*). Site `777b3ff`, data
`165f39a`, 539 + 349 tests, deploy green in 2m31s, read on the live host after
it landed: `/data/` says *"Every source is re-read daily — last run
2026-09-15."* with no exception clause, and the footer *"re-read daily (last
run 2026-09-15)"* — the clean sentence, because the shipped state carries no
unread list yet. **The first watch run after this merge writes it**, and from
then on a partial run says so on every surface without anyone's help.

**s10 is open at its boundary** (2026-09-15, human: *"s10'a geçelim"*). The
CLS defect the counter found is **reproduced**: the page ships an empty
`<main>`, a 220 KB module fills it, and everything below moves. On a local
server the script arrives with the HTML and CLS reads 0 — which is why no gate
has ever seen it; with the module delayed 700 ms, the site's own headless
driver measures **0.11 / 0.28 / 0.16** on the three arrivals (cold, `?country=`,
saved record) and names the field's nodes: `#app`, the footer, `#decl`. The
scenario is drafted — `docs/spine/scenarios/s10-first-paint.md` — with the
issue's own fix direction: the first question rendered into the HTML at build
time, a different first screen replacing it in the same box, and a
browser-driven gate that fails at today's numbers. **Nothing is built until
you approve it.**

**What tonight's run should do.** The User-Agent repair means Spain reads
again; CI read every IND page fine this morning. So the 05:17 UTC run is
expected **green** — the first since 2026-09-10 — and `/data/` to stay clean.
If it is not, the page will say which country, and that is the point.

**Three slices shipped this week on your word** — s8, s9, s11 — each built on
a branch, reviewed on both axes, walked on the local preview, merged. Today's
one cost the most and taught the most: the spec was wrong twice and the build
measured it; the approved sentence claimed a duration nothing in the system
knows and the walk caught it; and the working trees were treated as mine while
an agent wrote in them, three times, which is now Spine's rule steward-53.

**The five-day failure is closed** (data #18 stays open for the record). It was
our own header: the watch put a URL inside its User-Agent and
`inclusion.gob.es` refuses that, wherever it comes from. The name stays, the
address moved beside it, both Spanish sources read on the first try, and the
salary threshold was **unchanged** — eight days blind, nothing moved.

**Queued, in order:** **s10** (CLS, site #8 — v1.1's last slice, unbuilt);
**site #9** (the label "Newest value read" that you read as "last checked" —
two rows, "Newest value changed" and "Last checked"); `feedback-line` (site
#6, built, never walked); data #15 (the free-movement notice's evidence for
four passports); data #13 (the Opportunity Card's link); data #17 (the IND
shell — the browser strategy's gate read 2 of 5, worth building for two
sources); the Spanish job-search visa's annual order to re-read at the end of
December.

What runs without anyone asking:

- **The daily watch** (05:17 UTC) — repaired today; expected green tonight.
- **The site's daily rebuild** (06:40 UTC nominal, ~11:48 in practice) — has
  pinned and deployed a fresh data commit every day since 2026-09-11.
- **The counter**, and **the pre-registered numbers** (A2, A7, A8 on 2026-10-09).

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

Nothing is blocked on you. These are the things only you can see, when you want
to look:

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
- [ ] **Approve the s10 scenario** — `docs/spine/scenarios/s10-first-paint.md`.
      Read "What must be true" (six points) and "How it is proved". The one
      judgment in it that is yours: point 4 — with the first question in the
      HTML, a reader without JavaScript sees a question they cannot answer, and
      the scenario puts a one-line `<noscript>` in scope and nothing more.
      *Say "approve", or say what to change.*
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
