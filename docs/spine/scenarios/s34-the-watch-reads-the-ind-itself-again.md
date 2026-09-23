# s34 — the watch reads the IND itself again

**Status:** approved 2026-09-23 (human: "onaylıyorum"). v1.2 queue head: data #17, the road back from
the human tier (s14, s29). Data slice; the site changes by rebuilding against
the pin, plus one glossary entry.

## What happened

On 2026-09-16 the IND put the requirements of its five route pages behind a
*Your situation* form whose result has no address of its own, and the five
entries went to the human tier (s14): a person reads them, quarterly, where the
fetcher gets a 700-character shell. On 2026-09-17 the Opportunity Card's
official page joined the tier for a different wall — the BMI serves it only
after a cookie round-trip this fetcher does not keep (s29). Two more had been
there since 09-10: Legifrance (HTTP 403) and EUR-Lex (202 with an empty body).

The tier is honest and it is a cost: `human_tier: 40` at the quote gate — 38
IND quotes and 2 notice quotes ship on a person's word with a 90-day reminder
instead of a daily read — and the site's *re-read daily* clause is true of 37
sources and not of these. The one measurement the road back was gated on has
been taken, from the runner, on 2026-09-15: **headless Chrome from GitHub's
runner reads the IND page and EUR-Lex (the sentence found in both) and does
not read Legifrance (a Cloudflare challenge)**; the runner and a laptop
returned the same rows, so these walls sort by client, not by address.

Since then the tier has not moved, and the IND has changed its form once
(orientation year, *last update 16 September*). A person will be due to read
38 sentences again on 2026-12-15.

## What a reader gets

Nothing on a route page changes today: the sentences are the IND's, read on
their dates. What changes is what the site can say about them — *re-read
daily*, machine-checked, the same as every other source — and what a curator
gets when the IND rewrites a requirement: a flag with the diff the next
morning, not a quarterly reminder to go and look.

## What must be true

1. **A `browser` strategy exists, and it is the html strategy with a
   different reader.** `WatchStrategy` gains `"browser"`; `STRATEGIES` gains
   its row (`fetches: true`, `compares: true`, its own honest
   `no_text_snapshot`, html's remediation). A browser entry's reading is the
   page **as rendered** — headless Chrome opens the URL, performs the entry's
   declared steps, waits for the page to settle, and hands back the
   document's HTML — and from there `readSource` treats it exactly as html:
   `htmlToText`, `normalize`, the slice markers, a missing marker reported as
   `unreachable`, never as "no change". The snapshot carries `text`, so the
   quote gate verifies against it like any html entry, and a `changed` flag
   carries its diff context. `--only=<id>` re-baselines a browser entry like
   any other.
2. **The steps are data, declared on the entry, in a closed vocabulary.** A
   browser entry may carry `steps`: an ordered list from a small set the code
   defines and the validator checks — select an option by its label in a
   field named by its label; answer a yes/no question by its label; press a
   button by its label; open every collapsed block. The five IND entries
   carry the recipe `data/verify-s5e.md` §3 already writes down for a
   person: nationality *Türkiye*; *Do you already have a valid Dutch
   residence permit?* — No; *Did you have a Dutch residence permit and did it
   expire less than 2 years ago…?* — No; *View information*; open the
   collapsed blocks. An entry with no steps is simply rendered. A step that
   cannot be performed — the label is gone, the option is gone — makes the
   entry `unreachable` with the step named in the error, and the run goes on
   to the next entry; the IND changing its form is a red day a person looks
   at, never a green day that read a shell.
3. **Seven entries move, two stay, each with its reason on the entry.** To
   `browser`: `nl-ind-highly-skilled-migrant`, `nl-ind-orientation-year`,
   `nl-ind-blue-card`, `nl-ind-ict`, `nl-ind-researcher` (the form, point 2),
   `de-bmi-chancenkarte` (a cookie round-trip a browser keeps; no steps), and
   `eur-lex-blue-card-directive` (the 202-and-empty-body challenge a browser
   passes, measured 2026-09-15; no steps). Each loses `max_age_days` and
   `last_verified`, gains a `slice` the builder proves against the rendered
   page (the IND slices from the page's lede to the footer as before; EUR-Lex
   around Article 3(1); the BMI notice around its body), and gains a
   `history` line naming this slice, the day, and what moved it. Staying on
   the human tier, with the reason already in their notes and re-stated with
   this day's measurement: `legifrance-ce-algerian-titles` (the Cloudflare
   challenge headless Chrome did not pass) and `gesetze-official-recheck`
   (reachable only through a VPN — a geography, not a client). The notes on
   the seven are rewritten: what the fetch did, what the browser does, and
   the day it was measured from the runner.
