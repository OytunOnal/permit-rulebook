/**
 * Carry the live site's assets forward, so a cached page still finds them.
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
 * It runs inside a deploy, which decides two things about it. It never fails:
 * a carrier that cannot carry must not take the site down with it, so every
 * failure is a printed line and the exit code is always 0. And it never
 * guesses: a file is written only when the host answered `200` with a CSS or
 * JavaScript content type, byte for byte, under the name the page asked for,
 * with its sha256 printed beside it.
 *
 *   node scripts/carry-assets.mjs                      # the live site into ./dist
 *   node scripts/carry-assets.mjs --origin <url>        # where the live site is
 *   node scripts/carry-assets.mjs --dist <dir>          # which build to fill
 *   node scripts/carry-assets.mjs --dry-run             # fetch and report, write nothing
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Where the site lives when nobody says otherwise. */
const DEFAULT_ORIGIN = "https://permitrulebook.com";

/**
 * A slow host must not hold a deploy open. Ten seconds is long enough for a
 * cold CDN edge and short enough that a hung origin costs the build nothing
 * worth noticing.
 */
const TIMEOUT_MS = 10_000;

/**
 * What may be written into `dist/_astro/`. A host that has lost a file answers
 * `200` with an HTML page saying so — writing that over a stylesheet would
 * break the very deploy this step exists to save.
 */
const CARRIABLE = /^(?:text\/css|text\/javascript|application\/javascript|application\/ecmascript|text\/ecmascript)$/;

/**
 * The names a page asks for, resolved against the page's own address: the site
 * is served under a base when no custom domain is bound, so the reference in
 * the HTML is not always the path on the host.
 */
export function assetRefs(html, pageUrl) {
  const out = new Map();
  for (const [, ref] of html.matchAll(/["']([^"']*\/_astro\/[A-Za-z0-9._-]+)["']/g)) {
    const url = new URL(ref, pageUrl);
    const name = url.pathname.split("/").pop();
    // The live host's HTML is a stranger's string: only a plain file name may
    // become a path under `dist/_astro/`.
    if (!/^[A-Za-z0-9._-]+$/.test(name) || name === "." || name === "..") continue;
    if (!out.has(name)) out.set(name, url.href);
  }
  return [...out].map(([name, href]) => ({ name, href }));
}

/** Fetch, with a failure that reads as a sentence rather than a stack. */
async function get(url) {
  try {
    return { ok: true, response: await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "follow" }) };
  } catch (e) {
    return { ok: false, why: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Fill `dist` with whatever the live `origin` still references and this build
 * does not have. Returns what happened; printing is the caller's.
 */
export async function carryAssets({ origin = DEFAULT_ORIGIN, dist, dryRun = false } = {}) {
  const carried = [];
  const problems = [];
  const alreadyBuilt = [];

  // The origin as given, not its host root: without a custom domain the site
  // is served from a subpath and `SITE_URL` carries it, so reading the root
  // would read somebody else's page (`check:base` guards the same edge).
  const pageUrl = origin.endsWith("/") ? origin : `${origin}/`;
  const page = await get(pageUrl);
  if (!page.ok) return { carried, problems: [`the live page ${pageUrl}: ${page.why}`], alreadyBuilt };
  if (page.response.status !== 200) {
    return { carried, problems: [`the live page ${pageUrl}: answered ${page.response.status}`], alreadyBuilt };
  }

  const refs = assetRefs(await page.response.text(), pageUrl);
  for (const { name, href } of refs) {
    const target = join(dist, "_astro", name);
    if (existsSync(target)) { alreadyBuilt.push(name); continue; }

    const asset = await get(href);
    if (!asset.ok) { problems.push(`${name}: ${asset.why}`); continue; }
    if (asset.response.status !== 200) { problems.push(`${name}: answered ${asset.response.status}`); continue; }
    const type = (asset.response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!CARRIABLE.test(type)) { problems.push(`${name}: answered 200 as ${type || "no content type"}`); continue; }

    const bytes = Buffer.from(await asset.response.arrayBuffer());
    if (!dryRun) {
      mkdirSync(join(dist, "_astro"), { recursive: true });
      writeFileSync(target, bytes);
    }
    carried.push({ name, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  return { carried, problems, alreadyBuilt };
}

/** `--name value` or `--name=value`; a flag that is not there keeps its default. */
function flag(argv, name) {
  const i = argv.indexOf(`--${name}`);
  if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1];
  const inline = argv.find((a) => a.startsWith(`--${name}=`));
  return inline ? inline.slice(name.length + 3) : undefined;
}

if (process.argv[1]?.split("\\").join("/").endsWith("/carry-assets.mjs")) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const dist = flag(argv, "dist") ?? join(root, "dist");
  const origin = flag(argv, "origin") ?? DEFAULT_ORIGIN;

  const { carried, problems, alreadyBuilt } = await carryAssets({ origin, dist, dryRun });
  for (const { name, bytes, sha256 } of carried) {
    console.log(`${dryRun ? "would carry" : "carried"} ${name}  ${bytes} bytes  sha256:${sha256}`);
  }
  for (const problem of problems) console.log(`could not carry ${problem}`);
  console.log(
    `${carried.length} asset(s) ${dryRun ? "would be carried" : "carried"} from ${origin}, `
    + `${alreadyBuilt.length} already in this build, ${problems.length} left behind`,
  );
  // Always 0. A deploy that fails because the previous generation could not be
  // rescued is worse than the ten-minute window it was rescuing (s33, point 2).
  process.exit(0);
}
