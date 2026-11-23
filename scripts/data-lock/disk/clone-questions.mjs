// @level infrastructure
/**
 * The questions the shortfall's rule asks the data clone, answered by local
 * git through an argument list with no shell; it never fetches, and writes
 * nothing.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { runGit, runGitOrNull } from "../../run-git.mjs";

/** Whether the clone at `clonePath` has `sha` as a commit; git says "no" there with exit code 128. */
function hasCommit(clonePath, sha) {
  try {
    return runGit(clonePath, "cat-file", "-t", sha) === "commit";
  } catch (error) {
    if (error.status === 128) return false;
    throw error;
  }
}

/**
 * The clone at `clonePath`'s answers to the shortfall's questions, each asked
 * when the rule calls it.
 * @returns {import("../rules/shortfall.mjs").CloneQuestions}
 */
export function cloneQuestionsOf(clonePath) {
  return {
    isCloned: () => existsSync(join(clonePath, ".git")),
    branchOrNull: () => runGitOrNull(clonePath, "symbolic-ref", "--quiet", "--short", "HEAD"),
    // git answers no here only while HEAD's branch has no commit yet.
    headOrNull: () => runGitOrNull(clonePath, "rev-parse", "--verify", "--quiet", "HEAD"),
    hasCommit: (sha) => hasCommit(clonePath, sha),
    isAncestor: (ancestor, descendant) => runGitOrNull(clonePath, "merge-base", "--is-ancestor", ancestor, descendant) !== null,
    originMasterOrNull: () => runGitOrNull(clonePath, "rev-parse", "--verify", "--quiet", "refs/remotes/origin/master"),
  };
}
