// @level main
/**
 * The `pin` subcommand, `npm run data:pin`: reads the lock to write with
 * `cli-data-pin.mjs`, pins it through the `data-lock` module, and returns the
 * report `cli-data-pin.mjs` makes of it.
 */
import { pinData } from "../../data-lock/data-lock.mjs";
import { optionsRefusingMissing } from "../refusal/run-refusals.mjs";
import { pinOptionsOf, pinReportOf } from "./cli-data-pin.mjs";

/** `data:pin` run on the arguments after `pin`, as its report; an option with no value is refused as `optionsRefusingMissing` says. */
export function runPin(argv) {
  return pinReportOf(pinData(optionsRefusingMissing(() => pinOptionsOf(argv))));
}
