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
    G --> H["Steward ◀ here<br/>live, watched, answered"]
```

Pace, from the ledger: s5e real-green 2026-09-07, s5f 2026-09-07, s6
2026-09-09, s7 building 2026-09-10 — about one slice a day while the human is
in the loop daily. v1.1 holds two ruled candidates beyond s7; at that pace it
is days, not weeks, but the nationality reads for three more countries sit in
front of it and each is a research day before a build day.

## What is happening now

**Steward has run once** (2026-09-10). The human found that the way back in had
no door for a suggestion: all three templates asked about a defect or about
data, and the "new need" form required a checkbox about a route. The wording is
fixed in both repositories — the labels are unchanged — and the footer now says
"Suggest a route or a change".

**A second report came in, and it is at its gate:** a reader suggested asking
for feedback at some point — a popup, or a permanent icon. The footer's two
links stay as they are; what is being decided is a moment, not a replacement.
Two shapes are drawn in `docs/spine/design/s7-feedback.html` (served at
http://localhost:4400/s7-feedback.html): **A**, a slip docked to the bottom
edge that never dims the page, and **B**, a centred modal that stops the
reading. Both fire once ever, only after the results have been read, ask for
the two things the product can act on, send nothing off the device, and say out
loud that the tracker needs a GitHub account. Recommended: A. **Waiting on the
human's pick.**

**The counter was read** (2026-09-10): 57 visits and 75 page views since it went
live, 41 visits in the announcement's first 24 hours; United States 26,
Türkiye 24, seven other countries once each; LinkedIn and its app the only
referrers besides one Bing and one Google; **every visit entered at `/`** — no
route page has been landed on yet, which is what an unindexed week looks like.
The reading also found a defect: Core Web Vitals put CLS **poor for 23%** of
samples (`#app` 0.402, the footer 0.414, against a 0.25 threshold) — the
interview paints and then fills itself. Site #8. The A2/A7/A8 numbers stay
where they were pre-registered: 2026-10-09.

**s7 is live** (`docs/spine/scenarios/s7-nationality.md`, real-green
2026-09-10). A statement can name the passports it does not bind: a Turkish
passport no longer meets the recognised-sponsor condition on the two Dutch
highly skilled migrant permits or the researcher permit, because the IND says
it does not bind them; all six Dutch routes now state the provisional residence
permit, which ten passports do not need. Walked live with both passports.
Reviewed on both axes — one blocker, and it was in the spec I wrote, not the
build: the MVV shipped as a caveat and is a precondition.

**The rule that keeps it from happening again:** every question the interview
asks must change something the reader sees, as a generated check. Against this
morning's dataset, 168 third-country passports produced one screen — it would
have found data #8 by itself.

**The feedback line is built and waiting** (site #6): one line at the end of
the results screen — "Wrong about you? … report a wrong value or suggest a
change. Both open GitHub, where filing needs an account." Nothing opens,
nothing is dismissed, nothing is remembered. It sits on the branch
`feedback-line` (`20681e6`, 300 tests), **not on master**, because the window
is open and it is an improvement rather than a blocker. It merges when the
window closes.

**Germany is read and closed** (data #10). The answer came back different from
the Dutch one, and the difference is the finding: **nothing in the eight German
routes is wrong.** Every nationality rule found sits beside the routes rather
than inside them — § 26 Abs. 1 BeschV (eleven states, any employment, no
qualification) and § 26 Abs. 2 (the Western Balkans regulation, with its quota
and its mission-of-application rule) are ways in this dataset does not model;
Decision 1/80's rights attach after employment has begun, which is exactly what
the dataset's Türkiye notice already says — an official German source confirmed
a statement instead of correcting one; § 41 AufenthV decides where paperwork is
filed, and this product states conditions, not procedure. Three rows in
`exclusions.md` with the text they were read from. One defect fell out of it:
the Opportunity Card's "Official page" link points at handbookgermany.de, which
is not an authority (data #13 — the replacement is a real choice: the federal
portal serves a bot check, so it is a page a reader can use against a page the
watch can keep its eye on).

**Next, in order:** France (#11 — the Franco-Algerian Agreement of 1968 is the
lead, and if it governs Algerians instead of the general code it is a heavier
finding than either country so far: not a condition lifted, but the wrong route
shown), then Spain (#12, nothing claimed — the read has to establish it either
way). Each is a research day before a
build day: the Dutch read is what turned "four routes are wrong" into "three
are, and here is a second thing nobody had asked about".

What runs without anyone asking:

- **The daily watch** (05:17 UTC, data repository) re-reads every source, files
  an issue for each change and tells the site to rebuild. Its first three real
  flags were read on 2026-09-09 — all three were our own slice change, not the
  law, and the gap that let that happen is now a test.
- **The site's daily rebuild** (06:40 UTC) is the redundant path. **It did not
  fire on 2026-09-09.** The fast path (the watch's dispatch) is proven end to
  end and carried the day's data instead, by hand once. If the schedule keeps
  missing, the sentence "a daily schedule rebuilds even if every signal fails"
  has to change or the trigger has to.
- **The counter** (Cloudflare Web Analytics) records one view per page load and
  nothing about the reader.
- **The pre-registered numbers** in `docs/spine/assumptions.md` decide A2, A7
  and A8 thirty days after the announcement — 2026-10-09, read from the counter
  and the tracker.

## What is expected from you

**The 48-hour window is open until 2026-09-11 09:00 (GMT+3)** — the announcement
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

- [ ] **If a day passes with no rebuild — run one.** The site's own 06:40 UTC
      schedule has not fired once since it was written (2026-09-08); GitHub's
      scheduler is best-effort, and the data watch's own schedule runs three to
      four hours late every day. The daily rebuild that actually happens is the
      watch's: it commits its heartbeat and dispatches the site. *Check:* the
      footer of https://permitrulebook.com/data/ says "last run <today or
      yesterday>". *If it says an older day:* in a terminal,
      `gh workflow run pages.yml -R OytunOnal/permit-rulebook` — that builds
      against the pinned data and deploys; a green run appears within ten
      minutes at https://github.com/OytunOnal/permit-rulebook/actions. Nothing
      else is needed; it cannot break anything that the daily run would not.

- [x] **The card's quote cap, 10 → 11** (human, 2026-09-10): ratified for
      `nl-hsm-under30`. Twelve would have to be argued again.
- [ ] **The feedback line, when the window closes** (site #6, branch
      `feedback-line`): read it once — "Wrong about you? A value that does not
      match its source, or something this screen should do — report a wrong
      value or suggest a change. Both open GitHub, where filing needs an
      account." *Pass:* you would let it sit under your own results. Then I
      merge it. *If not:* say what it should say instead.
- [ ] **Nothing right now** on the audit: the Netherlands is being built (s7),
      Germany (#10) is read next, then France (#11) and Spain (#12).
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
