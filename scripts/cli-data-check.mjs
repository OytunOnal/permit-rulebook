// @level presentation
/**
 * The data check's command line: the lock `--lock` names and the data clone
 * `--clone` names, as `lockAndCloneOf`'s options in `clone-shortfall.mjs`,
 * and the report of what `cloneShortfallOf` returned. It reads, runs and
 * prints nothing; `main-data-check.mjs` prints what it returns.
 *
 *   npm run data:check [-- --lock <path>] [-- --clone <path>]
 *
 * Both options exist for the cases; with neither, the site's own lock and its
 * data clone are checked. A red names one thing to run, picked by the clone's
 * branch, and never `data:pin`: when the clone is behind, pinning it would
 * move the site back onto older data.
 */
import { findOptionValue } from "./find-option-value.mjs";

/** Where the data repository is cloned from. */
const DATA_REPOSITORY_URL = "https://github.com/OytunOnal/permit-rulebook-data.git";

/** The check's options from the command's arguments: the lock after `--lock` and the clone after `--clone`, each left out when not given. */
export function dataCheckOptionsOf(argv) {
  const lockPath = findOptionValue(argv, "--lock", "--lock names no path: npm run data:check -- --lock <path>");
  const clonePath = findOptionValue(argv, "--clone", "--clone names no path: npm run data:check -- --clone <path>");
  return {
    ...(lockPath === undefined ? {} : { lockPath }),
    ...(clonePath === undefined ? {} : { clonePath }),
  };
}

/** The one thing a shortfall's red tells the maintainer to do: `clone`, `switch-to-master`, `pull` or `merge-master`. */
function remedyOf(shortfall) {
  if (shortfall.kind === "no-clone") return "clone";
  if (shortfall.branch === null) return "switch-to-master";
  return shortfall.branch === "master" ? "pull" : "merge-master";
}

/** What the clone lacks, in words: the first half of the red's sentence. */
function lackOf({ kind, clonePath, lockSha, head }) {
  if (kind === "no-clone") return `There is no data clone at ${clonePath}, so the lock's commit ${lockSha} cannot be read`;
  if (kind === "commit-missing") return `The data clone at ${clonePath} (HEAD ${head}) does not have the lock's commit ${lockSha}`;
  return `The data clone at ${clonePath} is at ${head}, behind the lock's commit ${lockSha}`;
}

/** The command a remedy runs on the clone at `clonePath`, in words. */
function commandOf(remedy, { clonePath, branch }) {
  if (remedy === "clone") return `run git clone ${DATA_REPOSITORY_URL} ${clonePath}`;
  if (remedy === "switch-to-master") return `switch it to master and pull: git -C ${clonePath} switch master, then git -C ${clonePath} pull --ff-only`;
  if (remedy === "pull") return `pull it forward: git -C ${clonePath} pull --ff-only`;
  return `merge the data master into ${branch}: git -C ${clonePath} fetch, then git -C ${clonePath} merge origin/master`;
}

/** The red's one sentence for `shortfall`: what the clone lacks and the one thing to run. */
export function shortfallSentenceOf(shortfall) {
  return `${lackOf(shortfall)}; ${commandOf(remedyOf(shortfall), shortfall)}.`;
}

/**
 * What the command prints, one JSON line, and the code it exits with: 0 with
 * an info line when the clone at `clonePath` holds `lockSha` (no shortfall),
 * 1 with an error line naming the sentence, its remedy, and the clone's HEAD
 * and branch where it has them, otherwise.
 */
export function dataCheckReportOf({ lockSha, clonePath }, shortfall) {
  if (shortfall === null)
    return { out: [JSON.stringify({ level: "info", msg: "the data clone holds the lock's commit", clone: clonePath, lock_sha: lockSha })], exitCode: 0 };
  const { head, branch } = shortfall;
  const line = {
    level: "error", msg: shortfallSentenceOf(shortfall), remedy: remedyOf(shortfall), clone: clonePath, lock_sha: lockSha,
    ...(head ? { head } : {}),
    ...(branch ? { branch } : {}),
  };
  return { err: [JSON.stringify(line)], exitCode: 1 };
}
