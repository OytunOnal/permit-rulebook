import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHOOSE_COMMIT_REFUSALS, lockedShaOf } from "../scripts/data-lock/data-lock.mjs";
import { READ_BUILT_COMMIT_REFUSALS, RUN_REFUSALS } from "../scripts/data-lock-run/data-lock-run.mjs";
import { runGit } from "../scripts/run-git.mjs";
import { type StepRun, runStepCommand, stepKeyOf } from "./step-run.js";
import { LF, commitInThrowaway, inThrowawayFolder, initThrowawayRepository } from "./throwaway-folder.js";
import {
  checkoutRefOf, jobNamesOf, jobNeedsOf, jobOf, pagesYaml as pages, readText, stepScriptOf, stepsOf,
} from "./workflow-text.js";

/**
 * Which data commit a run builds is chosen once, in `data-commit`, and handed
 * on as one 40-hex sha: `data-check` runs the data package's whole check at
 * it, beside `build`, which builds the site against it (rulings 13 and 14 on
 * #343). The choice is the run module's `choose-commit`, run here as the
 * step's own line runs it, a process in a throwaway site folder, and so is
 * the build's `read-built-commit`. Where each job reads
 * the choice is read from the text, a workflow being a file no test can run.
 */

const root = fileURLToPath(new URL("..", import.meta.url));

/** The site's own lock and manifest, which the choice reads, with the runner's line endings. */
const lockText = readText(join(root, "data.lock"));
const manifestText = readText(join(root, "package.json"));
/** The commit the site's own lock names: what every run but the newest-data ones hands on. */
const LOCKED = lockedShaOf(lockText);

/** A dispatch's payload: a commit other than the lock's. */
const PAYLOAD = "0123456789abcdef0123456789abcdef01234567";

/** The one step that chooses the data commit, by its id, in whichever job holds it. */
function choosingStep(): string {
  const steps = jobNamesOf(pages).flatMap((name) => stepsOf(jobOf(pages, name))).filter((step) => /^ {8}id: data$/m.test(step));
  expect(steps, "no step, or more than one, has id: data").toHaveLength(1);
  return steps[0]!;
}

/** The site's files the choice reads, each the repository's own unless a case hands its own. */
interface SiteFiles { lock?: string; manifest?: string }

/** The choosing step run in a site folder of `folder` made of `site`, under `env` as the step's environment. */
function runChoice(folder: string, env: Record<string, string>, site: SiteFiles = {}): StepRun {
  const siteFolder = join(folder, "site");
  mkdirSync(siteFolder);
  writeFileSync(join(siteFolder, "data.lock"), site.lock ?? lockText);
  writeFileSync(join(siteFolder, "package.json"), site.manifest ?? manifestText);
  return runStepCommand(choosingStep(), siteFolder, { RUN_ATTEMPT: "1", PAYLOAD_SHA: "", ...env });
}

describe("the data commit is chosen once, by the run module's choose-commit", () => {
  it("the step that chooses it is in data-commit", () => {
    expect(stepsOf(jobOf(pages, "data-commit"))).toContain(choosingStep());
  });

  it.each([
    ["push", "1"], ["pull_request", "1"], ["workflow_dispatch", "1"], ["schedule", "2"], ["repository_dispatch", "2"],
  ])("a %s run, attempt %s, hands on the lock's commit", async (event, attempt) => {
    await inThrowawayFolder((folder) => {
      const { exitCode, outputLines, printed } = runChoice(folder, { EVENT_NAME: event, RUN_ATTEMPT: attempt, PAYLOAD_SHA: PAYLOAD });
      expect(exitCode, printed).toBe(0);
      expect(outputLines).toEqual(["dir=permit-rulebook-data", `locked=${LOCKED}`, `sha=${LOCKED}`]);
    });
  });

  it("a dispatch's first attempt hands on its payload's commit", async () => {
    await inThrowawayFolder((folder) => {
      const { exitCode, outputLines, printed } = runChoice(folder, { EVENT_NAME: "repository_dispatch", PAYLOAD_SHA: PAYLOAD });
      expect(exitCode, printed).toBe(0);
      expect(outputLines).toEqual(["dir=permit-rulebook-data", `locked=${LOCKED}`, `sha=${PAYLOAD}`]);
    });
  });

  // Read once, here, so data-check and build check the same commit even when
  // the watch commits between them.
  it("a schedule's first attempt hands on the data master's commit at that moment", async () => {
    await inThrowawayFolder((folder) => {
      const dataRepository = join(folder, "data");
      initThrowawayRepository(dataRepository);
      commitInThrowaway(dataRepository, "--allow-empty", "-m", "the newest data");
      const newest = runGit(dataRepository, "rev-parse", "HEAD");
      const { exitCode, outputLines, printed } = runChoice(folder, { EVENT_NAME: "schedule", DATA_REPOSITORY_URL: dataRepository });
      expect(exitCode, printed).toBe(0);
      expect(outputLines).toEqual(["dir=permit-rulebook-data", `locked=${LOCKED}`, `sha=${newest}`]);
    });
  });
});

