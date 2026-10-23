import { execFile } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { carryAssets, type BuildDirectory } from "../../scripts/carry-assets/carry.mjs";
import { liveAnswerFor } from "./live-site-in-memory.js";

/**
 * One run of the carry, as its tests read it: its status and what it printed.
 * Two ways to get one — the flow in this process against the in-memory live
 * site and build directory, or the real entry as a child process, the
 * deploy's own command.
 */
export type CarryRun = { status: number; out: string };

const root = fileURLToPath(new URL("../..", import.meta.url));
const entry = join(root, "scripts", "carry-assets.mjs");

/**
 * The clock the flow's cases run on: one instant, so no case's outcome turns
 * on how long a runner takes.
 */
export const fixedClock = (): number => Date.UTC(2026, 9, 23);

/**
 * The flow, run in this process as the entry runs it, against every in-memory
 * site the case has open, filling `into` — no build directory at all when it
 * is left out — on the fixed clock: what it would print, and a status of 0
 * when the flow came back — the whole of what makes the entry exit 0 — or 1
 * when it threw.
 */
export async function flowRunInProcess(
  origin: string,
  into: BuildDirectory | undefined,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<CarryRun> {
  try {
    const result = await carryAssets({ origin, buildDirectory: into, liveAnswerFor, now: fixedClock, dryRun });
    return { status: 0, out: result.logLines.map((line: string) => `${line}\n`).join("") };
  } catch (e) {
    return { status: 1, out: String(e) };
  }
}

/**
 * The real entry, run as a child process the way the workflow runs it: the
 * origin through the environment, and the command line for what only a test
 * or a terminal passes. Its exit code is an assertion.
 *
 * The origin is a parameter of its own and not part of `args`, because that is
 * the shape of the step: `pages.yml` sets `CARRY_ORIGIN` and passes no argv at
 * all. Why it must stay that way is the entry header's "Where the address
 * comes from"; the consequence for the tests is that no case may spell an
 * origin on the command line, and the one that tries is a case of its own.
 *
 * Asynchronously, and that is not a style choice: a stand-in origin over HTTP
 * listens on this very process, so a synchronous child would block the event
 * loop that has to answer it, and every case would read as a timeout.
 *
 * `cwd` is the instrument of the case that hands the step an empty `--dist`:
 * the step must write nothing at all on that path, and a run given a directory
 * of its own is how a regression lands somewhere it can be asserted rather
 * than in the working tree.
 */
export function entryRunAsChildProcess(origin: string, args: string[] = [], cwd?: string): Promise<CarryRun> {
  return new Promise((resolve) => {
    const env = { ...process.env, CARRY_ORIGIN: origin };
    execFile(process.execPath, [entry, ...args], { encoding: "utf8", env, cwd }, (error, stdout, stderr) => {
      const status = error ? ((error as { code?: number }).code ?? 1) : 0;
      resolve({ status, out: `${stdout}${stderr}` });
    });
  });
}

/**
 * Every annotation the run summary carries, as one block, or "" when the step
 * ended quiet. `::warning::` at the start of a line is the workflow command
 * Actions reads, so they are read here the same way Actions reads them: line by
 * line, anchored. Every, and not the first, because one page can be wrong in
 * more than one way at once and each way sends the reader somewhere else.
 */
export const annotationsOf = (out: string): string => out.split("\n").filter((line) => line.startsWith("::warning::")).join("\n");
