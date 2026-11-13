import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { THE_WALKS_SUITE, walksPlugin } from "../eslint.config.mjs";

/**
 * The lint refuses `errorsExpected` in a test (#353, ruling 7 on #288): the
 * walk fails on any page's error by itself, and only the walk's own suite
 * turns that off, to read its error cases. Read through ESLint's own API with
 * the project's config, so the rule cannot go quiet when its files drift.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const eslint = new ESLint({ cwd: root });

/** The rule's id in the project's config, which every case reads its messages by. */
const RULE = "walks/no-errors-expected";

/** A test file's path, as the project's config sees one. */
const A_TEST = "tests/a-browser-case.test.ts";

/** The rule's setting in the project's config for the file at `filePath`, or undefined when it runs none there. */
async function ruleSettingFor(filePath: string): Promise<unknown> {
  const config = await eslint.calculateConfigForFile(filePath) as { rules?: Record<string, unknown> };
  return config.rules?.[RULE];
}

/** The project's config with the rule forced on for the walk's own suite too. */
const forcedOnTheWalksSuite = new ESLint({
  cwd: root,
  overrideConfig: { files: [THE_WALKS_SUITE], plugins: { walks: walksPlugin }, rules: { [RULE]: "error" } },
});

/** The rule's messages on `code` linted by `linter` as the file at `filePath`. */
async function refusalsOf(code: string, filePath: string, linter = eslint): Promise<string[]> {
  const [result] = await linter.lintText(code, { filePath });
  return result!.messages.filter((m) => m.ruleId === RULE).map((m) => m.message);
}

const lines = (...code: string[]) => code.join("\n");

describe("the lint on errorsExpected", () => {
  it("errorsExpected in a test file, as an object's key or as a member, is an error naming the walk's own suite", async () => {
    expect(await ruleSettingFor(A_TEST), `the config runs no ${RULE} on ${A_TEST}`).toEqual([2]);
    const refused = await refusalsOf(lines(
      "declare function walkSite(walk: object, walker: () => Promise<void>): Promise<void>;",
      "export const quoted = () => walkSite({ \"errorsExpected\": true }, async () => {});",
      "export const walk = { screen: 390, errorsExpected: true };",
      "export const errorsExpected = false;",
      "export const shorthand = { errorsExpected };",
      "export const set = (w: { errorsExpected?: boolean }) => { w.errorsExpected = true; };",
    ), A_TEST);
    expect(refused).toHaveLength(4);
    expect(refused[0]).toContain(THE_WALKS_SUITE);
  });

  it("the walk's own suite may pass it", async () => {
    expect(await ruleSettingFor(THE_WALKS_SUITE), `the config runs ${RULE} on ${THE_WALKS_SUITE}`).toBeUndefined();
    const code = readFileSync(new URL(`../${THE_WALKS_SUITE}`, import.meta.url), "utf8");
    expect(await refusalsOf(code, THE_WALKS_SUITE, forcedOnTheWalksSuite),
      "the rule, forced on, finds no errorsExpected in the walk's own suite").not.toEqual([]);
    expect(await refusalsOf(code, THE_WALKS_SUITE)).toEqual([]);
  });
});
