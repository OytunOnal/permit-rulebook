/**
 * Which references in a live page are this deploy's assets.
 */
import { short } from "./log-wording.mjs";

/**
 * The longest name taken. A name becomes a file under `dist/_astro/`, and one
 * longer than the filesystem accepts would make that write throw; 128 is far
 * above any name Astro emits, and it bounds the pattern below as well.
 */
const MAX_NAME = 128;

/**
 * The only shape of name that may become a path under `dist/_astro/`, be
 * written into the digest list, or be read back out of it — one rule, spelled
 * once, because a name the list can hold and the carrier would refuse (or the
 * other way round) is a hole between two spellings of the same idea.
 *
 * Spelled once means the STRING below, which both the page's reader and the
 * list's line pattern splice in. `.` and `..` are excluded inside the pattern,
 * so both ends hold the exclusion or neither does.
 *
 * Being a string to splice, it carries no anchor of its own and must not
 * depend on one: the exclusion is written against what FOLLOWS the name, not
 * against the end of the subject, so the only thing a splice has to guarantee
 * is that no `[A-Za-z0-9._-]` comes straight after it. Both call sites end
 * there, which satisfies it; so would a `/`, a quote or a space.
 */
const NAME_CHARS = "A-Za-z0-9._-";
export const NAME_PATTERN = `(?!\\.\\.?(?![${NAME_CHARS}]))[${NAME_CHARS}]{1,${MAX_NAME}}`;
export const PLAIN_NAME = new RegExp(`^${NAME_PATTERN}$`);

/**
 * Read the asset names a page asks for — names only.
 *
 * The reference's own URL is never fetched and never returned: the live HTML is
 * a stranger's string, and the one thing taken from it is a file name, which
 * the caller turns back into a URL under the origin IT chose. A reference that
 * points at another host, at another scheme, or at no name this filesystem
 * would accept is declined by name and reported, never fetched.
 *
 * Names only, but not names alone: a name is one of THIS deploy's assets only
 * when the reference RESOLVES to the URL the carry would build for it. Those
 * that do come back in `names`; those that resolve under our own origin to
 * anything else come back in `unserved`, which is neither carried nor fetched,
 * because the deploy does not serve what the reader is going to ask for. The
 * rest — another host, another scheme, a string that resolves nowhere — come
 * back in `refused`.
 *
 * WHERE A REFERENCE RESOLVES IS WHAT SPLITS THE TWO, and nothing else. A
 * reference under our own origin is `unserved` whether it fails on its name or
 * on its path, because the reader holding that page asks our own host for that
 * URL and gets a 404. `refused` is what no reader's request of ours can come
 * of: a host that is not this site answers for itself, and a string neither
 * this nor a browser resolves is a request nobody makes.
 *
 * ## What shapes this reads, and what it does not
 *
 * It reads a QUOTED STRING with no whitespace in it and `/_astro/` inside,
 * wherever the page holds one — and the two quote marks need not be the same
 * one, so `"…'` is read as readily as `"…"`. That covers the reference shapes
 * Astro emits, which is why it is what it is, but it is not a rule about
 * attributes and must not be described as one: it knows nothing about markup,
 * so a name in a comment or in an inline script is read exactly as a `href`
 * is.
 *
 * It errs in both directions, and each costs something different. Narrow: it
 * is blind to five shapes a browser would do something with — `/_ASTRO/x.css`,
 * `/_astro%2Fx.css`, a bare relative `_astro/x.css`, `/_astro\x.css`, and a
 * reference with a tab in it — and three of those five a browser resolves to
 * one of this deploy's real assets, so they are a missed CARRY and not only a
 * missed alarm. Wide: a `/_astro/` name a page holds in a comment or a script
 * string, which no reader will ever ask for, reaches `needed` all the same;
 * what that costs a run is the flow's, beside its count of twenty requests in
 * `carry.mjs`. Our own pages hold no such string, and what would separate one
 * from a real reference is an HTML parser, below.
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
 * silent window the carry exists to close. So the boundary is not left to a
 * comment: `tests/pipeline.test.ts` reads the real built page with this very
 * function and asserts it finds every file the build put in `_astro/`, and
 * goes red the day a shape it cannot read appears in our own output.
 */
