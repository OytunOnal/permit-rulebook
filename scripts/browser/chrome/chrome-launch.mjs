// @level infrastructure
import { spawn } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromePath } from "./chrome.mjs";

/**
 * Headless Chrome launched on a profile of its own, and closed with it.
 *
 * A profile of its own, per launch. Three test files drive a browser, vitest
 * runs them in parallel, and Chrome exits 21 when a second instance opens the
 * same user-data-dir — which read as "the identity pair is missing" and "the
 * interview threw", three failures with one cause (2026-09-08).
 *
 * Under the OS temp directory, not the repository: Windows still holds a lock
 * on the profile when the browser is killed, so removing it on the way out
 * only sometimes works. Stale ones from processes that have gone are swept at
 * launch instead, which is the sweep that always works.
 */

/** Distinguishes concurrent browsers within one process. */
let nextProfile = 0;
// Starts the name of every profile this harness makes, so the sweep removes only its own; the pid after it says whose.
const PROFILE_PREFIX = "permit-rulebook-browser-";

/** Removes the profiles left by runs that are over. A dead pid cannot still be browsing. */
export function sweepStaleProfiles() {
  let entries = [];
  try { entries = readdirSync(tmpdir()); } catch { return; }
  for (const name of entries) {
    if (!name.startsWith(PROFILE_PREFIX)) continue;
    const pid = Number(name.slice(PROFILE_PREFIX.length).split("-")[0]);
    if (!Number.isInteger(pid) || pid === process.pid) continue;
    try { process.kill(pid, 0); continue; } catch { /* gone: sweep it */ }
    try { rmSync(join(tmpdir(), name), { recursive: true, force: true }); } catch { /* in use */ }
  }
}

/**
 * The factor every tab is slowed by: BROWSER_CPU_SLOWDOWN slows every tab by
 * that factor through Chrome's CPU throttling, a busy runner here; unset, none.
 */
export function readCpuSlowdown() {
  const cpuSlowdown = Number(process.env.BROWSER_CPU_SLOWDOWN || 1);
  if (!(cpuSlowdown >= 1)) throw new Error(`BROWSER_CPU_SLOWDOWN is a factor of 1 or more, not ${process.env.BROWSER_CPU_SLOWDOWN}`);
  return cpuSlowdown;
}

/**
 * Launches headless Chrome on a fresh profile and returns it once it reports
 * its DevTools endpoint: the process, its profile folder, and the endpoint.
 *
 * Scrollbars are hidden unless the caller asks for them: a measurement of
 * the page's shape wants the layout, not the platform's chrome around it.
 * The one case that asks is about the chrome — a classic scrollbar takes
 * its width from the layout when it appears, and only a browser that
 * draws one can show whether the page reserves the room (s31).
 */
export async function launchChrome({ scrollbars }) {
  const userDataDir = join(tmpdir(), `${PROFILE_PREFIX}${process.pid}-${nextProfile++}`);
  const browser = spawn(chromePath(), [
    "--headless=new", "--disable-gpu", ...(scrollbars ? [] : ["--hide-scrollbars"]), "--no-first-run",
    "--remote-debugging-port=0", `--user-data-dir=${userDataDir}`, "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  const devToolsUrl = await readDevToolsUrl(browser);
  return { browser, userDataDir, devToolsUrl };
}

/** The DevTools endpoint Chrome prints on its error stream once it listens. */
function readDevToolsUrl(browser) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => reject(new Error("Chrome did not report a DevTools endpoint")), 30000);
    browser.stderr.on("data", (chunk) => {
      buffer += chunk.toString();
      const m = /ws:\/\/[^\s]+/.exec(buffer);
      if (m) { clearTimeout(timer); resolve(m[0]); }
    });
    browser.on("exit", (code) => { clearTimeout(timer); reject(new Error(`Chrome exited (${code})`)); });
  });
}

/** Kills the Chrome `launchChrome` started; the profile goes with the browser that made it. */
export function closeChrome({ browser, userDataDir }) {
  try { browser.kill(); } catch { /* already gone */ }
  try { rmSync(userDataDir, { recursive: true, force: true }); } catch { /* in use */ }
}
