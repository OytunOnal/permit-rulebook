/**
 * Carry the live site's assets forward, so a cached page still finds them.
 *
 * This file is where the reason is written down for the code: the workflow step
 * and the two test files point here rather than repeat it.
 *
 * GitHub Pages serves `/` with `Cache-Control: max-age=600` — its header, not
 * ours, and not one we can change on this host. So a reader's browser, and any
 * proxy between, may hold the page for ten minutes. The two files that page
 * needs are content-hashed: every deploy that changes either one publishes a
 * new name and the previous file leaves the tree. A reader who returns inside
 * those ten minutes asks for files that are no longer there — an unstyled page
 * whose interview never runs. Measured on the live host 2026-09-23:
 * `/_astro/index.CpGG1ZDr.css`, `/_astro/index.BcmUcb7-.css` and
 * `/_astro/index.qYLZ_mcb.js` all answered 404.
 *
 * This reads the page the site is serving RIGHT NOW, takes the `/_astro/`
 * names it references, and copies into the fresh `dist/` the ones this build
 * did not produce. One generation, deliberately: the step reads what is live,
 * so the next deploy keeps only what this one published. Two deploys inside
 * ten minutes still leave the earliest reader broken, and that limit is on the
 * record (s33).
 *
 * It runs inside a deploy, which decides everything else about it.
 *
 * It cannot fail the build. Not "does not": every failure — a refused socket,
 * a body that stops mid-stream, a directory it cannot write, a name the
 * filesystem rejects — is caught and printed, the last two handlers catch what
 * nothing else did, and the process exits 0 on every path (Security and Spec
 * review, 2026-09-23: the first cut promised this and exited 1 on three of
 * them).
 *
 * ## Where the address comes from
 *
 * From the environment, in `CARRY_ORIGIN`, and from nowhere else.
 *
 * It used to come from `argv`. `pages.yml` ran
 * `node scripts/carry-assets.mjs --origin "$SITE_URL"`, and `flag()` at the
 * bottom of this file reads any `--name value` or `--name=value` — so the one
 * repository variable that decides this site's address was a step away from
 * being a flag instead. Measured with that step's exact argv (Security review,
 * round 4): `SITE_URL=--dry-run` printed `would publish asset-digests.txt`,
 * wrote no list and exited 0; `SITE_URL=--dist=<another directory>` put the
 * list in that directory while the real `dist/` shipped without one. Either
 * ships an artifact with no `asset-digests.txt` in it, so every LATER deploy
 * has nothing to check a carried byte against and carries nothing — this step
 * permanently off, the deploy green, from a value no code review reads. It is
 * the `--budget-ms` failure mode the flag reader's own comment says was
 * removed, reached from a repository variable instead.
 *
 * A value cannot become a flag, so the address travels as a value. `--dist`
 * and `--dry-run` stay: they are the surface a test and a person at a terminal
 * drive this by, and nothing in a deploy passes them. The deploy passes no
 * argv at all, and `tests/pipeline.test.ts` pins the step's whole block, that
 * empty command line included.
 *
 * There is no built-in fallback address. An origin this was not given is an
 * origin it does not have: it says so and carries nothing, rather than
 * quietly reaching for production from somebody else's build.
 *
 * It fetches only from the origin it was given. A name comes out of the live
 * HTML, but the URL is always built here, from that origin — a reference to
 * another host, a protocol-relative one or a plaintext one is refused by name
 * and never fetched, and a redirect is an error rather than a hop, so nothing
 * the page says can make this reach a host nobody chose.
 *
 * ## What a page may cost this build
 *
 * A name is at most 128 characters. A page is at most 512 KB and an asset at
 * most 4 MB — two ceilings, because they bound two different things and one
 * number for both is how the first became untrue. A run asks the origin for at
 * most 20 assets, and whatever is left over is printed as not carried, in a
 * bounded list, because a page that names four hundred files must not become
 * four hundred lines in a deploy's log.
 *
 * `BUDGET_MS` bounds how long this will WAIT ON THE NETWORK: it sizes request
 * timeouts and it does nothing else, so a run that never waits can no more be
 * interrupted by it than a run that waits forever can outlast it. Everything
 * in this step that is not a request has to be cheap enough that this is not a
 * lie, and one thing was not: reading the names out of a page was quadratic in
 * how many distinct names the page held, and ran to completion after the body
 * was in hand, with nothing checking a clock. Measured on the real export
 * against a raw origin, 2026-09-23 (Security review, round 4): a 1,024,001-byte
 * page — a quarter of the 4 MB ceiling a page then had — took 76.1 s with a
 * 5,000 ms budget and reported no problem at all, and the curve was clean
 * (128 KB → 1.6 s, 256 KB → 9.6 s, 512 KB → 31.3 s), so the ceiling itself was
 * about twenty minutes of uninterruptible CPU inside a deploy job. With
 * `cancel-in-progress: false` on the workflow's concurrency group, the next
 * deploy queues behind it. Reproduced here at the same shape before the
 * repair: a page of distinct names took 0.37 s at 128 KB, 1.52 s at 256 KB,
 * 6.13 s at 512 KB and 25.5 s at 1 MB.
 *
 * The reading is linear now, and the page has a ceiling that is true of it:
 * 512 KB of names reads in 17 ms, and 512 KB is forty-four times today's
 * `index.html` (11,569 bytes). What remains uninterruptible is milliseconds.
 *
 * ## What makes a carried byte trustworthy, and what does not
 *
 * This section is the one place that reading is written down. The tests and
 * the scenario point at it; neither repeats it.
 *
 * Not the HTTP exchange. An origin declares its own `content-length`, so every
 * guard built on that declaration is the origin vouching for itself: measured
 * on the real process against raw-socket origins, 2026-09-23, an answer with
 * no `content-length`, one that declared less than it sent, and
 * `content-length: 0` each put a file of the wrong length on disk under the
 * previous generation's exact name, reported carried, exit 0.
 *
 * So the authority moved to something our own build made. Every build
 * publishes `asset-digests.txt` beside its page — one line per file it put in
 * `_astro/`, the sha256 and the name — and the next deploy writes a byte only
 * if it hashes to what the list published beside that page says that name is.
 *
 * Now be exact about what that buys, because an earlier wording here claimed
 * more, and two review axes arrived at the same objection independently (round
 * 4). The list comes from the same origin as the page, over the same HTTP,
 * unsigned. It moves the authority out of the HTTP FRAMING. It does not move
 * it off the ORIGIN, and it cannot: measured, an origin serving both wrote
 * 104,017 arbitrary bytes under the previous generation's exact name and this
 * step reported no problem — as it must, because a list we have no way to
 * authenticate says whatever the host that serves it says.
 *
 * What the list does refuse, each measured on the real process: a body
 * truncated in transit, whatever its headers declared; a stale or foreign
 * object served under a name from another generation; an HTML error page
 * answered 200 under an asset's name; a list truncated in transit; an empty
 * body; and a deploy landing between the page request and the list request,
 * which leaves the two describing different generations. Those are the
 * failures this step actually meets — a CDN edge, a proxy, a half-finished
 * deploy — and every one of them ends in one file not carried rather than in a
 * wrong file published under a name the deploy swears by.
 *
 * What it cannot refuse is the origin itself. If the live host serves hostile
 * bytes under a name it also lists, this carries them into the next deploy —
 * and so does every reader's browser, from that same host, with no help from
 * us. The origin is the trust boundary. The list is the check that what
 * crossed it is what that host had already published under that name.
 *
 * The page and the list are published together and fetched together, so they
 * describe the same deploy. When the list describes NONE of the names the page
 * still needs, they are from different deploys and there is nothing here to
 * check any byte against: the run is refused whole and says THAT is why, in
 * words that are not "nothing to carry". When it describes some of them, the
 * ones it does not name are the ones not carried — one stray reference in a
 * page this step does not own is not a reason to leave the real assets behind
 * (Security review, round 4: `/_astro/../../pwn.css` normalises to `pwn.css`,
 * which no list of ours carries, and both real assets were left behind).
 *
 * The first deploy after this was merged finds no list live yet and carries
 * nothing that once, publishing the list the deploy after it reads.
 *
 * ## The guards this file actually performs
 *
 * Written out because a header that claims a guard the code does not run is
 * worse than no header (Standards review, round 3):
 *
 *  - the status is 200, the content type is CSS or JavaScript, and the body is
 *    not empty — each refused here, by name;
 *  - the body hashes to the digest our previous build published for that name;
 *  - the request asks for `identity` and an answer that DECLARES another
 *    encoding is refused: fetch would decompress it, and what is written must
 *    be the file rather than an archive of it. Measured 2026-09-23, and this
 *    file is where that reading is kept: answered gzip, a 104,000-byte asset
 *    came back declaring 14,192 bytes, and the same asset declared at 40 bytes
 *    decoded to 14,192 with no error at all — the declaration describing the
 *    transfer while the bytes are the file. An answer that LIES about its
 *    encoding declares nothing to refuse it by, and is caught by the digest;
 *  - the declared length, when there is one, must be the number of bytes read.
 *    A backstop behind undici's own enforcement, which throws first, and it
 *    has never fired: instrumented across 13 header shapes, 2026-09-23, zero
 *    hits. It stays because it costs a comparison and the day undici's
 *    behaviour changes it is the line that notices.
 *
 *   CARRY_ORIGIN=<url> node scripts/carry-assets.mjs  # the live site into ./dist
 *   node scripts/carry-assets.mjs --dist <dir>        # which build to fill
 *   node scripts/carry-assets.mjs --dry-run           # fetch and report, write nothing
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The environment variable the live site's address arrives in — the header's
 * "Where the address comes from" is why it is an environment variable and not
 * a flag. `pages.yml` sets it from `SITE_URL`, the one place this site's
 * address is decided, and that is the only edge that sets it in a deploy.
 */
