import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { ARROW, FUNCTION } from "./code-to-lint.js";

/**
 * The lint refuses a fixed wait in a test (#230, rulings 2 and 11): a sleep, a
 * `setTimeout` that resolves a promise, and a navigation given a time. Read
 * through ESLint's own API with the project's config, so the rule cannot go
 * quiet when its files drift.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const eslint = new ESLint({ cwd: root });

/** The rule's id in the project's config, which every case reads its messages by. */
const RULE = "waits/no-fixed-wait";

/** A test file's path, as the project's config sees one. */
const A_TEST = "tests/a-browser-case.test.ts";

/** The carry's stand-in origin, which holds a response back to play a slow origin (ruling 11). */
const STAND_IN_ORIGIN = "tests/carry-assets/stand-in-origin.ts";

/** The rule's messages on `code` linted as the file at `filePath`, once the
 * config is seen to run the rule there. */
async function lintForFixedWaits(code: string, filePath = A_TEST): Promise<string[]> {
  const config = await eslint.calculateConfigForFile(filePath) as { rules?: Record<string, unknown> };
  expect(config.rules?.[RULE], `the config runs no ${RULE} on ${filePath}`).toEqual([2]);
  const [result] = await eslint.lintText(code, { filePath });
  return result!.messages.filter((m) => m.ruleId === RULE).map((m) => m.message);
}

/** What every refusal points to instead. */
const expectItPointsAtTheWaits = (message: string | undefined) => {
  for (const wait of ["waitUntil", "waitUntilAtRest", "navigate"]) expect(message).toContain(wait);
};

const lines = (...code: string[]) => code.join("\n");

describe("the lint on a fixed wait", () => {
  it("a sleep in a test file is an error", async () => {
    const refused = await lintForFixedWaits(lines(
      `export async ${FUNCTION} read(): Promise<void> {`,
      `  await new Promise((r) ${ARROW} setTimeout(r, 900));`,
      `  await new Promise<void>((resolve) ${ARROW} { setTimeout(() ${ARROW} resolve(), 300); });`,
      "}",
    ));
    expect(refused).toHaveLength(2);
    expectItPointsAtTheWaits(refused[0]);
  });

  it("goto(url, 900) is an error", async () => {
    const refused = await lintForFixedWaits(lines(
      "interface Page { goto(url: string, ms?: number): Promise<void> }",
      `export async ${FUNCTION} open(page: Page, url: string): Promise<void> {`,
      "  await page.goto(url, 900);",
      "  await page.goto(url);",
      "}",
    ));
    expect(refused).toHaveLength(1);
    expectItPointsAtTheWaits(refused[0]);
  });
});

describe("the lint on a navigation given a time", () => {
  it("a bare goto(url, 900) is an error", async () => {
    const refused = await lintForFixedWaits(lines(
      `declare ${FUNCTION} goto(url: string, ms?: number): Promise<void>;`,
      `export async ${FUNCTION} open(url: string): Promise<void> {`,
      "  await goto(url, 900);",
      "  await goto(url);",
      "}",
    ));
    expect(refused).toHaveLength(1);
    expectItPointsAtTheWaits(refused[0]);
  });

  it("navigate(url, 900) is an error", async () => {
    const refused = await lintForFixedWaits(lines(
      "interface Page { navigate(url: string, ms?: number): Promise<void> }",
      `export async ${FUNCTION} open(page: Page, url: string): Promise<void> {`,
      "  await page.navigate(url, 900);",
      "  await page.navigate(url);",
      "}",
    ));
    expect(refused).toHaveLength(1);
    expectItPointsAtTheWaits(refused[0]);
  });
});

describe("the lint on Node's promised timers", () => {
  for (const [how, code] of [
    ["a named import", ['import { setTimeout } from "node:timers/promises";', `export const read = () ${ARROW} setTimeout(900);`]],
    ["a default import", ['import timers from "timers/promises";', `export const read = () ${ARROW} timers.setTimeout(900);`]],
    ["a namespace import", ['import * as timers from "node:timers/promises";', `export const read = () ${ARROW} timers.setTimeout(900);`]],
    ["a dynamic import", [`export const read = async () ${ARROW} (await import("node:timers/promises")).setTimeout(900);`]],
  ] as const)
    it(`Node's promised timers taken by ${how} are an error`, async () => {
      const refused = await lintForFixedWaits(lines(...code));
      expect(refused).toHaveLength(1);
      expectItPointsAtTheWaits(refused[0]);
    });
});

describe("the lint on a sleep by another timer or another name", () => {
  it("a setInterval that resolves a promise is an error", async () => {
    const refused = await lintForFixedWaits(lines(
      `export async ${FUNCTION} read(): Promise<void> {`,
      `  await new Promise<void>((resolve) ${ARROW} { const every = setInterval(() ${ARROW} { clearInterval(every); resolve(); }, 300); });`,
      "}",
    ));
    expect(refused).toHaveLength(1);
    expectItPointsAtTheWaits(refused[0]);
  });

  it("a timer handed a promise's resolve under another name is an error", async () => {
    const refused = await lintForFixedWaits(lines(
      `export async ${FUNCTION} read(): Promise<void> {`,
      `  await new Promise<void>((resolve) ${ARROW} { const done = resolve; setTimeout(done, 300); });`,
      `  let release = () ${ARROW} {};`,
      `  const held = new Promise<void>((resolve) ${ARROW} { release = resolve; });`,
      `  setTimeout(() ${ARROW} release(), 300);`,
      "  await held;",
      "}",
    ));
    expect(refused).toHaveLength(2);
    expectItPointsAtTheWaits(refused[0]);
  });
});

describe("the lint on a timer that is no wait", () => {
  it("a fake server's held response is not", async () => {
    const code = readFileSync(new URL(`../${STAND_IN_ORIGIN}`, import.meta.url), "utf8");
    expect(code, "the stand-in origin no longer holds a response back").toMatch(/setTimeout\(\(\) => send\(/);
    expect(await lintForFixedWaits(code, STAND_IN_ORIGIN)).toEqual([]);
  });

  it("a setTimeout inside a string sent to the page is not", async () => {
    const refused = await lintForFixedWaits(lines(
      "interface Page { evaluate(expression: string): Promise<string> }",
      `export async ${FUNCTION} tapNextTask(page: Page): Promise<void> {`,
      `  await page.evaluate('setTimeout(() ${ARROW} { window.__arrived = "here"; }, 300), 0');`,
      `  await page.evaluate(\`new Promise((r) ${ARROW} setTimeout(r, 300))\`);`,
      "}",
    ));
    expect(refused).toEqual([]);
  });
});
