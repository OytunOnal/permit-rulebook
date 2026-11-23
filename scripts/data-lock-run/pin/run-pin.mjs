// @level main
/**
 * The `pin` subcommand, `npm run data:pin`: reads the lock to write with
 * `cli-data-pin.mjs`, pins it through the `data-lock` module, and returns the
 * report `cli-data-pin.mjs` makes of it.
 */
import { pinData } from "../../data-lock/data-lock.mjs";
import { pinOptionsOf, pinReportOf } from "./cli-data-pin.mjs";

/** The pin run on the arguments after `pin`, as its report. */
export function runPin(argv) {
  return pinReportOf(pinData(pinOptionsOf(argv)));
}
