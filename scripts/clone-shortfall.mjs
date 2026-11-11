// @level infrastructure
/**
 * How the data clone falls short of the lock, or nothing: the rule the green's
 * first step (`npm run data:check`) and the pipeline's lock cases both ask.
 *
 * The clone holds the lock when its HEAD is the lock's commit or a descendant
 * of it; ahead is fine, since a developer moves the data first and pins it
 * after.
 *
 * It reads the lock (the site's own `data.lock`, or the one `--lock` names)
 * and asks the data clone local git questions only, through an argument list
 * with no shell; it never fetches, and writes nothing. It refuses a lock whose
 * sha is not 40 hex characters, before git sees it.
 *
 * It returns what fell short and prints nothing: the sentence and the remedy
 * are `cli-data-check.mjs`'s, and `main-data-check.mjs` runs the two.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { dataClonePath, readLock } from "./data-pin.mjs";

/** A full commit sha, the only form a lock names. */
const FULL_SHA = /^[0-9a-f]{40}$/;

/**
 * git's answer in `dir`, or null when git answered with exit code 1 (a "no",
 * such as `--is-ancestor`'s or a detached HEAD's); any other failure throws
 * with git's own words.
 */
function answerAt(dir, ...args) {
  try {
    return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    if (error.status === 1) return null;
    throw error;
  }
}

/** Whether the clone at `clonePath` has `sha` as a commit; git says "no" there with exit code 128. */
function hasCommit(clonePath, sha) {
  try {
    return answerAt(clonePath, "cat-file", "-t", sha) === "commit";
  } catch (error) {
    if (error.status === 128) return false;
    throw error;
  }
}

/**
 * The lock's sha and the data clone's path the check reads: the lock at
 * `lockPath` and the clone at `clonePath` when given (relative paths read from
 * the working folder), else the site's own lock and its data clone.
 */
export function lockAndCloneOf({ lockPath, clonePath } = {}) {
  return {
    lockSha: readLock(lockPath === undefined ? undefined : readFileSync(resolve(lockPath), "utf8")).sha,
    clonePath: clonePath === undefined ? dataClonePath() : resolve(clonePath),
  };
}

/**
 * How the clone at `clonePath` falls short of `lockSha`, or null when it holds
 * it. A shortfall names the clone's path, the lock's sha and its `kind`:
 * `no-clone` (nothing cloned at the path), `commit-missing` (the clone lacks
 * the lock's commit) or `head-lacks-commit` (the clone has it, but its HEAD
 * does not contain it). The last two also carry the clone's `head` and its
 * `branch`, null when HEAD is detached.
 */
export function cloneShortfallOf({ lockSha, clonePath } = lockAndCloneOf()) {
  if (!FULL_SHA.test(lockSha)) throw new Error(`the lock names ${JSON.stringify(lockSha)}, not a 40-hex commit sha`);
  if (!existsSync(join(clonePath, ".git"))) return { kind: "no-clone", clonePath, lockSha };
  const head = answerAt(clonePath, "rev-parse", "HEAD");
  const branch = answerAt(clonePath, "symbolic-ref", "--quiet", "--short", "HEAD");
  if (!hasCommit(clonePath, lockSha)) return { kind: "commit-missing", clonePath, lockSha, head, branch };
  // A commit is its own ancestor, so HEAD at the lock answers yes too.
  if (answerAt(clonePath, "merge-base", "--is-ancestor", lockSha, head) !== null) return null;
  return { kind: "head-lacks-commit", clonePath, lockSha, head, branch };
}
