// @level main
/**
 * The `pin-built` subcommand, the deploy's `pin` step: reads the built commit
 * and dataset version from the step's environment (`cli-pin-built.mjs`),
 * writes them into the lock of the site in the working folder through the
 * `data-lock` module, and returns the report of what it wrote. It refuses,
 * before the lock is written and before any report exists, a commit or a
 * version of the wrong shape. It never commits or pushes: the step after it
 * does, in shell.
 */
import { PIN_REFUSALS, pinBuiltCommit } from "../../data-lock/data-lock.mjs";
import { pinBuiltOptionsOf, pinBuiltReportOf } from "./cli-pin-built.mjs";

/** Why the deploy's write of the lock is refused: the pin's own reasons, a value unset by the workflow included, since "" has neither shape. */
export const PIN_BUILT_REFUSALS = PIN_REFUSALS;

/** The built commit and version written into the lock on the process's environment, as its report; it takes no arguments. */
export function runPinBuilt() {
  return pinBuiltReportOf(pinBuiltCommit(pinBuiltOptionsOf(process.env)));
}
