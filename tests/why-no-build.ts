import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Why a suite cannot test the build here: `path` (from the project's root,
 * as `dist/` or `dist/404.html`) was never built. Null when it was. */
export function whyNoBuild(path: string): string | null {
  if (existsSync(fileURLToPath(new URL(`../${path}`, import.meta.url)))) return null;
  return `run npm run build first: no ${path} to test`;
}
