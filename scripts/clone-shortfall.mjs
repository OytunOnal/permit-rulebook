// @level infrastructure
/**
 * How the data clone falls short of the lock, or nothing: the rule the green's
 * first step (`npm run data:check`) and the pipeline's lock cases both ask.
 *
 * The clone holds the lock when its HEAD is the lock's commit or a descendant
 * of it; ahead is fine, since a developer moves the data first and pins it
 * after. A master that has left the lock's line is told apart from one behind
 * it, since only the second can be pulled forward.
 *
 * It reads the lock (the site's own `data.lock`, or the one `--lock` names)
 * and asks the data clone local git questions only, through an argument list
 * with no shell; it never fetches, and writes nothing. It refuses a lock whose
 * sha is not 40 hex characters, before git sees it.
 *
 * It returns what fell short and prints nothing: the sentence and the remedy
 * are `cli-data-check.mjs`'s, and `main-data-check.mjs` runs the two.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { dataClonePath, readLock } from "./data-pin.mjs";
import { runGit, runGitOrNull } from "./run-git.mjs";

/** A full commit sha, the only form a lock names. */
const FULL_SHA = /^[0-9a-f]{40}$/;

/** Whether the clone at `clonePath` has `sha` as a commit; git says "no" there with exit code 128. */
function hasCommit(clonePath, sha) {
  try {
    return runGit(clonePath, "cat-file", "-t", sha) === "commit";
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
    lockSha: (lockPath === undefined ? readLock() : readLock(readFileSync(resolve(lockPath), "utf8"))).sha,
    clonePath: clonePath === undefined ? dataClonePath() : resolve(clonePath),
  };
}

/** Whether `ancestor` is `descendant` or behind it, in the clone at `clonePath`. */
const isAncestor = (clonePath, ancestor, descendant) =>
  runGitOrNull(clonePath, "merge-base", "--is-ancestor", ancestor, descendant) !== null;

/**
 * Whether `head` holds commits the clone's own `origin/master` lacks, read
 * offline from the remote-tracking ref; false when there is no `origin/master`.
 */
function isAheadOfOriginMaster(clonePath, head) {
  const originMaster = runGitOrNull(clonePath, "rev-parse", "--verify", "--quiet", "refs/remotes/origin/master");
  return originMaster !== null && !isAncestor(clonePath, head, originMaster);
}

/** How `head` falls short of `lockSha`: `commit-missing` or `head-lacks-commit`, or null when it holds it. */
function headShortfallKindOf(clonePath, lockSha, head) {
  if (!hasCommit(clonePath, lockSha)) return "commit-missing";
  // A commit is its own ancestor, so HEAD at the lock answers yes too.
  return isAncestor(clonePath, lockSha, head) ? null : "head-lacks-commit";
}

/**
 * Whether master at `head`, short of `lockSha` as `kind` says, has diverged
 * from the lock's line: the clone has the lock's commit and HEAD is neither
 * ahead of it nor behind it, or HEAD holds commits `origin/master` lacks (a
 * local merge whose push was refused). `pull --ff-only` is refused on either.
 */
function hasDiverged(clonePath, { lockSha, head, kind }) {
  if (kind === "head-lacks-commit" && !isAncestor(clonePath, head, lockSha)) return true;
  return isAheadOfOriginMaster(clonePath, head);
}

/**
 * How the data clone falls short of the lock.
 * @typedef {object} CloneShortfall
 * @property {"no-clone" | "commit-missing" | "head-lacks-commit" | "diverged"} kind
 * @property {string} clonePath
 * @property {string} lockSha
 * @property {string | null} [head] the clone's HEAD, null when it has no commit yet
 * @property {string | null} [branch] the clone's branch, null when HEAD is detached
 */

/**
 * How the clone at `clonePath` falls short of `lockSha`, or null when it holds
 * it. A shortfall names the clone's path, the lock's sha and its `kind`:
 * `no-clone` (nothing cloned at the path), `commit-missing` (the clone lacks
 * the lock's commit, or has no commit yet), `head-lacks-commit` (the clone has
 * it, but its HEAD does not contain it) or `diverged` (on master, which has
 * left the lock's line, as `hasDiverged` reads it). All but the first also
 * carry the clone's `head` and its `branch`, null when HEAD is detached.
 * @param {{ lockSha: string, clonePath: string }} [lockAndClone]
 * @returns {CloneShortfall | null}
 */
export function cloneShortfallOf({ lockSha, clonePath } = lockAndCloneOf()) {
  if (!FULL_SHA.test(lockSha)) throw new Error(`the lock names ${JSON.stringify(lockSha)}, not a 40-hex commit sha`);
  if (!existsSync(join(clonePath, ".git"))) return { kind: "no-clone", clonePath, lockSha };
  const branch = runGitOrNull(clonePath, "symbolic-ref", "--quiet", "--short", "HEAD");
  // git answers no here only while HEAD's branch has no commit yet.
  const head = runGitOrNull(clonePath, "rev-parse", "--verify", "--quiet", "HEAD");
  if (head === null) return { kind: "commit-missing", clonePath, lockSha, head, branch };
  const kind = headShortfallKindOf(clonePath, lockSha, head);
  if (kind === null) return null;
  const diverged = branch === "master" && hasDiverged(clonePath, { lockSha, head, kind });
  return { kind: diverged ? "diverged" : kind, clonePath, lockSha, head, branch };
}
