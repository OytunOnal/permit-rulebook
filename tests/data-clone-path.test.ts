import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { dataClonePath } from "../scripts/data-pin.mjs";

/**
 * Every copy of the site finds the same data clone: the one beside the site's
 * main checkout, which the build reads. A builder's worktree under
 * `.claude/worktrees/` has no data clone beside it, so `dataClonePath()` finds
 * the clone from the main checkout. The pipeline's lock cases and
 * `npm run data:pin` read the real one through it; these call it on a
 * throwaway repository of the OS temp folder, removed after.
 */

/** `body` run on a fresh folder of the OS temp folder, by its real path, removed after. */
function inThrowawayFolder(body: (folder: string) => void): void {
  const folder = realpathSync.native(mkdtempSync(join(tmpdir(), "permit-rulebook-data-clone-path-")));
  try {
    body(folder);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

/** git run in a throwaway repository, its output dropped. */
const gitIn = (folder: string, ...args: string[]): void => {
  execFileSync("git", ["-C", folder, ...args], { stdio: "ignore" });
};

/** A site at `site` whose manifest names the data clone beside it, committed, with a worktree at `worktree`. */
function siteWithWorktree(site: string, worktree: string): void {
  mkdirSync(site);
  writeFileSync(join(site, "package.json"), JSON.stringify({ dependencies: { "permit-rulebook-data": "file:../permit-rulebook-data" } }));
  gitIn(site, "init", "--quiet");
  gitIn(site, "add", "package.json");
  gitIn(site, "-c", "user.name=throwaway", "-c", "user.email=throwaway@example.invalid", "commit", "--quiet", "-m", "manifest");
  gitIn(site, "worktree", "add", "--quiet", worktree);
}

describe("every copy of the site finds the same data clone", () => {
  it("from a worktree nested in the main checkout, and from the main checkout, names the main checkout's data clone", () => {
    inThrowawayFolder((folder) => {
      const site = join(folder, "site");
      const worktree = join(site, "nested", "copy");
      siteWithWorktree(site, worktree);
      const mainCheckoutsClone = resolve(folder, "permit-rulebook-data");
      expect(dataClonePath(worktree)).toBe(mainCheckoutsClone);
      expect(dataClonePath(site)).toBe(mainCheckoutsClone);
    });
  });

  it("outside a git repository, refuses with a sentence naming the folder", () => {
    inThrowawayFolder((folder) => {
      expect(() => dataClonePath(folder)).toThrow(folder);
    });
  });
});
