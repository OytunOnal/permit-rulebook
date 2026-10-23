import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { configWithoutExceptions, lintExceptions } from "../eslint.config.mjs";

/**
 * The lint's config through ESLint's own API (#199, seam 3): each of the six
 * shape limits fails a text that breaks it and passes one that keeps it, under
 * the repository's own `eslint.config.mjs`. The limits are the spec's numbers:
 * 400 lines a file and 40 a function, every line counted, nesting 3,
 * parameters 3. Its exception list is held to `package.json`'s version and to
 * what the lint still flags.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const lint = new ESLint({ cwd: root });

/** The rule ids a text breaks; a text that does not parse fails loudly. */
async function brokenRulesOf(code: string, filePath: string): Promise<string[]> {
  const [result] = await lint.lintText(code, { filePath });
  return result!.messages.map((message) => message.ruleId ?? `fatal: ${message.message}`);
}

const linesOf = (count: number, line: string): string[] => Array.from({ length: count }, () => line);

/** A function of `total` lines, its head and its closing brace counted. */
const functionOf = (total: number): string =>
  ["export function sized() {", ...linesOf(total - 2, "  // a line of the body"), "}"].join("\n");

const TEST_FUNCTION_LENGTH = "shape/max-lines-per-function-except-describe";

describe("the lint holds the six shape limits", () => {
  it("a file over 400 lines fails, comments and blank lines counted", async () => {
    const fileOf = (total: number): string =>
      ["export const kept = 1;", ...linesOf(total - 1, "// a comment")].join("\n");
    const withBlank = [...linesOf(399, "// a comment"), "", "export const kept = 1;"].join("\n");
    expect(await brokenRulesOf(fileOf(401), "src/lib/sized.ts")).toEqual(["max-lines"]);
    expect(await brokenRulesOf(withBlank, "src/lib/sized.ts")).toEqual(["max-lines"]);
    expect(await brokenRulesOf(fileOf(400), "src/lib/sized.ts")).toEqual([]);
  });

  it("a function over 40 lines fails, comments counted", async () => {
    expect(await brokenRulesOf(functionOf(41), "src/lib/sized.ts")).toEqual(["max-lines-per-function"]);
    expect(await brokenRulesOf(functionOf(40), "scripts/sized.mjs")).toEqual([]);
    expect(await brokenRulesOf(functionOf(41), "scripts/sized.mjs")).toEqual(["max-lines-per-function"]);
  });

  it("nesting deeper than 3 fails", async () => {
    const nestedOf = (depth: number): string => {
      const opens = Array.from({ length: depth }, (_, level) => `${"  ".repeat(level + 1)}if (n > ${level}) {`);
      const closes = Array.from({ length: depth }, (_, level) => `${"  ".repeat(depth - level)}}`);
      return ["export function nested(n: number): number {", ...opens, "    return n;", ...closes, "  return 0;", "}"].join("\n");
    };
    expect(await brokenRulesOf(nestedOf(4), "src/lib/nested.ts")).toEqual(["max-depth"]);
    expect(await brokenRulesOf(nestedOf(3), "src/lib/nested.ts")).toEqual([]);
  });

  it("more than 3 parameters fails", async () => {
    const takes = (names: string[]): string =>
      `export const joined = (${names.map((name) => `${name}: string`).join(", ")}): string => [${names.join(", ")}].join("");`;
    expect(await brokenRulesOf(takes(["a", "b", "c", "d"]), "src/lib/joined.ts")).toEqual(["max-params"]);
    expect(await brokenRulesOf(takes(["a", "b", "c"]), "src/lib/joined.ts")).toEqual([]);
  });

  it("a nested ternary fails", async () => {
    const nested = `export const sign = (n: number): string => (n > 0 ? "+" : n < 0 ? "-" : "0");`;
    const plain = `export const sign = (n: number): string => (n > 0 ? "+" : "0");`;
    expect(await brokenRulesOf(nested, "src/lib/sign.ts")).toEqual(["no-nested-ternary"]);
    expect(await brokenRulesOf(plain, "src/lib/sign.ts")).toEqual([]);
  });

  it("an unused name fails in TypeScript and in JavaScript, and a type used only as a type is used", async () => {
    const typed = "type Count = number;\nexport const count: Count = 1;";
    expect(await brokenRulesOf("const unused = 1;\nexport const used = 2;", "src/lib/names.ts")).toEqual([
      "@typescript-eslint/no-unused-vars",
    ]);
    expect(await brokenRulesOf(typed, "src/lib/names.ts")).toEqual([]);
    expect(await brokenRulesOf("const unused = 1;\nexport const used = 2;", "scripts/names.mjs")).toEqual([
      "no-unused-vars",
    ]);
    expect(await brokenRulesOf("export const used = 2;", "scripts/names.mjs")).toEqual([]);
  });
});

