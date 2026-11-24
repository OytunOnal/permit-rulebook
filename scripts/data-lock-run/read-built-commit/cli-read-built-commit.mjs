// @level presentation
/**
 * The deploy's build step's words: the environment the workflow passes, as
 * the data clone the build checked out, and the report of what it built, its
 * step outputs and one log line. It reads, runs and prints nothing;
 * `run-read-built-commit.mjs` returns what it makes.
 *
 *   DATA_DIR  the step's env: the data clone's folder, from the step's working folder
 */
import { stepReportOf } from "../step-report/step-report.mjs";

/** The data clone's folder the step's environment `env` names; "" when the workflow passes none. */
export function readBuiltCommitOptionsOf(env) {
  return { dataDir: env.DATA_DIR ?? "" };
}

/** The step's report: its outputs `sha` and `version` under the names the later jobs read, as `stepReportOf` shapes it. */
export function readBuiltCommitReportOf({ sha, version }) {
  return stepReportOf("the data commit this run built", { sha, version });
}
