// @level main
/**
 * `npm run smoke`: reads the surfaces from the arguments with `cli-smoke.mjs`,
 * walks them with `smoke.mjs`, prints the report `cli-smoke.mjs` makes of the
 * page loads, and exits with its code.
 */
import { smokeOptionsOf, smokeReportOf } from "./cli-smoke.mjs";
import { printReport } from "./print-report.mjs";
import { smoke } from "./smoke.mjs";

printReport(smokeReportOf(await smoke(smokeOptionsOf(process.argv.slice(2)))));
