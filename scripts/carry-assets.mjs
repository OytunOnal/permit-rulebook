/**
 * Carry the live site's assets forward, so a cached page still finds them.
 *
 * GitHub Pages serves `/` with `Cache-Control: max-age=600` — its header, not
 * ours, and not one we can change on this host — so a reader's browser, and
 * any proxy between, may hold that page for ten minutes. The files it names
 * are content-hashed: every deploy that changes one publishes a new name and
 * the previous file leaves the tree. A reader who returns inside those ten
 * minutes asks for files that are no longer there, and gets an unstyled page
 * whose interview never runs. That is the whole of why this exists.
 *
 * So this reads the page the site is serving RIGHT NOW, takes the `/_astro/`
 * names it references, and copies into the fresh `dist/` the ones this build
 * did not produce. One generation, deliberately: it reads what is live, so the
 * next deploy keeps only what this one published. Two deploys inside ten
 * minutes still leave the earliest reader broken, and that limit is on the
 * record.
 *
 * It runs inside a deploy, which decides everything else about it — above all
 * that it cannot fail the build. Not "does not": every failure is caught and
 * printed, the two handlers at the bottom catch what nothing else did, and the
 * process exits 0 on every path, because a deploy that failed over a rescue of
 * the previous generation would be worse than the window it was rescuing.
 *
 * This file is where the reasons live: the workflow step and the two test
 * files point here rather than repeat them, and a reason that belongs beside
 * the code holding it stays there rather than being told twice.
 *
 * ## Where the address comes from
 *
 * From the environment, in `CARRY_ORIGIN`, and from nowhere else. It used to
 * arrive spliced into argv — and `flag()` at the bottom of this file reads any
 * `--name value`, so the one repository variable that decides this site's
 * address was a step away from being a flag instead: `--dry-run` or
 * `--dist=<somewhere else>` in that variable ships an artifact with no
 * `asset-digests.txt` in it, which leaves every later deploy nothing to check a
 * carried byte against — this step off, every deploy green, from a value no
 * code review reads. A value cannot become a flag. `--dist` and `--dry-run`
 * stay, because they are the surface a test and a person at a terminal drive
 * this by, and the deploy passes no argv at all, which `tests/pipeline.test.ts`
 * pins along with the rest of the step's block.
 *
 * There is no built-in fallback address: an origin this was not given is an
 * origin it does not have, and it says so and carries nothing rather than
 * quietly reaching for production from somebody else's build.
 *
 * It fetches only from the origin it was given. A name comes out of the live
 * HTML, but the URL is always built here, from that origin — a reference to
 * another host, a protocol-relative one or a plaintext one is refused by name
 * and never fetched, and a redirect is an error rather than a hop, so nothing
 * the page says can make this reach a host nobody chose. A reference under
 * that origin counts as one of this deploy's assets only if it RESOLVES to the
 * URL this step would build for its name, base path and all: a name is what is
 * fetched, but where the reference pointed is what the reader will ask for.
 *
 * ## What a page may cost this build
 *
 * A name is at most 128 characters. A page is at most 512 KB and an asset at
 * most 4 MB — two ceilings, because they bound two different things: how much
 * text is read for names, and how large a file may be written. One number for
 * both is how a page came to inherit an asset's 4 MB. A run asks the origin
 * for at most 20 assets, counted whether they answer or 404, because counting
 * only the ones that worked let four hundred dead references cost four hundred
 * requests against our own origin.
 *
 * The log is bounded for the same reason the network is. A page that names
 * four hundred files is a bounded list, not four hundred lines; a string this
 * step did not write is printed shortened and on one line, because a log
 * nobody can read is the same as no log — and in Actions a line beginning `::`
 * is a workflow command.
 *
 * `BUDGET_MS` bounds how long this will WAIT ON THE NETWORK: it sizes request
 * timeouts and does nothing else, so a run that never waits can no more be
 * interrupted by it than a run that waits forever can outlast it. Everything
 * here that is not a request has to be cheap enough that this is not a lie,
 * and one thing was not: reading the names out of a page was quadratic in how
 * many distinct ones it held, ran to completion after the body was in hand,
 * and had no clock on it at all — minutes of uninterruptible CPU inside a
 * deploy job which, with `cancel-in-progress: false`, queues the next deploy
 * behind it. The reading is linear now and the page's ceiling is true of it:
 * 512 KB of names reads in 17 ms, against an `index.html` of 11,569 bytes.
 *
 * ## What makes a carried byte trustworthy, and what does not
 *
 * This section is the one place that reading is written down; the tests and
 * the scenario point at it.
 *
 * Not the HTTP exchange. An origin declares its own `content-length`, so a
 * guard built on that declaration is the origin vouching for itself: measured
 * against raw-socket origins, an answer with no `content-length`, one that
 * declared less than it sent, and `content-length: 0` each put a file of the
 * wrong length on disk under the previous generation's exact name.
 *
 * So the authority is something our own build made. Every build publishes
 * `asset-digests.txt` beside its page — one line per file it put in `_astro/`,
 * the sha256 and the name — and the next deploy writes a byte only if it
 * hashes to what the list published beside that page says that name is.
 *
 * Be exact about what that buys, because an earlier wording here claimed more.
 * The list arrives from the same origin as the page, over the same HTTP,
 * unsigned: it moves the authority out of the HTTP FRAMING, and it cannot move
 * it off the ORIGIN. A host serving both says whatever it likes under a name
 * it also lists, and this step carries it — as does every reader's browser,
 * from that same host, with no help from us. The origin is the trust boundary;
 * the list is the check that what crossed it is what that host had already
 * published under that name. What it therefore refuses is a transfer that went
 * wrong rather than a host that means harm: a truncated body, a stale or
 * foreign object under a known name, an error page answered 200, a truncated
 * list, an empty body, and a deploy landing between the two requests. Each
 * ends in one file not carried, rather than a wrong file published under a
 * name the deploy swears by.
 *
 * The page and the list are published together and fetched together, so they
 * describe the same deploy. Whether they do is a question about the page's
 * whole reference set; whether one name can be carried is a question about
 * that name alone. Both are asked, and answered, where `carryAssets` reads the
 * list.
 *
 * The first deploy after this was merged finds no list live yet and carries
 * nothing that once, publishing the list the deploy after it reads.
 *
 * The guards themselves are not listed here. This header used to list them
 * and listed one the code did not run, which is worse than saying nothing:
 * each guard now carries its own reason beside itself, in `carryAssets` and in
 * `bodyWithin`, where a reader can see the line as well as the claim.
 *
 * When this step ends quiet and when it says the window may be open is the one
 * rule not written here: it is written where the verdict is computed, at the
 * bottom of this file.
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
 * carried file from a story about one. It sits beside the page rather than in
 * `_astro/` because it is not an asset and nothing hashes it, and its first
 * line is fixed so that an HTML error page, a proxy's notice or a truncated
 * transfer cannot be read as a list — the name and the content type an origin
 * puts on a response are the word of the same stranger this file already
 * refuses to take at face value.
 */
