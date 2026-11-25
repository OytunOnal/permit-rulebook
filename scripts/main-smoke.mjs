// @level main
/**
 * `npm run smoke`: reads the surfaces from the arguments with `cli-smoke.mjs`,
 * walks them with `smoke.mjs`, prints the report `cli-smoke.mjs` makes of the
 * page loads, or of smoke's `SmokeRefusal` to walk, and exits with its code.
 * Any other error is thrown on, its stack kept.
 */
import { smokeOptionsOf, smokeRefusalReportOf, smokeReportOf } from "./cli-smoke.mjs";
import { printReport } from "./print-report.mjs";
import { smoke } from "./smoke.mjs";
import { SmokeRefusal } from "./smoke-reasons.mjs";

/** The report of the walk `args` ask for, or of its `SmokeRefusal`. */
async function reportOfRun(args) {
  try {
    return smokeReportOf(await smoke(smokeOptionsOf(args)));
  } catch (error) {
    if (!(error instanceof SmokeRefusal)) throw error;
    return smokeRefusalReportOf(error);
  }
}

const report = await reportOfRun(process.argv.slice(2));
printReport(report);
process.exit(report.exitCode);
