// @level presentation
/**
 * The data pin's command line: the lock `--lock` names and the data clone
 * `--clone` names, as `pinData`'s options in the `data-lock` module, and the
 * report line of what it returned. It reads, runs and prints nothing;
 * `run-pin.mjs` returns what it makes.
 *
 *   npm run data:pin [-- --lock <path>] [-- --clone <path>]
 *
 * `--lock` names another lock file to write, which must exist already;
 * `--clone` another data clone to read. With neither, the site's own data
 * clone is pinned into its own lock.
 */
import { findOptionValue } from "../../find-option-value.mjs";

/** The pin's options from the command's arguments: the lock after `--lock` and the clone after `--clone`, each left out when not given. */
export function pinOptionsOf(argv) {
  const lockPath = findOptionValue(argv, "--lock", "--lock names no path: npm run data:pin -- --lock <path>");
  const clonePath = findOptionValue(argv, "--clone", "--clone names no path: npm run data:pin -- --clone <path>");
  return {
    ...(lockPath === undefined ? {} : { lockPath }),
    ...(clonePath === undefined ? {} : { clonePath }),
  };
}

/** What the command prints to stdout, one JSON line, and the code it exits with: always 0. */
export function pinReportOf(pinned) {
  const msg = pinned.previousSha === pinned.sha ? "data.lock already at this commit" : "data.lock updated";
  return {
    out: [JSON.stringify({ level: "info", msg, was: pinned.previousSha, now: pinned.sha, dataset_version: pinned.datasetVersion })],
    exitCode: 0,
  };
}
