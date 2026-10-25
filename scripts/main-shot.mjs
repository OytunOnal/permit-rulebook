// @level main
/**
 * The README's picture: reads where to write it with `cli-shot.mjs`, takes it
 * with `shot.mjs`, prints the line `cli-shot.mjs` makes of it, and exits with
 * its code.
 *
 * Usage: node scripts/main-shot.mjs [out.png]
 */
import { shotOptionsOf, shotReportOf } from "./cli-shot.mjs";
import { printReport } from "./print-report.mjs";
import { takeShot } from "./shot.mjs";

const report = shotReportOf(await takeShot(shotOptionsOf(process.argv.slice(2))));
printReport(report);
process.exit(report.exitCode);
