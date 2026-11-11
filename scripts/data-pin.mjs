// @level infrastructure
/**
 * Write the data clone's HEAD into `data.lock`.
 *
 * The site is built against the commit the lock names, not against whatever
 * the data clone happens to be at (see the file's own comment). A developer
 * who has just moved the data repository forward runs this to say so.
 *
 * The data clone is found from the site's main checkout, never from the
 * folder the code runs in: `dataClonePath()` asks git for the git directory
 * every copy of the site shares, and resolves the manifest's `file:` path from
 * its parent, so a worktree under `.claude/worktrees/` finds the same clone the
 * main checkout does. Outside a git repository it refuses, naming the folder.
 *
 * It reads the manifest, git's answer, the data clone's HEAD and dataset
 * version, and the lock it writes; it writes only that lock, which must exist
 * already: a case pins into a copy in the OS temp folder, never into the
 * site's own.
 *
 * `pinData` returns what it found and prints nothing: the report line is
 * `cli-data-pin.mjs`'s, and `main-data-pin.mjs` runs the two.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runGit } from "./run-git.mjs";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const siteLockPath = join(root, "data.lock");

/**
 * The site's main checkout: the parent of the git directory every copy of the
 * repository holding `siteDir` shares. Outside a git repository it throws.
 */
function mainCheckoutOf(siteDir) {
  try {
    return dirname(runGit(siteDir, "rev-parse", "--path-format=absolute", "--git-common-dir"));
  } catch (error) {
    // No exit code: git itself did not run, which is not the folder's fault.
    if (typeof error.status !== "number") throw error;
    throw new Error(`${siteDir} is not in a git repository, so the site's main checkout, and the data clone beside it, cannot be found.`, { cause: error });
  }
}

/**
 * The data clone of the site at `siteDir` (this code's own site by default):
 * where the manifest's `file:` path for the data package points from the
 * site's main checkout, the same folder from every worktree of it — never
 * typed twice.
 */
export function dataClonePath(siteDir = root) {
  const mainCheckout = mainCheckoutOf(siteDir);
  const manifest = JSON.parse(readFileSync(join(siteDir, "package.json"), "utf8"));
  return resolve(mainCheckout, manifest.dependencies["permit-rulebook-data"].replace(/^file:/, ""));
}

/** What the lock says today. */
export function readLock(text = readFileSync(siteLockPath, "utf8")) {
  const value = (key) => new RegExp(`^${key}=(.+)$`, "m").exec(text)?.[1]?.trim() ?? "";
  return { sha: value("sha"), datasetVersion: value("dataset_version") };
}

/**
 * Writes the data clone's HEAD and dataset version into the lock at
 * `lockPath` (the site's own `data.lock` by default, a relative path read from
 * the working folder), and returns the sha it named before, the sha it names
 * now and the dataset version.
 */
export function pinData({ lockPath = siteLockPath } = {}) {
  const target = resolve(lockPath);
  const dir = dataClonePath();
  const sha = runGit(dir, "rev-parse", "HEAD");
  const datasetVersion = JSON.parse(readFileSync(join(dir, "data", "dataset.json"), "utf8")).dataset_version;
  const lockText = readFileSync(target, "utf8");
  const pinned = lockText
    .replace(/^sha=.*$/m, `sha=${sha}`)
    .replace(/^dataset_version=.*$/m, `dataset_version=${datasetVersion}`);
  writeFileSync(target, pinned, "utf8");
  return { previousSha: readLock(lockText).sha, sha, datasetVersion };
}
