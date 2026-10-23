# Coding standards

Two repositories, one product: the site (this repository) and the data package
(`OytunOnal/permit-rulebook-data`, checked out beside it). Where they differ a
line says so. The data repository's `CONTRIBUTING.md` is the data contract and
wins where this file is silent on data. `code-review` reads this file on every
pull request.

## Commands

- Lint: site `npm run lint` (ESLint, `eslint.config.mjs`) over `src/`,
  `scripts/`, `tests/` and the pages' scripts holds the six shape limits:
  files ≤ 400 lines and functions ≤ 40 lines, every line counted, blank lines
  and comments included; nesting ≤ 3; parameters ≤ 3; no nested ternaries; no
  unused names. A `describe` callback is exempt from the function limit; every
  `it` body and helper is held to it. A hit waiting on its issue is an entry
  in the config's exception list, with that issue and its version, and
  `tests/lint.test.ts` fails once that version comes. `astro check` and `tsc`
  carry the type rules.
- Format: none configured.
- Typecheck: site `npm run build` (`astro check && astro build`); data
  `npm run build` (`tsc -p tsconfig.json`) and `npm run typecheck:tests`.
- Structure: in the site's root, `node ${CLAUDE_PLUGIN_ROOT}/scripts/structure.mjs`
  writes `docs/spine/structure.json` from the code, and
  `node ${CLAUDE_PLUGIN_ROOT}/scripts/structure-check.mjs` reads it against
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

- Logs are structured: the watch writes one JSON line per event (`ts`,
  `level`, `msg`). A record the code produces carries its day in its name
  (`watch/flags/<source>-<day>.md`). A `.gitignore` line names a home, never a
  name shape (`*.tmp`).
- Errors are visible: each reaches the log or the user. None is swallowed
  without a comment saying why dropping it is safe.
- The site's health signal is the footer line on every page: the oldest and
  newest day a value was read, the watch's last run, the sources it could not
  read, and the dataset version.
- The lockfile is committed in both repositories, and dependencies are audited
  in CI. An upgrade is one package per change; its lockfile diff is read, never
  hand-edited.
- The deploy triggers on product paths, never on docs (`pages.yml`,
  `paths-ignore`).
- Every user-facing string lives in the copy module (site) or in the dataset
  (data). The copy module is `src/lib/copy/`, one file per screen or part:
  `frame.ts` for the frame every page shares, `quotes.ts` for the words around
  a quote, and one file each for the interview, the verdict, a route page, a
  country page, `/data/`, `/feedback/` and the 404. None is typed into a
  template, a page, a test or an inline script; a
  script reads its words from `data-` attributes the template renders. No
  country name, route name or dataset value inside an inline script.
- Naming: files and ids are kebab-case; exported functions are verbs
  (`renderQuestion`, `askedFieldOf`); a term the code leans on lives in
  `GLOSSARY.md`.
- A comment states a non-obvious constraint or reason, today's; obvious code
  carries none. No history.

## Code

- The plainest form that does the job: no clever trick where a plain form
  reads. A finding names the plainer form.
- No boolean argument that switches what a function does: two functions, or an
  option named for it.
- A condition of more than two clauses gets a name that says what it asks; a
  test's oracle is exempt.
- A helper sits in its only user's file, or inside its deep module's folder
  when only that module uses it; used by several modules, it is a module of its
  own. A module's own logic stays in it, never in a helper others share.
- No compatibility shims, no `// removed` comments.
- A case for new behaviour, a bug fix's included, fails before its code; a
  guard case, which the code already holds, is exempt.

## Tests

- A test asserts a decision, not content. A check keyed to a substring, a word
  count or a sentence's shape is a finding unless the contract declares that
  set and the test names it.
- No source-grep: a test reads rendered output or runs the engine. Two
  precedents: the sweep that proves a retired name is gone, and a workflow,
  which no test can run: it is read from its file.
- A test that pins a date, a version or a count says why when it moves.
- Browser cases measure geometry and state from the running page, through
  `scripts/browser.mjs`.
- A fixture regenerates only with a recorded reason in its own `source` line.
- No check that content can silence, and none that demands content.
- A test decides its pass on a state it writes itself, never on one a
  scheduled run rewrites (the shipped `watch/state.json`). The quote gate is
  the exception: it is meant to go red when a page changes.

## Security

- Data crossing a boundary (a request, a file, an external API, a fetched
  source page) is validated against a schema.
- Text from outside is escaped where it is rendered, and never run: not by a
  shell, an `eval`, a query or a prompt.
- Files are read inside the project only, no link followed.
- Writes: into a project only inside its root, never under `.git` (however
  spelled) and never at the root itself; run output and agents' scratch under
  `.run/`, which git ignores; test fixtures in the OS temp folder, a throwaway
  folder per case, removed.
- An outside program is called with an argument list, never through a shell,
  found from the PATH's absolute folders, never from the folder under check.
- Every loop, regex and walk over outside input is bounded: by length, count or
  depth. A fetched page is bounded on the wire and when unpacked.
- The watch fetches only public addresses: every resolved address is judged
  before a connection is made.
- Secrets live in `.env` or in the repository's Actions secrets, never in
  code.
- A third-party script is pinned to a version and loaded with its integrity
  hash. The analytics beacon, which its vendor serves unversioned, is the one
  exception, allowed by name in the Content-Security-Policy.
- The Content-Security-Policy names every script the page runs: `'self'`, the
  analytics beacon, and each inline script by its hash.
