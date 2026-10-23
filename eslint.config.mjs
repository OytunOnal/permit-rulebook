// @level main
import astro from "eslint-plugin-astro";
import { builtinRules } from "eslint/use-at-your-own-risk";
import tseslint from "typescript-eslint";

/** What `docs/spine/dependency-rules.md`'s `## Ignore` skips. */
const IGNORED = ["src/*.d.ts", "dist/**", ".astro/**", ".run/**", "docs/**"];

/** TypeScript: the `.ts` files and the scripts inside the pages. */
const TYPESCRIPT = ["src/**/*.ts", "scripts/**/*.ts", "tests/**/*.ts", "src/pages/**/*.astro/*.ts"];

/** `dependency-rules.md`'s `## Tests`. */
const TESTS = ["tests/**"];

const FILE_LENGTH = "max-lines";
const FUNCTION_LENGTH = "max-lines-per-function";
export const TEST_FUNCTION_LENGTH = "shape/max-lines-per-function-except-describe";
const NESTING = "max-depth";
const PARAMETERS = "max-params";
const NESTED_TERNARY = "no-nested-ternary";
const UNUSED = "no-unused-vars";
const UNUSED_IN_TYPESCRIPT = "@typescript-eslint/no-unused-vars";

/** Every line counts, blank lines and comments included (#37, ruling 8). */
const FUNCTION_LIMIT = { max: 40, skipBlankLines: false, skipComments: false };

const coreFunctionLimit = builtinRules.get(FUNCTION_LENGTH);

/**
 * A `describe(…)` callback only groups cases, and the file limit bounds it
 * (#37, ruling 10). `describe.skip(…)`, `describe.each(…)(…)` and
 * ``describe.each`…`(…)`` name `describe` at the root of their callee.
 */
function isDescribeCallee(callee) {
  if (callee.type === "Identifier") return callee.name === "describe";
  if (callee.type === "MemberExpression") return isDescribeCallee(callee.object);
  if (callee.type === "CallExpression") return isDescribeCallee(callee.callee);
  if (callee.type === "TaggedTemplateExpression") return isDescribeCallee(callee.tag);
  return false;
}

const isDescribeCallback = (node) =>
  node.parent?.type === "CallExpression" && node.parent.arguments.includes(node) && isDescribeCallee(node.parent.callee);

/** The core function limit, minus its reports on a `describe` callback. */
const functionLimitExceptDescribe = {
  meta: coreFunctionLimit.meta,
  create(context) {
    return coreFunctionLimit.create({
      sourceCode: context.sourceCode,
      options: context.options,
      report(descriptor) {
        if (!isDescribeCallback(descriptor.node)) context.report(descriptor);
      },
    });
  },
};

/**
 * The six shape limits over `src/`, `scripts/`, `tests/` and the pages, with no exception.
 * @type {import("eslint").Linter.Config[]}
 */
export const configWithoutExceptions = [
  { ignores: IGNORED },
  ...astro.configs["flat/base"],
  // The plugin looks for the TypeScript parser from the working directory and
  // falls back to reading a page's scripts as JavaScript; named here, the
  // pages read as TypeScript wherever the lint runs from.
  {
    files: ["**/*.astro"],
    processor: "astro/client-side-ts",
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    files: TYPESCRIPT,
    languageOptions: { parser: tseslint.parser },
  },
  {
    files: ["src/**", "scripts/**", "tests/**"],
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      shape: { rules: { "max-lines-per-function-except-describe": functionLimitExceptDescribe } },
    },
    rules: {
      [FILE_LENGTH]: ["error", { max: 400, skipBlankLines: false, skipComments: false }],
      [FUNCTION_LENGTH]: ["error", FUNCTION_LIMIT],
      [NESTING]: ["error", 3],
      [PARAMETERS]: ["error", 3],
      [NESTED_TERNARY]: "error",
      [UNUSED]: "error",
    },
  },
  {
    files: TYPESCRIPT,
    rules: { [UNUSED]: "off", [UNUSED_IN_TYPESCRIPT]: "error" },
  },
  {
    files: TESTS,
    rules: { [FUNCTION_LENGTH]: "off", [TEST_FUNCTION_LENGTH]: ["error", FUNCTION_LIMIT] },
  },
];

