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
 *
 * It refuses a subcommand it does not name, before running anything; a
 * subcommand that refuses throws before its report exists, so no output is
 * written. Every refusal, the usage one included, is printed as one JSON
 * error line, with no stack, and an `::error::` line under GitHub Actions
 * (`refusal/cli-refusal.mjs`), and exits 1. Imported, it runs nothing: a subcommand
 * runs only when this file is the process's own script, and an importer
 * reads `SUBCOMMAND_NAMES` alone.
 */
import { appendFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { printReport } from "../print-report.mjs";
import { runCheck } from "./check/run-check.mjs";
import { refusalReportOf } from "./refusal/cli-refusal.mjs";
import { runChooseCommit } from "./choose-commit/run-choose-commit.mjs";
import { runPin } from "./pin/run-pin.mjs";

/** Each subcommand's run, by its name; a Map, since the name is the command line's text. */
const SUBCOMMANDS = new Map([["pin", runPin], ["check", runCheck], ["choose-commit", runChooseCommit]]);

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
  if (!outputFile) throw new Error("GITHUB_OUTPUT names no file, so the step's outputs have nowhere to go");
  appendFileSync(outputFile, Object.entries(outputs).map(([name, value]) => `${name}=${value}\n`).join(""), "utf8");
}

/** Runs the subcommand `argv` names on the arguments after it, writes its step outputs, and returns its report. */
function runSubcommand(argv) {
  const [subcommand, ...args] = argv;
  const run = SUBCOMMANDS.get(subcommand);
  if (run === undefined)
    throw new Error(`${JSON.stringify(subcommand ?? "")} is not a subcommand: node scripts/data-lock-run/data-lock-run.mjs <${SUBCOMMAND_NAMES.join(" | ")}> ...`);
  const report = run(args);
  if (report.outputs !== undefined) writeStepOutputs(report.outputs);
  return report;
}

/** The report of the run `argv` names, or of its refusal: whatever it throws, its message as one error line, no stack. */
function reportOfRun(argv) {
  try {
    return runSubcommand(argv);
  } catch (error) {
    return refusalReportOf(error.message, { isUnderActions: process.env.GITHUB_ACTIONS === "true" });
  }
}

if (isProcessScript()) {
  const report = reportOfRun(process.argv.slice(2));
  printReport(report);
  process.exit(report.exitCode);
}