/**
 * Every value the choice writes to the run's outputs comes from a file or an
 * event a pull request or a dispatch may write, and a second line in one
 * would be a second output. Each is checked for its shape first, on every
 * event (review of #345, Security 1).
 */
describe("the choice writes nothing it has not checked", () => {
  /** A refusal asserted: a non-zero exit, no output line, the reason `refusal` names said, and the refused value never printed. */
  function expectRefused({ exitCode, outputLines, printed }: StepRun, refusal: keyof typeof CHOOSE_COMMIT_REFUSALS, refused?: string): void {
    expect(exitCode, printed).not.toBe(0);
    expect(outputLines).toEqual([]);
    expect(printed, "the refusal does not say why").toContain(CHOOSE_COMMIT_REFUSALS[refusal]);
    if (refused !== undefined) expect(printed, "the refusal prints the value it refused").not.toContain(refused);
  }

  const notACommit = "not-a-commit";
  const secondLine = "dir=../elsewhere";
  /** A malformed lock's text, and the value in it a refusal must not print, if any. */
  type MalformedLock = { lock: string; refused?: string };
  const events = ["push", "pull_request", "schedule", "repository_dispatch"];
  it.each<[string, string, MalformedLock]>([
    ...events.map((event): [string, string, MalformedLock] => [event, "not 40 hex", { lock: `sha=${notACommit}${LF}`, refused: notACommit }]),
    ...events.map((event): [string, string, MalformedLock] =>
      [event, "a second sha line", { lock: `sha=${LOCKED}${LF}sha=${secondLine}${LF}`, refused: secondLine }]),
    ["push", "no sha", { lock: `dataset_version=2026.11.10${LF}` }],
  ])("a %s run refuses a lock with %s, before any output, saying why without the value", async (event, _what, { lock, refused }) => {
    await inThrowawayFolder((folder) => {
      expectRefused(runChoice(folder, { EVENT_NAME: event, PAYLOAD_SHA: PAYLOAD }, { lock }), "lock", refused);
    });
  });

  it("a dispatch's first attempt refuses a payload that is not 40 hex, before any output, saying why without the value", async () => {
    await inThrowawayFolder((folder) => {
      expectRefused(runChoice(folder, { EVENT_NAME: "repository_dispatch", PAYLOAD_SHA: notACommit }), "chosenCommit", notACommit);
    });
  });

  // The folder lands in the build's checkout path and working directory.
  it("a manifest naming a data folder that is not a plain name is refused, before any output, saying why without the value", async () => {
    const manifest = JSON.parse(manifestText) as { dependencies: Record<string, string> };
    manifest.dependencies["permit-rulebook-data"] = "file:../Data Folder";
    await inThrowawayFolder((folder) => {
      expectRefused(runChoice(folder, { EVENT_NAME: "push" }, { manifest: JSON.stringify(manifest) }), "dataFolder", "Data Folder");
    });
  });
});

/**
 * A refusal prints one structured error line and no stack trace; under
 * Actions it also prints `::error::` with its reason, so it shows on the
 * run's page (Q306, Q310 on #446).
 */
describe("a refusal is one error line, with an annotation under Actions", () => {
  it.each([["outside Actions", "", false], ["under Actions", "true", true]])("%s", async (_where, githubActions, annotated) => {
    await inThrowawayFolder((folder) => {
      const reason = CHOOSE_COMMIT_REFUSALS.chosenCommit;
      const run = runChoice(folder, { EVENT_NAME: "repository_dispatch", PAYLOAD_SHA: "main", GITHUB_ACTIONS: githubActions });
      expect(run.exitCode, run.printed).toBe(1);
      const lines = run.printed.split(LF).map((line) => line.trimEnd()).filter((line) => line !== "");
      expect(lines, "the refusal printed more than its line, or its annotation").toHaveLength(annotated ? 2 : 1);
      const errorLines = lines.filter((line) => line.startsWith("{")).map((line) => JSON.parse(line) as { level: string; msg: string });
      expect(errorLines).toHaveLength(1);
      expect(errorLines[0]!.level).toBe("error");
      expect(errorLines[0]!.msg).toContain(reason);
      const annotations = lines.filter((line) => line.startsWith("::error::"));
      expect(annotations).toHaveLength(annotated ? 1 : 0);
      if (annotated) expect(annotations[0]).toContain(reason);
    });
  });

  // Only a declared refusal is one line (Q314): a git crash, like a bug, is
  // no refusal, and Node prints it with its stack.
  it("an error that is no declared refusal keeps its stack, not the one-line form", async () => {
    await inThrowawayFolder((folder) => {
      const run = runChoice(folder, { EVENT_NAME: "schedule", DATA_REPOSITORY_URL: join(folder, "no-repository-here"), GITHUB_ACTIONS: "true" });
      expect(run.exitCode, run.printed).not.toBe(0);
      expect(run.outputLines).toEqual([]);
      const lines = run.printed.split(LF).map((line) => line.trimEnd());
      expect(lines.filter((line) => /^\s+at /.test(line)), `no stack was printed: ${run.printed}`).not.toEqual([]);
      expect(lines.filter((line) => line.startsWith("{") || line.startsWith("::error::")), "the error was printed as a refusal").toEqual([]);
    });
  });
});

