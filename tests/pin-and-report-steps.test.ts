import { describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { pinnedLockTextOf, readLock } from "../scripts/data-lock/data-lock.mjs";
import { PIN_BUILT_REFUSALS, READ_LOCKED_COMMIT_REFUSALS } from "../scripts/data-lock-run/data-lock-run.mjs";
import { type StepRun, runStepCommand, stepKeyOf } from "./step-run.js";
import { LF, inThrowawayFolder } from "./throwaway-folder.js";
import { jobOf, pagesYaml as pages, readText, stepsOf } from "./workflow-text.js";

/**
 * The deploy's write of the lock and the report's read of it, each the run
 * module's subcommand, run here as the step's own line runs it: a process in a
 * throwaway site, under the environment the step passes, its outputs file
 * beside it. `pin` writes the commit and version the build reported into the
 * lock (`pin-built`); `report` hands on the lock's commit (`read-locked-commit`).
 * Where each step sits, and what runs beside it, is `tests/pipeline.test.ts`'s.
 */

const root = fileURLToPath(new URL("..", import.meta.url));

/** The site's own lock, with the runner's line endings: the lock a run starts from. */
const lockText = readText(join(root, "data.lock"));

/** A built commit other than the lock's. */
const BUILT = "0123456789abcdef0123456789abcdef01234567";
/** The dataset version that commit carried. */
const VERSION = "2026.11.24";

/** A job's one step with `id: <id>`; a failure when it has none, or more than one. */
function stepWithId(job: string, id: string): string {
  const steps = stepsOf(jobOf(pages, job)).filter((step) => new RegExp(`^ {8}id: ${id}$`, "m").test(step));
  expect(steps, `${job} has no step, or more than one, with id: ${id}`).toHaveLength(1);
  return steps[0]!;
}

/** A run of a step that may write the lock, and the lock's text after it. */
type LockStepRun = StepRun & { lockAfter: string };

/** The step `step` run in a site of `folder` holding `lock`, in the step's own working folder, under `env`. */
function runLockStep(step: string, folder: string, { lock, env }: { lock: string; env: Record<string, string> }): LockStepRun {
  const site = join(folder, stepKeyOf(step, 8, "working-directory") || "site");
  mkdirSync(site, { recursive: true });
  writeFileSync(join(site, "data.lock"), lock);
  const run = runStepCommand(step, site, env);
  return { ...run, lockAfter: readFileSync(join(site, "data.lock"), "utf8") };
}

/** `pin`'s write run on a site holding `lock` (the site's own by default), its BUILT and VERSION laid over the good ones. */
const runPinBuilt = (folder: string, env: Record<string, string> = {}, lock = lockText): LockStepRun =>
  runLockStep(stepWithId("pin", "pinned"), folder, { lock, env: { BUILT, VERSION, GITHUB_ACTIONS: "", ...env } });

/** `report`'s lock read run on a site holding `lock`. */
const runReadLockedCommit = (folder: string, lock: string, env: Record<string, string> = {}): LockStepRun =>
  runLockStep(stepWithId("report", "lock"), folder, { lock, env: { GITHUB_ACTIONS: "", ...env } });

/** The JSON lines a run printed, parsed. */
const jsonLinesOf = (printed: string): Record<string, string>[] =>
  printed.split(LF).map((line) => line.trim()).filter((line) => line.startsWith("{")).map((line) => JSON.parse(line) as Record<string, string>);

/** A refusal asserted: exit 1, no output line, the lock as it was, `reason` said, and the refused value never printed. */
function expectRefused(run: LockStepRun, { lock, reason, refused }: { lock: string; reason: string; refused?: string }): void {
  expect(run.exitCode, run.printed).toBe(1);
  expect(run.outputLines).toEqual([]);
  expect(run.lockAfter, "the lock was written").toBe(lock);
  expect(run.printed, "the refusal does not say why").toContain(reason);
  if (refused !== undefined) expect(run.printed, "the refusal prints the value it refused").not.toContain(refused);
}

describe("pin writes the built commit and version into the lock, through the run module's pin-built", () => {
  it("the lock names the built commit and version, every other line kept, and the outputs and the log name both", async () => {
    await inThrowawayFolder((folder) => {
      const run = runPinBuilt(folder);
      expect(run.exitCode, run.printed).toBe(0);
      expect(run.lockAfter).toBe(pinnedLockTextOf(lockText, { sha: BUILT, datasetVersion: VERSION }));
      expect(readLock(run.lockAfter)).toEqual({ sha: BUILT, datasetVersion: VERSION });
      expect(run.outputLines).toEqual([`sha=${BUILT}`, `version=${VERSION}`]);
      const logLines = jsonLinesOf(run.printed);
      expect(logLines).toHaveLength(1);
      expect(logLines[0]).toMatchObject({ level: "info", sha: BUILT, version: VERSION });
    });
  });
});

describe("pin-built writes nothing it has not checked", () => {
  const secondLine = `sha=${"f".repeat(40)}`;
  /** A malformed value the build may report: the step's env laid over the good one, the reason it breaks, and the value a refusal must not print, if any. */
  type MalformedReport = { env: Record<string, string>; reason: keyof typeof PIN_BUILT_REFUSALS; refused?: string };
  it.each<[string, MalformedReport]>([
    ["a commit that is not 40 hex", { env: { BUILT: "not-a-commit" }, reason: "commit", refused: "not-a-commit" }],
    ["a commit in capitals", { env: { BUILT: BUILT.toUpperCase() }, reason: "commit", refused: BUILT.toUpperCase() }],
    ["a commit with a second line", { env: { BUILT: `${BUILT}${LF}${secondLine}` }, reason: "commit", refused: secondLine }],
    ["no commit", { env: { BUILT: "" }, reason: "commit" }],
    ["a version with dashes for dots", { env: { VERSION: "2026-11-24" }, reason: "datasetVersion", refused: "2026-11-24" }],
    ["a version with a second line", { env: { VERSION: `${VERSION}${LF}${secondLine}` }, reason: "datasetVersion", refused: secondLine }],
    ["no version", { env: { VERSION: "" }, reason: "datasetVersion" }],
  ])("%s is refused, the lock unwritten and no output, saying why without the value", async (_what, { env, reason, refused }) => {
    await inThrowawayFolder((folder) => {
      expectRefused(runPinBuilt(folder, env), { lock: lockText, reason: PIN_BUILT_REFUSALS[reason], refused });
    });
  });

  // A line the pin cannot find is a line it cannot write (Q326).
  it.each([
    ["sha=", (line: string) => !line.startsWith("sha=")],
    ["dataset_version=", (line: string) => !line.startsWith("dataset_version=")],
  ])("a lock missing its %s line is refused, the lock unwritten and no output", async (_line, isKept) => {
    const lock = lockText.split(LF).filter(isKept).join(LF);
    await inThrowawayFolder((folder) => {
      expectRefused(runPinBuilt(folder, {}, lock), { lock, reason: PIN_BUILT_REFUSALS.lock });
    });
  });

  it("a refusal under Actions also prints its annotation", async () => {
    await inThrowawayFolder((folder) => {
      const run = runPinBuilt(folder, { VERSION: "2026-11-24", GITHUB_ACTIONS: "true" });
      expectRefused(run, { lock: lockText, reason: PIN_BUILT_REFUSALS.datasetVersion });
      const annotations = run.printed.split(LF).filter((line) => line.startsWith("::error::"));
      expect(annotations).toHaveLength(1);
      expect(annotations[0]).toContain(PIN_BUILT_REFUSALS.datasetVersion);
    });
  });
});

describe("report reads the lock's commit through the run module's read-locked-commit", () => {
  it("the lock's sha is handed on, and the log names it", async () => {
    await inThrowawayFolder((folder) => {
      const run = runReadLockedCommit(folder, lockText);
      expect(run.exitCode, run.printed).toBe(0);
      expect(run.outputLines).toEqual([`sha=${readLock(lockText).sha}`]);
      expect(run.lockAfter, "the lock was written").toBe(lockText);
      const logLines = jsonLinesOf(run.printed);
      expect(logLines).toHaveLength(1);
      expect(logLines[0]).toMatchObject({ level: "info", sha: readLock(lockText).sha });
    });
  });

  const notACommit = "not-a-commit";
  const secondLine = "second-line";
  it.each<[string, string, string | undefined]>([
    ["not 40 hex", `sha=${notACommit}${LF}dataset_version=${VERSION}${LF}`, notACommit],
    ["a second sha line", `${lockText}sha=${secondLine}${LF}`, secondLine],
    ["no sha", `dataset_version=${VERSION}${LF}`, undefined],
  ])("a lock with %s is refused, before any output, saying why without the value", async (_what, lock, refused) => {
    await inThrowawayFolder((folder) => {
      expectRefused(runReadLockedCommit(folder, lock), { lock, reason: READ_LOCKED_COMMIT_REFUSALS.lock, refused });
    });
  });

  it("a refusal under Actions also prints its annotation", async () => {
    await inThrowawayFolder((folder) => {
      const lock = `sha=${notACommit}${LF}`;
      const run = runReadLockedCommit(folder, lock, { GITHUB_ACTIONS: "true" });
      expectRefused(run, { lock, reason: READ_LOCKED_COMMIT_REFUSALS.lock, refused: notACommit });
      const annotations = run.printed.split(LF).filter((line) => line.startsWith("::error::"));
      expect(annotations).toHaveLength(1);
      expect(annotations[0]).toContain(READ_LOCKED_COMMIT_REFUSALS.lock);
    });
  });
});
