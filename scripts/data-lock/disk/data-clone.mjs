// @level infrastructure
/**
 * The data clone, and what it holds: its HEAD and its dataset version.
 *
 * The data clone is found from the site's main checkout, never from the
 * folder the code runs in: `dataClonePath()` asks git for the git directory
 * every copy of the site shares, and resolves the manifest's `file:` path from
 * its parent, so a worktree under `.claude/worktrees/` finds the same clone the
 * main checkout does. Outside a git repository it refuses, naming the folder.
 *
 * It reads the manifest, git's answer, the data clone's HEAD and its
 * `data/dataset.json`, and writes nothing.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { runGit } from "../../run-git.mjs";
import { siteRoot } from "./site-root.mjs";

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
 * The path the manifest of the site at `siteDir` names for the data package,
 * its `file:` dependency without the `file:`. A manifest naming none throws.
 */
export function dataDependencyPathOf(siteDir) {
  const dependency = JSON.parse(readFileSync(join(siteDir, "package.json"), "utf8")).dependencies?.["permit-rulebook-data"];
  if (typeof dependency !== "string") throw new Error(`the manifest at ${siteDir} names no permit-rulebook-data dependency`);
  return dependency.replace(/^file:/, "");
}

/**
 * The data clone of the site at `siteDir` (this code's own site by default):
 * where the manifest's `file:` path for the data package points from the
 * site's main checkout, the same folder from every worktree of it — never
 * typed twice.
 */
export function dataClonePath(siteDir = siteRoot) {
  return resolve(mainCheckoutOf(siteDir), dataDependencyPathOf(siteDir));
}

/** The HEAD commit of the data clone at `clonePath`. */
export function cloneHeadOf(clonePath) {
  return runGit(clonePath, "rev-parse", "HEAD");
}

/** The dataset version the data clone at `clonePath` carries. */
export function cloneDatasetVersionOf(clonePath) {
  return JSON.parse(readFileSync(join(clonePath, "data", "dataset.json"), "utf8")).dataset_version;
}
