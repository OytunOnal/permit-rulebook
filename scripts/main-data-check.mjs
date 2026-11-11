// @level main
/**
 * `npm run data:check`, the green's first step: reads the lock and the data
 * clone to check with `cli-data-check.mjs`, asks `clone-shortfall.mjs` how the
 * clone falls short of the lock, prints the report `cli-data-check.mjs` makes
 * of it, and exits with its code.
 */
import { dataCheckOptionsOf, dataCheckReportOf } from "./cli-data-check.mjs";
import { cloneShortfallOf, lockAndCloneOf } from "./clone-shortfall.mjs";
import { printReport } from "./print-report.mjs";

const checked = lockAndCloneOf(dataCheckOptionsOf(process.argv.slice(2)));
const report = dataCheckReportOf(checked, cloneShortfallOf(checked));
printReport(report);
process.exit(report.exitCode);
