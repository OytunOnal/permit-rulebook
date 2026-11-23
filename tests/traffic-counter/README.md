# Cloudflare's traffic counter, copied

`beacon.min.js` here is Cloudflare's code, not this project's: a copy of
Cloudflare Web Analytics' script, fetched from
<https://static.cloudflareinsights.com/beacon.min.js>, the address every page
of the site loads it from. Cloudflare publishes no licence for it.

Only the tests read it. A browser walk that checks what the counter sends is
served this copy inside the browser (the walk's `trafficCounter` option,
explained on `Walk` in `scripts/browser/walk/walk-site.mjs`), so the checks run
on Cloudflare's own code while no test loads the counter from the network.
Its users today: `tests/record.test.ts`, `tests/s26.test.ts` and
`tests/walk-site.test.ts`. The copy can drift from the live script; only the
live site shows that.

Refresh it by hand with `npm run traffic-counter:refresh`, which fetches the
live script, writes it over the copy and rewrites the date below.

Fetched on 2026-11-23.
