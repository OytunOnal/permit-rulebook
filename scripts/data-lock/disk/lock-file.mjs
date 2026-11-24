// @level infrastructure
/**
 * The lock's file: the site's own `data.lock` by default, the one in the site
 * a folder holds, or the one a path names (a relative path read from the
 * working folder). It reads and writes that one file's text, nothing else,
 * and is the one place the lock's file name is joined.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { siteRoot } from "./site-root.mjs";

/** The lock of the site checked out at `siteDir`, relative to the working folder. */
export function lockPathIn(siteDir) {
  return join(resolve(siteDir), "data.lock");
}

/** The site's own lock. */
export const siteLockPath = lockPathIn(siteRoot);

/** The text of the lock at `lockPath`. */
export function readLockText(lockPath = siteLockPath) {
  return readFileSync(resolve(lockPath), "utf8");
}

/** Writes `text` over the lock at `lockPath`. */
export function writeLockText(lockPath, text) {
  writeFileSync(resolve(lockPath), text, "utf8");
}
