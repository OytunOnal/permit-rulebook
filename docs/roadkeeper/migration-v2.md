# Moving Permit Rulebook onto the tracker (Spine v2.3.1)

Written 2026-10-17 on the human's word "taşı". A plan, not yet done: nothing
below is written to a tracker until the human approves it.

## Why

Spine moved from ledgers (`STATUS.md`, `KANBAN.md`, `DECISIONS.md`) to the
issue tracker in v2.0, and is at v2.3.1. Nothing in v2 reads the ledgers, and
v2's hooks already run in this project: the session-start nudge reads
`docs/spine/metrics.md`, and the redraw hook draws `docs/spine/road.html` from
the tracker after every tracker write (it has twice replaced the ledger page
with a drawing of the few issues the repositories hold, and the ledger page
was restored both times). A project kept half in each era has no guards and a
page that goes stale or wrong; the move is what makes Spine's checkpoints
work again.

## What changes for the human

- **The work is on the tracker of `OytunOnal/permit-rulebook`.** A slice is an
  issue on a milestone; a milestone holds at most five slices and is named
  `vX.Y.Z — <what it can do>`; what the human owes is an issue labelled
  `waiting-on-you`; The Road is drawn from these. The data repository keeps
  its own issues (watch flags, data bugs); a slice that changes it names them.
- **Every slice merges through a pull request.** Until now the session merged
  to master on "merge". In v2 the session asks "Merge PR #N?" and merges on
  yes.
- **The human runs the user-invoked skills of a slice:** `/grill-with-docs`
  and `/to-spec` (the spec), `/to-tickets`, `/implement-spec` (or
  `/implement` for a one-ticket slice), and `/spine:retro-spec` after real use.
  More checkpoints per slice than the session-driven loop, and each one yours.
- **Review** is Pocock's `code-review` plus Claude Code's `/security-review`
  on the branch, posted as one PR comment, then one fix round. The ledger
  era's open-line traces, waivers and record hygiene end with it.

## Step 0 — the human, once

Run `/setup-matt-pocock-skills` in this repository: it connects the tracker
and writes its labels and the tracker doc v2's skills read.

## Step 1 — labels and the open milestone

Add Spine's labels: `active`, `mock-green`, `real-green`, `waiting-on-you`,
`major`, `internal` (beside the existing `bug`, `enhancement`).

Open one milestone for what is left of the ledger's v1.2:
**`v1.2.0 — the watch tells the truth, and a reader's Back stays on the site`**.
Four counted slices, by WSJF (importance + risk) ÷ cost:

