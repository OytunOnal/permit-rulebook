// @level main
/**
 * The run module's own declared refusals: a command line or a step the lock's
 * rules never see, refused as the `data-lock` module refuses, with a
 * `LockRefusal` naming a reason of `RUN_REFUSALS`, so the run entry prints
 * them in its one error line.
 */
import { LockRefusal } from "../../data-lock/data-lock.mjs";

/** Why a run is refused before the lock's rules are asked; a reason names the rule, never a value. */
export const RUN_REFUSALS = Object.freeze({
  lockPath: "--lock names no path (--lock <path>)",
  stepOutputs: "GITHUB_OUTPUT names no file, so the step's outputs have nowhere to go",
});

/** Refuses `argv` when it gives `--lock` with no path after it, as its last or an empty argument. */
export function refuseBareLockOption(argv) {
  const at = argv.indexOf("--lock");
  if (at !== -1 && !argv[at + 1]) throw new LockRefusal(RUN_REFUSALS.lockPath, "the command line is refused");
}
