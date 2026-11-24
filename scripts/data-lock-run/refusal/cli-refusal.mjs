// @level presentation
/**
 * A refused run's words: one JSON error line, as `data:check`'s red prints,
 * and under GitHub Actions also an `::error::` line with the same reason, so
 * the refusal shows on the run's page. It reads, runs and prints nothing; the
 * run entry prints what it makes.
 */

/** `text` as a workflow command's data: GitHub's own escapes, so a line break cannot start a command of its own. */
const annotationDataOf = (text) => text.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");

/** The report of a run refused for `reason`, exit code 1; `isUnderActions` adds the annotation line. */
export function refusalReportOf(reason, { isUnderActions }) {
  return {
    err: [JSON.stringify({ level: "error", msg: reason })],
    out: isUnderActions ? [`::error::${annotationDataOf(reason)}`] : [],
    exitCode: 1,
  };
}
