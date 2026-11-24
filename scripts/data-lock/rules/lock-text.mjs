// @level domain
/**
 * The lock's text: its `sha=` line, the data commit the site is built
 * against, and its `dataset_version=` line, the version that commit carried.
 * It reads and writes text only; the lock's file is `lock-file.mjs`'s.
 */
import { LockRefusal } from "./lock-refusal.mjs";

/** A full commit sha, the only form a lock names. */
const FULL_SHA = /^[0-9a-f]{40}$/;

/** Whether `value` is a full commit sha, 40 lower-case hex characters: the sha-shape check every rule of the module asks. */
export function isFullSha(value) {
  return FULL_SHA.test(value);
}

/** Why a data clone's HEAD is refused; it names the rule, never the value. */
export const CLONE_HEAD_REFUSAL = "the data clone's HEAD is not a commit of 40 lower-case hex characters";

/** `head`, a data clone's HEAD, checked: it refuses any but a full commit sha, the only form a lock names (a sha256 repository's is 64). */
export function checkedCloneHeadOf(head) {
  if (!isFullSha(head)) throw new LockRefusal(CLONE_HEAD_REFUSAL, "a built commit is refused");
  return head;
}

/** A dataset version, the only form a lock names: the data's dataset file stamps its day as YYYY.MM.DD. */
const DATASET_VERSION = /^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$/;

/** Whether `value` is a dataset version, a string of the form YYYY.MM.DD: the version-shape check every reader of a version asks. */
export function isDatasetVersion(value) {
  return typeof value === "string" && DATASET_VERSION.test(value);
}

/** What the lock's text says: its sha and its dataset version, each "" when its line is missing. */
export function parseLock(text) {
  const value = (key) => new RegExp(`^${key}=(.+)$`, "m").exec(text)?.[1]?.trim() ?? "";
  return { sha: value("sha"), datasetVersion: value("dataset_version") };
}

/** Why a lock's sha is refused; it names the rule, never the value, which is a stranger's text. */
export const LOCKED_SHA_REFUSAL = "the lock names no single 40-hex sha (run npm run data:pin and commit it)";

/**
 * The lock's one sha, checked: it refuses a lock whose `sha=` lines are not
 * exactly one, naming a full commit sha as it stands, since a second line
 * would hand on a second value.
 */
export function lockedShaOf(text) {
  const shas = [...text.matchAll(/^sha=(.*)$/gm)].map((match) => match[1]);
  if (shas.length !== 1 || !isFullSha(shas[0])) throw new LockRefusal(LOCKED_SHA_REFUSAL, "a locked commit is refused");
  return shas[0];
}

/**
 * Why a pinned lock is refused, by the value of the wrong shape. A refusal
 * names the rule, never the value: the value is a stranger's text.
 */
export const PIN_REFUSALS = Object.freeze({
  commit: "the commit is not 40 lower-case hex characters",
  datasetVersion: "the dataset version is not YYYY.MM.DD",
  lock: "the lock has no sha= line or no dataset_version= line to write",
});

/** Whether `lockText` holds both lines a pin writes over, a `sha=` line and a `dataset_version=` line. */
const hasBothLockLines = (lockText) => /^sha=/m.test(lockText) && /^dataset_version=/m.test(lockText);

/**
 * `lockText` with its `sha=` line naming `sha` and its `dataset_version=` line
 * naming `datasetVersion`; every other line kept. It refuses a `sha` not 40
 * lower-case hex, a `datasetVersion` not YYYY.MM.DD, and a lock missing either
 * line, which the pin could not write, so no lock of the wrong shape is
 * written.
 */
export function pinnedLockTextOf(lockText, { sha, datasetVersion }) {
  if (!isFullSha(sha)) throw new LockRefusal(PIN_REFUSALS.commit, "a pinned lock is refused");
  if (!isDatasetVersion(datasetVersion)) throw new LockRefusal(PIN_REFUSALS.datasetVersion, "a pinned lock is refused");
  if (!hasBothLockLines(lockText)) throw new LockRefusal(PIN_REFUSALS.lock, "a pinned lock is refused");
  return lockText
    .replace(/^sha=.*$/m, `sha=${sha}`)
    .replace(/^dataset_version=.*$/m, `dataset_version=${datasetVersion}`);
}
