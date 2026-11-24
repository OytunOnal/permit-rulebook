import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHOOSE_COMMIT_REFUSALS } from "../scripts/data-lock/data-lock.mjs";
import { RUN_REFUSALS } from "../scripts/data-lock-run/data-lock-run.mjs";
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
  it.each(["data:pin", "data:check"])("npm run %s -- --lock with no path", (script) => {
    const before = siteLockWritten();
    expectOneRefusalLine(scriptRun(script, "--lock"), RUN_REFUSALS.lockPath);
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
});
