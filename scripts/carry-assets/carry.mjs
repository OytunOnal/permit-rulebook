// @level application
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
 * that it cannot fail the build: every failure comes back as a line, and
 * nothing here throws, because a deploy that failed over a rescue of the
 * previous generation would be worse than the window it was rescuing.
 *
 * It touches no disk, network or clock itself: the command hands it three
 * ports. The live site, `liveAnswerFor`: what it answers for a URL within a
 * timeout, with its body read on request up to a byte ceiling. Every rule
 * about what an answer means — its status, its content type, whether its
 * bytes are the file — is the carry's, in `live-deploy/`, and the body is read
 * only once the status and the type have passed. The build directory, `buildDirectory`: what this
 * build holds and where carried files and the digest list are written. The
 * clock, `now`.
 *
 * ## Where it reads from
 *
 * Only from the origin it was given. A name comes out of the live HTML, but the
 * URL is always built here, from that origin — a reference to another host, a
 * protocol-relative one or a plaintext one is refused by name and never
 * fetched, and the reader treats a redirect as an error rather than a hop, so
 * nothing the page says can make this reach a host nobody chose. A reference
 * under that origin counts as one of this deploy's assets only if it RESOLVES
 * to the URL this step would build for its name, base path and all: a name is
 * what is fetched, but where the reference pointed is what the reader will ask
 * for.
 *
 * ## What a page may cost this build
 *
 * What one origin may make this step do, and why each bound is there, is
 * `live-deploy/ceilings.mjs`'s.
 *
 * The run's budget bounds how long this will WAIT ON THE NETWORK: it sizes
 * request timeouts and does nothing else, so a run that never waits can no
 * more be interrupted by it than a run that waits forever can outlast it.
 * Everything that is not a request has to be cheap enough that this is not a
 * lie: the costly one is reading the names out of a page, which runs after the
 * body is in hand, with no clock on it, inside a deploy job which, with
 * `cancel-in-progress: false`, queues the next deploy behind it. Why that
 * reading is linear in the page is `generation/asset-names.mjs`'s.
 *
 * ## What makes a carried byte trustworthy
 *
 * The digest list, and why it and not the HTTP exchange is what a carried byte
 * is checked against, is `generation/digest-list.mjs`'s; what the carry does
 * with the list is here.
 *
 * The page and the list are published together and fetched together, so they
 * describe the same deploy. Whether they do is a question about the page's
 * whole reference set; whether one name can be carried is a question about
 * that name alone. Both are asked, and answered, where
 * `live-deploy/live-digests.mjs` reads the list. A live deploy that published
 * no list is one this carries nothing from, and this build's list is
 * published either way, for the deploy after.
 *
 * Each guard carries its own reason beside itself, where a reader can see the
 * line as well as the claim. When this step ends quiet and when it says the
 * window may be open is written where the verdict is computed, in
 * `outcome/outcome-lines.mjs`.
 */
import { readAssetNames } from "./generation/asset-names.mjs";
import { DIGESTS_NAME, digestListOf, readAssetDigests } from "./generation/digest-list.mjs";
import { carryAttestedAssets } from "./live-deploy/attested-assets.mjs";
import { liveDigestsMatchingPage } from "./live-deploy/live-digests.mjs";
import { assetNamesOfLivePage } from "./live-deploy/live-page.mjs";
import { logLinesOf } from "./outcome/outcome-lines.mjs";
import { oneLine, sentenceOfError } from "../log-wording.mjs";

// The generation's readers, which their own tests reach through this entry.
export { readAssetNames, digestListOf, readAssetDigests };

/**
 * The live site's answer for one URL, as `liveAnswerFor` hands it over: its
 * status and content type, and `readBody`, which reads the body up to the
 * byte ceiling the call was given — or why there is no answer at all.
 *
 * @typedef {{ ok: true, bytes: Buffer } | { ok: false, why: string }} LiveBody
 * @typedef {{ ok: true, status: number, contentType: string, readBody: () => Promise<LiveBody> }
 *   | { ok: false, why: string }} LiveAnswer
 * @typedef {(url: string, limits: { byteCeiling: number, timeoutMs: number }) => Promise<LiveAnswer>} LiveAnswerFor
 */

