// @level main
/**
 * The `check` subcommand, `npm run data:check`, the green's first step: reads
 * the lock and the data clone to check with `cli-data-check.mjs`, asks the
 * `data-lock` module how the clone falls short of the lock, and returns the
 * report `cli-data-check.mjs` makes of it.
 */
import { cloneShortfallOf, lockAndCloneOf } from "../../data-lock/data-lock.mjs";
import { optionsRefusingMissing } from "../refusal/run-refusals.mjs";
import { dataCheckOptionsOf, dataCheckReportOf } from "./cli-data-check.mjs";

/** The check run on the arguments after `check`, as its report; an option with no value is refused as `optionsRefusingMissing` says. */
export function runCheck(argv) {
  const lockAndClone = lockAndCloneOf(optionsRefusingMissing(() => dataCheckOptionsOf(argv)));
  return dataCheckReportOf(lockAndClone, cloneShortfallOf(lockAndClone));
}
