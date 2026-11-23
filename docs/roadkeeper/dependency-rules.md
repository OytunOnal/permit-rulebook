# Dependency rules

## Modules
<!-- a deep module's folder per line, or none; `folder/*` declares every folder directly under it -->
- `scripts/browser`
- `scripts/browser/tab`
- `scripts/browser/walk`
- `scripts/carry-assets`
- `src/lib/country-search`
- `src/lib/dataset-facts`
- `src/lib/frame`
- `src/lib/interview`
- `src/lib/interview/draw`
- `src/lib/interview-history`
- `src/lib/route-page`
- `src/lib/verdict`
- `src/lib/verdict/compose/card`
- `src/lib/verdict/reckon`

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
- `scripts/deploy-finding.mjs` — decides the deploy's finding and words its Kept issue; the words move to `cli-deploy-finding.mjs` in #221 (v1.2.13)
- `scripts/carry-assets/outcome/outcome-lines.mjs` — decides the carry's outcomes and words its log lines; the words move to a CLI file in #221 (v1.2.13)
- `scripts/carry-assets/carry.mjs` — runs the carry and words its digest list's log lines; the words move to a CLI file in #221 (v1.2.13)
- `scripts/data-pin.mjs` — parses and writes the lock's text beside its disk and git calls; one module in #359 (v1.2.9)
- `scripts/clone-shortfall.mjs` — the shortfall's kind rule beside its disk and git calls; one module in #359 (v1.2.9)
- `scripts/smoke.mjs` — walks the pages and words every failure; the words move to `cli-smoke.mjs` in #361 (v1.2.9)
- `scripts/smoke.mjs` → `scripts/browser/browser.mjs` — smoke's words make it presentation beside its infrastructure walk; gone when the words move in #361 (v1.2.9)
- `scripts/smoke.mjs` → `scripts/dev-server.mjs` — the same, for the server it starts (v1.2.9)
- `scripts/smoke.mjs` → `scripts/site-base.mjs` — the same, for the base it reads (v1.2.9)
- `src/pages/index.astro` — draws the interview page's document and wires its ports; a presentation builder in #395 (v1.2.10)

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
- `tests/traffic-counter/beacon.min.js`

## Relations
<!-- association, aggregation or composition, where the code cannot show them -->
- association: `scripts/browser/tab/page/tab-gestures.mjs` → `scripts/browser/tab/page/tab-waits.mjs`
- association: `scripts/browser/tab/page/tab-page.mjs` → `scripts/browser/tab/page/tab-waits.mjs`
- association: `scripts/browser/tab/page/tab-page.mjs` → `scripts/browser/tab/page/tab-gestures.mjs`
- association: `scripts/browser/tab/page/tab-page.mjs` → `scripts/browser/tab/page/tab-events.mjs`
