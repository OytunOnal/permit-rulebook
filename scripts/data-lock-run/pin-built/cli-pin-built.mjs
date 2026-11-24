// @level presentation
/**
 * The deploy's `pin` step's words: the environment the workflow passes, as
 * the data commit the build reported and the dataset version it carried, and
 * the report of what was written into the lock, its step outputs and one log
 * line. It reads, runs and prints nothing; `run-pin-built.mjs` returns what it
 * makes.
 *
 *   BUILT, VERSION  the step's env: the build job's `built` and `version` outputs
 */
import { stepReportOf } from "../step-report/step-report.mjs";

/** The built commit and dataset version the step's environment `env` names, each "" when the workflow passes none. */
export function pinBuiltOptionsOf(env) {
  return { sha: env.BUILT ?? "", datasetVersion: env.VERSION ?? "" };
}

/** The step's report: its outputs, the `sha` and `version` the lock now names, for the commit message after it, as `stepReportOf` shapes it. */
export function pinBuiltReportOf({ sha, datasetVersion }) {
  return stepReportOf("data.lock now names the data commit this run built", { sha, version: datasetVersion });
}