const DIGESTS_NAME = "asset-digests.txt";
const DIGESTS_HEADER = "permit-rulebook asset digests v1";

/**
 * A slow host must not hold a deploy open. Ten seconds per request is long
 * enough for a cold CDN edge, and sixty for the whole run is the ceiling on
 * how long a silent origin can cost this build. They are deliberately not
 * multiplied out — twenty requests at ten seconds each would be two hundred —
 * so on a slow origin it is the budget and not the asset ceiling that ends the
 * run, early, and saying which names it did not reach.
 */
const TIMEOUT_MS = 10_000;
const BUDGET_MS = 60_000;

/**
 * What one origin may make this step do; why each of these is bounded, and why
 * a page and an asset are bounded separately, is the header's "What a page may
 * cost this build". Today the page is 11,569 bytes and names two assets of
 * 27 KB and 244 KB, so these are the orders of magnitude above what the site
 * actually is.
 *
 * `MAX_ASSETS` counts requests, not files carried: nothing that failed used to
 * count towards the ceiling, so four hundred dead references cost four hundred
 * requests against our own origin. The page is one request on top of that,
 * always; the digest list is one more, and only when there is something to
 * carry — `carryAssets` returns before fetching it when this build already has
 * everything the live page names.
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
 * JavaScript beside one of them only, so a list line naming `..` parsed while
 * the page's reader refused the same string. The exclusion is inside the
 * pattern now, so both ends hold it or neither does.
 *
 * Being a string to splice, it carries no anchor of its own and must not
 * depend on one: the exclusion is written against what FOLLOWS the name, not
 * against the end of the subject, so the only thing a splice has to guarantee
 * is that no `[A-Za-z0-9._-]` comes straight after it. Both call sites end
 * there, which satisfies it; so would a `/`, a quote or a space.
 */