// A step whose outputs have nowhere to go is refused, not crashed (Q317 on #446).
describe("a run with nowhere to write its outputs", () => {
  it("is refused in one line", async () => {
    await inThrowawayFolder((folder) => {
      const run = runChoice(folder, { EVENT_NAME: "push", GITHUB_OUTPUT: "", GITHUB_ACTIONS: "" });
      expect(run.exitCode, run.printed).toBe(1);
      const lines = run.printed.split(LF).map((line) => line.trimEnd()).filter((line) => line !== "");
      expect(lines, "the refusal printed more than its one line").toHaveLength(1);
      expect(JSON.parse(lines[0]!)).toMatchObject({ level: "error" });
      expect(JSON.parse(lines[0]!).msg).toContain(RUN_REFUSALS.stepOutputs);
    });
  });
});

/**
 * The build hands on the commit it checked out and the dataset version it
 * read from the data's own file; the pin writes both into data.lock. The
 * version is checked for its shape before it becomes an output. The step is
 * the run module's `read-built-commit`, run here as the step's own line runs
 * it: a process in the site's checkout, the data checked out beside it, under
 * the step's own `working-directory:` and `DATA_DIR`.
 */
/** The build's one step that reads the commit and version it built. */
function builtStep(): string {
  const steps = stepsOf(jobOf(pages, "build")).filter((step) => /^ {8}id: built$/m.test(step));
  expect(steps, "the build has no step, or more than one, with id: built").toHaveLength(1);
  return steps[0]!;
}

/**
 * The built step run in a workspace of `folder` as the runner lays it out:
 * the site in the step's `working-directory:`, the data beside it under the
 * folder data-commit chose, its own file carrying `dataset`, and `DATA_DIR` as
 * the step's env gives it; `env` is laid over that, and `objectFormat` names
 * the data repository's hash, git's sha1 when not given.
 */
function runBuiltStep(
  folder: string, dataset: unknown, { env = {}, objectFormat = "sha1" }: { env?: Record<string, string>; objectFormat?: string } = {},
): StepRun & { commit: string } {
  const workspace = join(folder, "workspace");
  const dataFolder = join(workspace, "permit-rulebook-data");
  mkdirSync(dataFolder, { recursive: true });
  runGit(dataFolder, "init", "--quiet", "--initial-branch=master", `--object-format=${objectFormat}`);
  mkdirSync(join(dataFolder, "data"));
  writeFileSync(join(dataFolder, "data", "dataset.json"), JSON.stringify(dataset));
  commitInThrowaway(dataFolder, "--allow-empty", "-m", "the data");
  const step = builtStep();
  const siteFolder = join(workspace, stepKeyOf(step, 8, "working-directory"));
  mkdirSync(siteFolder, { recursive: true });
  const dataDir = stepKeyOf(step, 10, "DATA_DIR").replace("${{ needs.data-commit.outputs.dir }}", "permit-rulebook-data");
  const run = runStepCommand(step, siteFolder, { DATA_DIR: dataDir, ...env });
  return { ...run, commit: runGit(dataFolder, "rev-parse", "HEAD") };
}

/** A built step's refusal asserted: exit 1, no output line, the reason `refusal` names said, and the refused value never printed. */
function expectBuiltRefused({ exitCode, outputLines, printed }: StepRun, refusal: keyof typeof READ_BUILT_COMMIT_REFUSALS, refused?: string): void {
  expect(exitCode, printed).toBe(1);
  expect(outputLines).toEqual([]);
  expect(printed, "the refusal does not say why").toContain(READ_BUILT_COMMIT_REFUSALS[refusal]);
  if (refused !== undefined) expect(printed, "the refusal prints the value it refused").not.toContain(refused);
}

