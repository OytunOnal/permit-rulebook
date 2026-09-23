# s33 — a cached page still finds its assets

**Status:** proposed 2026-09-23. v1.2 queue head; the human's option A of three
("tamamdır", 2026-09-23), from the chase of metric 6.

## What happened

`/` is served with `Cache-Control: max-age=600` — GitHub Pages' own header,
which we do not set — so a reader's browser (and any proxy between) may hold
the page for ten minutes. The two files that page needs are content-hashed:
`/_astro/index.<hash>.css` (27 KB) and `/_astro/index.…<hash>.js` (244 KB,
the interview). Every deploy that changes either one publishes a **new name**
and the previous file leaves the tree.

So a reader who loaded `/` and returns inside those ten minutes asks for two
files that are no longer there. Verified on the live host, 2026-09-23:

```
/_astro/index.CpGG1ZDr.css   404      (the s31 build's stylesheet)
/_astro/index.BcmUcb7-.css   404      (the s30 build's)
/_astro/index.qYLZ_mcb.js    404      (an earlier module)
```

What that reader sees: an unstyled page whose interview never runs. The
window the last reading covers carried about ten deploys, and the two odd
pageviews in it (LCP 4.4 s, INP 2,176 ms, CLS 0.181) have that shape —
unproven as the cause, and not the reason this slice exists. The reason is
the 404s.

Only `/` carries external assets: the route pages, the country pages,
`/data/`, `/feedback/` and the 404 are self-contained (`grep -c _astro` = 0
on each). The whole exposure is one page and two files.

## What must be true

1. **The deploy carries the previous generation forward.** In `pages.yml`'s
   build job, after the build and its checks and before the artifact is
   uploaded: read the **live** `https://permitrulebook.com/`, take the
   `/_astro/…` names it references, and for each one the fresh `dist/` does
   not already have, download it into `dist/_astro/`. One generation: the
   step reads what is live now, so the next deploy keeps only what this one
   published.
2. **It never fails the deploy and it says what it did.** A fetch that
   times out, 404s or returns something that is not an asset leaves the
   build untouched and prints one line naming what it could not carry
   (`continue-on-error` semantics, or an explicit guard — the builder picks
   and says which). No new action: `curl` and the shell, as the IndexNow
   step does. Job permissions unchanged.
3. **What is carried is what the live host served.** Each carried file's
   sha256 is printed beside its name, and the step refuses to write a file
   whose response was not `200` with a `content-type` of CSS or JavaScript.
   A carried file is never rewritten, minified or renamed.
4. **The invariant is pinned, not assumed.** A test asserts that the set of
   built pages referencing `/_astro/` is exactly `{ /index.html }` — the day
   a second page gains a bundle, that test goes red and this step has to
   widen. A second test asserts the step's shape in `pages.yml`: it runs in
   the build job before `upload-pages-artifact`, uses no new action, and
   cannot fail the job.
5. **Nothing else changes.** The artifact is still `site/dist`; the data pin,
   the IndexNow job, the tests and the pages themselves are untouched.

**Corrected 2026-09-23, by the build:** point 2 named the mechanism as "`curl`
and the shell, as the IndexNow step does", which this scenario's own proof
section contradicts: it asks for `scripts/carry-assets.mjs` *"so it can be
tested without a deploy"*. A shell body inside a workflow step has no unit —
the guards that make this step safe would be unasserted shell, proved by
reading the YAML rather than by running it. The constraint point 2 is actually
protecting is "no new action", and a node script satisfies it: the build job
already has node, the step is `run: node scripts/carry-assets.mjs`, and it adds
no `uses:`, no token and no permission. Three things point 2 and point 3 left
to the builder, stated here. The guard is **explicit, not
`continue-on-error`** — the script catches every failure itself, installs
`uncaughtException` and `unhandledRejection` handlers for whatever it did not,
and exits 0 on every path, so there is nothing for the workflow to catch and a
crash cannot hide behind a shell `||`. The origin is **`$SITE_URL`**, read as
given and never the host root, because without a custom domain the site is
served from a subpath — and it is the ONLY host this step fetches from: a name
comes out of the live HTML but the URL is built from that origin, a reference
to another host or scheme is refused by name, and a redirect is an error rather
than a hop (Security review, 2026-09-23). And the step carries **ceilings** the
scenario did not ask for and a hostile page makes necessary: a name of at most
128 characters, a body of at most 4 MB, at most 20 assets, and 60 seconds for
the whole run, each overrun printed as not carried. Three premises checked:
only `index.html` references `/_astro/` in a fresh build (the other 37 pages:
zero) and the two live files are `index.BEnxC2y6.css` (27,533 bytes) and
`index.astro_astro_type_script_index_0_lang.Bev-BElT.js` (243,728 bytes), the
names this scenario predicted — both true; but the live module is served as
**`application/javascript`**, not `text/javascript` as an earlier reading of
this paragraph recorded (measured against `https://permitrulebook.com`,
2026-09-23; the guard accepts either).

## How it is proved

- Unit: the carrier is a small script (`scripts/carry-assets.mjs`) so it can
  be tested without a deploy — given a fixture HTML naming two assets and a
  `dist/` holding one of them, it fetches exactly the missing one, writes it
  byte-identical, and on a 404 or a wrong content type it writes nothing and
  returns a line saying so.
- `tests/pipeline.test.ts`: the two assertions of point 4.
- After the merge, on the live host: the assets the site serves **today**
  (`index.BEnxC2y6.css`, `index.astro_…Bev-BElT.js`) still answer `200`
  after this slice's own deploy — that is the real-green, and it is the
  first time the window is closed rather than argued about.

## What this slice is not

It is not a caching change (we cannot set headers on GitHub Pages), not a
move behind a proxy (option B, declined today), and not a second generation:
two deploys inside ten minutes still leave the older reader broken, and that
limit is on the record.
