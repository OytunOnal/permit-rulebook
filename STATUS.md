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

**A slice is mid-build — the working tree is the builder's** (s7,
`docs/spine/scenarios/s7-nationality.md`; uncommitted changes under `src/` in
both repositories are its, and nothing is committed until the gates run): a
statement can name the passports it does not bind, carrying the authority's own
sentence for the carve-out. The Netherlands was read first (issue #9, by the
deep-researcher, every claim quoted and dated). It corrected the report as well
as confirming it — **three** routes state the sponsor condition where the IND
sets it aside, not four: the Blue Card was already right and the ICT permit
states no sponsor condition. It also found something nobody had asked about:
**MVV is absent from the dataset entirely**, though every Dutch route's page
requires one and eleven nationalities are exempt. Both go in; the Japanese
work-permit claim goes to `exclusions.md` as investigated and not found on any
official page.

**The bug is real, and it is a class.** The human's report (data #7) said the
Dutch routes state conditions that do not apply to a Turkish citizen. The IND's
own page says it plainly — *"For employees with Turkish nationality, a
recognised sponsor is not required"* — and four Dutch routes state that
condition without qualification. Checking the rest: `citizenship` is used in
exactly one way in all 23 routes, `eq third_country`, so **no route can
currently say "for nationals of X this does not apply"** even where an
authority says so. That is data #8, and it is split into one read per country so no
lead travels as a summary: **#9 the Netherlands** (Turkish confirmed, Japanese
a lead), **#10 Germany** (§ 26 BeschV, the Western Balkans rule, Decision
1/80), **#11 France** (the Franco-Algerian Agreement of 1968, Tunisia,
Morocco), **#12 Spain** (nothing claimed — the reading has to establish it
either way). Each closes only when every regime is modelled with a quote and a
date or written into `data/exclusions.md` with the page and the reason.

**The feedback prompt is at its gate** (site #6, #7): both drawn shapes were
rejected; what replaces them is undecided.

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

Nothing is blocked on you. These are the things only you can see, when you want
to look:

- [ ] **The feedback prompt — pick A or B** (or change the words):
      http://localhost:4400/s7-feedback.html. *Pass:* you would let it appear
      on your own screen after your own results. Nothing is built until you
      pick.
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
