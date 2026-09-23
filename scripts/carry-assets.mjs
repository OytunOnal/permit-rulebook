/**
 * Carry the live site's assets forward, so a cached page still finds them.
 *
 * This file is the one place the reason is written down; the workflow step, the
 * two test files and the scenario point here rather than repeat it.
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
 * It fetches only from the origin it was given. A name comes out of the live
 * HTML, but the URL is always built here, from that origin — a reference to
 * another host, a protocol-relative one or a plaintext one is refused by name
 * and never fetched, and a redirect is an error rather than a hop, so nothing
 * the page says can make this reach a host nobody chose.
 *
 * And a hostile or broken origin cannot make it run away with the build: a
 * name is at most 128 characters, a body at most 4 MB, a run carries at most
 * 20 assets and lasts at most 60 seconds, and whatever is left over is printed
 * as not carried.
 *
 * A file is written only when the host answered `200` with a CSS or JavaScript
 * content type, byte for byte, under the name the page asked for, with its
 * sha256 printed beside it.
 *
 *   node scripts/carry-assets.mjs                 # the live site into ./dist
 *   node scripts/carry-assets.mjs --origin <url>  # where the live site is
 *   node scripts/carry-assets.mjs --dist <dir>    # which build to fill
 *   node scripts/carry-assets.mjs --dry-run       # fetch and report, write nothing
 *   node scripts/carry-assets.mjs --budget-ms <n> # the whole run's wall clock
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Where the site lives when nobody says otherwise.
 *
 * The workflow always passes `--origin "$SITE_URL"`, so this is the default for
 * a person at a terminal. It is deliberately NOT `SITE_URL`'s own fallback in
 * `pages.yml`: that fallback is the Pages address a run with nothing configured
 * deploys to, and this is the custom domain the site actually answers on — the
 * one whose cached pages are the defect.
 */
const DEFAULT_ORIGIN = "https://permitrulebook.com";

/**
 * A slow host must not hold a deploy open. Ten seconds per request is long
 * enough for a cold CDN edge; sixty for the whole run is more than four
 * requests could honestly need, and it is the ceiling on how long a silent
 * origin can cost this build.
 */
const TIMEOUT_MS = 10_000;
const BUDGET_MS = 60_000;

/**
 * What one origin may make this step do. Today the page names two assets of
 * 27 KB and 244 KB; these are the orders of magnitude above that, so a page
 * that has been tampered with cannot turn a deploy into a download.
 */
const MAX_NAME = 128;
const MAX_ASSETS = 20;
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * What may be written into `dist/_astro/`. A host that has lost a file answers
 * `200` with an HTML page saying so — writing that over a stylesheet would
 * break the very deploy this step exists to save.
 */
const CARRIABLE = /^(?:text\/css|text\/javascript|application\/javascript|application\/ecmascript|text\/ecmascript)$/;

/** An error as a sentence, with the cause `fetch failed` always hides. */
const say = (e) => {
  const message = e instanceof Error ? e.message : String(e);
  const cause = e instanceof Error && e.cause instanceof Error ? e.cause.message : "";
  return cause && !message.includes(cause) ? `${message} (${cause})` : message;
};

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
  const names = [];
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
    // Only a plain file name may become a path under `dist/_astro/`.
    if (!/^[A-Za-z0-9._-]+$/.test(name) || name === "." || name === "..") {
      refused.push({ ref, why: "is not a plain file name" });
      continue;
    }
    if (!names.includes(name)) names.push(name);
  }
  return { names, refused };
}

/**
 * Fetch, with every failure a sentence rather than a stack, and a redirect a
 * failure rather than a hop: following one would walk off the origin this step
 * is allowed to read.
 */
async function get(url, timeoutMs) {
  if (timeoutMs <= 0) return { ok: false, why: "the run's time budget was already spent" };
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "error" });
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
 */
