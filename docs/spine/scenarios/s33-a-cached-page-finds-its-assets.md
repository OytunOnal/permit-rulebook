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
than a hop (Security review, 2026-09-23). It reaches the script as an
**environment value**, `CARRY_ORIGIN`, and the deploy's command line is empty:
the step used to splice the variable into argv as `--origin "$SITE_URL"`, and
the script reads any `--name value` as a flag, so `SITE_URL` set to `--dry-run`
made the step write no digest list and exit 0, and set to `--dist=<elsewhere>`
put the list where the artifact does not go — every later deploy then having
nothing to check a byte against, this step permanently off and every deploy
green, from one repository variable (Security review, round 4). A value cannot
be read as a flag. The step also refuses anything that is not an absolute
`http(s)` address. And the step carries **ceilings** the scenario did not ask
for and a hostile page makes necessary: a name of at most 128 characters, a
**page** of at most 512 KB and an **asset** of at most 4 MB (one number for
both let the page inherit an asset's size, and reading names out of a page was
quadratic in how many it held — 76.1 s for a 1 MB page, about twenty minutes at
4 MB, uninterruptible inside the deploy job and reported as nothing; the
reading is linear now and 512 KB of it costs 17 ms), at most 20 **requests**
for assets — counted whether they answer or 404, because counting only the ones
that worked let 400 references cost 401 requests — and a 60-second budget,
which bounds how long the run will **wait on the network** and nothing else,
each overrun printed as not carried, in a list with a bottom to it. Three premises
checked: only `index.html` references `/_astro/` in a fresh build (the other 37
pages: zero) and the two live files are `index.BEnxC2y6.css` (27,533 bytes) and
`index.astro_astro_type_script_index_0_lang.Bev-BElT.js` (243,728 bytes), the
names this scenario predicted — both true; but the live module is served as
**`application/javascript`**, not `text/javascript` as an earlier reading of
this paragraph recorded (measured against `https://permitrulebook.com`,
2026-09-23; the guard accepts either). Then two **deviations**, stated as
deviations rather than as readings of the points they depart from. The first is
from point 3: it asks that what is carried be what the live host served, and
the build cannot honour that out of the HTTP exchange, because framing cannot
attest to a file — three measured holes in the origin's own headers each put a
file of the wrong length on disk under the previous generation's exact name and
reported it carried. That reading is kept in one place, `carry-assets.mjs`'s
header under "What makes a carried byte trustworthy, and what does not", and is
not re-told here or in the tests; what belongs on this record is the decision
and its limit. The decision: each build publishes **`asset-digests.txt`** beside
its page — one line per file it put in `_astro/`, the sha256 and the name — and
the next deploy writes a byte only if it hashes to what the list beside that
page says that name is. The limit, which an earlier wording of this paragraph
overstated and both review axes caught independently: the list arrives from the
same origin, over the same HTTP, unsigned, so it moves the authority out of the
HTTP **framing** and not off the **origin** — measured, an origin serving both
wrote 104,017 arbitrary bytes under the previous generation's exact name with
nothing reported. What it does refuse, all measured: a truncated body, a stale
or foreign object under a known name, an error page answered 200, a truncated
list, an empty body, and a deploy landing between the two requests. The origin
is the trust boundary; the list checks that what crossed it is what that host
had already published under that name. A name the list does not carry is that
name not carried — and only that name: refusing the whole run over one stray
reference left both real assets behind (`/_astro/../../pwn.css` normalises to
`pwn.css`), so the two cases are now separate lines, and it is **none** of the
needed names being listed that means the page and the list are from different
deploys and refuses the run. The request still asks for `identity` and an answer
that declares another encoding is still refused, so what is written is the file
and not an archive of it; the declared length is a backstop that fired zero
times across 13 measured header shapes. The second deviation is from point 5:
"nothing else changes" now has
one exception, the one more file in `dist/` that authority is. It is written by
the carrier step itself, so `npm run build` and `assets:check` are untouched
and both still pass; nothing links to it and nothing but the next deploy reads
it. Two consequences on the record. The first deploy after this merges finds no
list live yet, so it carries nothing that once and publishes the list the
deploy after it reads — **this slice's real-green needs two deploys**. And
because refusing everything and having nothing to do are no longer the same
outcome, the step's last line now says which: the refusal is a `::warning::`
naming what a reader holding the cached page will ask for and not get, still
exit 0, still unable to fail the deploy. Point 4's second test, finally,
asserts the step's **whole block in `pages.yml`, verbatim**, instead of parsing
the YAML — the hand-written parser read only keys at exactly eight spaces, so a
nested `env:` under this step passed all four of its assertions while the step
fetched a foreign host. Over-pinning a deploy step is the deliberate trade: an
edit to it now goes through a deliberate edit to that test, and it retires an
earlier pin of the exact `run` string, which spelled a spelling nobody had
declared. Round 6 then corrected four things this step was **claiming**. A
reference counts as one of this deploy's assets only when it **resolves to**
the URL the step would build for its name, base path and all: reducing it to a
basename let `/_astro/../real.css` score as "already in this build" against
`dist/_astro/real.css` — `0 carried, 1 already in this build, 0 left behind`,
no annotation, and a reader 404ing on `/real.css` — and let a root-absolute
`/_astro/old.css` on a subpath origin be fetched from under the base and
reported carried for a URL the deploy will never serve. Nothing escaped
`dist/_astro/` in either: what was lost was the alarm. Such a reference is now
neither fetched nor counted, and it is annotated for what it is, a URL the
reader asks for and does not get. The parse that clears the fragment and the
query clears the **credentials** too — `CARRY_ORIGIN=http://user:s3cr3t@host/`
echoed the secret four times, once onto the run summary, for a fetch undici
refuses anyway. A 200 page referencing **none** of this deploy's assets is
annotated instead of being granted the silence of a healthy deploy: ours always
names two, and a step that validated nothing should not sound like one that
found nothing wrong. And a **failed digest publish** is an annotation rather
than a plain line, because on a deploy whose page names are all already built
it read exactly like a healthy run while the next deploy was guaranteed to
carry nothing. One further **narrowing** belongs on this record, of point 1,
which the two deviations above are the model for: point 1 asks for the
`/_astro/…` names the live page **references**, and what this step reads is
**a quoted string with no whitespace in it and `/_astro/` inside, wherever the
page holds one** (the two quote marks need not be the same one, so `"…'` is
read as readily as `"…"`) — the shapes Astro emits are what that covers and
why it is drawn there, but it is not a rule about attributes and an earlier wording here
called it one. It errs in both directions, and the second is the one this
record was silent about. Narrow: a name a page holds any other way is not
seen, so it is not carried and nothing says so — measured, round 7, the reader
is blind to `/_ASTRO/x.css`, `/_astro%2Fx.css`, a bare relative
`_astro/x.css`, `/_astro\x.css` and a reference with a tab in it, three of
which a browser resolves to one of this deploy's real assets. Wide: because it
knows nothing about markup, a `/_astro/` name held in an HTML comment or in an
inline script string is read exactly as a `href` is (measured, round 9), so an
old name left in either reaches `needed`. What it costs there turns on the live
`asset-digests.txt`, and the two halves are exclusive (measured, 2026-09-23). A
name the live deploy no longer publishes is not in that list, and the carry
loop filters `needed` against the list before a request is counted, so such a
name spends **none** of the twenty requests, draws the refusal line saying the
list does not name it, and raises the `::warning::` saying a reader holding
that page asks for it and gets a 404 — for a URL no reader will ever ask for.
That annotation is the **false** alarm, on the one line this step exists to
make trustworthy, and it is the cost of the narrowing in the direction the
alarm is loudest. A name the list still carries does spend one of the twenty,
and is then carried: a wasted request and nothing else, no line and no
annotation. Our own pages hold no such string, and what would tell either from
a real reference is the same HTML parser the narrowing declines. The narrowing is
deliberate —
honouring what a browser resolves means `<base href>`, character references,
`srcset` and CSS `url()`, and half a browser reads strings no reader asks for
while still missing the ones it cannot parse — and it is declared here rather
than left to the code and to the `pipeline.test.ts` case that pins it, because
that case reads **this build's** `dist/index.html` while the step reads the
**live** page: it cannot go red for a live page whose reference shapes differ
from what this build emits, which is exactly the page the "references none of
this deploy's assets" annotation exists for.

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