| # | Slice | Kind | Why it is here | WSJF |
|---|---|---|---|---|
| 1 | Four source changes nobody walked (metric 1 off target: data #23–#26, and #27 when it turns 48 h) | `bug` | the dataset's liveness promise is broken: *re-read daily* while four changed sources sat unread by a person for up to ten days; #26 is the FR ICT floor, SMIC-indexed | (3+3)÷2 = 3.0 |
| 2 | The first paint shifts (site #8; metric 6 read off target 2026-09-23, 88 % good against > 92 %) | `bug` | a broken promise with an open issue and a reading behind it | (2+2)÷2 = 2.0 |
| 3 | An unknown link's first paint (`?country=zz`) | `bug` | v1.2's queue, since the s30 review | (2+1)÷1 = 3.0 |
| 4 | A flag quotes a page; the quote is the page's | `bug` | v1.2's queue, versioned 2026-09-25 | (2+2)÷2 = 2.0 |

Not counted, on the same milestone: **Real use of s37** (`mock-green`,
waiting on one phone tap). At the milestone's close the release is
`v1.2.0`: `package.json` (both repositories read `0.1.0` today) takes the
number, the commit is tagged, and the release says what v1.2 can do — the
ledger era's thirteen v1.2 slices included. v1.0 and v1.1 stay in the ledger's
`## versions`; v1.2.0 is the first tag.

## Step 2 — the candidates, as issues with no milestone

Every roadmap candidate in `KANBAN.md` becomes one issue, titled by its
capability, labelled `enhancement`, `bug` or `internal`, its body the ledger's
text (why · bet · source) and its old place ("planned under v1.3 in the
ledger", "`after: 2026-10-09`"):

- v1.3 (2): Compare, don't rank; Quoted, not asked.
- wave 2 (4): What a permit leads to; Permanent residence; Citizenship; CA + AU.
- wave 3 (2): A countries menu in the header; Rest of Europe.
- later (13): An id is a word the watch chose; Move the two workflows to
  Ubuntu 26; A Security-only read of the launch code; Split the digest list
  out of the carrier; the 45+ age rules; Orientation-year English requirement;
  Country vocabulary follow-ups; Affiliate layer; More citizenship exceptions;
  Reduced thresholds, remaining limb; Turkish UI; Quote-grounded "ask about
  this route"; Recognition helper.

Plus two that the move itself raises, `internal`:

- **Metric 2 needs a writer.** v2's `command` rows allow only `-R`, `--state`,
  `--label`, `--limit` and `--json`; the row now uses `--workflow`, `--event`
  and `--branch` to count scheduled runs only (DECISIONS 2026-09-25), so under
  v2 it would not run. v2's answer is a `file` row its own writer keeps.
- **The structure check.** v2.1: "a project already on Spine runs the
  structure check after updating and flattens what it flags" — a
  `docs/spine/dependency-rules.md` with a level per module, then
  `structure-check`. An audit of its own, not part of the move.

That is 23 candidate issues. The milestones after v1.2.0 are proposed at its
close, in v2's re-plan, from these; a candidate whose condition has landed
(the ten `after: 2026-10-09`, `after: s35`, Ubuntu 26 on 2026-10-19) is read
there, not before.

## Step 3 — what waits on the human, as issues

Each written so a stranger could act on it alone (target, what to look for,
what a pass is, why it is yours):

1. Real use of s37: one tap on a phone (the STATUS item as written).
2. Metric 3: Cloudflare Web Analytics, visits from search and referrals, days
   8–30 (due 2026-10-09).
3. Metric 5: Search Console → Links (due 2026-10-09).
4. Metric 6: Cloudflare Core Web Vitals, CLS share good (due 2026-09-30).
5. Pick from the 2026-09-23 walk's three adjustments.
6. The three checks only you can make (a touch device, a screen reader, the
   two counts on `/data/`).
7. End of December 2026: read the Spanish order (data #16 is held on it).
8. `DISPATCH_TOKEN` expires 2027-09-09.

## Step 4 — files

- `.gitignore` names `docs/spine/issues.json`; `.gitattributes` adds
  `docs/spine/structure.json text eol=lf` (v2.3.0's note).
- `CODING_STANDARDS.md` at the root, from v2's template, filled from
  `docs/spine/standards.md` and the data repository's `CONTRIBUTING.md`; each
  line kept or removed with the human (v2 genesis, Plan, step 5).
- Hard-to-reverse decisions from here go to `docs/adr/`.
- `STATUS.md`, `KANBAN.md`, `DECISIONS.md` and `docs/spine/reviews/` are
  frozen as history: each gains one opening line saying so and pointing at
  the tracker and The Road. Nothing is deleted; the records' links keep
  working.
- `docs/spine/metrics.md` takes v2's row shape
  (`# | Metric | Target | Kind | Source | Field | Cadence | Next reading`).
- The one Security finding still open in the records — s33's
  `.github/workflows/pages.yml:67`, the step fetching from `$SITE_URL`, a
  repository variable, with no SRI — becomes an issue, so the move does not
  drop it.
- `docs/spine/road.html` is drawn by v2's `road` command from the tracker and
  committed with the next commit on master.

## Step 5 — the first slice in the new way

Slice 1 of v1.2.0, the four unwalked flags: steward's diagnose, then the
slice steps with the human running each user-invoked skill.

## What it costs

- About 37 issues and one milestone written to a public tracker: four slices,
  one real use, 23 candidates, eight waiting-on-you, one security finding.
  Anyone can read them; they are written in English.
- More of the human's time per slice (five skills to run, a PR to approve).
- The ledger era's own disciplines that v2 dropped (record hygiene, open-line
  traces, waivers) end; the PR review and `/security-review` replace them.

## Order of work

1. The human approves this plan, or names what to change.
2. The human runs `/setup-matt-pocock-skills`.
3. The session writes steps 1–3 to the tracker in one pass, step 4's files in
   one commit, and draws The Road.
4. Slice 1 starts.
