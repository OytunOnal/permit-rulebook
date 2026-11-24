// @level main
/**
 * The run module's own declared refusals: a command line or a step the lock's
 * rules never see, refused as the `data-lock` module refuses, with a
 * `LockRefusal` naming a reason of `RUN_REFUSALS`, so the run entry prints
 * them in its one error line.
 */
import { LockRefusal } from "../../data-lock/data-lock.mjs";
import { OptionMissing } from "../../find-option-value.mjs";

/** Why a run is refused before the lock's rules are asked; a reason names the rule, never a value. */
export const RUN_REFUSALS = Object.freeze({
  subcommand: "the first argument names no subcommand",
  lockPath: "--lock names no path (--lock <path>)",
  clonePath: "--clone names no path (--clone <path>)",
  stepOutputs: "GITHUB_OUTPUT names no file, so the step's outputs have nowhere to go",
});

/** What the run module refused, by the act refused: the words a refusal's message opens with, before its reason. */
export const RUN_REFUSAL_CONTEXTS = Object.freeze({
  commandLine: "the command line is refused",
  stepOutputs: "the step's outputs are refused",
  buildRead: "the build's data commit is refused",
});

/** The reason an option given with no value is refused for, by the option; a Map, since the option is the command line's text. */
const MISSING_OPTION_REFUSALS = new Map([["--lock", RUN_REFUSALS.lockPath], ["--clone", RUN_REFUSALS.clonePath]]);

/**
 * What `readOptions` returns; an `OptionMissing` it throws for an option of
 * `MISSING_OPTION_REFUSALS` is refused as a `LockRefusal` with that option's
 * reason, and any other error is thrown on as it is.
 */
export function optionsRefusingMissing(readOptions) {
  try {
    return readOptions();
  } catch (error) {
    const reason = error instanceof OptionMissing ? MISSING_OPTION_REFUSALS.get(error.option) : undefined;
    if (reason === undefined) throw error;
    throw new LockRefusal(reason, RUN_REFUSAL_CONTEXTS.commandLine);
  }
}