const NAME_CHARS = "A-Za-z0-9._-";
const NAME_PATTERN = `(?!\\.\\.?(?![${NAME_CHARS}]))[${NAME_CHARS}]{1,${MAX_NAME}}`;
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

/**
 * As much of a string this step did not write as a log line can afford. A page
 * may name a reference of any length at all, and a refusal that printed one
 * whole let a page write the deploy's log twenty lines at a time. 40 for a
 * reference; the longer bound is for the one address a repository variable
 * holds, which has to survive being read.
 */
const short = (text, max = 40) => (text.length > max ? `${text.slice(0, max)}…` : text);

/**
 * One line, whatever it is handed. In Actions a line beginning `::` is a
 * workflow command, so a value this step prints but did not write — an address
 * out of a repository variable — must not be able to end a line and start
 * another one of its own.
 */
const oneLine = (text) => text.replace(/[\u0000-\u001f\u007f]+/g, " ");

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
 * one unparseable line would cost the next deploy the whole list. It returns
 * what happened and throws nothing, being called from a step that may not fail.
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
 * would accept is declined by name and reported, never fetched — an absolute
 * reference to another host, a protocol-relative one and a plaintext one all
 * reached the network before this read names only.
 *
 * Names only, but not names alone: a name is one of THIS deploy's assets only
 * when the reference RESOLVES to the URL this step would build for it. Those
 * that do come back in `names`; those that resolve under our own origin to
 * anything else come back in `unserved`, which is neither carried nor fetched,
 * because the deploy does not serve what the reader is going to ask for. The
 * rest — another host, another scheme, a string that resolves nowhere — come
 * back in `refused`.
 *
 * WHERE A REFERENCE RESOLVES IS WHAT SPLITS THE TWO, and nothing else. It used
 * to be which branch of this loop a reference fell out of, so a reference under
 * our own origin naming a path this deploy does not publish was reported and
 * not annotated whenever it failed on its NAME rather than on its path:
 * measured, round 7, `/_astro/sub%2Fold.css`, `/_astro/old.css/.`, `/_astro/`
 * and a 140-character name each printed a refusal line and raised no
 * annotation, while the reader holding that page asks our own host for that
 * URL and gets a 404. `refused` is what no reader's request of ours can come
 * of: a host that is not this site answers for itself, and a string neither
 * this nor a browser resolves is a request nobody makes.
 *
 * ## What shapes this reads, and what it does not
 *
 * It reads the reference shapes Astro emits: a quoted attribute value holding
 * a `/_astro/` path, no whitespace in it. Measured, round 7, this is blind to
 * five a browser would do something with — `/_ASTRO/x.css`, `/_astro%2Fx.css`,
 * a bare relative `_astro/x.css`, `/_astro\x.css`, and a reference with a tab
 * in it — and three of those five a browser resolves to one of this deploy's
 * real assets, so they are a missed CARRY and not only a missed alarm.
 *
 * They stay unread deliberately. Reading what a BROWSER resolves is not a
 * wider pattern here; it is a second HTML parser. A `<base href>` retargets
 * every relative reference in the document, so honouring bare-relative ones
 * without honouring `<base>` resolves them to a URL no reader ever asks for —
 * a new wrongness rather than a smaller one. Character references decode
 * before a URL is parsed (`/_astro&#47;x.css` is a path to a browser and text
 * here). `srcset` and CSS `url()` hold references no attribute-quote scan
 * sees. And whitespace inside an attribute is REMOVED by a browser rather than
 * refused, while the exclusion of it here is what keeps a reference the page
 * chose from ever carrying a line break into a name. Half a browser reads
 * strings no reader asks for and still misses the ones it cannot parse.
 *
 * What goes wrong the day Astro emits something else: this reads fewer names
 * than the page holds, carries fewer files than the reader needs, and says
 * NOTHING — no request, no problem line, no annotation, which is precisely the
 * silent window this step exists to close. So the boundary is not left to a
 * comment: `tests/pipeline.test.ts` reads the real built page with this very
 * function and asserts it finds every file the build put in `_astro/`, and
 * goes red the day a shape it cannot read appears in our own output.
 */
