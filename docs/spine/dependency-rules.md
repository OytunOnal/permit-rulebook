# Dependency rules

## Modules
<!-- a deep module's folder per line, or none; `folder/*` declares every folder directly under it -->
- `scripts/carry-assets`
- `src/lib/country-search`
- `src/lib/interview`
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
- `.claude/**`

## Relations
<!-- association, aggregation or composition, where the code cannot show them -->
- association: `scripts/tab-gestures.mjs` → `scripts/tab-waits.mjs`
