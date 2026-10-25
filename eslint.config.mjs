// @level main
import { readFileSync } from "node:fs";
import astro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";
import { preset } from "./spine-lint/lint.mjs";

/** What `docs/spine/dependency-rules.md`'s `## Ignore` skips, and Spine's own copy. */
const IGNORED = ["src/*.d.ts", "dist/**", ".astro/**", ".run/**", "docs/**", "spine-lint/**"];

/** TypeScript: the `.ts` files and the scripts inside the pages. */
const TYPESCRIPT = ["src/**/*.ts", "scripts/**/*.ts", "tests/**/*.ts", "src/pages/**/*.astro/*.ts"];

/** Spine's shape limits hold over the code, the scripts and the tests, the pages' scripts included. */
const SHAPED = ["src/**", "scripts/**", "tests/**"];

/** The files over Spine's 400 lines, each held to its count until it is paid off (Spine's Ceilings). */
const ceilings = JSON.parse(readFileSync(new URL("docs/spine/ceilings.json", import.meta.url), "utf8"));

/** What a refused fixed wait says to write instead: the harness's waits (#230). */
const FIXED_WAIT =
  "a fixed wait: wait on what the page does, with page.waitUntil(condition, what) or page.waitUntilAtRest(); "
  + "to read the page before its script runs, page.navigate(url), then waitUntil";

/** Where Node keeps its sleep as a promise. */
const TIMER_PROMISES = ["timers/promises", "node:timers/promises"];

/** The name a call is made by: `f(…)` or `x.f(…)`. */
function calledName({ callee }) {
  if (callee.type === "Identifier") return callee.name;
  return callee.type === "MemberExpression" && !callee.computed ? callee.property.name : null;
}

/** Whether `fn` is the function a `new Promise(…)` is made with. */
function isPromiseExecutor(fn) {
  const made = fn.parent;
  const isNewPromise = made?.type === "NewExpression" && made.callee.type === "Identifier" && made.callee.name === "Promise";
  return fn.type.endsWith("FunctionExpression") && isNewPromise && made.arguments[0] === fn;
}

/** The functions around `node` that are a `new Promise(…)`'s executor. */
const executorsAround = (sourceCode, node) => sourceCode.getAncestors(node).filter(isPromiseExecutor);

/** Whether the `setTimeout` call hands its timer a promise's `resolve`: a sleep. */
function resolvesAPromise(sourceCode, call) {
  const [from, to] = call.range;
  return executorsAround(sourceCode, call).some((executor) => {
    const resolve = sourceCode.getDeclaredVariables(executor).find((v) => v.name === executor.params[0]?.name);
    return resolve?.references.some(({ identifier: { range } }) => range[0] >= from && range[1] <= to);
  });
}

/**
 * A test waits on an event, never a sleep (`SPINE_STANDARDS.md`, Tests; #230,
 * rulings 2 and 11): a `setTimeout` that resolves a promise, Node's promised
 * `setTimeout`, and a `goto` given a time are refused. A timer doing other
 * work, such as a fake server holding a response back, is not a wait, and a
 * timer written in an expression sent to the page is text.
 */
const noFixedWait = {
  create: (context) => ({
    CallExpression(node) {
      const name = calledName(node);
      const sleeps = name === "setTimeout" && resolvesAPromise(context.sourceCode, node);
      if (sleeps || (name === "goto" && node.arguments.length > 1)) context.report({ node, message: FIXED_WAIT });
    },
    ImportDeclaration(node) {
      if (!TIMER_PROMISES.includes(node.source.value)) return;
      for (const s of node.specifiers)
        if (s.type === "ImportSpecifier" && s.imported.name === "setTimeout") context.report({ node: s, message: FIXED_WAIT });
    },
  }),
};

/** @type {import("eslint").Linter.Config[]} */
export default [
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
  ...preset({ ceilings, files: SHAPED }),
  // The core rule misreads types; typescript-eslint's reads them.
  {
    files: TYPESCRIPT,
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: { "no-unused-vars": "off", "@typescript-eslint/no-unused-vars": "error" },
  },
  // The harness's own modules (`scripts/browser.mjs`, `scripts/tab-waits.mjs`) stand outside: their backstop is
  // the one timer the browser cases keep.
  {
    files: ["tests/**"],
    plugins: { waits: { rules: { "no-fixed-wait": noFixedWait } } },
    rules: { "waits/no-fixed-wait": "error" },
  },
];
