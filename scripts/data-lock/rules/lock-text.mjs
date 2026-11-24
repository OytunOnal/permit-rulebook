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

/** A dataset version, the only form a lock names: the data's dataset file stamps its day as YYYY.MM.DD. */
const DATASET_VERSION = /^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$/;

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
});

/**
 * `lockText` with its `sha=` line naming `sha` and its `dataset_version=` line
 * naming `datasetVersion`; every other line kept. It refuses a `sha` not 40
 * lower-case hex and a `datasetVersion` not YYYY.MM.DD, so no lock of the
 * wrong shape is written.
 */
export function pinnedLockTextOf(lockText, { sha, datasetVersion }) {
  if (!isFullSha(sha)) throw new LockRefusal(PIN_REFUSALS.commit, "a pinned lock is refused");
  if (!DATASET_VERSION.test(datasetVersion)) throw new LockRefusal(PIN_REFUSALS.datasetVersion, "a pinned lock is refused");
  return lockText
    .replace(/^sha=.*$/m, `sha=${sha}`)
    .replace(/^dataset_version=.*$/m, `dataset_version=${datasetVersion}`);
}