const ORIGIN_VAR = "CARRY_ORIGIN";

/**
 * The digest list: what this build published, so the next deploy can tell a
 * carried file from a story about one.
 *
 * It sits beside the page rather than in `_astro/`, because it is not an asset
 * and nothing hashes it. Its first line is fixed so that an HTML error page, a
 * proxy's notice or a truncated transfer cannot be read as a list — the name
 * and the content type an origin puts on a response are the same word of the
 * same stranger this file already refuses to take at face value.
 */
const DIGESTS_NAME = "asset-digests.txt";
const DIGESTS_HEADER = "permit-rulebook asset digests v1";

/**
 * A slow host must not hold a deploy open. Ten seconds per request is long
 * enough for a cold CDN edge, and sixty for the whole run is the ceiling on
 * how long a silent origin can cost this build.
 *
 * The two are deliberately not multiplied out: twenty requests at ten seconds
 * each would be two hundred, so on a slow origin it is this budget and not the
 * asset ceiling that ends the run — early, and saying which names it did not
 * reach. Today's page names two assets, and a healthy host answers both in
 * well under a second.
 */
const TIMEOUT_MS = 10_000;
const BUDGET_MS = 60_000;

/**
 * What one origin may make this step do. Today the page is 11,569 bytes and
 * names two assets of 27 KB and 244 KB; these are the orders of magnitude
 * above that, so a page that has been tampered with cannot turn a deploy into
 * a download — or, at `MAX_PAGE_BYTES`, into a parse (see the header).
 *
 * A page and an asset get ceilings of their own because they bound different
 * things: how much text is read for names, and how large a file may be written.
 * One number for both meant the page inherited an asset's 4 MB, which is what
 * made twenty minutes of parsing reachable (Security review, round 4).
 *
 * `MAX_ASSETS` counts requests, not files carried: four hundred references
 * that all 404 used to cost four hundred requests against our own origin,
 * because nothing that failed counted towards the ceiling (Security review,
 * 2026-09-23). The page is one request on top of that, always; the digest list
 * is one more, and only when there is something to carry — `carryAssets`
 * returns before fetching it when this build already has everything the live
 * page names, and `getAssetDigests` says the same thing in its own words.
 *
 * `MAX_LIST_BYTES` is the same idea one file down: today's list is a 33-byte
 * header and two lines of 85 and 121 bytes, and 64 KB holds five hundred more
 * of the longer one.
 */
