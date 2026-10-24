# Coding standards

Spine's general rules, `SPINE_STANDARDS.md` at the Spine plugin's root, hold in
every section below; a line under `## Departures` wins over the rule it names.

Two repositories, one product: the site (this repository) and the data package
(`OytunOnal/permit-rulebook-data`, checked out beside it). Where they differ a
line says so. The data repository's `CONTRIBUTING.md` is the data contract and
wins where this file is silent on data. `code-review` reads this file on every
pull request.

## Commands

- Lint: site `npm run lint` (ESLint, `eslint.config.mjs`) over `src/`,
  `scripts/`, `tests/` and the pages' scripts holds Spine's shape limits,
  every line counted, blank lines and comments included. A hit waiting on its
  issue is an entry in the config's exception list, with that issue and its
  version, and `tests/lint.test.ts` fails once that version comes.
  `astro check` and `tsc` carry the type rules.
- Format: none configured.
- Typecheck: site `npm run build` (`astro check && astro build`); data
  `npm run build` (`tsc -p tsconfig.json`) and `npm run typecheck:tests`.
- Structure: in the site's root, Spine's structure command, set up as Spine's
  `structure-command.md` says, writes `docs/spine/structure.json` from the
  code, and Spine's structure check reads it against
  `docs/spine/dependency-rules.md`. Every source file carries its `// @level`
  tag as its first comment (an Astro file's, on the line after its first
  `---`). The file is generated and never resolved by hand: a merge
  keeps one side's copy (`.gitattributes`, `merge=ours`; a fresh clone sets
  the driver once with `git config merge.ours.driver true`, its worktrees
  share it, and CI never merges), and after any merge that changed it, the
  structure command is rerun
  and its result committed. GitHub's merge ignores local drivers, so on its
  conflict: merge master into the branch locally, rerun, push.
- Green means: the site — `npm test` (vitest, browser cases drive headless
  Chrome over `dist/`), `npm run build` with 0 errors, `npm run assets:check`
  true, `npm run lint` with 0 problems; the data — `npm run check` end to end
  (build, typecheck:tests, validate, watch:coverage, tests). Both, on the
  branch, before the merge.
- Watch: data `npm run watch:sources` is the daily read of every source; it
  is never run in a slice.
- Spine's tools (the green, red-before, same-cases, the check at write) run
  the steps of `docs/spine/commands.json`; their commands are in Spine's
  `briefing.md`.

## Module boundaries

- The data package owns the rules: the dataset, the schema, the engine
  (`evaluate`, the scope words, the watch). The site imports it as
  `permit-rulebook-data` and pins its commit in `data.lock`; a data change
  reaches the site only through a pin.
- The site owns the screens: `src/lib/*` renders, `src/pages/*.astro`
  composes, one bundled module drives the interview in the browser. Nothing in
  `src/` decides a rule.
- A number, a threshold or a rule sentence never lives in the site; a screen
  word never lives in the data.

## Rules

- The site's health signal is the footer line on every page: the oldest and
  newest day a value was read, the watch's last run, the sources it could not
  read, and the dataset version.
- Every user-facing string lives in the copy module (site) or in the dataset
  (data). The copy module is `src/lib/copy/`, one file per screen or part:
  `frame.ts` for the frame every page shares, `quotes.ts` for the words around
  a quote, and one file each for the interview, the verdict, a route page, a
  country page, `/data/`, `/feedback/` and the 404. None is typed into a
  template, a page, a test or an inline script; a
  script reads its words from `data-` attributes the template renders. No
  country name, route name or dataset value inside an inline script.
- Naming: files and ids are kebab-case.

## Tests

- Browser cases measure geometry and state from the running page, through
  `scripts/browser.mjs`.
- A fixture's `source` line is where it records why it was regenerated.

## Departures

Each line names a general rule and its section in `SPINE_STANDARDS.md`, this
product's version, and why.

- Lint limits (Rules): a `describe` callback is exempt from the function
  limit, because it only groups cases, each `it` body is held to the limit,
  and the file limit bounds the whole.
- A condition of more than two clauses named (Rules): a test's oracle is
  exempt, because the oracle is the decision the case asserts, and a name
  would put that decision out of sight.
- Records go under a dated home (Rules): the watch's flags share one home and
  carry their day in their name (`watch/flags/<source>-<day>.md`), because
  the step that files them as issues reads one folder.
- Errors are visible (Rules): an error may be dropped with a comment saying
  why dropping it is safe, because some failures (a browser that refuses
  site data) leave nothing for the log or the reader to act on.
- A test decides its pass on a state it writes itself (Tests): the quote gate
  is the exception, because it is meant to go red when a source page changes.
- Secrets live in `.env` (Security): also in the repository's Actions
  secrets, because the deploy and the watch run in GitHub Actions.
- A third-party script is pinned and loaded with its integrity hash
  (Security): the analytics beacon is the one exception, allowed by name in
  the Content-Security-Policy, because its vendor serves it unversioned.

## Security

- The watch fetches only public addresses: every resolved address is judged
  before a connection is made.
- A shared device keeps nothing of a reader after Start over.
- The Content-Security-Policy names every script the page runs: `'self'`, the
  analytics beacon, and each inline script by its hash.
