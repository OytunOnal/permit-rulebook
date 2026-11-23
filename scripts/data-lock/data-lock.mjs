// @level infrastructure
/**
 * The lock's rules, the one way in: `data.lock` names the data commit the
 * site is built against, not whatever the data clone happens to be at (see
 * the file's own comment), and the dataset version that commit carried.
 *
 * It reads the lock's text and writes a pinned one (`rules/lock-text.mjs`),
 * pins the data clone's HEAD into a lock, finds the data clone
 * (`disk/data-clone.mjs`) and says how it falls short of the lock
 * (`rules/shortfall.mjs`, asked through `disk/clone-questions.mjs`).
 *
 * It writes only the lock `pinData` is given, which must exist already: a
 * case pins into a copy in the OS temp folder, never into the site's own. It
 * returns what it found and prints nothing; the words are the run module's,
 * `scripts/data-lock-run`.
 */
import { resolve } from "node:path";
import { cloneQuestionsOf } from "./disk/clone-questions.mjs";
import { cloneDatasetVersionOf, cloneHeadOf, dataClonePath } from "./disk/data-clone.mjs";
import { readLockText, siteLockPath, writeLockText } from "./disk/lock-file.mjs";
import { parseLock, pinnedLockTextOf } from "./rules/lock-text.mjs";
import { shortfallOf } from "./rules/shortfall.mjs";

export { dataClonePath, pinnedLockTextOf };

/** What the lock's `text` says (the site's own lock by default): its sha and its dataset version. */
export function readLock(text = readLockText()) {
  return parseLock(text);
}

/**
 * Writes the HEAD and dataset version of the data clone at `clonePath` (the
 * site's own data clone by default) into the lock at `lockPath` (the site's
 * own `data.lock` by default), relative paths read from the working folder,
 * and returns the sha it named before, the sha it names now and the dataset
 * version. A HEAD or dataset version of the wrong shape is refused, and the
 * lock left unwritten.
 */
export function pinData({ lockPath = siteLockPath, clonePath } = {}) {
  const target = resolve(lockPath);
  const dir = clonePath === undefined ? dataClonePath() : resolve(clonePath);
  const sha = cloneHeadOf(dir);
  const datasetVersion = cloneDatasetVersionOf(dir);
  const lockText = readLockText(target);
  writeLockText(target, pinnedLockTextOf(lockText, { sha, datasetVersion }));
  return { previousSha: parseLock(lockText).sha, sha, datasetVersion };
}

/**
 * The lock's sha and the data clone's path the check reads: the lock at
 * `lockPath` and the clone at `clonePath` when given (relative paths read from
 * the working folder), else the site's own lock and its data clone.
 */
export function lockAndCloneOf({ lockPath, clonePath } = {}) {
  return {
    lockSha: parseLock(readLockText(lockPath)).sha,
    clonePath: clonePath === undefined ? dataClonePath() : resolve(clonePath),
  };
}

/**
 * How the clone falls short of the lock's sha, or null when it holds it:
 * `rules/shortfall.mjs`'s `CloneShortfall`, asked of the clone with local git
 * only. It refuses a lock whose sha is not 40 hex characters, before git sees
 * it.
 * @param {{ lockSha: string, clonePath: string }} [lockAndClone]
 */
export function cloneShortfallOf(lockAndClone = lockAndCloneOf()) {
  return shortfallOf(lockAndClone, cloneQuestionsOf(lockAndClone.clonePath));
}
