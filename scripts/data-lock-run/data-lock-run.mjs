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
 */
import { printReport } from "../print-report.mjs";
import { runCheck } from "./check/run-check.mjs";
import { runPin } from "./pin/run-pin.mjs";

/** Each subcommand's run, by its name; a Map, since the name is the command line's text. */
const SUBCOMMANDS = new Map([["pin", runPin], ["check", runCheck]]);

const [subcommand, ...args] = process.argv.slice(2);
const run = SUBCOMMANDS.get(subcommand);
if (run === undefined)
  throw new Error(`${JSON.stringify(subcommand ?? "")} is not a subcommand: node scripts/data-lock-run/data-lock-run.mjs <${[...SUBCOMMANDS.keys()].join(" | ")}> ...`);
const report = run(args);
printReport(report);
process.exit(report.exitCode);
