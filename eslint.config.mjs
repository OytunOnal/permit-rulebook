// @level main
import { readFileSync } from "node:fs";
import astro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";
import { preset } from "./spine-lint/lint.mjs";

/** What `docs/spine/dependency-rules.md`'s `## Ignore` skips, and Spine's own copy. */
const IGNORED = ["src/*.d.ts", "dist/**", ".astro/**", ".run/**", "docs/**", ".claude/**", "spine-lint/**"];

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

/** Where Node keeps its timers as promises, each of them a sleep: taken in any way, refused. */
const TIMER_PROMISES = ["timers/promises", "node:timers/promises"];

/** The timers that can hold a promise back. */
const TIMERS = ["setTimeout", "setInterval"];

/** The calls that open a page: given a time, a sleep after it. */
const NAVIGATIONS = ["goto", "navigate"];

/** The name a call is made by: `f(…)` or `x.f(…)`. */
function calledName({ callee }) {
  if (callee.type === "Identifier") return callee.name;
  return callee.type === "MemberExpression" && !callee.computed ? callee.property.name : null;
}

/** Whether the function `fn` is the one a `new Promise(…)` is made with. */
function isPromiseExecutor(fn) {
  const made = fn.parent;
  const isNewPromise = made.type === "NewExpression" && made.callee.type === "Identifier" && made.callee.name === "Promise";
  return isNewPromise && made.arguments[0] === fn;
}

/** The variable `identifier` names, looked up from the scope it stands in; null for a global. */
function variableOf(sourceCode, identifier) {
  for (let scope = sourceCode.getScope(identifier); scope; scope = scope.upper) {
    const found = scope.set.get(identifier.name);
    if (found) return found;
  }
  return null;
}

/** What `identifier`'s value is handed to: the name a declaration or an assignment gives it; null when neither. */
function handedTo(identifier) {
  const { parent } = identifier;
  if (parent.type === "VariableDeclarator" && parent.init === identifier) return parent.id;
  if (parent.type === "AssignmentExpression" && parent.right === identifier) return parent.left;
  return null;
}

/** The variable `reference` hands its value to, as `const done = resolve` or `release = resolve` do; null when none. */
function aliasOf(sourceCode, { identifier }) {
  const target = handedTo(identifier);
  return target?.type === "Identifier" ? variableOf(sourceCode, target) : null;
}

/** A promise's `resolve` and every variable it is handed to, each read and written where the file does. */
function resolveAndItsAliases(sourceCode, resolve) {
  const known = new Set([resolve]);
  for (const variable of known)
    for (const reference of variable.references) {
      const alias = aliasOf(sourceCode, reference);
      if (alias) known.add(alias);
    }
  return [...known];
}

/**
 * A test waits on an event, never a sleep (`SPINE_STANDARDS.md`, Tests; #230,
 * rulings 2 and 11): a timer handed a promise's `resolve`, under its own name
 * or another, Node's promised timers, and a navigation given a time are
 * refused. A timer doing other work, such as a fake server holding a response
 * back, is not a wait, and a timer written in an expression sent to the page
 * is text.
 */
const noFixedWait = {
  create: (context) => {
    const { sourceCode } = context;
    const refuse = (node) => context.report({ node, message: FIXED_WAIT });
    const timers = [];
    const resolves = [];
    return {
      CallExpression(node) {
        const name = calledName(node);
        if (TIMERS.includes(name)) timers.push(node);
        if (NAVIGATIONS.includes(name) && node.arguments.length > 1) refuse(node);
      },
      "ArrowFunctionExpression, FunctionExpression"(fn) {
        const [resolve] = fn.params;
        if (isPromiseExecutor(fn) && resolve?.type === "Identifier") resolves.push(variableOf(sourceCode, resolve));
      },
      ImportDeclaration(node) { if (TIMER_PROMISES.includes(node.source.value)) refuse(node); },
      ImportExpression(node) { if (TIMER_PROMISES.includes(node.source.value)) refuse(node); },
      "Program:exit"() {
        const handed = resolves.flatMap((resolve) => resolveAndItsAliases(sourceCode, resolve))
          .flatMap((variable) => variable.references.map(({ identifier }) => identifier.range));
        for (const timer of timers)
          if (handed.some(([from, to]) => from >= timer.range[0] && to <= timer.range[1])) refuse(timer);
      },
    };
  },
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
