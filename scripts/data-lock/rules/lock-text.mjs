// @level domain
/**
 * The lock's text: its `sha=` line, the data commit the site is built
 * against, and its `dataset_version=` line, the version that commit carried.
 * It reads and writes text only; the lock's file is `lock-file.mjs`'s.
 */

/** A full commit sha, the only form a lock names. */
export const FULL_SHA = /^[0-9a-f]{40}$/;

/** A dataset version, the only form a lock names: the data's dataset file stamps its day as YYYY.MM.DD. */
const DATASET_VERSION = /^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$/;

/** What the lock's text says: its sha and its dataset version, each "" when its line is missing. */
export function parseLock(text) {
  const value = (key) => new RegExp(`^${key}=(.+)$`, "m").exec(text)?.[1]?.trim() ?? "";
  return { sha: value("sha"), datasetVersion: value("dataset_version") };
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
  if (!FULL_SHA.test(sha)) throw new Error(`a pinned lock is refused: ${PIN_REFUSALS.commit}`);
  if (!DATASET_VERSION.test(datasetVersion)) throw new Error(`a pinned lock is refused: ${PIN_REFUSALS.datasetVersion}`);
  return lockText
    .replace(/^sha=.*$/m, `sha=${sha}`)
    .replace(/^dataset_version=.*$/m, `dataset_version=${datasetVersion}`);
}
