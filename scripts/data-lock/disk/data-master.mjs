// @level infrastructure
/**
 * The data master's newest commit, as the data repository's remote names it
 * now: `git ls-remote`, run by an argument list with no shell, the address
 * after `--` so it is never read as an option. It reads the remote and
 * writes nothing; what it hands back is checked by the caller.
 */
import { runGit } from "../../run-git.mjs";

/**
 * The commit `refs/heads/master` names at `repositoryUrl`, asked from `dir`:
 * the first field of each line git answers, one per line, as the remote gave
 * them; "" when it names none. An empty address throws.
 */
export function newestDataMasterOf(repositoryUrl, dir) {
  if (repositoryUrl === "") throw new Error("no data repository address is given, so its master's newest commit cannot be read");
  return runGit(dir, "ls-remote", "--", repositoryUrl, "refs/heads/master")
    .split("\n").map((line) => line.split("\t")[0]).join("\n");
}
