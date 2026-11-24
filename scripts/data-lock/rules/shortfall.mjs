// @level domain
/**
 * How the data clone falls short of the lock, or nothing: the rule the green's
 * first step (`npm run data:check`) and the pipeline's lock cases both ask.
 *
 * The clone holds the lock when its HEAD is the lock's commit or a descendant
 * of it; ahead is fine, since a developer moves the data first and pins it
 * after. A master that has left the lock's line is told apart from one behind
 * it, since only the second can be pulled forward.
 *
 * It asks the clone only through the questions it is handed
 * (`clone-questions.mjs` answers them with local git), and refuses a lock
 * whose sha is not 40 hex characters before asking any.
 */
import { LockRefusal, REFUSAL_CONTEXTS } from "./lock-refusal.mjs";
import { isFullSha, LOCKED_SHA_REFUSAL } from "./lock-text.mjs";

/**
 * The questions the rule asks the data clone.
 * @typedef {object} CloneQuestions
 * @property {() => boolean} isCloned whether anything is cloned at the path
 * @property {() => string | null} branchOrNull the clone's branch, null when HEAD is detached
 * @property {() => string | null} headOrNull the clone's HEAD, null while its branch has no commit yet
 * @property {(sha: string) => boolean} hasCommit whether the clone has `sha` as a commit
 * @property {(ancestor: string, descendant: string) => boolean} isAncestor whether `ancestor` is `descendant` or behind it
 * @property {() => string | null} originMasterOrNull the clone's `origin/master`, read offline, null when it has none
 */

/**
 * Whether `head` holds commits the clone's own `origin/master` lacks; false
 * when there is no `origin/master`.
 */
function isAheadOfOriginMaster(clone, head) {
  const originMaster = clone.originMasterOrNull();
  return originMaster !== null && !clone.isAncestor(head, originMaster);
}

/** How `head` falls short of `lockSha`: `commit-missing` or `head-lacks-commit`, or null when it holds it. */
function headShortfallKindOf(clone, lockSha, head) {
  if (!clone.hasCommit(lockSha)) return "commit-missing";
  // A commit is its own ancestor, so HEAD at the lock answers yes too.
  return clone.isAncestor(lockSha, head) ? null : "head-lacks-commit";
}

/**
 * Whether master at `head`, short of `lockSha` as `kind` says, has diverged
 * from the lock's line: the clone has the lock's commit and HEAD is neither
 * ahead of it nor behind it, or HEAD holds commits `origin/master` lacks (a
 * local merge whose push was refused). `pull --ff-only` is refused on either.
 */
function hasDiverged(clone, { lockSha, head, kind }) {
  if (kind === "head-lacks-commit" && !clone.isAncestor(head, lockSha)) return true;
  return isAheadOfOriginMaster(clone, head);
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
 * How the clone at `clonePath`, asked through `clone`, falls short of
 * `lockSha`, or null when it holds it. A shortfall names the clone's path, the
 * lock's sha and its `kind`: `no-clone` (nothing cloned at the path),
 * `commit-missing` (the clone lacks the lock's commit, or has no commit yet),
 * `head-lacks-commit` (the clone has it, but its HEAD does not contain it) or
 * `diverged` (on master, which has left the lock's line, as `hasDiverged`
 * reads it). All but the first also carry the clone's `head` and its
 * `branch`, null when HEAD is detached.
 * @param {{ lockSha: string, clonePath: string }} lockAndClone
 * @param {CloneQuestions} clone
 * @returns {CloneShortfall | null}
 */
export function shortfallOf({ lockSha, clonePath }, clone) {
  if (!isFullSha(lockSha)) throw new LockRefusal(LOCKED_SHA_REFUSAL, REFUSAL_CONTEXTS.lockedCommit);
  if (!clone.isCloned()) return { kind: "no-clone", clonePath, lockSha };
  const branch = clone.branchOrNull();
  const head = clone.headOrNull();
  if (head === null) return { kind: "commit-missing", clonePath, lockSha, head, branch };
  const kind = headShortfallKindOf(clone, lockSha, head);
  if (kind === null) return null;
  const diverged = branch === "master" && hasDiverged(clone, { lockSha, head, kind });
  return { kind: diverged ? "diverged" : kind, clonePath, lockSha, head, branch };
}