const MAX_NAME = 128;
const MAX_ASSETS = 20;
const MAX_PAGE_BYTES = 512 * 1024;
const MAX_ASSET_BYTES = 4 * 1024 * 1024;
const MAX_LIST_BYTES = 64 * 1024;

/**
 * The only shape of name that may become a path under `dist/_astro/`, be
 * written into the digest list, or be read back out of it — one rule, spelled
 * once, because a name the list can hold and the carrier would refuse (or the
 * other way round) is a hole between two spellings of the same idea.
 *
 * Spelled once means the STRING below, not two regexes that look alike: they
 * were two, and they diverged — `.` and `..` were excluded by a line of
 * JavaScript beside the first one only, so a list line naming `..` parsed
 * while the page's reader refused the same string (Standards review, round 4).
 * The exclusion is in the pattern now, so both ends hold it or neither does.
 */
const NAME_PATTERN = `(?!\\.\\.?$)[A-Za-z0-9._-]{1,${MAX_NAME}}`;
const PLAIN_NAME = new RegExp(`^${NAME_PATTERN}$`);
/** One line of the list: a sha256, two spaces, a name — `sha256sum`'s shape. */
const DIGESTS_LINE = new RegExp(`^([0-9a-f]{64}) {2}(${NAME_PATTERN})$`);

