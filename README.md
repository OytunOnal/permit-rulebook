# Permit Rulebook

**Every route, quoted and dated.**

An open, dated, source-quoted work-permit ruleset for four countries — 23
routes, every value with its official sentence and the day it was read, checked
daily.

**Licence:** MIT ([LICENSE](LICENSE)). The dataset it reads is
[CC BY 4.0](https://github.com/OytunOnal/permit-rulebook-data/blob/master/data/LICENSE) —
use it, cite it, link back.

Permit Rulebook makes no immigration decision and authorities won't consider
these results — it compares published values with what you declare, nothing
more.

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
read, and the language it is written in. Each page also says, in plain words,
what the interview asks of that route and what it does not.

## The data

The rules live in their own repository,
[permit-rulebook-data](https://github.com/OytunOnal/permit-rulebook-data), and
are usable on their own under CC BY 4.0. Every threshold, condition and
statement carries a source URL, a verbatim quote, a retrieval date and its
change history; a value without provenance fails validation and cannot build.
A daily workflow re-reads every source and files an issue when one moves.

Each route page carries the door: **this route as JSON**, the dataset, and the
tracker. Something wrong on a page goes to the
[issue tracker](https://github.com/OytunOnal/permit-rulebook-data/issues/new/choose)
under `bug`, `design-flaw` or `new-need`; how to change a value or add a route
is in that repository's
[CONTRIBUTING.md](https://github.com/OytunOnal/permit-rulebook-data/blob/master/CONTRIBUTING.md).

## Running it

```
npm install       # links ../visa-rules as permit-rulebook-data
npm run dev       # astro dev
npm run build     # astro check && astro build  -> dist/
npm test          # vitest
npm run assets    # re-render the favicon and the social card (needs Chrome)
npm run measure:taps   # measure every control at 390 px on the built site
```

`SITE_URL` sets where the build believes it lives; every absolute URL a link
preview reads follows it. Unset, it uses `https://permitrulebook.com`.

## Layout

- `src/pages/index.astro` — the interview and the results, client-side
- `src/pages/[country]/[route].astro` — one page per route, generated
- `src/pages/[country]/[route].json.ts` — the same route, as data
- `src/lib/route-page.ts` — the whole route page, built as a string so a test
  can read exactly what ships
- `src/lib/copy.ts` — the name, the tagline and the disclaimer, in one place
- `tokens.css` — the design tokens every screen is built inside

## Support

If this is useful and you want it to keep being maintained, sponsorship is
welcome once GitHub Sponsors is enabled on this account. Nothing here is behind
it: the site is free, the data is open, and it stays that way.
