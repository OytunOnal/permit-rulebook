import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

/**
 * The lint keeps the interview's record and question card inside
 * `InterviewPage` (#481; Q396, Q397, Q415, Q430, Q437): in tests and scripts it
 * refuses the record's constants, the spelled storage key, the card's
 * selectors and an in-page probe written as a string. Read through ESLint's
 * own API with the project's config, so a pattern that stops matching goes red.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const eslint = new ESLint({ cwd: root });

/** The rules the guard is made of, which every case reads its messages by. */
const GUARD_RULES = ["no-restricted-imports", "no-restricted-syntax"];

/** A test file, as the project's config sees one. */
const A_TEST = "tests/a-guarded-case.test.ts";
/** A script file, as the project's config sees one. */
const A_SCRIPT = "scripts/a-guarded-script.mjs";

/** `InterviewPage`'s entry, which the guard leaves free. */
const THE_MODULE = "scripts/interview-page/interview-page.mjs";
/** The module's card probes, behind its entry and free like it. */
const THE_MODULES_PROBES = "scripts/interview-page/probes/question-card-probes.mjs";
/** The page's own code, which spells its markup and is never guarded. */
const THE_PAGES_CODE = "src/lib/a-page-part.ts";
/** The record's unit test, which reads the record's constants on purpose. */
const THE_RECORDS_TEST = "tests/record.test.ts";

/** The guard's messages on `code` linted as the file at `filePath`. */
async function lintForTheGuard(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath });
  return result!.messages.filter((m) => GUARD_RULES.includes(m.ruleId ?? "")).map((m) => m.message);
}

/** The record's import, as a file at `filePath` writes its path. */
const importOf = (name: string, filePath: string): string => {
  const up = "../".repeat(filePath.split("/").length - 1);
  return `import { ${name} } from "${up}src/lib/record.${filePath.endsWith(".ts") ? "js" : "ts"}";\nexport const used = ${name};`;
};

/** The storage key, put together here so this suite spells no refused text itself. */
const KEY = ["permit-rulebook", "record", "v1"].join(".");
/** The card's three selectors, put together here for the same reason. */
const [CFILTER, QCARD, QLABEL] = [["#", "cfilter"], [".", "qcard"], [".", "qlabel"]].map((parts) => parts.join(""));

/** Each refused form as one line of code, by what it is. */
const REFUSED: readonly (readonly [string, (filePath: string) => string])[] = [
  ["an import of STORAGE_KEY", (filePath) => importOf("STORAGE_KEY", filePath)],
  ["an import of RECORD_VERSION", (filePath) => importOf("RECORD_VERSION", filePath)],
  ["the literal storage key", () => `export const key = "${KEY}";`],
  [`${CFILTER} in a string`, () => `export const search = "${CFILTER}";`],
  [`${QCARD} in a string`, () => `export const card = '#main ${QCARD}';`],
  [`${QLABEL} in a template`, () => `export const label = \`${QLABEL}\`;`],
  ["a string opening with (() =>", () => 'export const probe = "(() => document.title)()";'],
  ["a string opening with ((x) =>", () => 'export const probe = "((link) => link.href)(document.links[0])";'],
  ["a template opening with (async (", () => "export const probe = `(async () => document.title)()`;"],
  ["a string opening with (function", () => 'export const probe = "(function () { return document.title; })()";'],
  ["a dynamic import of the record module", (filePath) => {
    const up = "../".repeat(filePath.split("/").length - 1);
    return `export const load = () => import("${up}src/lib/record.${filePath.endsWith(".ts") ? "js" : "ts"}");`;
  }],
  ["a dynamic import of the record module by a template", (filePath) => {
    const up = "../".repeat(filePath.split("/").length - 1);
    const extension = filePath.endsWith(".ts") ? "js" : "ts";
    return `const up = "${up}";\nexport const load = () => import(\`\${up}src/lib/record.${extension}\`);`;
  }],
  ["a dynamic import of the record module by a template with no expression", (filePath) => {
    const up = "../".repeat(filePath.split("/").length - 1);
    return `export const load = () => import(\`${up}src/lib/record.${filePath.endsWith(".ts") ? "js" : "ts"}\`);`;
  }],
  ["a dynamic import by a template with an expression", () =>
    'const name = "record";\nexport const load = () => import(`src/lib/${name}.js`);'],
  ["a dynamic import by a variable", () => 'const path = "src/lib/record.js";\nexport const load = () => import(path);'],
];

describe("the guard refuses, in a test file and in a script file", () => {
  for (const [what, code] of REFUSED)
    for (const filePath of [A_TEST, A_SCRIPT])
      it(`${what} in ${filePath} is an error`, async () => {
        expect(await lintForTheGuard(code(filePath), filePath)).toHaveLength(1);
      });
});

describe("the guard leaves the interview's own places free", () => {
  for (const [what, code] of REFUSED)
    for (const filePath of [THE_MODULE, THE_MODULES_PROBES, THE_PAGES_CODE, THE_RECORDS_TEST])
      it(`${what} in ${filePath} is not an error`, async () => {
        expect(await lintForTheGuard(code(A_TEST), A_TEST), "the guard refuses nothing in a test file").toHaveLength(1);
        expect(await lintForTheGuard(code(filePath), filePath)).toEqual([]);
      });
});

describe("the guard leaves a probe that is no function body free", () => {
  for (const [what, code] of [
    ["a short expression string", 'export const where = "location.pathname";'],
    ["an object-literal string", 'export const size = "({ width: innerWidth, height: innerHeight })";'],
    ["a real function serialised into a template", "const read = () => document.title;\nexport const probe = `(${read})()`;"],
  ] as const)
    it(`${what} is not an error`, async () => {
      expect(await lintForTheGuard(REFUSED[6]![1](A_TEST), A_TEST), "the guard refuses no string probe").toHaveLength(1);
      expect(await lintForTheGuard(code, A_TEST)).toEqual([]);
    });
});
