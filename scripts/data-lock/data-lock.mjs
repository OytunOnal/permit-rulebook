// @level infrastructure
/**
 * The lock's rules, the one way in: `data.lock` names the data commit the
 * site is built against, not whatever the data clone happens to be at (see
 * the file's own comment), and the dataset version that commit carried.
 *
 * It reads the lock's text and writes a pinned one (`rules/lock-text.mjs`),
 * pins the data clone's HEAD into a lock, chooses the data commit a deploy
 * run builds (`rules/data-commit.mjs`, the data master asked through
 * `disk/data-master.mjs`), finds the data clone (`disk/data-clone.mjs`) and
 * says how it falls short of the lock (`rules/shortfall.mjs`, asked through
 * `disk/clone-questions.mjs`).
 *
 * It writes only the lock `pinData` is given, which must exist already: a
 * case pins into a copy in the OS temp folder, never into the site's own. It
 * returns what it found and prints nothing; the words are the run module's,
 * `scripts/data-lock-run`.
 */
import { join, resolve } from "node:path";
import { cloneQuestionsOf } from "./disk/clone-questions.mjs";
import { cloneDatasetVersionOf, cloneHeadOf, dataClonePath, dataDependencyOf } from "./disk/data-clone.mjs";
import { newestDataMasterOf } from "./disk/data-master.mjs";
import { readLockText, siteLockPath, writeLockText } from "./disk/lock-file.mjs";
import { dataCommitOf } from "./rules/data-commit.mjs";
import { parseLock, pinnedLockTextOf } from "./rules/lock-text.mjs";
import { shortfallOf } from "./rules/shortfall.mjs";

export { dataClonePath, pinnedLockTextOf };

/** What the lock's `text` says (the site's own lock by default): its sha and its dataset version. */
export function readLock(text = readLockText()) {
  return parseLock(text);
}

/**
 * Writes the data clone's HEAD and dataset version into the lock at
 * `lockPath` (the site's own `data.lock` by default, a relative path read from
 * the working folder), and returns the sha it named before, the sha it names
 * now and the dataset version.
 */
export function pinData({ lockPath = siteLockPath } = {}) {
  const target = resolve(lockPath);
  const dir = dataClonePath();
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
    { dependency: dataDependencyOf(site), lockText: readLockText(join(site, "data.lock")), eventName, runAttempt, payloadSha },
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