describe("the build hands on the commit and version it built, through the run module's read-built-commit", () => {
  it("a YYYY.MM.DD version is handed on beside the commit, and the run's log names both", async () => {
    await inThrowawayFolder((folder) => {
      const { exitCode, outputLines, printed, commit } = runBuiltStep(folder, { dataset_version: "2026.11.10" });
      expect(exitCode, printed).toBe(0);
      expect(outputLines).toEqual([`sha=${commit}`, "version=2026.11.10"]);
      const logLines = printed.split(LF).filter((line) => line.startsWith("{")).map((line) => JSON.parse(line) as Record<string, string>);
      expect(logLines).toHaveLength(1);
      expect(logLines[0]).toMatchObject({ level: "info", sha: commit, version: "2026.11.10" });
    });
  });
});

describe("the build's read-built-commit writes nothing it has not checked", () => {
  const secondLine = `built=${PAYLOAD}`;
  it.each<[string, unknown, string | undefined]>([
    ["a second line", { dataset_version: `2026.11.10${LF}${secondLine}` }, secondLine],
    ["dashes for dots", { dataset_version: "2026-11-10" }, "2026-11-10"],
    ["a number", { dataset_version: 20261110 }, "20261110"],
    ["a list holding a good version", { dataset_version: ["2026.11.10"] }, undefined],
    ["none at all", {}, undefined],
  ])("a version with %s is refused, before any output, saying why without the value", async (_what, dataset, refused) => {
    await inThrowawayFolder((folder) => {
      expectBuiltRefused(runBuiltStep(folder, dataset), "datasetVersion", refused);
    });
  });

  // Unset, the data folder would read as the site's own checkout, whose HEAD
  // is no data commit.
  it("a step with no DATA_DIR is refused, before any output", async () => {
    await inThrowawayFolder((folder) => {
      expectBuiltRefused(runBuiltStep(folder, { dataset_version: "2026.11.10" }, { env: { DATA_DIR: "" } }), "dataDir");
    });
  });

  // A sha256 repository's HEAD is 64 hex: no commit a lock can name.
  it("a data clone whose HEAD is not 40 hex is refused, before any output, saying why without the value", async () => {
    await inThrowawayFolder((folder) => {
      const run = runBuiltStep(folder, { dataset_version: "2026.11.10" }, { objectFormat: "sha256" });
      expectBuiltRefused(run, "head", run.commit);
    });
  });

  it("a refusal under Actions also prints its annotation", async () => {
    await inThrowawayFolder((folder) => {
      const run = runBuiltStep(folder, { dataset_version: "2026-11-10" }, { env: { GITHUB_ACTIONS: "true" } });
      expectBuiltRefused(run, "datasetVersion");
      const annotations = run.printed.split(LF).filter((line) => line.startsWith("::error::"));
      expect(annotations).toHaveLength(1);
      expect(annotations[0]).toContain(READ_BUILT_COMMIT_REFUSALS.datasetVersion);
    });
  });
});

describe("data-check and build read the one commit data-commit chose", () => {
  /** A job's checkout of the data repository; a failure when it has none. */
  function dataCheckoutOf(name: string): string {
    const checkout = stepsOf(jobOf(pages, name)).find((step) => /^ {10}repository: OytunOnal\/permit-rulebook-data$/m.test(step));
    expect(checkout, `${name} checks out no data`).toBeDefined();
    return checkout!;
  }

  it.each(["data-check", "build"])("%s waits on data-commit and checks out the data at its sha", (name) => {
    expect(jobNeedsOf(jobOf(pages, name))).toContain("data-commit");
    expect(checkoutRefOf(dataCheckoutOf(name))).toBe("${{ needs.data-commit.outputs.sha }}");
  });

  it("data-check runs the data package's whole check, and build only builds it", () => {
    const scriptsOf = (name: string): string[] => stepsOf(jobOf(pages, name)).map(stepScriptOf).filter((script) => script !== "");
    expect(scriptsOf("data-check")).toContainEqual(`npm ci${LF}npm run check`);
    expect(scriptsOf("build")).toContainEqual(`npm ci${LF}npm run build`);
    expect(jobOf(pages, "build")).not.toMatch(/^\s+npm run check$/m);
  });

  // A red data check reddens the run as a red build does, and nothing deploys.
  it("deploy waits on build and data-check", () => {
    expect(jobNeedsOf(jobOf(pages, "deploy")).sort()).toEqual(["build", "data-check"]);
  });
});
