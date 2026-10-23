# Dependency rules

## Modules
<!-- a deep module's folder per line, or none; `folder/*` declares every folder directly under it -->
- `scripts/carry-assets`
- `src/lib/country-search`
- `src/lib/interview-history`
- `src/lib/verdict`

## Levels
<!-- innermost first; changing them takes an ADR -->
1. domain — business rules and pure computation; no disk, clock, network or process
2. application — use cases, and the ports outer levels implement
3. infrastructure | presentation — adapters at the ports (a database gateway, an HTTP client), and the UI, CLI or HTTP handlers; same ring
4. main — wiring that builds the adapters and hands them to the application, and a deep module's entry that wires its levels; dropped when nothing wires

## Rules
<!-- for the reader; the check does not read this section -->
- Dependencies point inward: a file depends on its own level or an inner one. A file of mixed levels counts as its outermost.
- Two levels on the same ring never depend on each other.
- A file names one level; a deep module may hold several.
- Code and tests reach a deep module only through its entry; what is inside it, inner modules too, is private.
- Deep modules nested in one parent, and top deep modules, never depend on each other in a cycle.
- An exception never hides a cycle.

## Exceptions
<!-- a dependency allowed until a version or a date; a line naming one file covers only that file's mixed levels, never its edges -->
- `scripts/dev-server.mjs` → `src/lib/copy/frame.ts` — the dev server knows itself by the page's name, a screen word (v1.2.5)
- `scripts/check-base.mjs` — a command that builds and scans in its own body, beside its wiring (v1.2.5)
- `scripts/data-pin.mjs` — a command that runs git and writes `data.lock` in its own body (v1.2.5)
- `scripts/measure-taps.mjs` — a command that serves `dist/` and drives Chrome in its own body (v1.2.5)
- `scripts/render-assets.mjs` — a command that drives Chrome and writes `public/` in its own body (v1.2.5)
- `scripts/shot.mjs` — a command that drives Chrome and writes `docs/media/` in its own body (v1.2.5)
- `scripts/smoke.mjs` — a command that walks the browser and the dev server in its own body (v1.2.5)
- `src/pages/index.astro` — the page and the wiring of its adapters in one file (v1.2.4)

## Tests
<!-- test file patterns: * within a folder, ** across folders -->
- `tests/**`

## Ignore
<!-- generated files, such as build output -->
- `src/*.d.ts`
- `dist/**`
- `.astro/**`
- `.run/**`
- `docs/**`

## Relations
<!-- association, aggregation or composition, where the code cannot show them -->
