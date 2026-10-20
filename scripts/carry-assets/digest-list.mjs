/**
 * The digest list's format: written by one build, read back by the next.
 *
 * ## What makes a carried byte trustworthy, and what does not
 *
 * Not the HTTP exchange. An origin declares its own `content-length`, so a
 * guard built on that declaration is the origin vouching for itself: against
 * a raw-socket origin, an answer with no `content-length`, one that declares
 * less than it sends, and `content-length: 0` can each put a file of the wrong
 * length on disk under the previous generation's exact name.
 *
 * So the authority is something our own build made. Every build publishes
 * `asset-digests.txt` beside its page — one line per file it put in `_astro/`,
 * the sha256 and the name — and the next deploy writes a byte only if it
 * hashes to what the list published beside that page says that name is.
 *
 * Be exact about what that buys. The list arrives from the same origin as the
 * page, over the same HTTP, unsigned: it moves the authority out of the HTTP
 * FRAMING, and it cannot move it off the ORIGIN. A host serving both says
 * whatever it likes under a name it also lists, and the carry carries it — as
 * does every reader's browser, from that same host, with no help from us. The
 * origin is the trust boundary; the list is the check that what crossed it is
 * what that host had already published under that name. What it therefore
 * refuses is a transfer that went wrong rather than a host that means harm: a
 * truncated body, a stale or foreign object under a known name, an error page
 * answered 200, a truncated list, an empty body, and a deploy landing between
 * the two requests. Each ends in one file not carried, rather than a wrong
 * file published under a name the deploy swears by.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NAME_PATTERN, PLAIN_NAME } from "./asset-names.mjs";
import { say } from "./log-wording.mjs";

/**
 * The digest list: what this build published, so the next deploy can tell a
 * carried file from a story about one. It sits beside the page rather than in
 * `_astro/` because it is not an asset and nothing hashes it, and its first
 * line is fixed so that an HTML error page, a proxy's notice or a truncated
 * transfer cannot be read as a list — the name and the content type an origin
 * puts on a response are the word of the same stranger the carry already
 * refuses to take at face value.
 */
export const DIGESTS_NAME = "asset-digests.txt";
const DIGESTS_HEADER = "permit-rulebook asset digests v1";

/** One line of the list: a sha256, two spaces, a name — `sha256sum`'s shape. */
const DIGESTS_LINE = new RegExp(`^([0-9a-f]{64}) {2}(${NAME_PATTERN})$`);

/** The sha256 of some bytes, as the digest list spells it. */
export const digestOf = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * Publish what this build built, so the deploy after this one can check the
 * bytes it fetches against something we made rather than against the origin's
 * own headers.
 *
 * It describes this build's OWN assets: it runs before anything is carried, so
 * a file carried from the previous generation is not in it. That is what keeps
 * the chain one generation long, the same way the carry itself is.
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
export function readAssetDigests(text) {
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