/**
 * The build this run fills: the files this build put in `_astro/`, each with
 * bytes that are read only when asked for; whether one name is already there;
 * a carried asset written into `_astro/`; and the digest list written beside
 * the page, under the name it is given. Each operation throws when the
 * directory refuses it, and the flow turns that into a line.
 *
 * @typedef {{
 *   builtAssets: () => { name: string, bytes: Buffer }[],
 *   isBuilt: (name: string) => boolean,
 *   writeCarriedAsset: (name: string, bytes: Buffer) => void,
 *   writeDigestList: (name: string, text: string) => void,
 * }} BuildDirectory
 */

/**
 * The environment variable the live site's address arrives in, which the
 * entry reads and the lines here name when the address is unusable. Why it is
 * an environment variable and not a flag is the entry's "Where the address
 * comes from".
 */
export const ORIGIN_VAR = "CARRY_ORIGIN";

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
 * Whether this run was given a build to fill at all — one spelling, because
 * two would be a hole between them: the publish of the digest list and the
 * carry both decline on it, so a value one of them accepted and the other did
 * not cannot publish a list into a directory nobody named.
 */
const noBuildDirectory = (buildDirectory) => !buildDirectory;

/**
 * Publish what this build built, so the deploy after this one can check the
 * bytes it fetches against something we made rather than against the origin's
 * own headers.
 *
 * It describes this build's OWN assets: it runs before anything is carried, so
 * a file carried from the previous generation is not in it. That is what keeps
 * the chain one generation long, the same way the carry itself is. It returns
 * what happened and throws nothing, being called from a step that may not fail.
 *
 * It writes through `buildDirectory`, whose bytes are read only when the list
 * asks for them, which is only for a name it will hold.
 *
 * @param {BuildDirectory} buildDirectory
 */
export function writeAssetDigests(buildDirectory) {
  try {
    const list = digestListOf(buildDirectory.builtAssets());
    buildDirectory.writeDigestList(DIGESTS_NAME, list.text);
    return { ok: true, count: list.count };
  } catch (e) {
    return { ok: false, why: sentenceOfError(e) };
  }
}

/**
 * The lines that say whether this build's digest list was published.
 *
 * There is nothing to say when there is no build: the carry refuses the same
 * absence by name and its line is the whole of what happened. A directory
 * that is real and cannot be written into is a different thing, and keeps the
 * publish's own failure line.
 */
function digestListLines(buildDirectory, { dryRun }) {
  if (noBuildDirectory(buildDirectory)) return [];
  if (dryRun) return [`would publish ${DIGESTS_NAME} for the next deploy`];
  const published = writeAssetDigests(buildDirectory);
  if (published.ok) return [`published ${DIGESTS_NAME}: ${published.count} asset(s) this build made, for the next deploy to check against`];
  // An annotation, because a plain line here is invisible: on a deploy whose
  // page names are all already built, this run has nothing missing and nothing
  // to say, so a failed publish reads exactly like a healthy deploy — while
  // the NEXT deploy is guaranteed to carry nothing, which is the window this
  // step exists to close.
  return [oneLine(`::warning::could not publish ${DIGESTS_NAME} — ${published.why}; the next deploy has nothing to check a carried byte against, so it will carry nothing and the window is open on it`)];
}

/**
 * Fill `buildDirectory` with whatever the live `origin` still references, this
 * build does not have, and the live deploy's own digest list attests to —
 * after publishing this build's own list for the next deploy — timing its
 * requests by `now`. Returns what happened, and in `logLines` what the step
 * says about it, each one line. It throws nothing: everything it could not do
 * comes back in `problems`, including being called without the things it
 * cannot work without.
 *
 * @param {{
 *   origin?: string,
 *   buildDirectory?: BuildDirectory,
 *   liveAnswerFor?: LiveAnswerFor,
 *   now?: () => number,
 *   dryRun?: boolean,
 *   budgetMs?: number,
 * }} [options]
 */