/** @typedef {{ file: string, rules: string[], issue: number, until: string }} LintException */

/**
 * What the lint flags today and the issue that removes it: one entry per file
 * and issue, naming only the rules that file breaks. `until` is the version
 * at which `tests/lint.test.ts` fails on the entry (#37, rulings 13 and 14).
 * @type {LintException[]}
 */
export const lintExceptions = [
  { file: "src/pages/index.astro", rules: [FILE_LENGTH], issue: 56, until: "1.2.3" },

  { file: "src/lib/route-page.ts", rules: [FILE_LENGTH, FUNCTION_LENGTH], issue: 142, until: "1.2.3" },
  { file: "src/lib/country-page.ts", rules: [FUNCTION_LENGTH], issue: 142, until: "1.2.3" },
  { file: "src/lib/data-page.ts", rules: [FUNCTION_LENGTH], issue: 142, until: "1.2.3" },
  { file: "src/lib/dataset-ld.ts", rules: [FUNCTION_LENGTH], issue: 142, until: "1.2.3" },
  { file: "src/lib/feedback-page.ts", rules: [FUNCTION_LENGTH], issue: 142, until: "1.2.3" },
  { file: "src/lib/not-found.ts", rules: [FUNCTION_LENGTH], issue: 142, until: "1.2.3" },
  { file: "src/lib/identity.ts", rules: [FUNCTION_LENGTH], issue: 142, until: "1.2.3" },
  { file: "tests/route-page.test.ts", rules: [FILE_LENGTH], issue: 142, until: "1.2.3" },
  { file: "tests/identity.test.ts", rules: [FILE_LENGTH, TEST_FUNCTION_LENGTH], issue: 142, until: "1.2.3" },

  { file: "scripts/dev-server.mjs", rules: [FUNCTION_LENGTH], issue: 127, until: "1.2.3" },
  { file: "scripts/render-assets.mjs", rules: [FUNCTION_LENGTH], issue: 127, until: "1.2.3" },

  { file: "src/lib/verdict/compose/card-blocks.ts", rules: [FILE_LENGTH, FUNCTION_LENGTH], issue: 184, until: "1.2.4" },

  { file: "scripts/browser.mjs", rules: [FILE_LENGTH, FUNCTION_LENGTH], issue: 182, until: "1.2.4" },

  { file: "tests/s13.test.ts", rules: [FILE_LENGTH, TEST_FUNCTION_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/first-paint.test.ts", rules: [FILE_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/s27.test.ts", rules: [FILE_LENGTH, TEST_FUNCTION_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/s30.test.ts", rules: [FILE_LENGTH, TEST_FUNCTION_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/s23.test.ts", rules: [FILE_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/s26.test.ts", rules: [FILE_LENGTH, TEST_FUNCTION_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/s25.test.ts", rules: [FILE_LENGTH, TEST_FUNCTION_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/orientation.test.ts", rules: [FILE_LENGTH, TEST_FUNCTION_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/s19.test.ts", rules: [FILE_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/record.test.ts", rules: [FILE_LENGTH, TEST_FUNCTION_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/footer.test.ts", rules: [TEST_FUNCTION_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/means.test.ts", rules: [TEST_FUNCTION_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/s20.test.ts", rules: [TEST_FUNCTION_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/s21.test.ts", rules: [TEST_FUNCTION_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/s28.test.ts", rules: [TEST_FUNCTION_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/s31.test.ts", rules: [TEST_FUNCTION_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/site-index.test.ts", rules: [TEST_FUNCTION_LENGTH], issue: 198, until: "1.2.4" },
  { file: "tests/wire.ts", rules: [TEST_FUNCTION_LENGTH], issue: 198, until: "1.2.4" },
];

/** An entry's rules off for its file, and for the scripts the processor lifts out of a page. */
const blockOf = (exception) => ({
  files: [exception.file, `${exception.file}/*`],
  rules: Object.fromEntries(exception.rules.map((rule) => [rule, "off"])),
});

export default [...configWithoutExceptions, ...lintExceptions.map(blockOf)];
