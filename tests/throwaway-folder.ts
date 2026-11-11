import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runGit } from "../scripts/run-git.mjs";

/**
 * What the cases that build throwaway folders and git repositories share:
 * the folder in the OS temp folder, removed after; a repository in it; a
 * commit under a throwaway identity; and the newline git's lists are split on.
 */

/** A newline, spelled so no editor can eat it. */
export const LF = String.fromCharCode(10);

/** Who commits in a throwaway repository: a name and an address that reach no one. */
const THROWAWAY_IDENTITY = ["-c", "user.name=throwaway", "-c", "user.email=throwaway@example.invalid"];

/** `body` run on a fresh folder of the OS temp folder, by its real path, removed after whatever it did. */
export async function inThrowawayFolder(body: (folder: string) => void | Promise<void>): Promise<void> {
  const folder = realpathSync.native(mkdtempSync(join(tmpdir(), "permit-rulebook-throwaway-")));
  try {
    await body(folder);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

/** A new git repository at `folder`, on master, made with its parents. */
export function initThrowawayRepository(folder: string): void {
  mkdirSync(folder, { recursive: true });
  runGit(folder, "init", "--quiet", "--initial-branch=master");
}

/** A commit in the throwaway repository at `repository`, under the throwaway identity, with `args` after `git commit --quiet`. */
export function commitInThrowaway(repository: string, ...args: string[]): void {
  runGit(repository, ...THROWAWAY_IDENTITY, "commit", "--quiet", ...args);
}
