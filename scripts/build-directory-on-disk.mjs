// @level infrastructure
/**
 * The build directory the carry fills, over a real `dist/`: every disk call
 * the carry makes. What is built, carried and listed is the carry's to
 * decide; this only reads and writes where it is told. Each operation throws
 * what the filesystem throws, and the flow turns that into a line.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** @typedef {import("./carry-assets/carry.mjs").BuildDirectory} BuildDirectory */

/**
 * The build directory at `dist`, or none for a blank path: a blank `--dist`
 * would resolve against the process's own folder, which is not a build anyone
 * named.
 *
 * @param {string} dist
 * @returns {BuildDirectory | undefined}
 */
export function openBuildDirectoryOnDisk(dist) {
  if (dist.trim() === "") return undefined;
  const astro = join(dist, "_astro");
  return {
    // A file's bytes are read only when asked for, so a name the digest list
    // leaves out is never read.
    builtAssets: () => (existsSync(astro)
      ? readdirSync(astro, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => ({ name: entry.name, get bytes() { return readFileSync(join(astro, entry.name)); } }))
      : []),
    isBuilt: (name) => existsSync(join(astro, name)),
    writeCarriedAsset: (name, bytes) => {
      mkdirSync(astro, { recursive: true });
      writeFileSync(join(astro, name), bytes);
    },
    writeDigestList: (name, text) => writeFileSync(join(dist, name), text),
  };
}
