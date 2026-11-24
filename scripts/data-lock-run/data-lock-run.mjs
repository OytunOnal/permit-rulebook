// @level main
/**
 * The lock's runs, one entry: the first argument names the subcommand, the
 * rest are its own. It runs the subcommand, appends the step outputs its
 * report carries to the file `GITHUB_OUTPUT` names, prints the report and
 * exits with its code. It reaches the lock's rules only through the
 * `data-lock` module's entry.
 *
 *   node scripts/data-lock-run/data-lock-run.mjs pin [--lock <path>] [--clone <path>]   # npm run data:pin
 *   node scripts/data-lock-run/data-lock-run.mjs check [--lock <path>] [--clone <path>] # npm run data:check
 *   node scripts/data-lock-run/data-lock-run.mjs choose-commit                          # the deploy's data-commit step
 *   node scripts/data-lock-run/data-lock-run.mjs read-built-commit                      # the deploy's build step, `built`
 *   node scripts/data-lock-run/data-lock-run.mjs pin-built                              # the deploy's pin step, `pinned`
 *   node scripts/data-lock-run/data-lock-run.mjs read-locked-commit                     # the deploy's report step, `lock`
 *
 * It refuses a subcommand it does not name, before running anything; a
 * subcommand that refuses throws before its report exists, so no output is
 * written. A declared refusal (the usage one, or a `LockRefusal` the
 * `data-lock` module throws with a declared reason) is printed as one
 * JSON error line, with no stack, and an `::error::` line under GitHub
 * Actions (`refusal/cli-refusal.mjs`), and exits 1; any other error, a bug
 * or a git crash, is thrown on, so Node prints it with its stack. Imported,
 * it runs nothing: a subcommand runs only when this file is the process's
 * own script, and an importer reads `SUBCOMMAND_NAMES` alone.
 */
import { appendFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LockRefusal } from "../data-lock/data-lock.mjs";
import { printReport } from "../print-report.mjs";
import { runCheck } from "./check/run-check.mjs";
import { refusalReportOf } from "./refusal/cli-refusal.mjs";
import { RUN_REFUSAL_CONTEXTS, RUN_REFUSALS } from "./refusal/run-refusals.mjs";
import { READ_BUILT_COMMIT_REFUSALS, runReadBuiltCommit } from "./read-built-commit/run-read-built-commit.mjs";
import { READ_LOCKED_COMMIT_REFUSALS, runReadLockedCommit } from "./read-locked-commit/run-read-locked-commit.mjs";
import { PIN_BUILT_REFUSALS, runPinBuilt } from "./pin-built/run-pin-built.mjs";

export { PIN_BUILT_REFUSALS, READ_BUILT_COMMIT_REFUSALS, READ_LOCKED_COMMIT_REFUSALS, RUN_REFUSALS };
import { runChooseCommit } from "./choose-commit/run-choose-commit.mjs";
import { runPin } from "./pin/run-pin.mjs";

/** Each subcommand's run, by its name; a Map, since the name is the command line's text. */
const SUBCOMMANDS = new Map([
  ["pin", runPin], ["check", runCheck], ["choose-commit", runChooseCommit], ["read-built-commit", runReadBuiltCommit],
  ["pin-built", runPinBuilt], ["read-locked-commit", runReadLockedCommit],
]);

/** The subcommands the entry runs, by name, in the order its usage names them. */
export const SUBCOMMAND_NAMES = [...SUBCOMMANDS.keys()];

/** Whether this file is the script node was started with, both paths read through their links. */
function isProcessScript() {
  const script = process.argv[1];
  return script !== undefined && realpathSync(script) === realpathSync(fileURLToPath(import.meta.url));
}

/**
 * Appends `outputs` to the step's outputs file, the one `GITHUB_OUTPUT`
 * names, each as `name=value` on a line of its own; the values are the
 * `data-lock` module's, checked for their shape there.
 */
function writeStepOutputs(outputs) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) throw new LockRefusal(RUN_REFUSALS.stepOutputs, RUN_REFUSAL_CONTEXTS.stepOutputs);
  appendFileSync(outputFile, Object.entries(outputs).map(([name, value]) => `${name}=${value}\n`).join(""), "utf8");
}

/** The report of a run refused for `reason`, annotated under GitHub Actions. */
const refusedRunReportOf = (reason) => refusalReportOf(reason, { isUnderActions: process.env.GITHUB_ACTIONS === "true" });

/** The usage refusal's words: its reason and the subcommands, never the argument it refused, which is a stranger's text. */
const USAGE_REFUSAL = `${RUN_REFUSALS.subcommand}: node scripts/data-lock-run/data-lock-run.mjs <${SUBCOMMAND_NAMES.join(" | ")}> ...`;

/** Runs the subcommand `argv` names on the arguments after it, writes its step outputs, and returns its report; an unnamed subcommand's report is the usage refusal. */
function runSubcommandWritingOutputs(argv) {
  const [subcommand, ...args] = argv;
  const run = SUBCOMMANDS.get(subcommand);
  if (run === undefined) return refusedRunReportOf(USAGE_REFUSAL);
  const report = run(args);
  if (report.outputs !== undefined) writeStepOutputs(report.outputs);
  return report;
}

/** The report of the run `argv` names, or of its `LockRefusal` as one error line; any other error is thrown on, its stack kept. */
function reportOfRun(argv) {
  try {
    return runSubcommandWritingOutputs(argv);
  } catch (error) {
    if (!(error instanceof LockRefusal)) throw error;
    return refusedRunReportOf(error.message);
  }
}

if (isProcessScript()) {
  const report = reportOfRun(process.argv.slice(2));
  printReport(report);
  process.exit(report.exitCode);
}