/**
 * What may be written into `dist/_astro/`. A host that has lost a file answers
 * `200` with an HTML page saying so — writing that over a stylesheet would
 * break the very deploy this step exists to save.
 */
const CARRIABLE = /^(?:text\/css|text\/javascript|application\/javascript|application\/ecmascript|text\/ecmascript)$/;

/**
 * Some names as one line, with a bottom to it. A page that names four hundred
 * files would otherwise be four hundred lines in a deploy's log, which is the
 * same thing as no log at all.
 */
const boundedList = (names) => (names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`);

/** An error as a sentence, with the cause `fetch failed` always hides. */
const say = (e) => {
  const message = e instanceof Error ? e.message : String(e);
  const cause = e instanceof Error && e.cause instanceof Error ? e.cause.message : "";
  return cause && !message.includes(cause) ? `${message} (${cause})` : message;
};

/** The sha256 of some bytes, as the digest list spells it. */
const digestOf = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * Publish what this build built, so the deploy after this one can check the
 * bytes it fetches against something we made rather than against the origin's
 * own headers.
 *
 * It describes this build's OWN assets: it runs before anything is carried, so
 * a file carried from the previous generation is not in it. That is what keeps
 * the chain one generation long, the same way the step itself is.
 *
 * A name this file's own reader would refuse is left out rather than written:
 * one unparseable line would cost the next deploy the whole list. Astro has
 * never produced one.
 *
 * Returns what happened; it throws nothing, because it is called from a step
 * that may not fail.
 */
export function writeAssetDigests(dist) {
  try {
    const dir = join(dist, "_astro");
    const names = existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && PLAIN_NAME.test(entry.name))
        .map((entry) => entry.name)
        .sort()
      : [];
    const lines = [DIGESTS_HEADER, ...names.map((name) => `${digestOf(readFileSync(join(dir, name)))}  ${name}`)];
    writeFileSync(join(dist, DIGESTS_NAME), `${lines.join("\n")}\n`);
    return { ok: true, count: names.length };
  } catch (e) {
    return { ok: false, why: say(e) };
  }
}

/**
 * Read a digest list, strictly.
 *
 * Strictly, because this is the one input that decides what may be written: a
 * line that is not a sha256 and a name fails the whole list rather than being
 * skipped, so a transfer cut mid-line refuses the run instead of shrinking it.
 * A cut that lands exactly on a line boundary parses — and is caught one step
 * later, by a page that names something the list no longer does.
 */
function readAssetDigests(text) {
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (lines[0] !== DIGESTS_HEADER) return { ok: false, why: `does not begin "${DIGESTS_HEADER}"` };
  const digests = new Map();
  for (let i = 1; i < lines.length; i += 1) {
    const line = DIGESTS_LINE.exec(lines[i]);
    if (!line) return { ok: false, why: `line ${i + 1} is not a sha256 and a name` };
    if (digests.has(line[2])) return { ok: false, why: `names ${line[2]} twice` };
    digests.set(line[2], line[1]);
  }
  return { ok: true, digests };
}

/**
 * Read the asset names a page asks for — names only.
 *
 * The reference's own URL is never fetched and never returned: the live HTML is
 * a stranger's string, and the one thing taken from it is a file name, which
 * the caller turns back into a URL under the origin IT chose. A reference that
 * points at another host, at another scheme, or at no name this filesystem
 * would accept is refused by name and reported (Security review, 2026-09-23 —
 * `https://evil.example/_astro/pwn.js`, `//evil.example/…` and `http://…` all
 * reached the network through the first cut).
 */