export async function carryAssets({ origin, buildDirectory, liveAnswerFor, now, dryRun = false, budgetMs = BUDGET_MS } = {}) {
  const digestListLogLines = digestListLines(buildDirectory, { dryRun });
  // A throw is not one of the run's own bails and has none of their phrases to
  // carry, so this one blames nothing: what stopped the run is the caught
  // error, printed as its own line just above.
  let record = carryRecordOf({ problems: [], where: "nowhere — the line above says what stopped this run" });
  try {
    record = await recordOfCarry({ origin, buildDirectory, liveAnswerFor, now, dryRun, budgetMs });
  } catch (e) {
    record.problems.push(`anything: ${sentenceOfError(e)}`);
  }
  return { ...record, logLines: [...digestListLogLines, ...logLinesOf(record, { dryRun })] };
}

/**
 * What one run did: which names it carried and from where, which it left
 * behind and why. Every field `logLinesOf` reads to tell the three outcomes
 * apart comes from here. It runs in phases — parse the address, read the live
 * page, read its digest list, carry each asset — and each returns what it
 * found, which this merges in the order the phases ran, so the lines come out
 * in that order. A phase that ends the run returns its reason in `problems`
 * and leaves the phases after it unrun.
 *
 * `needed` is what the live page references and this build lacks, whether or
 * not any of it could be carried, and `looked` is whether this run ever got
 * as far as knowing that. Having nothing to do, never reaching the page, and
 * looking and finding something still missing are the three outcomes, and
 * these two fields are what tells them apart. Every return before `looked` is
 * set is a run that could not look, and a step that could not look does not
 * know whether the window is open — which is the one thing its reader has to
 * be able to tell apart from a healthy deploy.
 *
 * `unserved` is one of the ways the third happens and not an outcome of its
 * own: references under our own origin that resolve somewhere this deploy
 * does not publish, exactly as `readAssetNames` hands them back (`{ ref, why
 * }`), which are neither carried nor missing from this build but are still a
 * 404 the reader will hit. `alreadyBuilt` and `needed` between them hold every
 * name the page references that IS one of this deploy's assets, so both being
 * empty is a live page that references none of them — the third outcome
 * again, with the missing thing being the page's own evidence rather than a
 * file.
 *
 * `from` is the page this run actually read, once there is one: what was
 * parsed, not what was handed in. `where` is what the counted line names where
 * a page would be, when there is no page. `pageUrlOf` decides it AT THE BAIL
 * that ends the run, because that is the only place that knows which bail it
 * was: three phrases reach the counted line with no page read, and only two of
 * them are about the origin. Nothing of an unparsed value ever enters it.
 */
async function recordOfCarry({ origin, buildDirectory, liveAnswerFor, now, dryRun, budgetMs }) {
  const deadline = now() + budgetMs;
  /**
   * The live answer for `url`, with the request's timeout cut to what is left
   * of the run's budget — and no request at all once the budget is spent.
   */
  const answerWithinBudget = (url, byteCeiling) => {
    const timeoutMs = Math.min(TIMEOUT_MS, deadline - now());
    if (timeoutMs <= 0) return Promise.resolve({ ok: false, why: "the run's time budget was already spent" });
    return liveAnswerFor(url, { byteCeiling, timeoutMs });
  };
  // What every phase in `live-deploy/` is handed.
  const run = { buildDirectory, now, dryRun, budgetMs, deadline, answerWithinBudget };

  const address = pageUrlOf(origin, buildDirectory);
  if (!address.pageUrl) return carryRecordOf(address);
  const page = await assetNamesOfLivePage(address.pageUrl, run);
  if (page.needed.length === 0) return carryRecordOf(page);
  const list = await liveDigestsMatchingPage(page, run);
  if (!list.digests) return carryRecordOf({ ...page, problems: [...page.problems, ...list.problems] });
  const carry = await carryAttestedAssets(page, list.digests, run);
  return carryRecordOf({ ...page, carried: carry.carried, problems: [...page.problems, ...list.problems, ...carry.problems] });
}

/**
 * The record `logLinesOf` reads, from what the phases that ran found: a phase
 * that never ran found nothing, and `where` is the page read whenever there
 * is one.
 */
function carryRecordOf({ carried = [], problems, alreadyBuilt = [], needed = [], unserved = [], looked = false, from = "", where = from }) {
  return { carried, problems, alreadyBuilt, needed, unserved, looked, from, where };
}

