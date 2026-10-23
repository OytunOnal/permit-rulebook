import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { openBuildDirectoryOnDisk } from "../../scripts/build-directory-on-disk.mjs";
import { CSS, CSS_NAME, JS, JS_NAME, distHolding, sweepTemporary, tempDirectory } from "./deploy-fixtures.js";

/**
 * The build directory over a real `dist/`, in a throwaway folder per case: the
 * disk work the carry's flow hands to its port. What the flow does with each
 * answer is the `carry-*.test.ts` files', against a build directory in
 * memory.
 */

afterEach(sweepTemporary);

/** The adapter over `dist`, which these cases always give a path. */
const onDisk = (dist: string) => {
  const build = openBuildDirectoryOnDisk(dist);
  if (!build) throw new Error(`no build directory over ${dist}`);
  return build;
};

describe("the build directory on disk", () => {
  it("lists the files this build put in `_astro/`, each with its bytes", () => {
    const dist = distHolding({ [CSS_NAME]: CSS, [JS_NAME]: JS });
    mkdirSync(join(dist, "_astro", "nested"));
    const listed = onDisk(dist).builtAssets().map(({ name, bytes }) => [name, bytes.toString("utf8")]);
    expect(listed.sort()).toEqual([[CSS_NAME, CSS.toString("utf8")], [JS_NAME, JS.toString("utf8")]]);
    // A build with no `_astro/` at all built no assets.
    expect(onDisk(tempDirectory()).builtAssets()).toEqual([]);
  });

  it("says whether an asset is already in this build", () => {
    const build = onDisk(distHolding({ [JS_NAME]: JS }));
    expect(build.isBuilt(JS_NAME)).toBe(true);
    expect(build.isBuilt(CSS_NAME)).toBe(false);
  });

  it("writes a carried asset into `_astro/`, and never over a path that is not a folder", () => {
    const dist = tempDirectory();
    onDisk(dist).writeCarriedAsset(CSS_NAME, CSS);
    expect(readFileSync(join(dist, "_astro", CSS_NAME)).equals(CSS)).toBe(true);
    // `_astro` as a FILE: the write throws for the flow to report, and the
    // path it could not write into is left as it was.
    const blocked = tempDirectory();
    writeFileSync(join(blocked, "_astro"), "not a directory");
    expect(() => onDisk(blocked).writeCarriedAsset(CSS_NAME, CSS)).toThrow();
    expect(readFileSync(join(blocked, "_astro"), "utf8")).toBe("not a directory");
  });

  it("writes the digest list beside the page, under the name it is given", () => {
    const dist = distHolding();
    onDisk(dist).writeDigestList("asset-digests.txt", "the list\n");
    expect(readdirSync(dist).sort()).toEqual(["_astro", "asset-digests.txt"]);
    expect(readFileSync(join(dist, "asset-digests.txt"), "utf8")).toBe("the list\n");
  });

  it("is no build directory at all for a blank path", () => {
    // A blank `--dist` would resolve against the process's own folder, which
    // is not a build anyone named.
    expect(openBuildDirectoryOnDisk("")).toBeUndefined();
    expect(openBuildDirectoryOnDisk("  ")).toBeUndefined();
  });
});