export function readAssetNames(html, pageUrl) {
  const ours = new URL(pageUrl).origin;
  // Both sets, and both for the same reason: a page is allowed to name the
  // same thing as often as it likes, and answering "have I seen this?" by
  // walking what has been kept so far is quadratic in how many distinct names
  // the page holds. `names.includes` here cost 25.5 s on a 1 MB page and had
  // no clock on it — the header's "What a page may cost this build" is the
  // measurement. Order is kept because the log reads better in the page's own
  // order, so the set is the membership test and the array is the answer.
  const names = [];
  const kept = new Set();
  const refused = [];
  const seen = new Set();
  for (const [, ref] of html.matchAll(/["']([^"'\s]*\/_astro\/[^"'\s]*)["']/g)) {
    if (seen.has(ref)) continue;
    seen.add(ref);
    let url;
    try { url = new URL(ref, pageUrl); } catch { refused.push({ ref, why: "is not a URL" }); continue; }
    if (url.origin !== ours) { refused.push({ ref, why: `names ${url.origin}, which is not this site` }); continue; }
    const name = url.pathname.split("/").pop() ?? "";
    if (name.length > MAX_NAME) { refused.push({ ref: name.slice(0, 40) + "…", why: `is longer than ${MAX_NAME} characters` }); continue; }
    // Only a plain file name may become a path under `dist/_astro/` — the one
    // rule, which `.` and `..` fail inside the pattern rather than beside it.
    if (!PLAIN_NAME.test(name)) { refused.push({ ref, why: "is not a plain file name" }); continue; }
    if (kept.has(name)) continue;
    kept.add(name);
    names.push(name);
  }
  return { names, refused };
}

/**
 * Fetch, with every failure a sentence rather than a stack, and a redirect a
 * failure rather than a hop: following one would walk off the origin this step
 * is allowed to read.
 *
 * `identity`, because this step writes what arrives: see the header. It is a
 * request, not a guarantee — what to do with an answer that ignores it is
 * `bodyWithin`'s, and what to do with one that lies about it is the digest's.
 */
async function get(url, timeoutMs) {
  if (timeoutMs <= 0) return { ok: false, why: "the run's time budget was already spent" };
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "error",
      headers: { "accept-encoding": "identity" },
    });
    return { ok: true, response };
  } catch (e) {
    return { ok: false, why: say(e) };
  }
}

/**
 * The body, or the reason there isn't one — read in chunks and abandoned the
 * moment it passes the ceiling, so an endless response is the origin's problem
 * and not the build's. A body that stops mid-stream throws here and nowhere
 * else.
 *
 * An answer that declares an encoding is refused unread: `get` asked for
 * `identity`, and fetch decompresses anything that comes back anyway, so what
 * would be written is an unpacking of the file rather than the file. Refusing
 * costs one printed line and the previous generation of one file.
 *
 * The declared length is checked against what was read, and the header says
 * what that check is worth: it is a backstop behind undici's own enforcement,
 * and it has never fired. Nothing here decides that a body is the right file —
 * only its digest does.
 */
async function bodyWithin(response, limit) {
  const encoding = (response.headers.get("content-encoding") ?? "").trim().toLowerCase();
  if (encoding && encoding !== "identity") return { ok: false, why: `arrived ${encoding}-encoded, which is not the bytes the page asks for` };

  const header = response.headers.get("content-length");
  const declared = header === null ? Number.NaN : Number(header);
  const promised = Number.isFinite(declared) && declared >= 0;
  if (promised && declared > limit) return { ok: false, why: `declares ${declared} bytes, over the ${limit}-byte ceiling` };

  const chunks = [];
  let total = 0;
  if (response.body) {
    try {
      for await (const chunk of response.body) {
        total += chunk.length;
        if (total > limit) return { ok: false, why: `is over the ${limit}-byte ceiling` };
        chunks.push(Buffer.from(chunk));
      }
    } catch (e) {
      return { ok: false, why: say(e) };
    }
  }
  if (promised && total !== declared) return { ok: false, why: `is ${total} bytes, not the ${declared} it declared` };
  return { ok: true, bytes: Buffer.concat(chunks, total) };
}

