# Standards — Permit Rulebook

What this repository already does, written down so the builder reads it before
writing and the Standards axis reads it before reviewing (v0.4 slice 3). Two
repositories, one product: the site (this repo) and the data package
(`permit-rulebook-data`, the sibling); where they differ the section says so.

## The commands

| | site | data |
|---|---|---|
| typecheck | `npm run build` (`astro check && astro build`) | `npm run build` (`tsc -p tsconfig.json`) + `npm run typecheck:tests` |
| tests | `npm test` (vitest, browser cases drive headless Chrome over `dist/`) | `npm test` |
| the whole gate | `npm test` · `npm run build` · `npm run assets:check` | `npm run check` (build, typecheck:tests, validate, watch:coverage, tests) |
| extra, when it applies | `npm run assets` after a change to what the social card says | `npm run watch:sources` (the daily read; never in a slice) |

**Lint and format: none configured** — *reason: the two repos ship no ESLint or
Prettier config and never have; `astro check` and `tsc` carry the type rules,
and the review axes carry the style ones. Adding a linter is a slice nobody has
asked for. — Oytun, via Spine, 2026-09-23.*

**What "green" means:** the site — vitest all files, `astro check` 0 errors,
`assets:check` true; the data — `npm run check` end to end (the dataset
validates, every quote still verifies, the watch covers every source both
ways). A slice is not green until both, on the branch, before the merge word.

## Module boundaries

The data package owns the rules: the dataset, the schema, the engine
(`evaluate`, the scope words, the watch). It exports what the site may read;
the site imports it as `permit-rulebook-data` and pins the commit in
`data.lock` — the site's build checks the sibling out at that commit, so a
data change reaches the site only through a pin. The site owns the screens:
`src/lib/*` renders, `src/pages/*.astro` composes, one bundled module drives
the interview in the browser, and nothing in `src/` decides a rule. A number,
a threshold or a rule sentence never lives in the site; a screen word never
lives in the data.

## Naming and shape

- **Every user-facing string lives in `src/lib/copy.ts`** (site) or in the
  dataset (data). None is typed into a template, a page, a test or an inline
  script; a script reads its words from `data-` attributes the template
  renders.
- No country name, route name or dataset value inside an inline script.
- Comments say **why**, in the voice of the code around them, and stay true
  when the code moves; a comment that describes a retired rule is a finding.
- Files and ids are kebab-case; exported functions are verbs (`renderQuestion`,
  `askedFieldOf`); a term the code leans on lives in `CONTEXT.md`.

## Tests

- **A test asserts a decision, not content.** A check keyed to a substring, a
  word count or a sentence's shape is a finding unless the contract declares
  that set (the verb set for a `learn` label, say) and the test names it.
- **No source-grep.** A test reads rendered output or runs the engine; it does
  not grep `src/`. One accepted precedent: the sweep that proves a retired name
  is gone.
- A test that pins a date, a version or a count carries a why-comment when it
  moves, naming the slice that moved it.
- Browser cases measure geometry and state from the running page; the harness
  is `scripts/browser.mjs` (`withBrowser`, `serve`, `emulateMedia`,
  `scrollbars`, `network`).
- Fixtures regenerate only with a recorded reason in their own `source` line.

## Data contract (the sibling repo)

`CONTRIBUTING.md` there is the contract and wins where this file is silent:
every value carries the authority's sentence, its page and the day it was read;
a schema change bumps the version with its reason where the last one's lives; a
statement names the question that asks it in `field`; `scope.not_asked` is
authored, never derived; a human-tier source carries its checklist entry in
`data/verify-s5e.md`.

## What a slice may not do

- Commit, push or tag from a builder agent; the ledgers are the main session's.
- Edit an acceptance scenario except by a dated `**Corrected …, by the build:**`
  paragraph.
- Add a check that content can silence, or one that demands content.
- Leave a worktree, a server or a scratch file behind at the exit.
