// @level presentation
/**
 * The data pin's command line: the lock `--lock` names, as `pinData`'s
 * option in `data-pin.mjs`, and the report line of what it returned. It
 * reads, runs and prints nothing; `main-data-pin.mjs` prints what it returns.
 *
 *   npm run data:pin [-- --lock <path>]
 *
 * `--lock` names another lock file to write, which must exist already.
 */
import { findOptionValue } from "./find-option-value.mjs";

/** The pin's options from the command's arguments: the lock after `--lock`, else none, and the site's own is written. */
export function pinOptionsOf(argv) {
  const lockPath = findOptionValue(argv, "--lock", "--lock names no path: npm run data:pin -- --lock <path>");
  return lockPath === undefined ? {} : { lockPath };
}

/** What the command prints to stdout, one JSON line, and the code it exits with: always 0. */
export function pinReportOf(pinned) {
  const msg = pinned.previousSha === pinned.sha ? "data.lock already at this commit" : "data.lock updated";
  return {
    out: [JSON.stringify({ level: "info", msg, was: pinned.previousSha, now: pinned.sha, dataset_version: pinned.datasetVersion })],
    exitCode: 0,
  };
}
