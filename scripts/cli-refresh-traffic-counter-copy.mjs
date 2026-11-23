// @level presentation
/**
 * The refresh's report: what was written, or why nothing was, and the exit
 * code, from what `refreshTrafficCounterCopy` in
 * `refresh-traffic-counter-copy.mjs` returned. It reads, runs and prints
 * nothing; `main-refresh-traffic-counter-copy.mjs` prints what it returns.
 */

/** What the command prints, and the code it exits with: 0 once the copy is refreshed, 1 when nothing was written. */
export function reportTheRefresh(result, today) {
  if (!result.refreshed) return { err: [`the copy of Cloudflare's traffic counter was not refreshed: ${result.why}`], exitCode: 1 };
  return {
    out: [`refreshed the copy of Cloudflare's traffic counter: ${result.bytes} bytes, fetched on ${today}; read its diff before committing it`],
    exitCode: 0,
  };
}
