// @level presentation
/**
 * The deploy's `report` step's words for the lock: the report of the commit
 * the lock names, its step output and one log line. It reads, runs and prints
 * nothing; `run-read-locked-commit.mjs` returns what it makes.
 */
import { stepReportOf } from "../step-report/step-report.mjs";

/** The step's report: its output `sha`, the name the data checkout after it reads, as `stepReportOf` shapes it. */
export function readLockedCommitReportOf(sha) {
  return stepReportOf("the data commit data.lock names", { sha });
}
