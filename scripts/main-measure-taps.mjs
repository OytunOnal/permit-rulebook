// @level main
/**
 * `npm run measure:taps`: measures with `measure-taps.mjs`, prints each
 * screen's lines as it is measured and then the report `cli-measure-taps.mjs`
 * makes of the whole, and exits with its code.
 */
import { screenLinesOf, tapReportOf } from "./cli-measure-taps.mjs";
import { measureTaps } from "./measure-taps.mjs";

const measured = await measureTaps({ onScreen: (screen) => { for (const line of screenLinesOf(screen)) console.log(line); } });
const report = tapReportOf(measured);
for (const line of report.err) console.error(line);
for (const line of report.out) console.log(line);
process.exit(report.exitCode);
