// @level presentation
/**
 * The deploy report's first step (#117, decision 13): prints the run's finding
 * as one JSON `RunFinding` on stdout, which the step writes to a file for the
 * data package's kept-issue CLI (`--finding-file`). Everything it decides is
 * `deploy-finding.mjs`'s.
 *
 *   JOB_RESULTS='{"build":"success",...}' RUN_URL=<url> node scripts/cli-deploy-finding.mjs
 *
 * Both arrive as environment values, never as argv or in a script's body. A
 * missing value is read as empty, and `deployFindingOf` turns either one
 * empty into red: empty results are not JSON, and a green needs a run to link.
 */
import { deployFindingOf } from "./deploy-finding.mjs";

process.stdout.write(`${JSON.stringify(deployFindingOf(process.env.JOB_RESULTS ?? "", process.env.RUN_URL ?? ""))}\n`);
