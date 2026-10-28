# Coding standards

Roadkeeper's general rules, `ROADKEEPER_STANDARDS.md` at the Roadkeeper plugin's root, hold in
every section below; a line under `## Departures` wins over the rule it names.

Two repositories, one product: the site (this repository) and the data package
(`OytunOnal/permit-rulebook-data`, checked out beside it). Where they differ a
line says so. The data repository's `CONTRIBUTING.md` is the data contract and
wins where this file is silent on data. `code-review` reads this file on every
pull request.

## Commands

- Lint: site `npm run lint` (ESLint, `eslint.config.mjs`); it loads Roadkeeper's
  rules from `roadkeeper-lint/` over `src/`, `scripts/`, `tests/` and the pages'
  scripts. Existing breaches: Ceilings in `docs/roadkeeper/ceilings.json`,
  Suppressions in `eslint-suppressions.json`. `astro check` and `tsc` carry
  the type rules.
- Format: none configured.
- Typecheck: site `npm run build` (`astro check && astro build`); data
  `npm run build` (`tsc -p tsconfig.json`) and `npm run typecheck:tests`.
- Tests: site `npm test` (vitest; browser cases drive headless Chrome over
  `dist/`); data `npm test`.
- Browser walk: a live walk or a real-use check imports `walkSite` from the
  harness's entry, `scripts/browser/browser.mjs`, on the built site or a live
  address, at `DESK` or `PHONE`. It returns the walker's result, the shifts
  of the page it ends on, and the walk's errors.
- Structure: in the site's root, Roadkeeper's `structure.mjs`, set up as Roadkeeper's
  `structure-command.md` says, writes `docs/roadkeeper/structure.json` from the
  code, and Roadkeeper's `structure-check.mjs` reads it against
  `docs/roadkeeper/dependency-rules.md`. Every source file carries its `// @level`
  tag as its first comment (an Astro file's, on the line after its first
  `---`). The file is generated and never resolved by hand: a merge
  keeps one side's copy (`.gitattributes`, `merge=ours`; a fresh clone sets
  the driver once with `git config merge.ours.driver true`, its worktrees
  share it, and CI never merges), and after any merge that changed it, the
  structure command is rerun
  and its result committed. GitHub's merge ignores local drivers, so on its
  conflict: merge master into the branch locally, rerun, push.
- Green means: the site — the deploy's checks, in its order: `npm run build`
  with 0 errors, `npm test`, `npm run lint` with 0 problems,
  `npm run assets:check` true, `npm run check:base` and
  `npm run measure:taps`; the data — `npm run check`
  end to end (build, typecheck:tests, validate, watch:coverage, tests). Both,
  on the branch, before the merge.
- Watch: data `npm run watch:sources` is the daily read of every source; it
  is never run in a slice.
- Roadkeeper's tools (the green, red-before, same-cases, the check at write) run
  the steps of `docs/roadkeeper/commands.json`, one in each repository; their
  commands are in Roadkeeper's `briefing.md`.

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
  the browser harness's entry, `scripts/browser/browser.mjs`.

## Departures

Each line names a general rule and its section in `ROADKEEPER_STANDARDS.md`, this
product's version, and why. A lint departure also adds its override after
Roadkeeper's preset in `eslint.config.mjs`.

- A test decides its pass on a state it writes itself (Tests): the quote gate
  is the exception, because it is meant to go red when a source page changes.
- Secrets live in `.env` (Security): also in the data repository's Actions
  secrets, because the watch's dispatch to the site runs in GitHub Actions
  with `DISPATCH_TOKEN`, and Actions has no `.env`.

## Security

- The watch fetches only public addresses: every resolved address is judged
  before a connection is made.
- A shared device keeps nothing of a reader after Start over.
- The Content-Security-Policy names every script the page runs: `'self'`, the
  analytics beacon, and each inline script by its hash.
- A path built from outside text, such as a request's path, is decoded,
  resolved, and refused unless it stays inside the folder it was built on.
  The inside check runs on real paths, every link followed: the file's
  against the folder's, so a link in the folder that leads out of it is
  refused too.
