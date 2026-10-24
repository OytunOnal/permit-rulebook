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
];
