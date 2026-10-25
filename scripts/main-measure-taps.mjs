// @level main
/**
 * `npm run measure:taps`: measures with `measure-taps.mjs`, prints the report
 * `cli-measure-taps.mjs` makes of it, and exits with its code.
 */
import { tapReportOf } from "./cli-measure-taps.mjs";
import { measureTaps } from "./measure-taps.mjs";

const report = tapReportOf(await measureTaps());
for (const line of report.err) console.error(line);
for (const line of report.out) console.log(line);
process.exit(report.exitCode);
