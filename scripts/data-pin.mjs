/**
 * Write the sibling data repository's HEAD into `data.lock`.
 *
 * The site is built against the commit the lock names, not against whatever
 * the sibling happens to be at (see the file's own comment). A developer who
 * has just moved the data repository forward runs this to say so.
 *
 * Usage: npm run data:pin [-- --check]
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const lockPath = join(root, "data.lock");

/** Where the manifest says the data sits — never typed twice. */
export function dataDir() {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  return resolve(root, manifest.dependencies["permit-rulebook-data"].replace(/^file:/, ""));
}

/** What the lock says today. */
export function readLock(text = readFileSync(lockPath, "utf8")) {
  const value = (key) => new RegExp(`^${key}=(.+)$`, "m").exec(text)?.[1]?.trim() ?? "";
  return { sha: value("sha"), datasetVersion: value("dataset_version") };
}

const at = (dir, ...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" }).trim();

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const dir = dataDir();
  const sha = at(dir, "rev-parse", "HEAD");
  const version = JSON.parse(readFileSync(join(dir, "data", "dataset.json"), "utf8")).dataset_version;
  const before = readLock();
  const text = readFileSync(lockPath, "utf8")
    .replace(/^sha=.*$/m, `sha=${sha}`)
    .replace(/^dataset_version=.*$/m, `dataset_version=${version}`);
  writeFileSync(lockPath, text, "utf8");
  console.log(JSON.stringify({
    level: "info", msg: before.sha === sha ? "data.lock already at this commit" : "data.lock updated",
    was: before.sha, now: sha, dataset_version: version,
  }));
}
