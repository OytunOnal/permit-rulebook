// @level main
/**
 * The `read-locked-commit` subcommand, the deploy's `report` step: reads the
 * commit the lock of the site in the working folder names, through the
 * `data-lock` module, and returns the report of it. A lock that names no
 * single 40-hex sha is refused before any report exists.
 */
import { LOCKED_SHA_REFUSAL, lockedCommitOf } from "../../data-lock/data-lock.mjs";
import { readLockedCommitReportOf } from "./cli-read-locked-commit.mjs";

/** Why the report's read of the lock is refused; the reason names the rule and its remedy, never a value. */
export const READ_LOCKED_COMMIT_REFUSALS = Object.freeze({ lock: LOCKED_SHA_REFUSAL });

/** The commit the lock in the working folder names, as its report; it takes no arguments. */
export function runReadLockedCommit() {
  return readLockedCommitReportOf(lockedCommitOf());
}
