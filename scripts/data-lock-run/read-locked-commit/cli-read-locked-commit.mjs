// @level presentation
/**
 * The deploy's `report` step's words for the lock: the report of the commit
 * the lock names, its step output and one log line. It reads, runs and prints
 * nothing; `run-read-locked-commit.mjs` returns what it makes.
 */

/** The step's output, `sha`, the name the data checkout after it reads; one JSON log line; exit code 0. */
export function readLockedCommitReportOf(sha) {
  return {
    outputs: { sha },
    out: [JSON.stringify({ level: "info", msg: "the data commit data.lock names", sha })],
    exitCode: 0,
  };
}
