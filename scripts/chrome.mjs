import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * Where Chrome is, asked once.
 *
 * Two scripts needed it and each carried its own list of six paths (Standards
 * review, 2026-09-07). A browser found in one and missed in the other is the
 * kind of difference nobody notices until CI behaves unlike a laptop.
 */
const CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  // GitHub's ubuntu-latest image ships Chrome and Chromium; which name is
  // installed has changed between images, so all of them are asked for, and
  // PATH is asked last in case a future image moves them again.
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/opt/google/chrome/chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
];

/** The same names, resolved through PATH where the fixed locations miss. */
const ON_PATH = [
  "google-chrome", "google-chrome-stable", "chromium-browser", "chromium", "chrome",
];

function fromPath() {
  if (process.platform === "win32") return undefined;
  for (const name of ON_PATH) {
    try {
      const found = execFileSync("command", ["-v", name], { encoding: "utf8", shell: "/bin/sh" }).trim();
      if (found && existsSync(found)) return found;
    } catch { /* not on PATH */ }
  }
  return undefined;
}

export function chromePath() {
  // An explicit override is an instruction, not a hint: if it names a path that
  // is not there, say so instead of quietly using a different browser than the
  // one that was asked for.
  const told = process.env.CHROME_PATH;
  if (told) {
    if (!existsSync(told)) throw new Error(`CHROME_PATH is set to ${told}, and there is nothing there`);
    return told;
  }
  const found = CANDIDATES.find((p) => existsSync(p)) ?? fromPath();
  if (!found)
    throw new Error(
      "no Chrome found. Set CHROME_PATH, or install Chrome or Chromium. Looked at: " +
      CANDIDATES.join(", ") + "; and on PATH for: " + ON_PATH.join(", ") + ". " +
      "A run that cannot open a browser has not checked that the site renders, " +
      "and must not report that it has.",
    );
  return found;
}
