// @level infrastructure
/**
 * Set the `ours` merge driver that `.gitattributes` names for
 * `docs/spine/structure.json`, so a merge takes one side's file without a
 * conflict. Git keeps a driver's command only in its config, never in the
 * tree; `npm ci` runs this as `prepare`, and every worktree of a clone shares
 * the setting.
 *
 * Outside a git work tree (an install from a tarball) there is nothing to
 * set: it says so in one line and exits 0. Any other git failure fails it.
 */
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

// git's messages in one language, so the one failure that means "no work tree" reads the same everywhere
const gitEnv = { ...process.env, LC_ALL: "C" };

const git = (...args) =>
  execFileSync("git", ["-C", root, ...args], { encoding: "utf8", env: gitEnv, stdio: ["ignore", "pipe", "pipe"] }).trim();

/** Whether the site's root is inside a git work tree; any failure but "not a git repository" is thrown. */
function insideWorkTree() {
  try {
    return git("rev-parse", "--is-inside-work-tree") === "true";
  } catch (error) {
    if (String(error.stderr).includes("not a git repository")) return false;
    throw error;
  }
}

/** git's own words for a failure, else the error's. */
const gitMessageOf = (error) => String(error.stderr || error.message).trim();

try {
  if (insideWorkTree()) {
    git("config", "merge.ours.driver", "true");
    console.log(JSON.stringify({ level: "info", msg: "merge.ours.driver set to true" }));
  } else {
    console.log(JSON.stringify({ level: "info", msg: "merge.ours.driver not set: not inside a git work tree" }));
  }
} catch (error) {
  console.error(JSON.stringify({ level: "error", msg: "merge.ours.driver not set", git: gitMessageOf(error) }));
  process.exitCode = 1;
}
