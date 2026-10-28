// @level infrastructure
import { existsSync, statSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";

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
  // GitHub's Ubuntu images ship Chrome and Chromium; which name is
  // installed has changed between images, so all of them are asked for, and
  // PATH is asked last in case a future image moves them again.
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/opt/google/chrome/chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
];

/** The same names, looked for in PATH's folders where the fixed locations miss. */
const ON_PATH = [
  "google-chrome", "google-chrome-stable", "chromium-browser", "chromium", "chrome",
];

/** Whether `path` names a file. */
const isFile = (path) => existsSync(path) && statSync(path).isFile();

/**
 * The first of `ON_PATH` found as a file in an absolute folder of PATH, or
 * undefined. A relative folder is skipped: it names wherever the run happens
 * to stand. No shell is asked.
 */
function fromPath() {
  const folders = (process.env.PATH ?? "").split(delimiter).filter((folder) => isAbsolute(folder));
  for (const name of ON_PATH) {
    const found = folders.map((folder) => join(folder, name)).find(isFile);
    if (found) return found;
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
