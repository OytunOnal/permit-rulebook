import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The built site read as text: every page under `dist/`, and the stylesheets
 * each page carries as the browser receives them. Reads files under the
 * repository's root only.
 */

/** A path from the repository's root, as this machine names it. */
export const root = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));

/** A file under the repository's root, its line ends read as LF. */
export const read = (p: string) => readFileSync(root(p), "utf8").split("\r\n").join("\n");

/** Every built page under `dist/`, by its path from the root. */
export function builtPages(dir = "dist", out: string[] = []): string[] {
  for (const name of readdirSync(root(dir))) {
    const path = `${dir}/${name}`;
    if (statSync(root(path)).isDirectory()) builtPages(path, out);
    else if (name.endsWith(".html")) out.push(path);
  }
  return out;
}

/** A built page's stylesheets as the browser receives them: the inline ones and the ones it links. */
export function builtSheetsOf(page: string): string {
  const html = read(page);
  const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]!);
  const linked = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)]
    .map((m) => read(`dist/${m[1]!.replace(/^.*\/_astro\//, "_astro/")}`));
  return [...inline, ...linked].join("\n");
}
