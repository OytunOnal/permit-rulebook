# s24 — the deploy tells Bing what changed

**Status:** approved 2026-09-17 (human: "tamamdır", after the trade was laid
out). No issue; the human's question on reading the Search Console coverage.

## What happened

Bing has verified the site (`public/BingSiteAuth.xml`) and reads the
sitemap on its own clock; one visit has come from it. The site rebuilds
daily and takes several slices a week, and Bing learns of each on its next
crawl. IndexNow is the protocol Bing (with Yandex, Naver and Seznam)
accepts for "these URLs changed" — a public key file at the site's root and
one POST per deploy. No account, no secret, no token.

## What must be true

1. **A key file at the root.** `public/<key>.txt` whose content is the key —
   32 lowercase hex characters, generated once, committed; the key is public
   by IndexNow's design. Its name is the key. Served as `text/plain` (the
   static host does that for `.txt`).
2. **One step after a green deploy**, in `pages.yml`'s `deploy` job after
   the Pages deployment succeeds (or a job of its own that `needs: deploy`):
   read the built `dist/sitemap.xml`, collect every `<loc>`, and POST once
   to `https://api.indexnow.org/indexnow` with
   `{"host":"permitrulebook.com","key":"<key>","keyLocation":"https://permitrulebook.com/<key>.txt","urlList":[…]}`.
   The key is read from the committed file, not typed twice. The step is
   `continue-on-error: true` — a notification must never fail a deploy —
   and prints the HTTP status. Job permissions stay minimal and explicit
   (`tests/pipeline.test.ts` enforces this); no new action, `curl` only.
3. **Only on a real deploy**: not on `workflow_dispatch` previews, not on a
   re-run that deployed nothing — the same conditions that gate the `pin`
   job, minus the data-commit condition.
4. **Recorded where the reader can see it:** `/data/` is not the place (a
   reader does not care); `README.md`'s "How it runs" or the workflow's own
   comment says what is sent and to whom. `docs/spine/threats.md` gains one
   row: the key is public by protocol; the worst a stranger can do with it
   is submit our own URLs.
5. **Nothing else changes.** No page bytes move; no fixture regenerates.

**Corrected 2026-09-17, by the build:** point 3 inherited the `pin` job's
gate, which names only `schedule` and `repository_dispatch`; a slice is a
`push`, and announcing slices was the point — the gate is push, schedule
and dispatch, first attempt only, never `workflow_dispatch`. The URL list
travels as a `build` job output (the only job with `dist/` on disk), not an
artifact — no new action to pin. The daily schedule will announce every
address whether or not the data moved; tolerated by the protocol, and
reversible by gating the scheduled case on `built != locked`.

## How it is proved

- `tests/pipeline.test.ts` green (permissions explicit, actions pinned).
- A test that the key file exists, is 32 hex, and that the workflow reads
  the same filename it posts as `keyLocation` (no second copy of the key).
- After the merge: the deploy's log shows the POST and a `200`/`202`; Bing
  Webmaster Tools → IndexNow lists the submission within a day (the human's
  look, when they like).

## What this slice is not

It is not Bing-specific SEO, not a sitemap change, and not a change to
what Google sees.
