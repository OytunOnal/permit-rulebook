import { fileURLToPath } from "node:url";
import { pinnedLockTextOf } from "../scripts/data-lock/data-lock.mjs";
import { LF } from "./throwaway-folder.js";
import { readText } from "./workflow-text.js";

/**
 * A malformed lock for a refusal's case, made by breaking a good one by a
 * named step (Q339 on #446): the good lock is the site's own, pinned through
 * `data-lock`'s entry; each break below is one step. Only
 * `tests/data-lock.test.ts` writes lock text by hand.
 */

/** The site's own lock, with the runner's line endings. */
const siteLockText = readText(fileURLToPath(new URL("../data.lock", import.meta.url)));

/** A key of a lock's line. */
type LockKey = "sha" | "dataset_version";

/** A good lock: the site's own, every other line kept, pinned through the entry to `sha` and `datasetVersion`. */
export function goodLockText({ sha, datasetVersion }: { sha: string; datasetVersion: string }): string {
  return pinnedLockTextOf(siteLockText, { sha, datasetVersion });
}

/** `lock` with a second `key=` line after its own, naming `value`. */
export const withSecondLine = (lock: string, key: LockKey, value: string): string => `${lock}${key}=${value}${LF}`;

/** `lock` with its `key=` line dropped. */
export const withLineDropped = (lock: string, key: LockKey): string =>
  lock.split(LF).filter((line) => !line.startsWith(`${key}=`)).join(LF);

/** How many of its characters a sha cut short keeps: git's short form, never the 40 a lock names. */
export const CUT_SHA_LENGTH = 12;

/** `lock` with its sha cut short to its first `CUT_SHA_LENGTH` characters. */
export const withShaCutShort = (lock: string): string =>
  lock.split(LF).map((line) => (line.startsWith("sha=") ? line.slice(0, "sha=".length + CUT_SHA_LENGTH) : line)).join(LF);
