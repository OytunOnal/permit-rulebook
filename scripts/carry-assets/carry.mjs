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
 * The live site is an input, `liveAnswerFor`: what it answers for a URL within
 * a timeout, with its body read on request up to a byte ceiling. Every rule
 * about what an answer means — its status, its content type, whether its
 * bytes are the file — is here, and the body is read only once the status and
 * the type have passed.
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
 * A name is bounded where names are read, in `asset-names.mjs`. A page is at
 * most 512 KB and an asset at most 4 MB — two ceilings, because they bound two
 * different things: how much text is read for names, and how large a file may
 * be written. A run asks the origin for at most 20 assets, counted whether
 * they answer or 404, so a page of dead references costs twenty requests
 * against our own origin and no more.
 *
 * The log is bounded for the same reason the network is, and how is
 * `log-wording.mjs`'s.
 *
 * The run's budget bounds how long this will WAIT ON THE NETWORK: it sizes
 * request timeouts and does nothing else, so a run that never waits can no
 * more be interrupted by it than a run that waits forever can outlast it.
 * Everything that is not a request has to be cheap enough that this is not a
 * lie: the costly one is reading the names out of a page, which runs after the
 * body is in hand, with no clock on it, inside a deploy job which, with
 * `cancel-in-progress: false`, queues the next deploy behind it. Why that
 * reading is linear in the page is `asset-names.mjs`'s.
 *
 * ## What makes a carried byte trustworthy
 *
 * The digest list, and why it and not the HTTP exchange is what a carried byte
 * is checked against, is `digest-list.mjs`'s; what the carry does with the list
 * is here.
 *
 * The page and the list are published together and fetched together, so they
 * describe the same deploy. Whether they do is a question about the page's
 * whole reference set; whether one name can be carried is a question about
 * that name alone. Both are asked, and answered, where `recordOfCarry` reads
 * the list. A live deploy that published no list is one this carries nothing
 * from, and this build's list is published either way, for the deploy after.
 *
 * Each guard carries its own reason beside itself, where a reader can see the
 * line as well as the claim. When this step ends quiet and when it says the
 * window may be open is written where the verdict is computed, in
 * `logLinesOf`.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readAssetNames } from "./asset-names.mjs";
import { DIGESTS_NAME, digestListOf, digestOf, readAssetDigests } from "./digest-list.mjs";
import { boundedList, oneLine, sentenceOfError, short } from "./log-wording.mjs";

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
 * What one origin may make this step do; why each of these is bounded, and why
 * a page and an asset are bounded separately, is the header's "What a page may
 * cost this build". Today the page is 11,569 bytes and names two assets of
 * 27 KB and 244 KB, so these are the orders of magnitude above what the site
 * actually is.
 *
 * `MAX_ASSETS` counts requests, not files carried, so a reference that fails
 * costs one of the twenty like one that works. The page is one request on top
 * of that, always; the digest list is one more, and only when there is
 * something to carry — `recordOfCarry` returns before fetching it when this
 * build already has everything the live page names.
 *
 * `MAX_LIST_BYTES` is the same idea one file down: today's list is a 33-byte
 * header and two lines of 85 and 121 bytes, and 64 KB holds five hundred more
 * of the longer one.
 */
const MAX_ASSETS = 20;
const MAX_PAGE_BYTES = 512 * 1024;
const MAX_ASSET_BYTES = 4 * 1024 * 1024;
const MAX_LIST_BYTES = 64 * 1024;

/**
 * What may be written into `dist/_astro/`. A host that has lost a file answers
 * `200` with an HTML page saying so — writing that over a stylesheet would
 * break the very deploy this step exists to save.
 */
const CARRIABLE = /^(?:text\/css|text\/javascript|application\/javascript|application\/ecmascript|text\/ecmascript)$/;

/**
 * Whether this run was given a build to fill at all — one spelling, because
 * two would be a hole between them: the publish of the digest list and the
 * carry both decline on it, so a value one of them accepted and the other did
 * not cannot publish a list into a directory nobody named.
 */
const noBuildDirectory = (dist) => typeof dist !== "string" || dist.trim() === "";

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
 * A file's bytes are read only when the list asks for them, which is only for
 * a name it will hold.
 */
