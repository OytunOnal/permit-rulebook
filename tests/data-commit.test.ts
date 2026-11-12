import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readLock } from "../scripts/data-pin.mjs";
import { runGit } from "../scripts/run-git.mjs";
import { posixShellPath } from "./posix-shell.js";
import { LF, commitInThrowaway, inThrowawayFolder, initThrowawayRepository } from "./throwaway-folder.js";
import {
  checkoutRefOf, jobNamesOf, jobNeedsOf, jobOf, pagesYaml as pages, readText, stepScriptOf, stepsOf,
} from "./workflow-text.js";

/**
 * Which data commit a run builds is chosen once, in `data-commit`, and handed
 * on as one 40-hex sha: `data-check` runs the data package's whole check at
 * it, beside `build`, which builds the site against it (rulings 13 and 14 on
 * #343). The choice is the workflow's own shell, run here on throwaway
 * folders as the runner would; where each job reads it is read from the text,
 * a workflow being a file no test can run.
 */

const root = fileURLToPath(new URL("..", import.meta.url));

/** The site's own lock and manifest, which the choice reads, with the runner's line endings. */
const lockText = readText(join(root, "data.lock"));
const manifestText = readText(join(root, "package.json"));
/** The commit the site's own lock names: what every run but the newest-data ones hands on. */
const LOCKED = readLock(lockText).sha;

/** A dispatch's payload: a commit other than the lock's. */
const PAYLOAD = "0123456789abcdef0123456789abcdef01234567";

/** The one step that chooses the data commit, by its id, in whichever job holds it. */
function choosingStep(): string {
  const steps = jobNamesOf(pages).flatMap((name) => stepsOf(jobOf(pages, name))).filter((step) => /^ {8}id: data$/m.test(step));
  expect(steps, "no step, or more than one, has id: data").toHaveLength(1);
  return steps[0]!;
}

/** What one run of a step's script wrote to the run's outputs, and how it ended. */
interface StepRun { exitCode: number | null; outputLines: string[] }

/** A step's script run in `folder` as the runner runs it (`bash -e`), under `env`, its outputs file beside it. */
function runStepScript(step: string, folder: string, env: Record<string, string>): StepRun {
  const outputFile = `${folder}.github-output`;
  writeFileSync(outputFile, "");
  const run = spawnSync(posixShellPath!, ["-e", "-c", stepScriptOf(step)], {
    cwd: folder,
    env: { ...process.env, ...env, GITHUB_OUTPUT: outputFile.split("\\").join("/") },
    encoding: "utf8",
  });
  return { exitCode: run.status, outputLines: readFileSync(outputFile, "utf8").split(LF).filter((line) => line !== "") };
}

/** The site's files the choice reads, each the repository's own unless a case hands its own. */
interface SiteFiles { lock?: string; manifest?: string }

/** The choice's script run in a site folder of `folder` made of `site`, under `env` as the step's environment. */
function runChoice(folder: string, env: Record<string, string>, site: SiteFiles = {}): StepRun {
  const siteFolder = join(folder, "site");
  mkdirSync(siteFolder);
  writeFileSync(join(siteFolder, "data.lock"), site.lock ?? lockText);
  writeFileSync(join(siteFolder, "package.json"), site.manifest ?? manifestText);
  return runStepScript(choosingStep(), siteFolder, { RUN_ATTEMPT: "1", PAYLOAD_SHA: "", ...env });
}

describe.skipIf(!posixShellPath)("the data commit is chosen once, by data-commit's own shell", () => {
  it("the step that chooses it is in data-commit", () => {
    expect(stepsOf(jobOf(pages, "data-commit"))).toContain(choosingStep());
  });

  it.each([
    ["push", "1"], ["pull_request", "1"], ["workflow_dispatch", "1"], ["schedule", "2"], ["repository_dispatch", "2"],
  ])("a %s run, attempt %s, hands on the lock's commit", async (event, attempt) => {
    await inThrowawayFolder((folder) => {
      const { exitCode, outputLines } = runChoice(folder, { EVENT_NAME: event, RUN_ATTEMPT: attempt, PAYLOAD_SHA: PAYLOAD });
      expect(exitCode).toBe(0);
      expect(outputLines).toEqual(["dir=permit-rulebook-data", `locked=${LOCKED}`, `sha=${LOCKED}`]);
    });
  });

  it("a dispatch's first attempt hands on its payload's commit", async () => {
    await inThrowawayFolder((folder) => {
      const { exitCode, outputLines } = runChoice(folder, { EVENT_NAME: "repository_dispatch", PAYLOAD_SHA: PAYLOAD });
      expect(exitCode).toBe(0);
      expect(outputLines).toContain(`sha=${PAYLOAD}`);
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
      const { exitCode, outputLines } = runChoice(folder, {
        EVENT_NAME: "schedule", DATA_REPOSITORY_URL: dataRepository.split("\\").join("/"),
      });
      expect(exitCode).toBe(0);
      expect(outputLines).toContain(`sha=${newest}`);
    });
  });
});

