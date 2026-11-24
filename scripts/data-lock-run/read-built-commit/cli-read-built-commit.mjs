// @level presentation
/**
 * The deploy's build step's words: the environment the workflow passes, as
 * the data clone the build checked out, and the report of what it built, its
 * step outputs and one log line. It reads, runs and prints nothing;
 * `run-read-built-commit.mjs` returns what it makes.
 *
 *   DATA_DIR  the step's env: the data clone's folder, from the step's working folder
 */

/** The data clone's folder the step's environment `env` names; "" when the workflow passes none. */
export function readBuiltCommitOptionsOf(env) {
  return { dataDir: env.DATA_DIR ?? "" };
}

/** The step's outputs, `sha` and `version` under the names the later jobs read, one JSON log line, and exit code 0. */
export function readBuiltCommitReportOf({ sha, version }) {
  return {
    outputs: { sha, version },
    out: [JSON.stringify({ level: "info", msg: "the data commit this run built", sha, version })],
    exitCode: 0,
  };
}