export function writeAssetDigests(dist) {
  try {
    const dir = join(dist, "_astro");
    const files = existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => ({ name: entry.name, get bytes() { return readFileSync(join(dir, entry.name)); } }))
      : [];
    const list = digestListOf(files);
    writeFileSync(join(dist, DIGESTS_NAME), list.text);
    return { ok: true, count: list.count };
  } catch (e) {
    return { ok: false, why: sentenceOfError(e) };
  }
}

/**
 * The lines that say whether this build's digest list was published.
 *
 * There is nothing to say when there is no build: the carry refuses the same
 * value by name and its line is the whole of what happened, while a list
 * published anyway would land in whatever directory the process ran from. A
 * directory that is real and cannot be written into is a different thing, and
 * keeps the publish's own failure line.
 */
function digestListLines(dist, dryRun) {
  if (noBuildDirectory(dist)) return [];
  if (dryRun) return [`would publish ${DIGESTS_NAME} for the next deploy`];
  const published = writeAssetDigests(dist);
  if (published.ok) return [`published ${DIGESTS_NAME}: ${published.count} asset(s) this build made, for the next deploy to check against`];
  // An annotation, because a plain line here is invisible: on a deploy whose
  // page names are all already built, this run has nothing missing and nothing
  // to say, so a failed publish reads exactly like a healthy deploy — while
  // the NEXT deploy is guaranteed to carry nothing, which is the window this
  // step exists to close.
  return [oneLine(`::warning::could not publish ${DIGESTS_NAME} — ${published.why}; the next deploy has nothing to check a carried byte against, so it will carry nothing and the window is open on it`)];
}

/**
 * Fill `dist` with whatever the live `origin` still references, this build does
 * not have, and the live deploy's own digest list attests to — after publishing
 * this build's own list for the next deploy. Returns what happened, and in
 * `logLines` what the step says about it, each one line. It throws nothing:
 * everything it could not do comes back in `problems`, including being called
 * without the things it cannot work without.
 *
 * @param {{
 *   origin?: string,
 *   dist?: string,
 *   liveAnswerFor?: LiveAnswerFor,
 *   dryRun?: boolean,
 *   budgetMs?: number,
 * }} [options]
 */
export async function carryAssets({ origin, dist, liveAnswerFor, dryRun = false, budgetMs = BUDGET_MS } = {}) {
  const published = digestListLines(dist, dryRun);
  let record = {
    carried: [], problems: [], alreadyBuilt: [], needed: [], unserved: [], looked: false, from: "",
    // A throw is not one of the run's own bails and has none of their phrases
    // to carry, so this one blames nothing: what stopped the run is the caught
    // error, printed as its own line just above.
    where: "nowhere — the line above says what stopped this run",
  };
  try {
    record = await recordOfCarry({ origin, dist, liveAnswerFor, dryRun, budgetMs });
  } catch (e) {
    record.problems.push(`anything: ${sentenceOfError(e)}`);
  }
  return { ...record, logLines: [...published, ...logLinesOf(record, dryRun)] };
}

/**
 * The live deploy's digest list, or the reason this run will carry nothing.
 *
 * One request, and only when there is something to carry: a deploy that
 * changed neither asset has nothing to check, and spending a request to learn
 * that is a request too many.
 */
async function liveAssetDigests(answerWithinBudget, url) {
  const answer = await answerWithinBudget(url, MAX_LIST_BYTES);
  if (!answer.ok) return { ok: false, why: `${DIGESTS_NAME}: ${answer.why}` };
  if (answer.status !== 200)
    return { ok: false, why: `${DIGESTS_NAME}: answered ${answer.status} — the live deploy published no digest list for this one to check bytes against` };
  const body = await answer.readBody();
  if (!body.ok) return { ok: false, why: `${DIGESTS_NAME}: its body ${body.why}` };
  const list = readAssetDigests(body.bytes.toString("utf8"));
  return list.ok ? list : { ok: false, why: `${DIGESTS_NAME}: it ${list.why}` };
}

