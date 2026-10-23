// @level main
/**
 * The deploy's command for the carry: it reads its inputs, hands the flow the
 * live site over HTTP, the build directory on disk and the clock, prints what
 * the flow says, and exits 0 on every path.
 * Why the carry exists, what it carries and refuses, and what it says are
 * `carry-assets/carry.mjs`'s.
 *
 * It cannot fail the build: the flow throws nothing, the two handlers below
 * catch whatever nothing else did, and the process exits 0 on every path,
 * because a deploy that failed over a rescue of the previous generation would
 * be worse than the window it was rescuing.
 *
 * ## Where the address comes from
 *
 * From `CARRY_ORIGIN`, which the deploy sets from the reviewed address line in
 * `pages.yml`, and from nowhere else. It is an environment value and never a
 * flag, because `flag()` below reads any `--name value`: a value that became a
 * flag could be `--dry-run` or `--dist=<somewhere else>`, which ships an
 * artifact with no `asset-digests.txt` in it and leaves every later deploy
 * nothing to check a carried byte against — this step off, every deploy
 * green. A value cannot become a flag. `--dist` and `--dry-run` are the
 * surface a test and a person at a terminal drive this by, and the deploy
 * passes no argv at all, which `tests/pipeline.test.ts` pins along with the
 * rest of the step's block.
 *
 * There is no built-in fallback address: an origin this was not given is an
 * origin it does not have, and it says so and carries nothing rather than
 * quietly reaching for production from somebody else's build.
 *
 *   CARRY_ORIGIN=<url> node scripts/carry-assets.mjs  # the live site into ./dist
 *   node scripts/carry-assets.mjs --dist <dir>        # which build to fill
 *   node scripts/carry-assets.mjs --dry-run           # fetch and report, write nothing
 */
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDirectoryOnDisk } from "./build-directory-on-disk.mjs";
import { ORIGIN_VAR, carryAssets } from "./carry-assets/carry.mjs";
import { liveAnswerOverHttp } from "./live-site-over-http.mjs";
import { oneLine, sentenceOfError } from "./log-wording.mjs";

/**
 * `--name value` or `--name=value`; a flag that is not there keeps its default.
 *
 * This reads whatever is on the command line as a flag, which is exactly why
 * the live site's address is not on the command line: see the header, "Where
 * the address comes from".
 */
function flag(argv, name) {
  const i = argv.indexOf(`--${name}`);
  if (i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) return argv[i + 1];
  const inline = argv.find((a) => a.startsWith(`--${name}=`));
  return inline ? inline.slice(name.length + 3) : undefined;
}

// The floor under everything below: whatever gets this far is a printed line
// and a zero exit. Through `oneLine` like every other print, and this one most
// of all: it is the single site where a message nobody here wrote arrives, so
// it is the last place that should be able to start a line of its own.
const giveUp = (e) => { console.log(oneLine(`could not carry anything: ${sentenceOfError(e)}`)); process.exit(0); };
process.on("uncaughtException", giveUp);
process.on("unhandledRejection", giveUp);

const root = fileURLToPath(new URL("..", import.meta.url));
const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const dist = flag(argv, "dist") ?? join(root, "dist");
// A value in the environment and never a flag: the header's "Where the
// address comes from". `?? ""` rather than a fallback address, because an
// origin this was not given is refused by the flow. No flag moves the run's
// budget either: `--budget-ms 1` would make the step a no-op that exits 0.
const origin = process.env[ORIGIN_VAR] ?? "";

const { logLines } = await carryAssets({
  origin,
  buildDirectory: buildDirectoryOnDisk(dist),
  liveAnswerFor: liveAnswerOverHttp,
  now: Date.now,
  dryRun,
});
for (const line of logLines) console.log(line);
process.exit(0);
