import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Why a suite cannot test the build here: `path` (from the project's root,
 * as `dist/` or `dist/404.html`) was never built. Null when it was. */
export function whyNoBuild(path: string): string | null {
  if (existsSync(fileURLToPath(new URL(`../${path}`, import.meta.url)))) return null;
  return `run npm run build first: no ${path} to test`;
}

/** Says, loudly, that a suite's cases over the build were skipped and why, so a
 * skipped suite is not read as a passing one. */
export function warnBuildNotTested(what: string, reason: string): void {
  process.stderr.write([
    "",
    `  !! ${what}, NOT TESTED: ${reason}.`,
    "",
    "",
  ].join(String.fromCharCode(10)));
}
