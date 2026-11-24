// @level presentation
/**
 * The deploy's `data-commit` step's words: the environment the workflow
 * passes, as `chooseDataCommit`'s run in the `data-lock` module, and the
 * report of what it chose, its step outputs and one log line. It reads, runs
 * and prints nothing; `run-choose-commit.mjs` returns what it makes.
 *
 *   EVENT_NAME, RUN_ATTEMPT, PAYLOAD_SHA, DATA_REPOSITORY_URL  the step's env
 */
import { stepReportOf } from "../step-report/step-report.mjs";

/** The run the step's environment `env` names, each value "" when the workflow passes none. */
export function chooseCommitOptionsOf(env) {
  return {
    eventName: env.EVENT_NAME ?? "",
    runAttempt: env.RUN_ATTEMPT ?? "",
    payloadSha: env.PAYLOAD_SHA ?? "",
    dataRepositoryUrl: env.DATA_REPOSITORY_URL ?? "",
  };
}

/** The step's report: its outputs `dir`, `locked` and `sha` under the names the later jobs read, as `stepReportOf` shapes it. */
export function chooseCommitReportOf({ dir, locked, sha }) {
  return stepReportOf("the data commit this run builds", { dir, locked, sha });
}
