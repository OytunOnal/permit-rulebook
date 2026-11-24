// @level infrastructure
/**
 * The lock's rules, the one way in: `data.lock` names the data commit the
 * site is built against, not whatever the data clone happens to be at (see
 * the file's own comment), and the dataset version that commit carried.
 *
 * It reads the lock's text and writes a pinned one (`rules/lock-text.mjs`),
 * pins the data clone's HEAD into a lock, pins a deploy's built commit into
 * the lock and reads the commit a lock names, reads the HEAD and dataset version
 * of the data clone a build checked out and says whether a version has the
 * lock's shape (`isDatasetVersion`), chooses the data commit a deploy
 * run builds (`rules/data-commit.mjs`, the data master asked through
 * `disk/data-master.mjs`), finds the data clone (`disk/data-clone.mjs`) and
 * says how it falls short of the lock (`rules/shortfall.mjs`, asked through
 * `disk/clone-questions.mjs`).
 *
 * It writes only the lock `pinData` is given, or the site's in the folder
 * `pinBuiltCommit` is given, which must exist already: a
 * case pins into a copy in the OS temp folder, never into the site's own. It
 * returns what it found and prints nothing; the words are the run module's,
 * `scripts/data-lock-run`.
 */
import { resolve } from "node:path";
import { cloneQuestionsOf } from "./disk/clone-questions.mjs";
import { cloneDatasetVersionOf, cloneHeadOf, dataClonePath, dataDependencyPathOf } from "./disk/data-clone.mjs";
import { newestDataMasterOf } from "./disk/data-master.mjs";
import { lockPathIn, readLockText, siteLockPath, writeLockText } from "./disk/lock-file.mjs";
import { CHOOSE_COMMIT_REFUSALS, dataCommitOf } from "./rules/data-commit.mjs";
import { LockRefusal } from "./rules/lock-refusal.mjs";
import {
  checkedCloneHeadOf, CLONE_HEAD_REFUSAL, isDatasetVersion, LOCKED_SHA_REFUSAL, lockedShaOf, parseLock, PIN_REFUSALS, pinnedLockTextOf,
} from "./rules/lock-text.mjs";
import { shortfallOf } from "./rules/shortfall.mjs";

export {
  CHOOSE_COMMIT_REFUSALS, CLONE_HEAD_REFUSAL, dataClonePath, isDatasetVersion, LOCKED_SHA_REFUSAL, LockRefusal, lockedShaOf, PIN_REFUSALS,
  pinnedLockTextOf,
};

/** What the lock's `text` says (the site's own lock by default): its sha and its dataset version. */
export function readLock(text = readLockText()) {
  return parseLock(text);
}

/** The data clone at `clonePath`, relative to the working folder, when given; else the site's own data clone. */
function chosenClonePathOf(clonePath) {
  return clonePath === undefined ? dataClonePath() : resolve(clonePath);
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
  const dir = chosenClonePathOf(clonePath);
  const sha = cloneHeadOf(dir);
  const datasetVersion = cloneDatasetVersionOf(dir);
  const lockText = readLockText(target);
  writeLockText(target, pinnedLockTextOf(lockText, { sha, datasetVersion }));
  return { previousSha: parseLock(lockText).sha, sha, datasetVersion };
}

/**
 * Writes `sha` and `datasetVersion`, the data commit a deploy built and the
 * dataset version it carried, into the lock of the site checked out at
 * `siteDir` (the working folder by default), and returns the two it wrote. A
 * commit or version of the wrong shape is refused with a reason of
 * `PIN_REFUSALS`, and the lock left unwritten.
 * @param {{ sha: string, datasetVersion: string, siteDir?: string }} built
 */
export function pinBuiltCommit({ sha, datasetVersion, siteDir = "." }) {
  const lockPath = lockPathIn(siteDir);
  writeLockText(lockPath, pinnedLockTextOf(readLockText(lockPath), { sha, datasetVersion }));
  return { sha, datasetVersion };
}

/**
 * The commit the lock of the site checked out at `siteDir` (the working
 * folder by default) names, refused as `lockedShaOf` refuses a lock that
 * names no single 40-hex sha.
 */
export function lockedCommitOf(siteDir = ".") {
  return lockedShaOf(readLockText(lockPathIn(siteDir)));
}

/**
 * The HEAD of the data clone at `clonePath` (relative to the working folder),
 * checked for 40 hex and refused with `CLONE_HEAD_REFUSAL` when it is not,
 * and the dataset version its own file names, as found: the version is
 * unchecked, any JSON value or none, for its reader to ask `isDatasetVersion`.
 * @returns {{ sha: string, datasetVersion: unknown }}
 */
export function cloneHeadAndVersionOf(clonePath) {
  const dir = resolve(clonePath);
  return { sha: checkedCloneHeadOf(cloneHeadOf(dir)), datasetVersion: cloneDatasetVersionOf(dir) };
}

/**
 * The lock's sha and the data clone's path the check reads: the lock at
 * `lockPath` and the clone at `clonePath` when given (relative paths read from
 * the working folder), else the site's own lock and its data clone. A lock
 * that names no single 40-hex sha is refused, as `lockedShaOf` refuses it.
 */
export function lockAndCloneOf({ lockPath, clonePath } = {}) {
  return {
    lockSha: lockedShaOf(readLockText(lockPath)),
    clonePath: chosenClonePathOf(clonePath),
  };
}

/**
 * The data a deploy run builds, read from the site checked out at `siteDir`
 * (the working folder by default), its manifest and its lock:
 * `rules/data-commit.mjs`'s `dir`, `locked` and `sha`, each checked for its
 * shape, or a refusal before any is returned. The data master's newest
 * commit is asked of `dataRepositoryUrl` only on a schedule's first attempt.
 * @param {{ eventName: string, runAttempt: string, payloadSha: string, dataRepositoryUrl: string, siteDir?: string }} run
 */
export function chooseDataCommit({ eventName, runAttempt, payloadSha, dataRepositoryUrl, siteDir = "." }) {
  const site = resolve(siteDir);
  return dataCommitOf(
    { dependencyPath: dataDependencyPathOf(site), lockText: readLockText(lockPathIn(site)), eventName, runAttempt, payloadSha },
    () => newestDataMasterOf(dataRepositoryUrl, site),
  );
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
