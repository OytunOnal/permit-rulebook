# Cloudflare's traffic counter, copied

`beacon.min.js` here is Cloudflare's code, not this project's: a copy of
Cloudflare Web Analytics' script, fetched from
<https://static.cloudflareinsights.com/beacon.min.js>, the address every page
of the site loads it from. Cloudflare publishes no licence for it.

Only the tests read it. A browser walk that checks what the counter sends
(`trafficCounter: "cloudflare's copy"`, in `tests/record.test.ts` and
`tests/s26.test.ts`) is served this copy inside the browser, so the checks run
on Cloudflare's own code while no test loads the counter from the network.
The copy can drift from the live script; only the live site shows that.

Refresh it by hand with `npm run traffic-counter:refresh`, which fetches the
live script, writes it over the copy and rewrites the date below.

Fetched on 2026-11-23.