/**
 * What one run did: which names it carried and from where, which it left
 * behind and why. Every field `logLinesOf` reads to tell the three outcomes
 * apart comes from here.
 *
 * `needed` is what the live page references and this build lacks, whether or
 * not any of it could be carried, and `looked` is whether this run ever got
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
 */
async function recordOfCarry({ origin, dist, liveAnswerFor, dryRun, budgetMs }) {
  const carried = [];
  const problems = [];
  const alreadyBuilt = [];
  const needed = [];
  /**
   * References under our own origin that resolve somewhere this deploy does
   * not publish, exactly as `readAssetNames` hands them back: `{ ref, why }`.
   */
  const unserved = [];
  /**
   * Whether this run got far enough to know what the live page needs. Every
   * return above that point is a run that could not look, and a step that could
   * not look does not know whether the window is open — which is the one thing
   * its reader has to be able to tell apart from a healthy deploy.
   */
  let looked = false;
  /** The page this run actually read, once there is one: what was parsed, not what was handed in. */
  let from = "";
  /**
   * What the counted line names where a page would be, when there is no page.
   * It is decided AT THE BAIL that ends the run, because that is the only
   * place that knows which bail it was: three bails reach the counted line with
   * no page read, and only two of them are about the origin.
   *
   * The default is the parse failures', which are the two bails that reach
   * here and say nothing of their own. Nothing of an unparsed value ever
   * enters it — see "NEVER PRINT A VALUE THAT DID NOT PARSE" below.
   */
  let where = `a ${ORIGIN_VAR} no page could be read from`;
  const done = () => ({ carried, problems, alreadyBuilt, needed, unserved, looked, from, where: from || where });
  const deadline = Date.now() + budgetMs;
  /**
   * The live answer for `url`, with the request's timeout cut to what is left
   * of the run's budget — and no request at all once the budget is spent.
   */
  const answerWithinBudget = (url, byteCeiling) => {
    const timeoutMs = Math.min(TIMEOUT_MS, deadline - Date.now());
    if (timeoutMs <= 0) return Promise.resolve({ ok: false, why: "the run's time budget was already spent" });
    return liveAnswerFor(url, { byteCeiling, timeoutMs });
  };

  // No origin is the whole of what "no origin" means: there is no built-in
  // address to fall back to, so a build somewhere else never quietly carries
  // production's assets.
  if (typeof origin !== "string" || origin.trim() === "") {
    problems.push("anything: no origin was given");
    where = `an unset ${ORIGIN_VAR}`;
    return done();
  }
  // And it has to be an address rather than something that merely arrived in
  // the variable that holds one. `new URL` below would refuse most of these
  // too, but as a parse error; a value beginning `--` deserves to be named for
  // what it is (the entry's "Where the address comes from").
  //
  // NEVER PRINT A VALUE THAT DID NOT PARSE — the rule the two refusals here
  // and the counted line at the end all follow.
  //
  // Which population, because this file holds two and the rules differ. THIS
  // one is the ENVIRONMENT's: `CARRY_ORIGIN`, one value, and carrying a
  // credential is a thing it does. For it the rule is all or nothing — printed
  // whole once it has parsed (`new URL` has dropped the credentials by then),
  // and not printed at all until it has. The other population is the LIVE
  // PAGE's references and the origin's own header strings, which
  // `readAssetNames` and the carry loop print unparsed all the time and must:
  // they are how a deploy's log says which reference it refused and why, there
  // may be four hundred of them, and nobody's secret is in them. Their rule is
  // `log-wording.mjs`'s — bounded by `short`, flattened by `oneLine` — and
  // `could not carry http://[/_astro/x.css: it is not a URL` obeys it rather
  // than breaking this one.
  //
  // An UNPARSED address cannot be made safe by a rule about its shape: by
  // construction the values that reach these two lines are the ones that
  // failed `^https?://` or failed `new URL`, so a redaction keyed to `://` or
  // to an `@` would meet exactly the values it cannot read — missing a
  // credential, or reporting a host taken from the query. So: name the
  // variable, say what was wrong with it, and print nothing of it. Not even a
  // length, which is a secret's length.
  const given = origin.trim();
  if (!/^https?:\/\//i.test(given)) {
    problems.push(`anything: ${ORIGIN_VAR} is not an absolute http(s) address, so it is not somewhere to read a page from`);
    return done();
  }
  // And a build to fill, checked before a request is spent on a build there is
  // nowhere to put.
  if (noBuildDirectory(dist)) {
    problems.push("anything: no build directory was given");
    // The one bail here that is not about the origin, and the counted line
    // says so rather than naming a variable nothing was wrong with.
    where = "nowhere — no build directory was given, so no page was asked for";
    return done();
  }
  // Parsed once, and the parse is what is read from and printed, so the value
  // that was checked and the value that is fetched are one string. The parse
  // is also the only spelling of the address with nothing stray left in it:
  // whitespace, a line break and a fragment all end here rather than in a
  // request or in a log line.
  let home;
  try { home = new URL(given); } catch {
    // Not `sentenceOfError(e)` either, and for the same reason one step
    // further out: the error's wording is the runtime's, not this step's, and
    // the runtime is free to start putting the input it refused into it.
    // Node's is the constant "Invalid URL" today, which says nothing this line
    // does not.
    problems.push(`anything: ${ORIGIN_VAR} is not a URL, so it is not somewhere to read a page from`);
    return done();
  }
  home.hash = "";
  home.search = "";
  // And the credentials: `user:password@` survives the parse into the page
  // URL, into `from` and into every line this step prints. undici refuses to
  // build a request from a URL carrying credentials at all, so all they could
  // do here is put a secret in a deploy log.
  home.username = "";
  home.password = "";
  // The origin as given, path and all, not its host root: a site served from
  // a subpath carries it in its address, so reading the root would read
  // somebody else's page (`check:base` guards the same edge).
  if (!home.pathname.endsWith("/")) home.pathname += "/";
  const pageUrl = home.href;
  from = pageUrl;

  const page = await answerWithinBudget(pageUrl, MAX_PAGE_BYTES);
  if (!page.ok) { problems.push(`the live page ${pageUrl}: ${page.why}`); return done(); }
  if (page.status !== 200) { problems.push(`the live page ${pageUrl}: answered ${page.status}`); return done(); }
  const html = await page.readBody();
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
  // is a request no browser makes either.
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

  const list = await liveAssetDigests(answerWithinBudget, new URL(DIGESTS_NAME, pageUrl).href);
  if (!list.ok) { problems.push(`anything: ${list.why}`); return done(); }
  // Two questions, asked of two different sets.
  //
  // Whether the page and the list describe the same deploy is asked of the
  // page's WHOLE reference set: they are published together, so a list naming
  // not one of the names its page references is not that page's list — a proxy
  // holding one of them, or a deploy that landed between these two requests —
  // and there is then nothing to check ANY byte against. Asked of what is left
  // to carry instead, it would make an ordinary deploy a disagreement: both
  // real names are already built on a deploy that changed neither, so one
  // stray reference would be the whole of `needed`.
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
  // ours will ever carry, and refusing the run over it would leave every real
  // asset behind — one attribute in a page this step does not own, turning the
  // step off.
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
    const asset = await answerWithinBudget(new URL(`_astro/${name}`, pageUrl).href, MAX_ASSET_BYTES);
    if (!asset.ok) { problems.push(`${name}: ${asset.why}`); continue; }
    if (asset.status !== 200) { problems.push(`${name}: answered ${asset.status}`); continue; }
    const type = asset.contentType.split(";")[0].trim().toLowerCase();
    // `short` here for the same reason as on every reference above, one
    // population over: a `content-type` is a string the ORIGIN chose and this
    // step did not write, bounded by nothing but Node's header limit and
    // reachable once per asset, twenty times a run. `oneLine` already means it
    // cannot start a line of its own, so what `short` saves is a deploy log
    // somebody can read.
    if (!CARRIABLE.test(type)) { problems.push(`${name}: answered 200 as ${type ? short(type) : "no content type"}`); continue; }
    const body = await asset.readBody();
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
        problems.push(`${name}: it could not be written — ${sentenceOfError(e)}`);
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
 * What the step says about one run, each line through `oneLine`: what it
 * carried, what it could not, the counted line, and the verdict.
 *
 * WHEN THIS STEP ENDS QUIET — the rule, in the one place it is decided.
 * Nothing downstream reads this step's output, so the run summary is where a
 * reader's broken page is predicted or nowhere.
 *
 * THREE OUTCOMES, and they are the whole of what this step says about the page
 * a reader is holding: nothing to do · could not look · looked and something
 * is still missing. It ends quiet only on the first. The third has three
 * shapes, each its own line because each is a different thing that page needs
 * and does not have — a file this build lacks, a URL this deploy does not
 * publish, or any evidence at all that what answered was a page this site
 * published. Three lines, one outcome; a page can be wrong in more than one of
 * these ways at once and each is worth saying.
 *
 * Anything but the first is a `::warning::` on the run summary, as the
 * IndexNow step already uses for "nothing sent", and each says which it is.
 * The failed digest publish is annotated where it happens, in
 * `digestListLines`, and is not one of these three because it is not about
 * this page at all — its subject is the NEXT deploy, which without a list has
 * nothing to check a carried byte against.
 */
function logLinesOf(record, dryRun) {
  const lines = [];
  for (const { name, bytes, sha256 } of record.carried) {
    lines.push(oneLine(`${dryRun ? "would carry" : "carried"} ${name}  ${bytes} bytes  sha256:${sha256}`));
  }
  for (const problem of record.problems) lines.push(oneLine(`could not carry ${problem}`));
  // Where the page came from, and only ever the parse: `where` is `from` — set
  // the moment `new URL` succeeds — whenever there is one, so this names a host
  // exactly when a request was built for one. With no parse there is no
  // address to report, so what is printed is the phrase the bail that ended
  // the run chose for itself; the lines above have already said why.
  lines.push(oneLine(
    `${record.carried.length} asset(s) ${dryRun ? "would be carried" : "carried"} `
    + `from ${record.where}, `
    + `${record.alreadyBuilt.length} already in this build, ${record.problems.length} left behind`,
  ));
  return [...lines, ...verdictLinesOf(record)];
}

/** The annotations that say which of the three outcomes happened; none on the quiet one. */
function verdictLinesOf(record) {
  if (!record.looked) {
    return [oneLine(
      "::warning::could not read the live page, so this deploy does not know whether a reader holding it"
      + ` still finds its assets: ${record.problems.at(-1) ?? "no reason was given"}`,
    )];
  }
  const lines = [];
  const missing = record.needed.filter((name) => !record.carried.some((asset) => asset.name === name));
  const unserved = record.unserved.map(({ ref }) => ref);
  // A page whose every reference is unserved raises the first of these AND the
  // third, and that is the intended reading of two true things rather than one
  // predicate being loose. Counting `unserved` in with `alreadyBuilt` and
  // `needed` would still fire on a proxy notice, because a page referencing
  // nothing has no unserved reference either; what it would cost is this page,
  // which would then report only that one URL 404s and withhold the other
  // half, that NOTHING on it matched this deploy, which is the evidence that
  // the page answering may not be ours at all. Two questions, two answers, and
  // neither answers the other.
  if (record.alreadyBuilt.length + record.needed.length === 0) {
    lines.push(oneLine(
      "::warning::the live page answered 200 and references none of this deploy's assets"
      + " — every page of ours that is cached names them, so nothing here was checked against a page this site published",
    ));
  }
  if (missing.length) {
    lines.push(oneLine(
      `::warning::the live page references ${boundedList(missing)}, which this build does not have`
      + ` — a reader holding that page asks for ${missing.length === 1 ? "it" : "them"} and gets a 404`,
    ));
  }
  if (unserved.length) {
    lines.push(oneLine(
      `::warning::the live page references ${boundedList(unserved)}, which ${unserved.length === 1 ? "does" : "do"} not resolve to this deploy's assets`
      + ` — a reader holding that page asks for ${unserved.length === 1 ? "that URL" : "those URLs"} and gets a 404, and this step does not carry ${unserved.length === 1 ? "it" : "them"}`,
    ));
  }
  return lines;
}