describe("a describe callback is exempt from the function limit, an it is not", () => {
  const caseOf = (total: number): string[] => [
    `  it("a case", () => {`,
    ...linesOf(total - 2, "    // a line of the case"),
    "  });",
  ];
  const suiteOf = (opening: string, caseLines: string[]): string =>
    [`import { describe, it } from "vitest";`, opening, ...caseLines, ...linesOf(41, "  // grouped"), "});"].join("\n");

  it("a long describe passes, and a long it inside it fails", async () => {
    expect(await brokenRulesOf(suiteOf(`describe("a group", () => {`, caseOf(40)), "tests/sized.test.ts")).toEqual([]);
    expect(await brokenRulesOf(suiteOf(`describe("a group", () => {`, caseOf(41)), "tests/sized.test.ts")).toEqual([
      TEST_FUNCTION_LENGTH,
    ]);
  });

  it("describe.skip and describe.each are describe too", async () => {
    expect(await brokenRulesOf(suiteOf(`describe.skip("a group", () => {`, caseOf(40)), "tests/sized.test.ts")).toEqual([]);
    expect(await brokenRulesOf(suiteOf(`describe.each([1])("a group %s", () => {`, caseOf(40)), "tests/sized.test.ts")).toEqual(
      [],
    );
  });

  it("a long helper in a test file fails", async () => {
    expect(await brokenRulesOf(functionOf(41), "tests/helper.ts")).toEqual([TEST_FUNCTION_LENGTH]);
  });
});

describe("an .astro page's script is linted under the same rules", () => {
  const pageWith = (script: string): string =>
    ["---", "// @level main", "---", "<p>A page.</p>", "<script>", script, "</script>", ""].join("\n");

  it("a nested ternary in a page's script fails, the script read as TypeScript", async () => {
    const nested = `const width: number = innerWidth;\ndocument.body.dataset.sign = width > 9 ? "wide" : width > 3 ? "mid" : "narrow";`;
    const plain = `const width: number = innerWidth;\ndocument.body.dataset.sign = width > 9 ? "wide" : "narrow";`;
    expect(await brokenRulesOf(pageWith(nested), "src/pages/sized.astro")).toEqual(["no-nested-ternary"]);
    expect(await brokenRulesOf(pageWith(plain), "src/pages/sized.astro")).toEqual([]);
  });
});

type LintException = { file: string; rules: string[]; issue: number; until: string };

/** Whether `version` has reached `until`, compared part by part as numbers. */
function isReached(until: string, version: string): boolean {
  const have = version.split(".").map(Number);
  const due = until.split(".").map(Number);
  const first = due.findIndex((part, index) => part !== (have[index] ?? 0));
  return first === -1 || (have[first] ?? 0) > due[first]!;
}

/** One line for each exception due at `version`, naming its file and its issue. */
const dueExceptionsOf = (exceptions: LintException[], version: string): string[] =>
  exceptions
    .filter((exception) => isReached(exception.until, version))
    .map((exception) => `${exception.file}: #${exception.issue}'s exception was due at ${exception.until}`);

describe("the lint's exceptions are dated, and each is still needed", () => {
  it("no exception is due at package.json's version", () => {
    const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(dueExceptionsOf(lintExceptions, version)).toEqual([]);
  });

  it("an exception whose version is reached fails, naming its file and its issue", () => {
    const exceptions = [
      { file: "src/lib/sized.ts", rules: ["max-lines"], issue: 142, until: "1.2.3" },
      { file: "tests/sized.test.ts", rules: ["max-lines"], issue: 198, until: "1.10.0" },
    ];
    expect(dueExceptionsOf(exceptions, "1.2.2")).toEqual([]);
    expect(dueExceptionsOf(exceptions, "1.2.3")).toEqual(["src/lib/sized.ts: #142's exception was due at 1.2.3"]);
    expect(dueExceptionsOf(exceptions, "1.9.4")).toEqual(["src/lib/sized.ts: #142's exception was due at 1.2.3"]);
    expect(dueExceptionsOf(exceptions, "1.10.0")).toEqual([
      "src/lib/sized.ts: #142's exception was due at 1.2.3",
      "tests/sized.test.ts: #198's exception was due at 1.10.0",
    ]);
  });

  it("each exception names a file the lint flags under each of its rules without it", async () => {
    const bare = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: configWithoutExceptions });
    const unneeded: string[] = [];
    for (const { file, rules } of lintExceptions) {
      const results = await bare.lintFiles([file]);
      const broken = new Set(results.flatMap((result) => result.messages.map((message) => message.ruleId)));
      unneeded.push(...rules.filter((rule) => !broken.has(rule)).map((rule) => `${file}: ${rule}`));
    }
    expect(unneeded).toEqual([]);
  });
});
