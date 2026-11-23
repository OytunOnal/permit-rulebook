// @level main
/**
 * The lock's runs, one entry: the first argument names the subcommand, the
 * rest are its own. It runs the subcommand, prints the report it returns and
 * exits with its code. It reaches the lock's rules only through the
 * `data-lock` module's entry.
 *
 *   node scripts/data-lock-run/data-lock-run.mjs pin [--lock <path>]                    # npm run data:pin
 *   node scripts/data-lock-run/data-lock-run.mjs check [--lock <path>] [--clone <path>] # npm run data:check
 *
 * It refuses a subcommand it does not name, before running anything.
 * Imported, it runs nothing: a subcommand runs only when this file is the
 * process's own script, and an importer reads `SUBCOMMAND_NAMES` alone.
 */
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { printReport } from "../print-report.mjs";
import { runCheck } from "./check/run-check.mjs";
import { runPin } from "./pin/run-pin.mjs";

/** Each subcommand's run, by its name; a Map, since the name is the command line's text. */
const SUBCOMMANDS = new Map([["pin", runPin], ["check", runCheck]]);

/** The subcommands the entry runs, by name, in the order its usage names them. */
export const SUBCOMMAND_NAMES = [...SUBCOMMANDS.keys()];

/** Whether this file is the script node was started with, both paths read through their links. */
function isProcessScript() {
  const script = process.argv[1];
  return script !== undefined && realpathSync(script) === realpathSync(fileURLToPath(import.meta.url));
}

/** Runs the subcommand `argv` names on the arguments after it, prints its report and exits with its code. */
function runSubcommand(argv) {
  const [subcommand, ...args] = argv;
  const run = SUBCOMMANDS.get(subcommand);
  if (run === undefined)
    throw new Error(`${JSON.stringify(subcommand ?? "")} is not a subcommand: node scripts/data-lock-run/data-lock-run.mjs <${SUBCOMMAND_NAMES.join(" | ")}> ...`);
  const report = run(args);
  printReport(report);
  process.exit(report.exitCode);
}

if (isProcessScript()) runSubcommand(process.argv.slice(2));
