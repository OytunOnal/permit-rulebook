import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHOOSE_COMMIT_REFUSALS, PIN_REFUSALS } from "../scripts/data-lock/data-lock.mjs";
import { RUN_REFUSALS } from "../scripts/data-lock-run/data-lock-run.mjs";
import { runGit } from "../scripts/run-git.mjs";
import { commitInThrowaway, initThrowawayRepository, inThrowawayFolder, LF } from "./throwaway-folder.js";

/**
 * The hand runs' declared refusals of a malformed command line or lock, run
 * as `npm run data:pin` and `data:check` run them: each prints one JSON
 * error line saying its reason, no stack, and exits 1 (Q306, Q317 on #446).
 * Outside Actions, so no annotation is printed even on CI.
 */

const root = fileURLToPath(new URL("..", import.meta.url));

/** What `npm run <name>` hands node: the script's words after `node`. */
function scriptArgumentsOf(name: string): string[] {
  const words = String(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts[name] ?? "").split(" ").filter(Boolean);
  expect(words[0], `package.json's script ${name} is not a node command`).toBe("node");
  return words.slice(1);
}

/** `npm run <script>` with `args` after it, from the site's root and outside Actions: its exit code and everything it printed. */
function scriptRun(script: string, ...args: string[]): { status: number | null; out: string } {
  const run = spawnSync(process.execPath, [...scriptArgumentsOf(script), ...args], {
    cwd: root, encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: "" },
  });
  return { status: run.status, out: `${run.stdout}${run.stderr}` };
}

/** A refusal asserted: exit 1, and all it printed one JSON error line saying `reason`. */
function expectOneRefusalLine(run: { status: number | null; out: string }, reason: string): void {
  expect(run.status, run.out).toBe(1);
  const lines = run.out.split(LF).map((line) => line.trimEnd()).filter((line) => line !== "");
  expect(lines, "the refusal printed more than its one line").toHaveLength(1);
  const line = JSON.parse(lines[0]!) as { level: string; msg: string };
  expect(line.level).toBe("error");
  expect(line.msg).toContain(reason);
}

/** The site's own data.lock's last write, so a case can say it was not written. */
const siteLockWritten = (): number => statSync(join(root, "data.lock")).mtimeMs;

describe("the hand runs refuse a malformed command line or lock in one line", () => {
  it.each([
    ["data:pin", "--lock", "lockPath"], ["data:check", "--lock", "lockPath"],
    ["data:pin", "--clone", "clonePath"], ["data:check", "--clone", "clonePath"],
  ] as const)("npm run %s -- %s with no path", (script, option, refusal) => {
    const before = siteLockWritten();
    expectOneRefusalLine(scriptRun(script, option), RUN_REFUSALS[refusal]);
    expect(siteLockWritten(), "the site's data.lock was written").toBe(before);
  });

  it("npm run data:check on a lock whose sha is not 40 hex, saying why without the value", async () => {
    await inThrowawayFolder((folder) => {
      const clone = join(folder, "permit-rulebook-data");
      initThrowawayRepository(clone);
      commitInThrowaway(clone, "--allow-empty", "-m", "the data");
      const lock = join(folder, "data.lock");
      writeFileSync(lock, `sha=not-a-commit${LF}dataset_version=2026.11.17${LF}`);
      const run = scriptRun("data:check", "--lock", lock, "--clone", clone);
      expectOneRefusalLine(run, CHOOSE_COMMIT_REFUSALS.lock);
      expect(run.out, "the refusal prints the value it refused").not.toContain("not-a-commit");
    });
  });

  // The clone holds the first sha's commit, so only the second line refuses it (Q319).
  it("npm run data:check on a lock with a second sha= line, saying why without the value", async () => {
    await inThrowawayFolder((folder) => {
      const clone = join(folder, "permit-rulebook-data");
      initThrowawayRepository(clone);
      commitInThrowaway(clone, "--allow-empty", "-m", "the data");
      const head = runGit(clone, "rev-parse", "HEAD");
      const lock = join(folder, "data.lock");
      writeFileSync(lock, `sha=${head}${LF}sha=second-line${LF}dataset_version=2026.11.17${LF}`);
      const run = scriptRun("data:check", "--lock", lock, "--clone", clone);
      expectOneRefusalLine(run, CHOOSE_COMMIT_REFUSALS.lock);
      expect(run.out, "the refusal prints the value it refused").not.toContain("second-line");
    });
  });
});

/** A throwaway data clone at `clone` whose one commit carries a YYYY.MM.DD dataset version, so only the lock can refuse a pin from it. */
function cloneWithGoodVersion(clone: string): void {
  initThrowawayRepository(clone);
  mkdirSync(join(clone, "data"));
  writeFileSync(join(clone, "data", "dataset.json"), JSON.stringify({ dataset_version: "2026.11.24" }));
  runGit(clone, "add", "data");
  commitInThrowaway(clone, "-m", "the data");
}

// A line the pin cannot find is a line it cannot write (Q326).
describe("the hand pin refuses a lock it cannot write in one line", () => {
  it.each(["sha=", "dataset_version="])("npm run data:pin on a lock missing its %s line, leaving the lock as it was", async (key) => {
    await inThrowawayFolder((folder) => {
      const clone = join(folder, "permit-rulebook-data");
      cloneWithGoodVersion(clone);
      const lock = join(folder, "data.lock");
      const lockText = readFileSync(join(root, "data.lock"), "utf8").split(LF).filter((line) => !line.startsWith(key)).join(LF);
      writeFileSync(lock, lockText);
      expectOneRefusalLine(scriptRun("data:pin", "--lock", lock, "--clone", clone), PIN_REFUSALS.lock);
      expect(readFileSync(lock, "utf8"), "the given lock was written").toBe(lockText);
    });
  });

  // A second line would keep its old value beside the written one (Q327).
  it.each(["sha=", "dataset_version="])("npm run data:pin on a lock with a second %s line, leaving the lock as it was", async (key) => {
    await inThrowawayFolder((folder) => {
      const clone = join(folder, "permit-rulebook-data");
      cloneWithGoodVersion(clone);
      const lock = join(folder, "data.lock");
      const siteLockText = readFileSync(join(root, "data.lock"), "utf8");
      const lockText = `${siteLockText}${siteLockText.split(LF).find((line) => line.startsWith(key))}${LF}`;
      writeFileSync(lock, lockText);
      expectOneRefusalLine(scriptRun("data:pin", "--lock", lock, "--clone", clone), PIN_REFUSALS.lock);
      expect(readFileSync(lock, "utf8"), "the given lock was written").toBe(lockText);
    });
  });
});
