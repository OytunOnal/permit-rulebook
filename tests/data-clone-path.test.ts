import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { dataClonePath } from "../scripts/data-pin.mjs";
import { runGit } from "../scripts/run-git.mjs";
import { commitInThrowaway, initThrowawayRepository, inThrowawayFolder } from "./throwaway-folder.js";

/**
 * Every copy of the site finds the same data clone: the one beside the site's
 * main checkout, which the build reads. A builder's worktree under
 * `.claude/worktrees/` has no data clone beside it, so `dataClonePath()` finds
 * the clone from the main checkout. The pipeline's lock cases and
 * `npm run data:pin` read the real one through it; these call it on a
 * throwaway repository of the OS temp folder, removed after.
 */

/** A site at `site` whose manifest names the data clone beside it, committed, with a worktree at `worktree`. */
function siteWithWorktree(site: string, worktree: string): void {
  initThrowawayRepository(site);
  writeFileSync(join(site, "package.json"), JSON.stringify({ dependencies: { "permit-rulebook-data": "file:../permit-rulebook-data" } }));
  runGit(site, "add", "package.json");
  commitInThrowaway(site, "-m", "manifest");
  runGit(site, "worktree", "add", "--quiet", worktree);
}

describe("every copy of the site finds the same data clone", () => {
  it("from a worktree nested in the main checkout, and from the main checkout, names the main checkout's data clone", async () => {
    await inThrowawayFolder((folder) => {
      const site = join(folder, "site");
      const worktree = join(site, "nested", "copy");
      siteWithWorktree(site, worktree);
      const mainCheckoutsClone = resolve(folder, "permit-rulebook-data");
      expect(dataClonePath(worktree)).toBe(mainCheckoutsClone);
      expect(dataClonePath(site)).toBe(mainCheckoutsClone);
    });
  });

  it("outside a git repository, refuses with a sentence naming the folder", async () => {
    await inThrowawayFolder((folder) => {
      expect(() => dataClonePath(folder)).toThrow(folder);
    });
  });
});