/**
 * The live deploy's digest list, or the reason this run will carry nothing.
 *
 * One request, and only when there is something to carry: a deploy that
 * changed neither asset has nothing to check, and spending a request to learn
 * that is a request too many.
 */
async function getAssetDigests(url, timeoutMs) {
  const answer = await get(url, timeoutMs);
  if (!answer.ok) return { ok: false, why: `${DIGESTS_NAME}: ${answer.why}` };
  if (answer.response.status !== 200)
    return { ok: false, why: `${DIGESTS_NAME}: answered ${answer.response.status} — the live deploy published no digest list for this one to check bytes against` };
  const body = await bodyWithin(answer.response, MAX_LIST_BYTES);
  if (!body.ok) return { ok: false, why: `${DIGESTS_NAME}: its body ${body.why}` };
  const list = readAssetDigests(body.bytes.toString("utf8"));
  return list.ok ? list : { ok: false, why: `${DIGESTS_NAME}: it ${list.why}` };
}

/**
 * Fill `dist` with whatever the live `origin` still references, this build does
 * not have, and the live deploy's own digest list attests to. Returns what
 * happened; printing is the caller's. It throws nothing: everything it could
 * not do comes back in `problems` — including being called without the two
 * things it cannot work without.
 *
 * `needed` is what the live page references and this build lacks, whether or
 * not any of it could be carried: carrying none of it is a different outcome
 * from having nothing to carry, and only this number tells them apart.
 *
 * @param {{ origin?: string, dist?: string, dryRun?: boolean, budgetMs?: number }} [options]
 */
