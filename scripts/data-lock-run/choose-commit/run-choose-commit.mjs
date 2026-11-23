// @level main
/**
 * The `choose-commit` subcommand, the deploy's `data-commit` step: reads the
 * run from the step's environment with `cli-choose-commit.mjs`, asks the
 * `data-lock` module which data commit it builds from the site in the working
 * folder, and returns the report `cli-choose-commit.mjs` makes of it.
 */
import { chooseDataCommit } from "../../data-lock/data-lock.mjs";
import { chooseCommitOptionsOf, chooseCommitReportOf } from "./cli-choose-commit.mjs";

/** The choice run on the process's environment, as its report; it takes no arguments. */
export function runChooseCommit() {
  return chooseCommitReportOf(chooseDataCommit(chooseCommitOptionsOf(process.env)));
}