export function readAssetNames(html, pageUrl) {
  const ours = new URL(pageUrl).origin;
  // Both sets, and both for the same reason: a page is allowed to name the
  // same thing as often as it likes, and answering "have I seen this?" by
  // walking what has been kept so far is quadratic in how many distinct names
  // the page holds. The run's budget bounds only how long the carry waits on
  // the network, and this runs after the page is in hand, so reading a page as
  // large as its ceiling allows has to be linear in the page. Order is kept
  // because the log reads better in the page's own order, so the set is the
  // membership test and the array is the answer.
  const names = [];
  const kept = new Set();
  const refused = [];
  const unserved = [];
  const seen = new Set();
  for (const [, ref] of html.matchAll(/["']([^"'\s]*\/_astro\/[^"'\s]*)["']/g)) {
    if (seen.has(ref)) continue;
    seen.add(ref);
    const verdict = verdictOnReference(ref, pageUrl, ours);
    if (verdict.refused) refused.push(verdict.refused);
    else if (verdict.unserved) unserved.push(verdict.unserved);
    else if (!kept.has(verdict.name)) {
      kept.add(verdict.name);
      names.push(verdict.name);
    }
  }
  return { names, refused, unserved };
}

/**
 * What one reference is: `{ name }` when it is one of this deploy's assets,
 * or `{ refused }` or `{ unserved }`, each a `{ ref, why }`, when it is not.
 *
 * Every refusal reports a BOUNDED piece of the reference, not the reference:
 * a page names strings of its own choosing, and a log line is the deploy's.
 *
 * The name has to be the whole of what the reference asks for. A reference
 * that climbs out of `_astro/` (`/_astro/../real.css` resolves to
 * `/real.css`), or a root-absolute `/_astro/old.css` in a page served from a
 * subpath, names a URL this deploy does not serve; scored by its bare name
 * against `dist/_astro/`, it would end the run quiet over a reader's 404.
 *
 * Compared on the PATH: a static host resolves a path to a file, and a query
 * or a fragment on the reference is the reader's business and not the file's.
 * Both paths go in the line, because on a subpath origin the reference and
 * where it resolved are the same string, and "it resolves to itself, which is
 * not ours" tells a reader nothing — the path this deploy would have had for
 * that name is the whole of the difference.
 */
function verdictOnReference(ref, pageUrl, ours) {
  let url;
  try { url = new URL(ref, pageUrl); } catch { return { refused: { ref: short(ref), why: "is not a URL" } }; }
  if (url.origin !== ours) return { refused: { ref: short(ref), why: `names ${short(url.origin)}, which is not this site` } };
  // Past this line every reference is one our own host will be asked for, so
  // every way of failing from here on is a 404 the reader will hit and goes
  // to `unserved` rather than to `refused`.
  const name = url.pathname.split("/").pop() ?? "";
  if (name.length > MAX_NAME) return { unserved: { ref: short(name), why: `is longer than ${MAX_NAME} characters, so this deploy publishes nothing under it` } };
  // Only a plain file name may become a path under `dist/_astro/` — the one
  // rule, which `.` and `..` fail inside the pattern rather than beside it.
  if (!PLAIN_NAME.test(name)) return { unserved: { ref: short(ref), why: "is not a plain file name, so this deploy publishes nothing under it" } };
  const target = new URL(`_astro/${name}`, pageUrl);
  if (url.pathname !== target.pathname)
    return { unserved: { ref: short(ref), why: `resolves to ${short(url.pathname)}, not to this deploy's ${short(target.pathname)}` } };
  return { name };
}
