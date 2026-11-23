// @level infrastructure
/**
 * The lock's file: the site's own `data.lock` by default, or the one a path
 * names (a relative path read from the working folder). It reads and writes
 * that one file's text, nothing else.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL("../../../package.json", import.meta.url)));

/** The site's own lock. */
export const siteLockPath = join(root, "data.lock");

/** The text of the lock at `lockPath`. */
export function readLockText(lockPath = siteLockPath) {
  return readFileSync(resolve(lockPath), "utf8");
}

/** Writes `text` over the lock at `lockPath`. */
export function writeLockText(lockPath, text) {
  writeFileSync(resolve(lockPath), text, "utf8");
}
