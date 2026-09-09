# Permit Rulebook

[![The results screen: three German routes open, each rule answered against what
the reader declared, every value carrying the authority's quote and the day it
was read](docs/media/results-2026-09-08.png)](https://permitrulebook.com)

**Every route, quoted and dated.** A person answers a few questions and
[permitrulebook.com](https://permitrulebook.com) shows which work-permit routes
across Germany, France, Spain and the Netherlands fit them, which are close by
how much, and what one step would open more — every number carrying the
authority's own sentence and the day it was read. The rules themselves live in
a repository of their own —
**[permit-rulebook-data](https://github.com/OytunOnal/permit-rulebook-data)**,
open data under CC BY 4.0: every route as JSON, every value with its quote,
its source page and its read date, and the daily watch that re-reads all of
them. This repository is the site; that one is the ruleset.

**Who it is for.** Someone weighing a move to one of those four countries who
wants the rules rather than an opinion — and anyone who needs the ruleset
itself.

**What it does now** — the latest line of the versions ledger
([KANBAN.md](KANBAN.md), `## versions`):

> **v0.10** — Launch-readiness sweep: Spain measured against three years on
> two routes (es-highly-qualified, es-ict); the experience ladder made ordinal
> (y3in7 implies y2in5) after the review caught a regression the guard could
> not see; pdf-text watch strategy — human tier 0, quotes verified 78 → 120;
> 37 bare preconditions given a kind (34 sourced, 2 ours, 1 deleted as
> repealed law); every document on disk English. Real-green walked by the
> session at the human's delegation. 323 + 70 tests. (2026-09-07)

**How to run it.** Both repositories side by side — the site reads the dataset
package from the sibling directory its manifest names. Tried from a fresh clone
on 2026-09-08:

```
git clone https://github.com/OytunOnal/permit-rulebook-data.git visa-rules && git clone https://github.com/OytunOnal/permit-rulebook.git && cd visa-rules && npm ci && npm run build && cd ../permit-rulebook && npm ci && npm run build
```

Then `npm run dev` for the site, `npm test` for the suite.

**Feedback.** A wrong value, a route that is missing, a screen that misleads:
the [issue tracker](https://github.com/OytunOnal/permit-rulebook-data/issues/new/choose),
under `bug`, `design-flaw` or `new-need`.

**Licence.** Code MIT ([LICENSE](LICENSE)); the dataset it reads is
[CC BY 4.0](https://github.com/OytunOnal/permit-rulebook-data/blob/master/data/LICENSE) —
use it, cite it, link back. [Sponsor this
work](https://github.com/sponsors/OytunOnal) — small, optional, and not what
the site runs on.

## What it is

A static site with no backend. It asks a person a few questions, compares their
answers against published official rules, and shows what fits, what is close,
and which single step would change that. Nothing they answer leaves their
device: the evaluation runs in the browser, there is no server to send it to,
and the record is kept in the browser's own storage or not at all.

Beside the interview there is a page for every route in the dataset, at
`/{country}/{route}` — `/germany/eu-blue-card-general` and twenty-two others.
A route page describes the rules and never rules on the reader: every number on
it is the authority's own sentence, with the page it came from, the day it was
read, and the language it is written in. Each one carries its own door to the
data: **this route as JSON**, at `/{country}/{route}.json`, beside the dataset
and the tracker.

Permit Rulebook makes no immigration decision and no authority is bound by
these results — it compares published values with what you declare, nothing
more.

## How it is put together

The shape of the two repositories, the boundary between them and what crosses
it: [docs/spine/ARCHITECTURE.md](docs/spine/ARCHITECTURE.md).

- `src/pages/index.astro` — the interview and the results, client-side
- `src/pages/[country]/[route].astro` — one page per route, generated
- `src/lib/route-page.ts` — the whole route page, built as a string so a test
  can read exactly what ships
- `src/lib/copy.ts` — the name, the tagline and the disclaimer, in one place
- `tokens.css` — the design tokens every screen is built inside

The rest of the commands, and what each is for:

```
npm run dev            # astro dev
npm test               # vitest — includes the browser-driven cases
npm run smoke          # load the real pages in a real browser, dev and dist
npm run measure:taps   # every control at 390 px on the built site
npm run check:base     # build under a subpath and read every link back
npm run assets         # re-render the favicon and the social card (needs Chrome)
```

`SITE_URL` sets where the build believes it lives; every absolute URL a link
preview reads follows it. Unset, it uses `https://permitrulebook.com`.

## The data

The rules live in their own repository and are usable on their own under
CC BY 4.0. Every threshold, condition and statement carries a source URL, a
verbatim quote, a retrieval date and its change history; a value without
provenance fails validation and cannot build. A daily workflow re-reads every
source and files an issue when one moves. How to change a value or add a route
is in that repository's
[CONTRIBUTING.md](https://github.com/OytunOnal/permit-rulebook-data/blob/master/CONTRIBUTING.md).

## Support

If this is useful and you want it to keep being maintained, [sponsorship is
welcome](https://github.com/sponsors/OytunOnal). Nothing here is behind
it: the site is free, the data is open, and it stays that way.