async function bodyWithin(response, limit) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return { ok: false, why: `declares ${declared} bytes, over the ${limit}-byte ceiling` };
  if (!response.body) return { ok: true, bytes: Buffer.alloc(0) };
  const chunks = [];
  let total = 0;
  try {
    for await (const chunk of response.body) {
      total += chunk.length;
      if (total > limit) return { ok: false, why: `is over the ${limit}-byte ceiling` };
      chunks.push(Buffer.from(chunk));
    }
  } catch (e) {
    return { ok: false, why: say(e) };
  }
  return { ok: true, bytes: Buffer.concat(chunks, total) };
}

/**
 * Fill `dist` with whatever the live `origin` still references and this build
 * does not have. Returns what happened; printing is the caller's. It throws
 * nothing: everything it could not do comes back in `problems`.
 */
export async function carryAssets({ origin = DEFAULT_ORIGIN, dist, dryRun = false, budgetMs = BUDGET_MS } = {}) {
  const carried = [];
  const problems = [];
  const alreadyBuilt = [];
  const done = () => ({ carried, problems, alreadyBuilt });
  const deadline = Date.now() + budgetMs;
  const left = () => Math.min(TIMEOUT_MS, deadline - Date.now());

  // An empty `--origin` used to fall through to the default and quietly carry
  // production's assets into somebody else's build (Standards review).
  if (typeof origin !== "string" || origin.trim() === "") {
    problems.push("anything: no origin was given");
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
  const html = await bodyWithin(page.response, MAX_BYTES);
  if (!html.ok) { problems.push(`the live page ${pageUrl}: its body ${html.why}`); return done(); }

  const { names, refused } = readAssetNames(html.bytes.toString("utf8"), pageUrl);
  for (const { ref, why } of refused) problems.push(`${ref}: it ${why}`);

  for (const name of names) {
    if (carried.length >= MAX_ASSETS) { problems.push(`${name}: this run had already carried its ceiling of ${MAX_ASSETS}`); continue; }
    if (deadline - Date.now() <= 0) { problems.push(`${name}: the run's ${budgetMs} ms budget was spent`); continue; }

    const target = join(dist, "_astro", name);
    if (existsSync(target)) { alreadyBuilt.push(name); continue; }

    // Built here, from the origin this run was given — never from the ref.
    const asset = await get(new URL(`_astro/${name}`, pageUrl).href, left());
    if (!asset.ok) { problems.push(`${name}: ${asset.why}`); continue; }
    if (asset.response.status !== 200) { problems.push(`${name}: answered ${asset.response.status}`); continue; }
    const type = (asset.response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!CARRIABLE.test(type)) { problems.push(`${name}: answered 200 as ${type || "no content type"}`); continue; }
    const body = await bodyWithin(asset.response, MAX_BYTES);
    if (!body.ok) { problems.push(`${name}: its body ${body.why}`); continue; }

    if (!dryRun) {
      try {
        mkdirSync(join(dist, "_astro"), { recursive: true });
        writeFileSync(target, body.bytes);
      } catch (e) {
        problems.push(`${name}: it could not be written — ${say(e)}`);
        continue;
      }
    }
    carried.push({ name, bytes: body.bytes.length, sha256: createHash("sha256").update(body.bytes).digest("hex") });
  }
  return done();
}

/** `--name value` or `--name=value`; a flag that is not there keeps its default. */
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
  const origin = flag(argv, "origin") ?? DEFAULT_ORIGIN;
  const budget = Number(flag(argv, "budget-ms") ?? BUDGET_MS);
  const budgetMs = Number.isFinite(budget) && budget > 0 ? budget : BUDGET_MS;

  let result = { carried: [], problems: [], alreadyBuilt: [] };
  try {
    result = await carryAssets({ origin, dist, dryRun, budgetMs });
  } catch (e) {
    result.problems.push(`anything: ${say(e)}`);
  }
  for (const { name, bytes, sha256 } of result.carried) {
    console.log(`${dryRun ? "would carry" : "carried"} ${name}  ${bytes} bytes  sha256:${sha256}`);
  }
  for (const problem of result.problems) console.log(`could not carry ${problem}`);
  console.log(
    `${result.carried.length} asset(s) ${dryRun ? "would be carried" : "carried"} from ${origin}, `
    + `${result.alreadyBuilt.length} already in this build, ${result.problems.length} left behind`,
  );
  process.exit(0);
}
