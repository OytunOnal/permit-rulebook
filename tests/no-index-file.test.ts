import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

/**
 * The lint refuses a file named `index` in the code and the scripts (#309,
 * rulings 2 and 3): a file is named for its main export, so a module's entry
 * says what it does. Read through ESLint's own API with the project's config,
 * so the rule cannot go quiet when its files drift.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const eslint = new ESLint({ cwd: root });

/** The rule's id in the project's config, which every case reads its messages by. */
const RULE = "names/no-index-file";

/** What the rule says, word for word (ruling 3). */
const REFUSAL = "Name the file for its main export, not `index` (ROADKEEPER_STANDARDS.md › Names).";

/** A module's entry, written as one line of code. */
const AN_ENTRY = "export const answer = 42;\n";

/** The rule's messages on `code` linted as the file at `filePath`. */
async function refusalsOf(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  if (!result) throw new Error(`ESLint returned no result for ${filePath}`);
  return result.messages.filter((m) => m.ruleId === RULE).map((m) => m.message);
}

/** The rule's setting in the project's config for the file at `filePath`, or undefined when it runs none there. */
async function ruleSettingFor(filePath: string): Promise<unknown> {
  const config = await eslint.calculateConfigForFile(filePath) as { rules?: Record<string, unknown> };
  return config.rules?.[RULE];
}

/** Files named `index` in the code and the scripts, each refused. */
const INDEX_FILES = [
  "src/lib/a-module/index.ts",
  "src/lib/a-module/inner/index.ts",
  "scripts/a-tool/index.mjs",
  "scripts/index.ts",
];

/** Files named for what they do, each passing. */
const NAMED_FILES = ["src/lib/a-module/a-module.ts", "scripts/a-tool/open-tool.mjs", "src/lib/a-module/indexes.ts"];

describe("the lint on files named index", () => {
  it("the config runs the rule on every file the cases lint", async () => {
    for (const filePath of [...INDEX_FILES, ...NAMED_FILES])
      expect(await ruleSettingFor(filePath), `the config runs no ${RULE} on ${filePath}`).toEqual([2]);
  });

  it.each(INDEX_FILES)("%s is refused, the refusal naming the rule it breaks", async (filePath) => {
    expect(await refusalsOf(AN_ENTRY, filePath)).toEqual([REFUSAL]);
  });

  it.each(NAMED_FILES)("%s, named for what it does, passes", async (filePath) => {
    expect(await refusalsOf(AN_ENTRY, filePath)).toEqual([]);
  });

  it("a page named index is a route, outside the rule", async () => {
    expect(await ruleSettingFor("src/pages/index.astro")).toBeUndefined();
    expect(await ruleSettingFor("src/pages/[country]/index.astro")).toBeUndefined();
  });
});
