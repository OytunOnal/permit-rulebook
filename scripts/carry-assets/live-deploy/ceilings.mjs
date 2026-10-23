// @level domain
/**
 * What one origin may make this step do.
 *
 * A name is bounded where names are read, in `generation/asset-names.mjs`. A
 * page is at most 512 KB and an asset at most 4 MB — two ceilings, because
 * they bound two different things: how much text is read for names, and how
 * large a file may be written. A run asks the origin for at most 20 assets,
 * counted whether they answer or 404, so a page of dead references costs
 * twenty requests against our own origin and no more. The log is bounded for
 * the same reason the network is, and how is `scripts/log-wording.mjs`'s.
 *
 * Today the page is 11,569 bytes and names two assets of 27 KB and 244 KB, so
 * these are the orders of magnitude above what the site actually is.
 *
 * `MAX_ASSETS` counts requests, not files carried, so a reference that fails
 * costs one of the twenty like one that works. The page is one request on top
 * of that, always; the digest list is one more, and only when there is
 * something to carry — the flow ends before fetching it when this build
 * already has everything the live page names.
 *
 * A `/_astro/` name a page holds in a comment or a script string, which
 * `readAssetNames` reads as readily as a reference, reaches `needed` all the
 * same. What it costs there turns on the live `asset-digests.txt`, and the
 * two halves are exclusive. A name the live deploy no longer publishes is not
 * in that list, and the carry loop filters `needed` against the list BEFORE
 * `asked` is incremented — so such a name spends NONE of the twenty requests,
 * draws the refusal line saying the list does not name it, and raises the
 * annotation that says a reader holding this page gets a 404. That annotation
 * is the FALSE alarm, on the one line the carry exists to make trustworthy. A
 * name the list still carries does spend one of the twenty, and is then
 * carried: a wasted request and nothing else, no line and no annotation.
 *
 * `MAX_LIST_BYTES` is the same idea one file down: today's list is a 33-byte
 * header and two lines of 85 and 121 bytes, and 64 KB holds five hundred more
 * of the longer one.
 */
export const MAX_ASSETS = 20;
export const MAX_PAGE_BYTES = 512 * 1024;
export const MAX_ASSET_BYTES = 4 * 1024 * 1024;
export const MAX_LIST_BYTES = 64 * 1024;
