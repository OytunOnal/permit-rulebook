// @level presentation
/**
 * The smoke command's arguments and report: `--dev` or `--dist` as the
 * surfaces `smoke` in `smoke.mjs` walks, and the page loads it returns as
 * lines and an exit code. It reads, runs and prints nothing;
 * `main-smoke.mjs` prints what it returns.
 */

/**
 * The options a run's arguments ask `smoke` for: `--dev` or `--dist` alone,
 * or none, which leaves the job its default surfaces.
 */
export function smokeOptionsOf(args) {
  if (args.includes("--dev")) return { surfaces: ["dev"] };
  if (args.includes("--dist")) return { surfaces: ["dist"] };
  return {};
}

/** What a run prints for one page load: a FAIL line with its failures under it, or one ok line. */
function reportLinesOf(r) {
  if (!r.failures.length) return [`ok   [${r.surface}] ${r.path} (${r.what}) — ${JSON.stringify(r.value)}, 0 console errors`];
  return [`FAIL [${r.surface}] ${r.path} (${r.what})`, ...r.failures.map((f) => `     ${f}`)];
}

/** What the command prints to stdout, and the code it exits with: 0 when no page load broke, 1 when one did. */
export function smokeReportOf(results) {
  const failed = results.filter((r) => r.failures.length).length;
  return {
    out: [...results.flatMap(reportLinesOf), `\n${results.length} page loads in a real browser — ${failed} broken`],
    exitCode: failed === 0 ? 0 : 1,
  };
}
