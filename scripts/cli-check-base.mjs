// @level presentation
/**
 * The subpath check's report: what was built, the problems' lines, and the
 * exit code, from what `checkBase` in `check-base.mjs` returned. It reads,
 * runs and prints nothing; `main-check-base.mjs` prints what it returns.
 */

const SHOWN_PROBLEMS = 25; // enough lines to see what escaped; the count after them names the rest

/** What the command prints to stdout, and the code it exits with: 0 for no problem, 1 for any. */
export function baseReportOf(scan) {
  const built = `built ${scan.pageCount} pages and ${scan.endpointCount} endpoints under ${scan.site}`;
  const { problems } = scan;
  if (problems.length === 0) return { out: [built, "\nno root-absolute internal URL, and every internal link resolves"], exitCode: 0 };
  const more = problems.length > SHOWN_PROBLEMS ? [`  … and ${problems.length - SHOWN_PROBLEMS} more`] : [];
  return {
    out: [built, ...problems.slice(0, SHOWN_PROBLEMS).map((p) => `  ${p}`), ...more, `\n${problems.length} problems under a subpath`],
    exitCode: 1,
  };
}
