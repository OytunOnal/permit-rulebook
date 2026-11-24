import { expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { LF } from "./throwaway-folder.js";
import { stepRunLineOf } from "./workflow-text.js";

/**
 * A workflow step's one-line `run:` run as the runner runs it: a process in a
 * throwaway folder, under the step's environment, its outputs file beside
 * it. What the cases that run the lock's steps share.
 */

const root = fileURLToPath(new URL("..", import.meta.url));

/** What one run of a step wrote to the run's outputs, and how it ended. */
export interface StepRun { exitCode: number | null; outputLines: string[]; printed: string }

/** The lines a step's run wrote to the outputs file at `outputFile`. */
const outputLinesOf = (outputFile: string): string[] => readFileSync(outputFile, "utf8").split(LF).filter((line) => line !== "");

/**
 * A step's one-line `run:` run as a process in `folder`, as the runner runs
 * it from the site's checkout: node on the site's own file the line names,
 * with the line's arguments, under `env`, its outputs file beside it.
 */
export function runStepCommand(step: string, folder: string, env: Record<string, string>): StepRun {
  const [program, script, ...args] = stepRunLineOf(step).split(" ");
  expect(program, `the step runs no node command: ${step}`).toBe("node");
  const outputFile = `${folder}.github-output`;
  writeFileSync(outputFile, "");
  const run = spawnSync(process.execPath, [join(root, script!), ...args], {
    cwd: folder,
    env: { ...process.env, GITHUB_OUTPUT: outputFile, ...env },
    encoding: "utf8",
  });
  return { exitCode: run.status, outputLines: outputLinesOf(outputFile), printed: `${run.stdout}${run.stderr}` };
}

/** A key's value on its own line in a step's text, at `indent` spaces, trimmed; "" when it has none. */
export const stepKeyOf = (step: string, indent: number, key: string): string =>
  new RegExp(`^ {${indent}}${key}:\\s*(.+)$`, "m").exec(step)?.[1]?.trim() ?? "";
