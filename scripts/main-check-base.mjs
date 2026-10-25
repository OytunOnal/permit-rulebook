// @level main
/**
 * `npm run check:base`: builds and scans with `check-base.mjs`, prints the
 * report `cli-check-base.mjs` makes of it, and exits with its code.
 */
import { baseReportOf } from "./cli-check-base.mjs";
import { checkBase } from "./check-base.mjs";
import { printReport } from "./print-report.mjs";

const report = baseReportOf(checkBase());
printReport(report);
process.exit(report.exitCode);
