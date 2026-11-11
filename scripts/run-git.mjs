// @level infrastructure
/**
 * git run in a folder: the one way the scripts ask git anything.
 *
 * git is run by an argument list, never through a shell, and found in PATH's
 * absolute folders only: a relative folder names wherever the run happens to
 * stand, and on Windows a bare name would be looked for in the current folder
 * first. It reads PATH and runs git; it refuses to run anything when no
 * absolute folder of PATH holds git.
 */
import { execFileSync } from "node:child_process";
import { findOnPath } from "./find-on-path.mjs";

/** git's file name on this platform; with no shell, Windows completes no `.exe`. */
const GIT_FILE_NAME = process.platform === "win32" ? "git.exe" : "git";

/** git's path: the first absolute folder of PATH that holds it. None throws. */
function gitPath() {
  const found = findOnPath(GIT_FILE_NAME);
  if (found === undefined) throw new Error(`no absolute folder of PATH holds ${GIT_FILE_NAME}, so git cannot be run`);
  return found;
}

/**
 * git run in `dir` with `args`, its output trimmed. A failure throws with
 * git's own words in its message and git's exit code as its `status`.
 * @param {string} dir
 * @param {...string} args
 * @returns {string}
 */
export function runGit(dir, ...args) {
  return execFileSync(gitPath(), ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/**
 * git run in `dir` with `args`, its output trimmed, or null when git answers
 * "no" with exit code 1 (`--is-ancestor`'s no, or a detached HEAD's for
 * `symbolic-ref --quiet`). Any other failure throws as `runGit`'s does.
 * @param {string} dir
 * @param {...string} args
 * @returns {string | null}
 */
export function runGitOrNull(dir, ...args) {
  try {
    return runGit(dir, ...args);
  } catch (error) {
    if (error.status === 1) return null;
    throw error;
  }
}
