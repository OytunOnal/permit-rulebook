// @level main
/**
 * The `read-built-commit` subcommand, the deploy's build step: reads the data
 * clone the build checked out, from the folder the step's environment names
 * (`cli-read-built-commit.mjs`), through the `data-lock` module, and returns
 * the report of its HEAD and dataset version. It refuses, before any report
 * exists, a step naming no folder, a HEAD that is not 40 hex (the `data-lock`
 * module's check) and a dataset version of the wrong shape.
 */
import { cloneHeadAndVersionOf, CLONE_HEAD_REFUSAL, isDatasetVersion, LockRefusal } from "../../data-lock/data-lock.mjs";
import { readBuiltCommitOptionsOf, readBuiltCommitReportOf } from "./cli-read-built-commit.mjs";

/** Why the build's read is refused; a reason names the rule, never a value, which is the data's or the step's text. */
export const READ_BUILT_COMMIT_REFUSALS = Object.freeze({
  dataDir: "DATA_DIR names no folder, so the data clone the build checked out cannot be read",
  head: CLONE_HEAD_REFUSAL,
  datasetVersion: "the data names no YYYY.MM.DD dataset version",
});

/** The data clone's commit and dataset version, read on the process's environment, as its report; it takes no arguments. */
export function runReadBuiltCommit() {
  const { dataDir } = readBuiltCommitOptionsOf(process.env);
  // Unset, the folder would resolve to the working folder, the site's own checkout.
  if (dataDir === "") throw new LockRefusal(READ_BUILT_COMMIT_REFUSALS.dataDir, "the build's data commit is refused");
  const { sha, datasetVersion } = cloneHeadAndVersionOf(dataDir);
  if (!isDatasetVersion(datasetVersion)) throw new LockRefusal(READ_BUILT_COMMIT_REFUSALS.datasetVersion, "the build's data commit is refused");
  return readBuiltCommitReportOf({ sha, version: datasetVersion });
}
