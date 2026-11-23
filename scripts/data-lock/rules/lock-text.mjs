// @level domain
/**
 * The lock's text: its `sha=` line, the data commit the site is built
 * against, and its `dataset_version=` line, the version that commit carried.
 * It reads and writes text only; the lock's file is `lock-file.mjs`'s.
 */

/** A full commit sha, the only form a lock names. */
export const FULL_SHA = /^[0-9a-f]{40}$/;

/** What the lock's text says: its sha and its dataset version, each "" when its line is missing. */
export function parseLock(text) {
  const value = (key) => new RegExp(`^${key}=(.+)$`, "m").exec(text)?.[1]?.trim() ?? "";
  return { sha: value("sha"), datasetVersion: value("dataset_version") };
}

/**
 * The lock's one sha, checked: it refuses a lock whose `sha=` lines are not
 * exactly one, naming a full commit sha as it stands, since a second line
 * would hand on a second value.
 */
export function lockedShaOf(text) {
  const shas = [...text.matchAll(/^sha=(.*)$/gm)].map((match) => match[1]);
  if (shas.length !== 1 || !FULL_SHA.test(shas[0])) throw new Error("the lock names no single 40-hex sha: run npm run data:pin and commit it");
  return shas[0];
}

/** `lockText` with its `sha=` line naming `sha` and its `dataset_version=` line naming `datasetVersion`; every other line kept. */
export function pinnedLockTextOf(lockText, { sha, datasetVersion }) {
  return lockText
    .replace(/^sha=.*$/m, `sha=${sha}`)
    .replace(/^dataset_version=.*$/m, `dataset_version=${datasetVersion}`);
}
