// @level infrastructure
/**
 * Write the sibling data repository's HEAD into `data.lock`.
 *
 * The site is built against the commit the lock names, not against whatever
 * the sibling happens to be at (see the file's own comment). A developer who
 * has just moved the data repository forward runs this to say so.
 *
 * It reads the manifest, the data clone's HEAD and dataset version, and the
 * lock it writes; it writes only that lock, which must exist already: a case
 * pins into a copy in the OS temp folder, never into the site's own.
 *
 * `pinData` returns what it found and prints nothing: the report line is
 * `cli-data-pin.mjs`'s, and `main-data-pin.mjs` runs the two.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const siteLockPath = join(root, "data.lock");

/** Where the manifest says the data sits — never typed twice. */
export function dataDir() {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  return resolve(root, manifest.dependencies["permit-rulebook-data"].replace(/^file:/, ""));
}

/** What the lock says today. */
export function readLock(text = readFileSync(siteLockPath, "utf8")) {
  const value = (key) => new RegExp(`^${key}=(.+)$`, "m").exec(text)?.[1]?.trim() ?? "";
  return { sha: value("sha"), datasetVersion: value("dataset_version") };
}

const at = (dir, ...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" }).trim();

/**
 * Writes the data clone's HEAD and dataset version into the lock at
 * `lockPath` (the site's own `data.lock` by default, a relative path read from
 * the working folder), and returns the sha it named before, the sha it names
 * now and the dataset version.
 */
export function pinData({ lockPath = siteLockPath } = {}) {
  const target = resolve(lockPath);
  const dir = dataDir();
  const sha = at(dir, "rev-parse", "HEAD");
  const datasetVersion = JSON.parse(readFileSync(join(dir, "data", "dataset.json"), "utf8")).dataset_version;
  const lockText = readFileSync(target, "utf8");
  const pinned = lockText
    .replace(/^sha=.*$/m, `sha=${sha}`)
    .replace(/^dataset_version=.*$/m, `dataset_version=${datasetVersion}`);
  writeFileSync(target, pinned, "utf8");
  return { previousSha: readLock(lockText).sha, sha, datasetVersion };
}
