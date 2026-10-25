// @level main
/**
 * `npm run data:pin`: reads the lock to write with `cli-data-pin.mjs`, pins
 * it with `data-pin.mjs`, prints the report `cli-data-pin.mjs` makes of it,
 * and exits with its code.
 */
import { pinOptionsOf, pinReportOf } from "./cli-data-pin.mjs";
import { pinData } from "./data-pin.mjs";
import { printReport } from "./print-report.mjs";

printReport(pinReportOf(pinData(pinOptionsOf(process.argv.slice(2)))));
