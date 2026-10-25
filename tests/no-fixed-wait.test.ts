import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

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
async function fixedWaitsIn(code: string, filePath = A_TEST): Promise<string[]> {
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
    const refused = await fixedWaitsIn(lines(
      "export async function read(): Promise<void> {",
      "  await new Promise((r) => setTimeout(r, 900));",
      "  await new Promise<void>((resolve) => { setTimeout(() => resolve(), 300); });",
      "}",
    ));
    expect(refused).toHaveLength(2);
    expectItPointsAtTheWaits(refused[0]);
  });

  it("goto(url, 900) is an error", async () => {
    const refused = await fixedWaitsIn(lines(
      "interface Page { goto(url: string, ms?: number): Promise<void> }",
      "export async function open(page: Page, url: string): Promise<void> {",
      "  await page.goto(url, 900);",
      "  await page.goto(url);",
      "}",
    ));
    expect(refused).toHaveLength(1);
    expectItPointsAtTheWaits(refused[0]);
  });
});

describe("the lint on a timer that is no wait", () => {
  it("a fake server's held response is not", async () => {
    const code = readFileSync(new URL(`../${STAND_IN_ORIGIN}`, import.meta.url), "utf8");
    expect(code, "the stand-in origin no longer holds a response back").toMatch(/setTimeout\(\(\) => send\(/);
    expect(await fixedWaitsIn(code, STAND_IN_ORIGIN)).toEqual([]);
  });

  it("a setTimeout inside a string sent to the page is not", async () => {
    const refused = await fixedWaitsIn(lines(
      "interface Page { evaluate(expression: string): Promise<string> }",
      "export async function tapNextTask(page: Page): Promise<void> {",
      "  await page.evaluate('setTimeout(() => { window.__arrived = \"here\"; }, 300), 0');",
      "  await page.evaluate(`new Promise((r) => setTimeout(r, 300))`);",
      "}",
    ));
    expect(refused).toEqual([]);
  });
});