export async function carryAssets({ origin, dist, dryRun = false, budgetMs = BUDGET_MS } = {}) {
  const carried = [];
  const problems = [];
  const alreadyBuilt = [];
  const needed = [];
  const done = () => ({ carried, problems, alreadyBuilt, needed });
  const deadline = Date.now() + budgetMs;
  const left = () => Math.min(TIMEOUT_MS, deadline - Date.now());

  // An empty origin used to fall through to a hard-coded production address
  // and quietly carry production's assets into somebody else's build
  // (Standards review). There is no such address any more; this is the whole
  // of what "no origin" now means.
  if (typeof origin !== "string" || origin.trim() === "") {
    problems.push("anything: no origin was given");
    return done();
  }
  // And it has to be an address rather than something that merely arrived in
  // the variable that holds one. `new URL` below would refuse most of these
  // too, but it would refuse them as a parse error; a value that begins `--`
  // deserves to be named for what it is, because that is the shape of the
  // repository variable that used to become a flag (header: "Where the address
  // comes from"). An absolute `http(s)` address, or nothing is carried.
  if (!/^https?:\/\//i.test(origin.trim())) {
    problems.push(`anything: ${origin} is not an absolute http(s) address, so it is not somewhere to read a page from`);
    return done();
  }
  // And a build to fill. The signature lets this be left out; `join` threw a
  // TypeError on it, which is not "everything comes back in `problems`"
  // (Standards review, 2026-09-23). Checked here, before a request is spent on
  // a build there is nowhere to put.
  if (typeof dist !== "string" || dist.trim() === "") {
    problems.push("anything: no build directory was given");
    return done();
  }
  // The origin as given, not its host root: without a custom domain the site
  // is served from a subpath and `SITE_URL` carries it, so reading the root
  // would read somebody else's page (`check:base` guards the same edge).
  const pageUrl = origin.endsWith("/") ? origin : `${origin}/`;
  let home;
  try {
    home = new URL(pageUrl);
    if (home.protocol !== "https:" && home.protocol !== "http:") throw new Error(`${home.protocol} is not a web address`);
  } catch (e) {
    problems.push(`anything: ${origin} — ${say(e)}`);
    return done();
  }

  const page = await get(pageUrl, left());
  if (!page.ok) { problems.push(`the live page ${pageUrl}: ${page.why}`); return done(); }
  if (page.response.status !== 200) { problems.push(`the live page ${pageUrl}: answered ${page.response.status}`); return done(); }
  const html = await bodyWithin(page.response, MAX_PAGE_BYTES);
  if (!html.ok) { problems.push(`the live page ${pageUrl}: its body ${html.why}`); return done(); }

  const { names, refused } = readAssetNames(html.bytes.toString("utf8"), pageUrl);
  // The reasons differ reference by reference, so these stay lines rather than
  // a folded list — but there is the same bottom to how many a page can print
  // as to how many it can fetch.
  for (const { ref, why } of refused.slice(0, MAX_ASSETS)) problems.push(`${ref}: it ${why}`);
  if (refused.length > MAX_ASSETS)
    problems.push(`the ${refused.length - MAX_ASSETS} further reference(s) this page named: each refused unread`);

  for (const name of names) {
    // Already in this build: no request, so no cost, so no ceiling.
    if (existsSync(join(dist, "_astro", name))) alreadyBuilt.push(name);
    else needed.push(name);
  }
  if (needed.length === 0) return done();

  const list = await getAssetDigests(new URL(DIGESTS_NAME, pageUrl).href, left());
  if (!list.ok) { problems.push(`anything: ${list.why}`); return done(); }
  // Two different things, which used to be one and cost the slice its whole
  // job (Security review, round 4).
  //
  // A name the list does not carry is THAT NAME not carried: nothing here can
  // say what its bytes should be. A page reference `/_astro/../../pwn.css`
  // normalises to `pwn.css`, which no list of ours will ever carry, and
  // refusing the run over it left both real assets behind — one attribute in a
  // page this step does not own, turning the step off and announcing it.
  //
  // NONE of the needed names being in the list is the other case: the page and
  // the list are from different deploys — a proxy holding one of them, or a
  // deploy that landed between these two requests — and then there is nothing
  // to check ANY byte against, so the run is refused whole and says so in
  // words that do not read like a page with no assets to carry.
  const unlisted = needed.filter((name) => !list.digests.has(name));
  if (unlisted.length === needed.length) {
    problems.push(
      `anything: ${DIGESTS_NAME} names none of what the live page needs (${boundedList(needed)})`
      + " — the page and the list are from different deploys, so there is nothing to check these bytes against",
    );
    return done();
  }
  if (unlisted.length) {
    problems.push(
      `${boundedList(unlisted)}: ${DIGESTS_NAME} does not name ${unlisted.length === 1 ? "it" : "them"},`
      + " so there is nothing to check those bytes against",
    );
  }

  /** What was asked of the origin — the ceiling counts these, not the wins. */
  let asked = 0;
  const overCeiling = [];
  const overBudget = [];

  for (const name of needed.filter((name) => list.digests.has(name))) {
    const target = join(dist, "_astro", name);
    if (asked >= MAX_ASSETS) { overCeiling.push(name); continue; }
    if (deadline - Date.now() <= 0) { overBudget.push(name); continue; }
    asked += 1;

    // Built here, from the origin this run was given — never from the ref.
    const asset = await get(new URL(`_astro/${name}`, pageUrl).href, left());
    if (!asset.ok) { problems.push(`${name}: ${asset.why}`); continue; }
    if (asset.response.status !== 200) { problems.push(`${name}: answered ${asset.response.status}`); continue; }
    const type = (asset.response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!CARRIABLE.test(type)) { problems.push(`${name}: answered 200 as ${type || "no content type"}`); continue; }
    const body = await bodyWithin(asset.response, MAX_ASSET_BYTES);
    if (!body.ok) { problems.push(`${name}: its body ${body.why}`); continue; }
    // A 0-byte file would publish a 200 that answers nothing under a name the
    // deploy swears by — the defect this step exists to fix, with no console
    // error to find it by. Refused before it is even hashed.
    if (body.bytes.length === 0) { problems.push(`${name}: answered 200 with an empty body`); continue; }
    const digest = digestOf(body.bytes);
    if (digest !== list.digests.get(name)) {
      problems.push(`${name}: its ${body.bytes.length} bytes are sha256:${digest}, not the sha256:${list.digests.get(name)} the build that published this page recorded`);
      continue;
    }

    if (!dryRun) {
      try {
        mkdirSync(join(dist, "_astro"), { recursive: true });
        writeFileSync(target, body.bytes);
      } catch (e) {
        problems.push(`${name}: it could not be written — ${say(e)}`);
        continue;
      }
    }
    carried.push({ name, bytes: body.bytes.length, sha256: digest });
  }

  // One line each, however many names are behind them.
  if (overCeiling.length)
    problems.push(`${boundedList(overCeiling)}: this run had already asked the origin for its ceiling of ${MAX_ASSETS} assets`);
  if (overBudget.length) problems.push(`${boundedList(overBudget)}: the run's ${budgetMs} ms budget was spent`);
  return done();
}

