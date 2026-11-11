// @level infrastructure
/**
 * A program's file found on PATH, the one way the scripts look there.
 *
 * It reads PATH and asks the disk whether each folder holds a file of the
 * name. It refuses a relative folder of PATH, which names wherever the run
 * happens to stand, and asks no shell.
 */
import { existsSync, statSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";

/** Whether `path` names a file. */
const isFile = (path) => existsSync(path) && statSync(path).isFile();

/**
 * The first file named `name` in PATH's absolute folders, in PATH's order, or
 * undefined when none holds one.
 * @param {string} name
 * @returns {string | undefined}
 */
export function findOnPath(name) {
  const folders = (process.env.PATH ?? "").split(delimiter).filter((folder) => isAbsolute(folder));
  return folders.map((folder) => join(folder, name)).find(isFile);
}