export function readAssetNames(html, pageUrl) {
  const ours = new URL(pageUrl).origin;
  // Both sets, and both for the same reason: a page is allowed to name the
  // same thing as often as it likes, and answering "have I seen this?" by
  // walking what has been kept so far is quadratic in how many distinct names
  // the page holds — the header's "What a page may cost this build" is why
  // that is not affordable here. Order is kept because the log reads better in
  // the page's own order, so the set is the membership test and the array is
  // the answer.
  const names = [];
  const kept = new Set();
  const refused = [];
  const unserved = [];
  const seen = new Set();
  for (const [, ref] of html.matchAll(/["']([^"'\s]*\/_astro\/[^"'\s]*)["']/g)) {
    if (seen.has(ref)) continue;
    seen.add(ref);
    let url;
    // Every refusal reports a BOUNDED piece of the reference, not the
    // reference: a page names strings of its own choosing, and a log line is
    // the deploy's. Three of these four used to print it whole.
    try { url = new URL(ref, pageUrl); } catch { refused.push({ ref: short(ref), why: "is not a URL" }); continue; }
    if (url.origin !== ours) { refused.push({ ref: short(ref), why: `names ${short(url.origin)}, which is not this site` }); continue; }
    // Past this line every reference is one our own host will be asked for, so
    // every way of failing from here on is a 404 the reader will hit and goes
    // to `unserved` rather than to `refused`.
    const name = url.pathname.split("/").pop() ?? "";
    if (name.length > MAX_NAME) { unserved.push({ ref: short(name), why: `is longer than ${MAX_NAME} characters, so this deploy publishes nothing under it` }); continue; }
    // Only a plain file name may become a path under `dist/_astro/` — the one
    // rule, which `.` and `..` fail inside the pattern rather than beside it.
    if (!PLAIN_NAME.test(name)) { unserved.push({ ref: short(ref), why: "is not a plain file name, so this deploy publishes nothing under it" }); continue; }
    // And the name has to be the whole of what the reference asks for. This
    // used to keep the name and throw the resolved path away, so a reference
    // that climbed out of `_astro/` (`/_astro/../real.css`, which resolves to
    // `/real.css`) was scored against `dist/_astro/real.css` and reported
    // "already in this build", and a root-absolute `/_astro/old.css` in a page
    // served from a subpath was fetched from under the base and reported
    // carried. Both are URLs this deploy does not serve and both ended the run
    // quiet, which is the alarm gone (Security review, round 6).
    //
    // Compared on the PATH: a static host resolves a path to a file, and a
    // query or a fragment on the reference is the reader's business and not the
    // file's. Both paths go in the line, because on a subpath origin the
    // reference and where it resolved are the same string, and "it resolves to
    // itself, which is not ours" tells a reader nothing — the path this deploy
    // would have had for that name is the whole of the difference.
    const target = new URL(`_astro/${name}`, pageUrl);
    if (url.pathname !== target.pathname) {
      unserved.push({ ref: short(ref), why: `resolves to ${short(url.pathname)}, not to this deploy's ${short(target.pathname)}` });
      continue;
    }
    if (kept.has(name)) continue;
    kept.add(name);
    names.push(name);
  }
  return { names, refused, unserved };
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
 * would be written is an unpacking of the file rather than the file — and the
 * length beside it describes the transfer, not the file. Measured, against an
 * origin that answered `content-encoding: gzip`: a 104,000-byte asset came
 * back declaring 14,192 bytes, and the same asset declared at 40 bytes decoded
 * to 14,192 with no error at all. An answer that LIES about its encoding
 * declares nothing to refuse it by, and is caught by the digest.
 *
 * The declared length is checked against what was read: a backstop behind
 * undici's own enforcement, which throws first and has never let this line
 * fire. It stays because it costs a comparison, and the day undici's behaviour
 * changes it is the line that notices. Nothing here decides that a body is the
 * right file — only its digest does.
 *
 * EXPORTED FOR A TEST, which this file has refused before: `DEFAULT_ORIGIN`
 * was exported so a case could name it, and that widened the module's surface
 * for a convenience. The difference is what is on the other side of the
 * export. This function's correctness IS the threat — it is handed a length it
 * counted itself and calls `Buffer.concat(chunks, total)` with it, where too
 * small truncates the file and too large pads it with zeroes, either way a
 * file of the wrong bytes on disk under a name the deploy swears by. Proving
 * that through the process needs a body that arrives in more than one chunk,
 * which needs a server on the test worker's own event loop and a client
 * waiting on it — and that case is the one thing in this slice's suite that
 * ever failed s33's own deploy on a loaded runner. A test that hands the
 * chunks over directly has no clock in it at all. A constant a test wanted to
 * name buys nothing for that price; this buys the proof back.
 */
export async function bodyWithin(response, limit) {
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
        // Converted first and counted after, so `total` is the length of what
        // `Buffer.concat` is handed rather than the length of what arrived.
        // Counted the other way round, a chunk whose two counts differ made
        // the two disagree: a string `üü` counted 2 characters and
        // concatenated 4 bytes, and `Buffer.concat(chunks, 2)` returned half
        // the value with `ok: true` — the silent truncation this file's header
        // calls this step's own threat, and the ceiling below miscounted by
        // the same amount. Unreachable through the step, where undici yields
        // `Uint8Array` and the two counts agree; reachable through the export,
        // which is the whole population this function has to be honest to
        // (Security review, round 8).
        const bytes = Buffer.from(chunk);
        total += bytes.length;
        if (total > limit) return { ok: false, why: `is over the ${limit}-byte ceiling` };
        chunks.push(bytes);
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
 * What it returns is also what the verdict at the bottom of this file is made
 * of: `needed` is what the live page references and this build lacks, whether
 * or not any of it could be carried, and `looked` is whether this run ever got
 * as far as knowing that. Having nothing to do, never reaching the page, and
 * looking and finding something still missing are the three outcomes, and
 * these two fields are what tells them apart. `unserved` is one of the ways
 * the third happens and not an outcome of its own: a reference that resolves
 * under our origin to somewhere this deploy does not publish, which is neither
 * carried nor missing from this build but is still a 404 the reader will hit.
 * `alreadyBuilt` and `needed` between them hold every name the page references
 * that IS one of this deploy's assets, so both being empty is a live page that
 * references none of them — the third outcome again, with the missing thing
 * being the page's own evidence rather than a file.
 *
 * @param {{ origin?: string, dist?: string, dryRun?: boolean, budgetMs?: number }} [options]
 */
export async function carryAssets({ origin, dist, dryRun = false, budgetMs = BUDGET_MS } = {}) {
  const carried = [];
  const problems = [];
  const alreadyBuilt = [];
  const needed = [];
  /**
   * References under our own origin that resolve somewhere this deploy does
   * not publish, exactly as `readAssetNames` hands them back — `{ ref, why }`
   * there and `{ ref, why }` here. It was a `string[]` on this side, which is
   * one name for two shapes and forced the destructure above to call the other
   * one something else (Standards review, round 7).
   */
  const unserved = [];
  /**
   * Whether this run got far enough to know what the live page needs. Every
   * return above that point is a run that could not look, and a step that could
   * not look does not know whether the window is open — which is the one thing
   * its caller has to be able to tell apart from a healthy deploy.
   */
  let looked = false;
  /** The page this run actually read, once there is one: what was parsed, not what was handed in. */
  let from = "";
  const done = () => ({ carried, problems, alreadyBuilt, needed, unserved, looked, from });
  const deadline = Date.now() + budgetMs;
  const left = () => Math.min(TIMEOUT_MS, deadline - Date.now());

  // An empty origin used to fall through to a hard-coded production address
  // and quietly carry production's assets into somebody else's build. There is
  // no such address any more; this is the whole of what "no origin" means.
  if (typeof origin !== "string" || origin.trim() === "") {
    problems.push("anything: no origin was given");
    return done();
  }
  // And it has to be an address rather than something that merely arrived in
  // the variable that holds one. `new URL` below would refuse most of these
  // too, but as a parse error; a value beginning `--` deserves to be named for
  // what it is (header: "Where the address comes from").
  //
  // NEVER PRINT A VALUE THAT DID NOT PARSE — the rule the two refusals here
  // and the counted line at the end all follow, and the reason there is no
  // redaction in this file any more. A parsed address is safe to print:
  // `new URL` has already dropped the credentials from it. An UNPARSED one
  // cannot be made safe by a rule about its shape, and every such rule tried
  // here failed on the population it actually meets — by construction the
  // values that reach these two lines are the ones that failed `^https?://`
  // or failed `new URL`. A redaction anchored on `://` did not fire on them
  // at all (round 8: `u:pw@host/` and `//u:pw@host/`, three echoes each, one
  // on the run summary), and widening it to the last `@` anywhere did not
  // lose a host but SUBSTITUTED one — a valid origin whose query carried an
  // `@` was reported read from the query's host, on the one line an incident
  // is read from. So: name the variable, say what was wrong with it, and
  // print nothing of it. Not even a length, which is a secret's length.
  const given = origin.trim();
  if (!/^https?:\/\//i.test(given)) {
    problems.push(`anything: ${ORIGIN_VAR} is not an absolute http(s) address, so it is not somewhere to read a page from`);
    return done();
  }
  // And a build to fill. The signature lets this be left out, and `join` threw
  // a TypeError on it, which is not "everything comes back in `problems`".
  // Checked before a request is spent on a build there is nowhere to put.
  if (typeof dist !== "string" || dist.trim() === "") {
    problems.push("anything: no build directory was given");
    return done();
  }
  // Parsed once, and the parse is what is read from and printed. The value
  // that was checked and the value that was fetched used to be two different
  // strings — the tests above ran on `origin.trim()` while the URL was built
  // from `origin` — so an address with a space at each end passed every check
  // and then fetched `…/%20%20/`. The parse is also the only spelling of the
  // address with nothing stray left in it: whitespace, a line break and a
  // fragment all end here rather than in a request or in a log line.
  let home;
  try { home = new URL(given); } catch {
    // Not `say(e)` either, and for the same reason one step further out: the
    // error's wording is the runtime's, not this step's, and the runtime is
    // free to start putting the input it refused into it. Node's is the
    // constant "Invalid URL" today, which says nothing this line does not.
    problems.push(`anything: ${ORIGIN_VAR} is not a URL, so it is not somewhere to read a page from`);
    return done();
  }
  home.hash = "";
  home.search = "";
  // And the credentials, one assignment further along the same line of
  // reasoning: `CARRY_ORIGIN` is a repository variable, and `user:password@`
  // in it survived the parse into the page URL, into `from`, into every line
  // this step prints and onto the run summary — measured, round 6: four
  // echoes of the secret, one of them the annotation. undici refuses to build
  // a request from a URL carrying credentials at all, so a secret in a deploy
  // log was the whole of what they did.
  home.username = "";
  home.password = "";
  // The origin as given, path and all, not its host root: without a custom
  // domain the site is served from a subpath and `SITE_URL` carries it, so
  // reading the root would read somebody else's page (`check:base` guards the
  // same edge).
  if (!home.pathname.endsWith("/")) home.pathname += "/";
  const pageUrl = home.href;
  from = pageUrl;

  const page = await get(pageUrl, left());
  if (!page.ok) { problems.push(`the live page ${pageUrl}: ${page.why}`); return done(); }
  if (page.response.status !== 200) { problems.push(`the live page ${pageUrl}: answered ${page.response.status}`); return done(); }
  const html = await bodyWithin(page.response, MAX_PAGE_BYTES);
  if (!html.ok) { problems.push(`the live page ${pageUrl}: its body ${html.why}`); return done(); }

  const references = readAssetNames(html.bytes.toString("utf8"), pageUrl);
  const { names } = references;
  // The reasons differ reference by reference, so these stay lines rather than
  // a folded list — but there is the same bottom to how many a page can print
  // as to how many it can fetch. A reference that resolves off this deploy is
  // reported the same way: it is a reference this step declined, and the line
  // says why, which is what the reader is going to run into.
  const declined = [...references.refused, ...references.unserved];
  for (const { ref, why } of declined.slice(0, MAX_ASSETS)) problems.push(`${ref}: it ${why}`);
  if (declined.length > MAX_ASSETS)
    problems.push(`the ${declined.length - MAX_ASSETS} further reference(s) this page named: each refused unread`);
  // Kept apart from the rest for the verdict: these resolve under OUR OWN
  // origin to something this deploy does not publish, so each is a request the
  // reader's browser makes to our host and a 404 it gets back. The rest name
  // another host, which answers for itself, or resolve nowhere at all, which
  // is a request no browser makes either. Same shape on both sides of this
  // line: what `readAssetNames` hands back is what the verdict reads, so
  // there is one `unserved` and not two.
  unserved.push(...references.unserved);

  for (const name of names) {
    // Already in this build: no request, so no cost, so no ceiling.
    if (existsSync(join(dist, "_astro", name))) alreadyBuilt.push(name);
    else needed.push(name);
  }
  // From here on this run knows what a reader holding the live page will ask
  // for, so what it says at the end is about those names rather than about not
  // having looked.
  looked = true;
  if (needed.length === 0) return done();

  const list = await getAssetDigests(new URL(DIGESTS_NAME, pageUrl).href, left());
  if (!list.ok) { problems.push(`anything: ${list.why}`); return done(); }
  // Two questions, asked of two different sets.
  //
  // Whether the page and the list describe the same deploy is asked of the
  // page's WHOLE reference set: they are published together, so a list naming
  // not one of the names its page references is not that page's list — a proxy
  // holding one of them, or a deploy that landed between these two requests —
  // and there is then nothing to check ANY byte against. Asked instead of what
  // was left to carry, it made an ordinary deploy a disagreement: both real
  // names are already built on a deploy that changed neither, so one stray
  // reference was the whole of `needed`, and one equalled one.
  if (!names.some((name) => list.digests.has(name))) {
    problems.push(
      `anything: ${DIGESTS_NAME} names none of the ${names.length} asset(s) this page references (${boundedList(names)})`
      + " — the page and the list are from different deploys, so there is nothing to check these bytes against",
    );
    return done();
  }
  // Whether one name can be carried is asked of that name alone: nothing here
  // can say what the bytes of a name the list does not carry should be. A page
  // reference `/_astro/../../pwn.css` normalises to `pwn.css`, which no list of
  // ours will ever carry, and refusing the run over it left both real assets
  // behind — one attribute in a page this step does not own, turning the step
  // off and announcing it.
  const unlisted = needed.filter((name) => !list.digests.has(name));
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
  // The floor under everything below, and the header's "it cannot fail the
  // build" in two lines of code: whatever gets this far is a printed line and a
  // zero exit — including whatever these handlers are the only catcher of.
  // Through `oneLine` like every other print, and this one most of all: it is
  // the single site where a message nobody here wrote arrives, so it is the
  // last place that should be able to start a line of its own.
  const giveUp = (e) => { console.log(oneLine(`could not carry anything: ${say(e)}`)); process.exit(0); };
  process.on("uncaughtException", giveUp);
  process.on("unhandledRejection", giveUp);

  const root = fileURLToPath(new URL("..", import.meta.url));
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const dist = flag(argv, "dist") ?? join(root, "dist");
  // A value in the environment and never a flag: the header's "Where the
  // address comes from". `?? ""` rather than a fallback address, because an
  // origin this was not given is refused by `carryAssets`.
  const origin = process.env[ORIGIN_VAR] ?? "";
  // No flag moves the budget either, one step further on the same road:
  // `--budget-ms 1` would make the step a no-op that prints
  // `0 asset(s) carried` and exits 0, the defect back and the deploy green over
  // it. The tests hand `carryAssets` a budget directly.

  // This build's own digests first, for the deploy after this one: it describes
  // what the build made, so it is written before anything is carried into it —
  // and it is published whether or not anything is carried, because without it
  // the next deploy has nothing to check bytes against.
  if (dryRun) {
    console.log(`would publish ${DIGESTS_NAME} for the next deploy`);
  } else {
    const published = writeAssetDigests(dist);
    if (published.ok) console.log(`published ${DIGESTS_NAME}: ${published.count} asset(s) this build made, for the next deploy to check against`);
    // An annotation, because a plain line here is invisible: on a deploy whose
    // page names are all already built, this run has nothing missing and
    // nothing to say, so a failed publish reads exactly like a healthy deploy
    // — while the NEXT deploy is guaranteed to carry nothing, which is the
    // window this step exists to close (Spec review, round 6).
    else console.log(oneLine(`::warning::could not publish ${DIGESTS_NAME} — ${published.why}; the next deploy has nothing to check a carried byte against, so it will carry nothing and the window is open on it`));
  }

  let result = { carried: [], problems: [], alreadyBuilt: [], needed: [], unserved: [], looked: false, from: "" };
  try {
    result = await carryAssets({ origin, dist, dryRun });
  } catch (e) {
    result.problems.push(`anything: ${say(e)}`);
  }
  for (const { name, bytes, sha256 } of result.carried) {
    console.log(oneLine(`${dryRun ? "would carry" : "carried"} ${name}  ${bytes} bytes  sha256:${sha256}`));
  }
  for (const problem of result.problems) console.log(oneLine(`could not carry ${problem}`));
  // Where the page came from, and only ever the parse: `result.from` is set
  // the moment `new URL` succeeds, so this names a host exactly when a request
  // was built for one. It used to fall back to the value as it arrived, which
  // is how this line — the one an incident is read from — came to name a host
  // no socket was ever opened on (round 8, and see "NEVER PRINT A VALUE THAT
  // DID NOT PARSE" in `carryAssets`). With no parse there is no address to
  // report, so it reports the variable and which of the two things was wrong
  // with it; the lines above have already said why.
  const where = result.from
    || (origin.trim() === "" ? `an unset ${ORIGIN_VAR}` : `a ${ORIGIN_VAR} no page could be read from`);
  console.log(oneLine(
    `${result.carried.length} asset(s) ${dryRun ? "would be carried" : "carried"} `
    + `from ${where}, `
    + `${result.alreadyBuilt.length} already in this build, ${result.problems.length} left behind`,
  ));

  // WHEN THIS STEP ENDS QUIET — the rule, in the one place it is decided.
  // Nothing downstream reads this step's output, so the run summary is where a
  // reader's broken page is predicted or nowhere.
  //
  // THREE OUTCOMES, and they are the whole of what this step says about the
  // page a reader is holding: nothing to do · could not look · looked and
  // something is still missing. It ends quiet only on the first. The third has
  // three shapes below, each its own line because each is a different thing
  // that page needs and does not have — a file this build lacks, a URL this
  // deploy does not publish, or any evidence at all that what answered was a
  // page this site published. Three lines, one outcome; a page can be wrong in
  // more than one of these ways at once and each is worth saying.
  //
  // Anything but the first is a `::warning::` on the run summary, as the
  // IndexNow step already uses for "nothing sent", and each says which it is.
  // The ones below all used to be as quiet as a healthy deploy: the alarm was
  // `needed.length && carried.length === 0`, which no run that gave up before
  // the page was read could reach and which a run that carried one name of two
  // never reached either (round 5); then a reference reduced to its basename
  // was scored against this build and ended the run quiet on a URL the deploy
  // does not serve, and a page holding no reference at all was granted silence
  // on evidence nothing had validated (round 6). Exit 0 on every one of them:
  // this step never fails a deploy. The failed digest publish is annotated
  // where it happens, above, and is not one of these three because it is not
  // about this page at all — its subject is the NEXT deploy, which without a
  // list has nothing to check a carried byte against.
  const missing = result.needed.filter((name) => !result.carried.some((asset) => asset.name === name));
  const unserved = result.unserved.map(({ ref }) => ref);
  if (!result.looked) {
    console.log(oneLine(
      "::warning::could not read the live page, so this deploy does not know whether a reader holding it"
      + ` still finds its assets: ${result.problems.at(-1) ?? "no reason was given"}`,
    ));
  } else {
    // A page whose every reference is unserved raises the first of these AND
    // the third, and that is the intended reading of two true things rather
    // than one predicate being loose. The narrower predicate — counting
    // `unserved` in with `alreadyBuilt` and `needed` — would still fire on a
    // proxy notice, because a page referencing nothing has no unserved
    // reference either; what it would cost is this page, which would then
    // report only that one URL 404s and withhold the other half, that NOTHING
    // on it matched this deploy, which is the evidence that the page answering
    // may not be ours at all. Two questions, two answers, and neither answers
    // the other (the build's earlier reason for this — that a narrower
    // predicate "would leave a proxy page silent" — was simply not true; Spec
    // review, round 7).
    if (result.alreadyBuilt.length + result.needed.length === 0) {
      console.log(oneLine(
        "::warning::the live page answered 200 and references none of this deploy's assets"
        + " — every page of ours that is cached names them, so nothing here was checked against a page this site published",
      ));
    }
    if (missing.length) {
      console.log(oneLine(
        `::warning::the live page references ${boundedList(missing)}, which this build does not have`
        + ` — a reader holding that page asks for ${missing.length === 1 ? "it" : "them"} and gets a 404`,
      ));
    }
    if (unserved.length) {
      console.log(oneLine(
        `::warning::the live page references ${boundedList(unserved)}, which ${unserved.length === 1 ? "does" : "do"} not resolve to this deploy's assets`
        + ` — a reader holding that page asks for ${unserved.length === 1 ? "that URL" : "those URLs"} and gets a 404, and this step does not carry ${unserved.length === 1 ? "it" : "them"}`,
      ));
    }
  }
  process.exit(0);
}
