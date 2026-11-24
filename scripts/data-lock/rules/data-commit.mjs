// @level domain
/**
 * Which data commit a deploy run builds, and the folder it checks the data
 * out into: chosen once, in the workflow's `data-commit` job, and handed on.
 *
 * A push, a pull request or a manual run builds the lock's commit: re-running
 * a green deploy rebuilds what deployed, and no data commit can break a
 * deploy that changed nothing on the site. The schedule and the data watch's
 * dispatch exist to build the newest data, so their first attempt builds the
 * data master's newest commit or the dispatch's payload, and the pin writes it
 * back into the lock when the run goes green. A rerun keeps its event's name,
 * so only a first attempt may move off the lock.
 *
 * Every value it returns comes from a file a pull request may change or from
 * an event's payload, and each becomes a step output, where a second line
 * would be a second output: each is checked for its shape before it is
 * returned, and a value of the wrong shape is refused with a reason from
 * `CHOOSE_COMMIT_REFUSALS`, never echoed.
 */
import { posix } from "node:path";
import { LockRefusal } from "./lock-refusal.mjs";
import { FULL_SHA, LOCKED_SHA_REFUSAL, lockedShaOf } from "./lock-text.mjs";

/** A data folder the build may check out into and work in: the shape the manifest's folder has always had. */
const PLAIN_FOLDER = /^[a-z0-9-]+$/;

/** Why no data commit is chosen, by the value of the wrong shape. A refusal names the rule, never the value. */
export const CHOOSE_COMMIT_REFUSALS = Object.freeze({
  dataFolder: "the manifest names no plain folder for the data",
  lock: LOCKED_SHA_REFUSAL,
  chosenCommit: "the run chose no 40-hex data commit",
});

/** The folder the data is checked out into: the last part of the manifest's `file:` path for the data package, refused unless a plain name. */
function dataFolderOf(dependency) {
  const folder = posix.basename(dependency.replace(/^file:/, ""));
  if (!PLAIN_FOLDER.test(folder)) throw new LockRefusal(CHOOSE_COMMIT_REFUSALS.dataFolder, "no data commit is chosen");
  return folder;
}

/** The commit a run of `eventName`, attempt `runAttempt`, builds; the newest master is asked only when it is the one. */
function chosenShaOf({ eventName, runAttempt, payloadSha }, lockedSha, newestMasterSha) {
  if (runAttempt !== "1") return lockedSha;
  if (eventName === "schedule") return newestMasterSha();
  if (eventName === "repository_dispatch") return payloadSha;
  return lockedSha;
}

/**
 * The data a run builds: `dir`, the folder it checks the data out into;
 * `locked`, the lock's commit; `sha`, the commit it builds. It refuses, before
 * returning any, a manifest folder that is not a plain name, a lock that does
 * not name one 40-hex sha, and a chosen commit that is not 40 hex.
 * @param {{ dependency: string, lockText: string, eventName: string, runAttempt: string, payloadSha: string }} run
 * @param {() => string} newestMasterSha the data master's newest commit, asked only on a schedule's first attempt
 * @returns {{ dir: string, locked: string, sha: string }}
 */
export function dataCommitOf(run, newestMasterSha) {
  const dir = dataFolderOf(run.dependency);
  const locked = lockedShaOf(run.lockText);
  const sha = chosenShaOf(run, locked, newestMasterSha);
  if (!FULL_SHA.test(sha)) throw new LockRefusal(CHOOSE_COMMIT_REFUSALS.chosenCommit, "no data commit is chosen");
  return { dir, locked, sha };
}