/**
 * `--name value` or `--name=value`; a flag that is not there keeps its default.
 *
 * This reads whatever is on the command line as a flag, which is exactly why
 * the live site's address is not on the command line: see the header, "Where
 * the address comes from". What is left here — `--dist` and `--dry-run` — a
 * deploy never passes, and the pinned block in `tests/pipeline.test.ts` is how
 * that stays true.
 */
function flag(argv, name) {
  const i = argv.indexOf(`--${name}`);
  if (i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) return argv[i + 1];
  const inline = argv.find((a) => a.startsWith(`--${name}=`));
  return inline ? inline.slice(name.length + 3) : undefined;
}

if (process.argv[1]?.split("\\").join("/").endsWith("/carry-assets.mjs")) {
  // The floor under everything below. A deploy that fails because the previous
  // generation could not be rescued is worse than the ten-minute window it was
  // rescuing (s33, point 2), so whatever gets this far is a printed line and a
  // zero exit — including whatever the handlers below are the only catcher of.
  const giveUp = (e) => { console.log(`could not carry anything: ${say(e)}`); process.exit(0); };
  process.on("uncaughtException", giveUp);
  process.on("unhandledRejection", giveUp);

  const root = fileURLToPath(new URL("..", import.meta.url));
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const dist = flag(argv, "dist") ?? join(root, "dist");
  // The address is a value in the environment and never a flag, so that the
  // one repository variable holding it cannot be read as one — the header's
  // "Where the address comes from" is the measurement. `?? ""` rather than a
  // fallback address: an origin this was not given is refused by
  // `carryAssets`, which says so and carries nothing.
  const origin = process.env[ORIGIN_VAR] ?? "";
  // No flag moves the budget either, and for the same reason one step further
  // on: `--budget-ms 1` would make the step a no-op that prints
  // `0 asset(s) carried` and exits 0 — the defect back, and the deploy green
  // over it (Spec review, 2026-09-23). The tests hand `carryAssets` a budget
  // directly.

  // This build's own digests first, for the deploy after this one: it describes
  // what the build made, so it is written before anything is carried into it —
  // and it is published whether or not anything is carried, because without it
  // the next deploy has nothing to check bytes against.
  if (dryRun) {
    console.log(`would publish ${DIGESTS_NAME} for the next deploy`);
  } else {
    const published = writeAssetDigests(dist);
    if (published.ok) console.log(`published ${DIGESTS_NAME}: ${published.count} asset(s) this build made, for the next deploy to check against`);
    else console.log(`could not publish ${DIGESTS_NAME} — ${published.why}; the next deploy will carry nothing`);
  }

  let result = { carried: [], problems: [], alreadyBuilt: [], needed: [] };
  try {
    result = await carryAssets({ origin, dist, dryRun });
  } catch (e) {
    result.problems.push(`anything: ${say(e)}`);
  }
  for (const { name, bytes, sha256 } of result.carried) {
    console.log(`${dryRun ? "would carry" : "carried"} ${name}  ${bytes} bytes  sha256:${sha256}`);
  }
  for (const problem of result.problems) console.log(`could not carry ${problem}`);
  console.log(
    `${result.carried.length} asset(s) ${dryRun ? "would be carried" : "carried"} from ${origin || `an unset ${ORIGIN_VAR}`}, `
    + `${result.alreadyBuilt.length} already in this build, ${result.problems.length} left behind`,
  );
  // Refusing everything and having nothing to do used to print that same line
  // and nothing else, and no other step reads this one's output: a proxy change
  // in front of Pages would reopen the cached-page window silently, and the
  // first evidence would be a reader's unstyled page (Security review, round
  // 3). So the two outcomes end differently, and the loud one is a warning
  // annotation the run summary carries — `::warning::`, as the IndexNow step
  // already uses for "nothing sent". It is still exit 0: this step never fails
  // a deploy.
  if (result.needed.length && result.carried.length === 0) {
    console.log(
      `::warning::nothing was carried: the live page still references ${boundedList(result.needed)}`
      + ` — a reader holding that page gets a 404 for ${result.needed.length === 1 ? "it" : "them"},`
      + " which is the window s33 exists to close, open on this deploy",
    );
  }
  process.exit(0);
}
