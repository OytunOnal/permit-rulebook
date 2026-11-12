import { execFileSync } from "node:child_process";

/**
 * A POSIX shell with grep, sed and git, for the cases that run a workflow's
 * own shell lines: the CI runner has one; on Windows, Git's own bash serves,
 * if present. Null when neither answers.
 */
export const posixShellPath: string | null = (() => {
  const candidates = ["C:\\Program Files\\Git\\bin\\bash.exe", "bash"];
  for (const candidate of candidates) {
    try {
      if (execFileSync(candidate, ["-c", "echo ok"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() === "ok")
        return candidate;
    } catch { /* try the next */ }
  }
  return null;
})();