4. **The quote gate reads them.** `npm run check` prints `human_tier: 1`
   (Legifrance's one sentence) and `ok: true`; `verified` rises by exactly
   the quotes that were unverifiable on the seven (38 IND + 1 EUR-Lex — the
   builder confirms the count from the dataset before and after); `missing:
   []`. Nothing in the dataset changes: no value, no `retrieved_at`, no
   history line on a value — the sentences stay as read, with their dates.
5. **The daily run can open a browser, and says so when it cannot.** The
   watch workflow's runner has Chrome; the watch finds it the way the site's
   `scripts/chrome.mjs` does (an explicit `CHROME_PATH` first, the runner's
   known locations, then PATH) and launches it **once per run**, headless,
   with the fetcher's own User-Agent name in its string. No new npm
   dependency: the reader speaks to Chrome over its own protocol, as the
   site's `scripts/browser.mjs` already does, and the builder may port that
   harness. A per-entry budget of 30 s, like the fetcher's. When no Chrome
   can be found, every browser entry reports `unreachable` with an error that
   names the missing browser, the html entries are read as before, and the
   run goes red — a run that could not open a browser has not read these
   seven and must not say it has.
6. **The run's cost is bounded and stated.** Seven browser reads inside a
   job that takes about two minutes today: the builder measures the run
   before and after on the runner (a `workflow_dispatch` of the watch on the
   branch, without `--commit`, is enough) and writes both numbers in the
   correction paragraph. If the run passes five minutes, that is a finding
   for the session, not a reason to read fewer pages.
7. **The record of the human read closes, dated, and nothing is deleted.**
   `data/verify-s5e.md` §3 and §6 gain a closing line: moved to the browser
   strategy on this slice's day; the sentences below stay as the record of
   the last human read and are not re-verified by hand again. `CONTRIBUTING.md`'s
   human-tier paragraph says what the tier is now — two sources, and why —
   and that a form-gated page is a browser entry with steps, not a human one.
   `tests/s14.test.ts`'s promises that this slice inverts (the five are
   human; the state carries no text for them) are retired **by name** in this
   slice's test, with a comment saying which s14 case each one replaces; the
   s14 cases that stay true (the two untouched IND pages, the bot-gated
   template) stay. The bot-wall measurement — `.github/workflows/bot-wall.yml`
   in the data repository and the site's `bot-wall` branch — is deleted with
   the decision it informed, as its own header says it should be; the
   measurement's result is in DECISIONS (2026-09-15).
