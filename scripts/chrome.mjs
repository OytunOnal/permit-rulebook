import { existsSync } from "node:fs";

/**
 * Where Chrome is, asked once.
 *
 * Two scripts needed it and each carried its own list of six paths (Standards
 * review, 2026-09-07). A browser found in one and missed in the other is the
 * kind of difference nobody notices until CI behaves unlike a laptop.
 */
const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

export function chromePath() {
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found)
    throw new Error(
      "no Chrome found — set CHROME_PATH. The rendered assets are committed, so " +
      "this is only needed when the identity or the dataset's headline numbers change.",
    );
  return found;
}
