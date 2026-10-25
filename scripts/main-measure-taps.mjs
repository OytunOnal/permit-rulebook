// @level main
/**
 * `npm run measure:taps`: measures with `measure-taps.mjs`, prints each
 * screen's lines as it is measured and then the report `cli-measure-taps.mjs`
 * makes of the whole, and exits with its code.
 */
import { screenLinesOf, tapReportOf } from "./cli-measure-taps.mjs";
import { measureTaps } from "./measure-taps.mjs";
import { printReport } from "./print-report.mjs";

const measured = await measureTaps({ onScreen: (screen) => printReport({ out: screenLinesOf(screen) }) });
printReport(tapReportOf(measured));