8. **The site changes by the pin, plus one glossary entry.** No site code
   changes. `CONTEXT.md`'s **Human tier** entry stops calling the browser
   read a candidate and says the tier holds one source; a **Browser tier**
   (or the builder's better name) entry says what a browser entry is — a
   page read as rendered, with declared steps — and the *Source watch*
   section gains **Steps**. s11's freshness clause needs nothing: a browser
   entry is a machine read, so on a day it is unreachable it is *unread*,
   exactly as an html entry would be — and the builder confirms with the s11
   tests that the seven produce no clause on a clean day and the right one on
   a red day.
9. **The bet on metric 2 is stated, not hidden.** This slice moves seven
   entries from an arm that cannot fail to an arm that can. The watch's red
   days are counted against a target of zero-in-seven, and a browser read has
   more ways to fail than a fetch — the IND's form, a slow render, a runner
   without Chrome. The retry slice (intake #21) is next in the queue and
   shares this file; until it lands, a browser entry that fails once reports
   `unreachable` like any fetch, and the day is red. That is the honest order:
   read the pages first, then stop crying at hiccups.

## How it is proved

- **A real browser against a local page, in the data repository's own
  tests.** A case serves a fixture page from the test itself — a *Your
  situation* form with the three questions, a *View information* button that
  renders a requirement list only after the answers, and a collapsed block
  holding one sentence — and runs the real reader with the five IND entries'
  own steps: the rendered text carries the sentence, the slice applies, and a
  page whose form lost its nationality field reports `unreachable` naming the
  step. Where no Chrome exists the case is skipped **with a printed reason**,
  and never under `CI`.
- `tests/s34.test.ts` over the watchlist and the code: the seven entries'
  shape (strategy, steps where the form needs them, a slice, a history line,
  no verification age); the two that stay; the `STRATEGIES` row; `readSource`
  reading a browser body as html; a run with no browser marking exactly the
  browser entries `unreachable` and reading the rest; the validator refusing
  a step outside the vocabulary.
- `npm run check` green with the numbers of point 4, confirmed by the builder
  from the dataset.
- The watch run locally with `--commit` against the live pages, before the
  merge: the seven baseline or unchanged, the 39 sentences present in the
  snapshots the run wrote, no `unreachable` among the seven.
- **Real-green: the first scheduled run on the runner after the merge** reads
  the seven with no `unreachable` among them, commits state, and the site's
  next pin lands with `human_tier: 1` in the data check — and the site's
  `/data/` page says *re-read daily* of the IND's pages. Read the run's log
  and the live page the morning after.
- The docs of point 7 and the glossary of point 8, read.

## What this slice is not

It is not the retry (intake #21) — that is the next slice in the same file. It
is not a way through Legifrance's challenge or gesetze's geography: those two
stay with a person, and their notes say why with today's date. It is not a
value change: every sentence stays as read, with its date, and a browser read
that finds a sentence moved raises a flag for a curator, as an html read
would. It does not touch a route page's text or any site code.

**Corrected 2026-09-23, by the build:** the strategy landed as written and the
seven read, but the form has two faces and the build walked into both. ind.nl
serves the requirement list unasked to a client it recognises and the *Your
situation* form to one that names itself — and the watch is the second kind, so
the form is what it always meets. Read from a developer machine the pages
showed no form at all, the build concluded it was gone and declared no steps,
and that error was caught by a second: the no-steps attempt kept the old slice
markers, the page's own lede and its footer, which the form-only page carries
**both** of — so the runner's first baselines were 892 characters of form
recorded as a clean read of a page whose every quoted sentence was missing. A
marker a shell can match turns a failed read into a green one. The `from`
markers now start below the form (`Requirements` on four; on the
highly-skilled-migrant page the intra-corporate-transferee sentence, quoted and
sitting above that heading), and a fixture holding the five shells the runner
rendered checks that none of them can ever match again. Driving the form then
took four corrections, each from a failed run rather than a guess: the option
is **"Turkish"** — the list holds nationality adjectives, not country names —
its suggestions are rendered as links and not as options; typing means real key
events from Chrome, because a value written through the input's own setter
fired no request at all; the radios are clicked by their visible label, not the
input; and the last failure was the build's own — `listOf` asked the document
for the first autocomplete menu and got the site search box's, empty and shut,
while the field's menu sat second with *Turkish* and *Turkmen* in it. On the
page's renderer freezing after each click, measured on a fixture that blocks
its main thread: the settle rule survives it (a freeze costs its own duration,
not a quiet window on top), and the choice is 800 ms between steps, 2.5 s
before the reading, and one retry after a full settle — which moved the 30 s
budget from surviving 2 s of freeze per click to 4 s and cut the five-step
recipe from 16.7 s to 10.1 s. **Point 6, measured on the runner:** scheduled
runs took 46–77 s before this slice; the measurement dispatch 102 s, the first
baseline dispatch 121 s, and the run that reads the five with the full
five-step recipe 213 s — about 20 s per stepped page, with the first read of a
run carrying Chrome's cold start (34.5 s), and the whole job still well under
the scenario's five-minute line — and the figure held on the final code, run
35926499955 reading the five at 20–23 s, EUR-Lex at 5.1 and the BMI notice at
9.4. `expand` is in the recipe and earns nothing
today: none of the thirty-eight sits behind *Show details*, and the sliced text
is identical with the step and without it; it is kept as the guard it was
written to be, at the cost of one click. **Point 2's vocabulary is narrower
than it was written**, in one arm and deliberately: `expand` opens every
collapsed block *in the page's own content, never in its furniture, and never
by pressing a link* — nav, header, footer, aside and dialog are out, named
structurally so the rule survives a reworded heading. Opening everything that
merely says it is collapsed opened the IND's own navigation menu into the
snapshot; and a security review then found the sharper half, that a disclosure
which is a link takes the tab with it — measured, a cross-origin anchor wearing
`aria-expanded` returned another site's body as the source's own reading — so
the origin the entry names is now the only origin a reading may come from: a
page that redirects or meta-refreshes to a third party on load is refused as
surely as a step that presses its way there, while
a redirect around the source's own site (the Opportunity Card's cookie check)
still reads; a move within that origin is allowed and the address it was read
at is logged — as its own `watch:read_at` event, on the fetch tier as well as
the browser one — because the origin is the trust line and a sub-path is not.
The fetch tier got the same guard in the same round, being the same harm one
tier over, and then a rewrite of its own that the nine points do not cover: it
judges a redirect BEFORE taking it, so an off-site target is refused without
ever being requested, the status reported is the redirect's own rather than a
stranger's, and a chain is capped at five hops within the source's site. One
housekeeping note for the record: `ind-turkish-citizens` was left unread by
the runner on 2026-09-23 through a transient fetch failure, and was re-read
before the merge with `--only --commit` from a developer machine — the state
diff was the unread list and nothing else. **Point 5 gained a clause it did not ask for**:
the browser sends `x-source-contact` beside the watch's name, as the fetcher
has since data #18, so a host that wants to block this reader can reach its
operator instead. **Point 6's proof list was met by the
runner rather than locally**: the line asking for the watch run with `--commit`
against the live pages before the merge was answered by the workflow's own
dispatches — a measurement run with `commit=false`, then a baseline run with
`commit=true dispatch=false` — because the five IND pages are served the form
only to a client that names itself, and the runner is the machine that reads
them every morning. **Provenance:** the five IND baselines
were rendered on the runner by the workflow itself; EUR-Lex and the BMI notice
were rendered on a developer machine and then confirmed `unchanged` by the
runner, which is the only evidence this slice has that a laptop render and a
runner render normalise to the same text — so a day-one `changed` on any of the
seven is to be read, not waved through. The watch workflow gained two
`workflow_dispatch` inputs, `commit` and `dispatch`, both defaulting to what
the schedule already does and every guard written `!= 'false'`, because
`github.event.inputs` is null on a schedule and the obvious spelling would have
silently stopped the morning run committing. Two costs worth stating: a browser
read is far heavier on a source than a fetch — ind.nl dropped this developer
address at the TCP level for about ninety minutes after roughly thirty-five
renders in half an hour, and the runner spent six renders per page across the
day getting this right — and `.gitattributes` gained `*.ts diff`, because
`src/watch/core.ts` holds a NUL byte in `sliceFingerprint` and git had been
printing the file this slice changed most as binary. The promises this slice
inverted were not only s14's: s29, s8, `tests/orientation.test.ts` and
`tests/watch.test.ts` each held one, and each is retired by name where it
stood. The glossary took **Browser tier** and **Watch step** — the latter not
the suggested *Steps*, because `CONTEXT.md` already defines *Step-gated row*
and *Leverage step*.
