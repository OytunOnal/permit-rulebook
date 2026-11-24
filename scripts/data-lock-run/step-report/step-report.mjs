// @level presentation
/**
 * A deploy step's success report, the one shape the four step subcommands
 * share: the step's outputs, one JSON log line naming them, and exit code 0.
 * It reads, runs and prints nothing; the run entry writes and prints it.
 */

/** The report of a step that handed on `outputs`, its log line saying `msg` and naming each output as it is named for the later jobs. */
export function stepReportOf(msg, outputs) {
  return {
    outputs,
    out: [JSON.stringify({ level: "info", msg, ...outputs })],
    exitCode: 0,
  };
}