/**
 * The address to read the live page from, parsed, in `pageUrl` — or "" there,
 * with `problems` saying why there is none and `where` the phrase the counted
 * line names in its place. The origin has to be given, has to be an address rather than
 * something that merely arrived in the variable that holds one, and needs a
 * build to fill, checked before a request is spent on a build there is
 * nowhere to put.
 *
 * No origin is the whole of what "no origin" means: there is no built-in
 * address to fall back to, so a build somewhere else never quietly carries
 * production's assets. `new URL` would refuse most values that are not an
 * address too, but as a parse error; a value beginning `--` deserves to be
 * named for what it is (the entry's "Where the address comes from").
 *
 * NEVER PRINT A VALUE THAT DID NOT PARSE — the rule the two refusals here and
 * the counted line `logLinesOf` prints all follow.
 *
 * Which population, because the carry prints two and the rules differ. THIS
 * one is the ENVIRONMENT's: `CARRY_ORIGIN`, one value, and carrying a
 * credential is a thing it does. For it the rule is all or nothing — printed
 * whole once it has parsed (`new URL` has dropped the credentials by then),
 * and not printed at all until it has. The other population is the LIVE
 * PAGE's references and the origin's own header strings, which
 * `readAssetNames` and the carry loop print unparsed all the time and must:
 * they are how a deploy's log says which reference it refused and why, there
 * may be four hundred of them, and nobody's secret is in them. Their rule is
 * `scripts/log-wording.mjs`'s — bounded by `short`, flattened by `oneLine` —
 * and `could not carry http://[/_astro/x.css: it is not a URL` obeys it
 * rather than breaking this one.
 *
 * An UNPARSED address cannot be made safe by a rule about its shape: by
 * construction the values that reach these two lines are the ones that
 * failed `^https?://` or failed `new URL`, so a redaction keyed to `://` or
 * to an `@` would meet exactly the values it cannot read — missing a
 * credential, or reporting a host taken from the query. So: name the
 * variable, say what was wrong with it, and print nothing of it. Not even a
 * length, which is a secret's length.
 *
 * The parse is what is read from and printed, so the value that was checked
 * and the value that is fetched are one string, with nothing stray left in
 * it: whitespace, a line break and a fragment all end here rather than in a
 * request or in a log line.
 */
function pageUrlOf(origin, buildDirectory) {
  // The two parse failures say nothing of the value, so they share one phrase.
  const unparsed = `a ${ORIGIN_VAR} no page could be read from`;
  if (typeof origin !== "string" || origin.trim() === "")
    return { pageUrl: "", problems: ["anything: no origin was given"], where: `an unset ${ORIGIN_VAR}` };
  const given = origin.trim();
  if (!/^https?:\/\//i.test(given)) {
    const problem = `anything: ${ORIGIN_VAR} is not an absolute http(s) address, so it is not somewhere to read a page from`;
    return { pageUrl: "", problems: [problem], where: unparsed };
  }
  if (noBuildDirectory(buildDirectory)) {
    // The one bail here that is not about the origin, and the counted line
    // says so rather than naming a variable nothing was wrong with.
    const where = "nowhere — no build directory was given, so no page was asked for";
    return { pageUrl: "", problems: ["anything: no build directory was given"], where };
  }
  let home;
  try { home = new URL(given); } catch {
    // Not `sentenceOfError(e)` either: the error's wording is the runtime's,
    // which is free to start putting the input it refused into it.
    const problem = `anything: ${ORIGIN_VAR} is not a URL, so it is not somewhere to read a page from`;
    return { pageUrl: "", problems: [problem], where: unparsed };
  }
  home.hash = "";
  home.search = "";
  // `user:password@` would survive into every line this step prints, and
  // undici refuses to build a request from a URL carrying credentials at all.
  home.username = "";
  home.password = "";
  // The origin as given, path and all: a site served from a subpath carries
  // it in its address (`check:base` guards the same edge).
  if (!home.pathname.endsWith("/")) home.pathname += "/";
  return { pageUrl: home.href, problems: [], where: home.href };
}