/**
 * Every value the choice writes to the run's outputs comes from a file or an
 * event a pull request or a dispatch may write, and a second line in one
 * would be a second output. Each is checked for its shape first, on every
 * event (review of #345, Security 1).
 */
describe.skipIf(!posixShellPath)("the choice writes nothing it has not checked", () => {
  const twoLineLock = `sha=${LOCKED}${LF}sha=dir=../elsewhere${LF}`;
  it.each([
    ...["push", "pull_request", "schedule", "repository_dispatch"].map((event) => [event, "not 40 hex", "sha=main\n"]),
    ...["push", "pull_request", "schedule", "repository_dispatch"].map((event) => [event, "a second sha line", twoLineLock]),
    ["push", "no sha", "dataset_version=2026.11.10\n"],
  ])("a %s run refuses a lock with %s, before any output", async (event, _what, lock) => {
    await inThrowawayFolder((folder) => {
      const { exitCode, outputLines } = runChoice(folder, { EVENT_NAME: event, PAYLOAD_SHA: PAYLOAD }, { lock });
      expect(exitCode).not.toBe(0);
      expect(outputLines).toEqual([]);
    });
  });

  it("a dispatch's first attempt refuses a payload that is not 40 hex, before any output", async () => {
    await inThrowawayFolder((folder) => {
      const { exitCode, outputLines } = runChoice(folder, { EVENT_NAME: "repository_dispatch", PAYLOAD_SHA: "main" });
      expect(exitCode).not.toBe(0);
      expect(outputLines).toEqual([]);
    });
  });

  // The folder lands in the build's checkout path and working directory.
  it("a manifest naming a data folder that is not a plain name is refused, before any output", async () => {
    const manifest = JSON.parse(manifestText) as { dependencies: Record<string, string> };
    manifest.dependencies["permit-rulebook-data"] = "file:../Data Folder";
    await inThrowawayFolder((folder) => {
      const { exitCode, outputLines } = runChoice(folder, { EVENT_NAME: "push" }, { manifest: JSON.stringify(manifest) });
      expect(exitCode).not.toBe(0);
      expect(outputLines).toEqual([]);
    });
  });
});

/**
 * The build hands on the commit it checked out and the dataset version it
 * read from the data's own file; the pin writes both into data.lock. The
 * version is checked for its shape before it becomes an output.
 */
describe.skipIf(!posixShellPath)("the build hands on the data's version only in its shape", () => {
  /** The build's step that reads the commit and version, run in a workspace of `folder` whose data carries `version`. */
  function runBuiltStep(folder: string, version: string): StepRun & { commit: string } {
    const workspace = join(folder, "workspace");
    const dataFolder = join(workspace, "permit-rulebook-data");
    initThrowawayRepository(dataFolder);
    mkdirSync(join(dataFolder, "data"));
    writeFileSync(join(dataFolder, "data", "dataset.json"), JSON.stringify({ dataset_version: version }));
    commitInThrowaway(dataFolder, "--allow-empty", "-m", "the data");
    const step = stepsOf(jobOf(pages, "build")).find((candidate) => /^ {8}id: built$/m.test(candidate));
    expect(step, "the build has no step with id: built").toBeDefined();
    const run = runStepScript(step!, workspace, { DATA_DIR: "permit-rulebook-data", LOCKED });
    return { ...run, commit: runGit(dataFolder, "rev-parse", "HEAD") };
  }

  it("a YYYY.MM.DD version is handed on beside the commit", async () => {
    await inThrowawayFolder((folder) => {
      const { exitCode, outputLines, commit } = runBuiltStep(folder, "2026.11.10");
      expect(exitCode).toBe(0);
      expect(outputLines).toEqual([`sha=${commit}`, "version=2026.11.10"]);
    });
  });

  it("a version carrying a second line is refused, before any output", async () => {
    await inThrowawayFolder((folder) => {
      const { exitCode, outputLines } = runBuiltStep(folder, `2026.11.10${LF}built=${PAYLOAD}`);
      expect(exitCode).not.toBe(0);
      expect(outputLines).toEqual([]);
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
