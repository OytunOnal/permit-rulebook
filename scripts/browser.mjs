import { spawn } from "node:child_process";
import { createReadStream, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { chromePath } from "./chrome.mjs";
import { at, siteBase } from "./site-base.mjs";

/**
 * A real browser over the built site, shared by everything that needs one.
 *
 * Two things here are not optional, and both were learned by getting them
 * wrong. The site is served over HTTP, because a module script does not run
 * from `file://` and the interview would measure as a handful of static links.
 * And the viewport is set through CDP's `Emulation.setDeviceMetricsOverride`,
 * because `--window-size` does not reach a `--dump-dom` render — the first cut
 * of the tap harness reported `innerWidth 500` while claiming 390.
 *
 * It also collects everything the page throws. `measure:taps` walks elements and
 * saw a completely dead interview as "0 controls under the floor": on
 * 2026-09-07 the client script died on import, no question ever rendered, and
 * nothing in the suite or the harness noticed.
 */

/**
 * Everything this process has opened that must not outlive it.
 *
 * A `finally` covers a throw. It does not cover Ctrl-C, and it does not cover a
 * crash — and a leaked listener is not a tidiness problem here: the next run
 * finds a port held by a process nobody owns, and a harness that trusts what is
 * listening walks it (coordinator, 2026-09-07). Everything registers, and the
 * process closes the lot on its way out however it leaves.
 */
const openThings = new Set();

/** Distinguishes concurrent browsers within one process. */
let nextProfile = 0;
const PROFILE_PREFIX = "permit-rulebook-browser-";

/** Profiles left by runs that are over. A dead pid cannot still be browsing. */
function sweepStaleProfiles() {
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

function closeEverything() {
  for (const close of [...openThings]) {
    openThings.delete(close);
    try { close(); } catch { /* going away anyway */ }
  }
}

let hooked = false;
function hookExit() {
  if (hooked) return;
  hooked = true;
  process.on("exit", closeEverything);
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"])
    process.on(signal, () => { closeEverything(); process.exit(130); });
  process.on("uncaughtException", (e) => { closeEverything(); throw e; });
}

/** Register a thing to be closed, and hand back a close that only runs once. */
export function owned(close) {
  hookExit();
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    openThings.delete(once);
    try { close(); } catch { /* already gone */ }
  };
  openThings.add(once);
  return once;
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".ico": "image/x-icon", ".map": "application/json", ".txt": "text/plain",
};

/**
 * A static server over a directory, on a port the OS picks, mounted where the
 * build believes it lives.
 *
 * A site built for a subpath asks for its own assets under that subpath. Served
 * at the root it gets 404 for every stylesheet and script, and every measured
 * page comes out unstyled — which is how CI reported the identity pair as
 * missing and the interview as empty (2026-09-08).
 */
export async function serve(dir, { base = siteBase() } = {}) {
  const server = createServer((req, res) => {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (base && (path === base || path.startsWith(`${base}/`))) path = path.slice(base.length) || "/";
    let file = join(dir, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  // Port 0: the OS picks a free one. Never a fixed port — a harness that binds
  // 4321 fights the developer's own dev server for it.
  const port = await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
  const close = owned(() => { server.closeAllConnections?.(); server.close(); });
  const origin = `http://127.0.0.1:${port}`;
  return { port, origin, base, url: (path) => at(origin, base, path), close };
}

/**
 * Headless Chrome, attached over CDP, handed to `run` as a small page object:
 *
 *   goto(url)        navigate and settle
 *   evaluate(expr)   run an expression in the page, return its value
 *   problems()       everything the page has thrown or logged as an error
 */
export async function withBrowser(run, { viewport = { width: 390, height: 844 }, mobile = true, network = false } = {}) {
  // A profile of its own, per launch. Three test files drive a browser, vitest
  // runs them in parallel, and Chrome exits 21 when a second instance opens the
  // same user-data-dir — which read as "the identity pair is missing" and "the
  // interview threw", three failures with one cause (2026-09-08).
  //
  // Under the OS temp directory, not the repository: Windows still holds a lock
  // on the profile when the browser is killed, so removing it on the way out
  // only sometimes works. Stale ones from processes that have gone are swept at
  // launch instead, which is the sweep that always works.
  sweepStaleProfiles();
  const userDataDir = join(tmpdir(), `${PROFILE_PREFIX}${process.pid}-${nextProfile++}`);
  const browser = spawn(chromePath(), [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
    "--remote-debugging-port=0", `--user-data-dir=${userDataDir}`, "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

  const wsUrl = await new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => reject(new Error("Chrome did not report a DevTools endpoint")), 30000);
    browser.stderr.on("data", (chunk) => {
      buffer += chunk.toString();
      const m = /ws:\/\/[^\s]+/.exec(buffer);
      if (m) { clearTimeout(timer); resolve(m[0]); }
    });
    browser.on("exit", (code) => { clearTimeout(timer); reject(new Error(`Chrome exited (${code})`)); });
  });

  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const problems = [];
  /** Every request the page made, when the caller asked to watch. */
  const requests = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") {
      const d = message.params.exceptionDetails;
      problems.push(`exception: ${d.exception?.description ?? d.text}`);
      return;
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      problems.push(`console.error: ${message.params.args.map((a) => a.value ?? a.description ?? "").join(" ")}`);
      return;
    }
    if (message.method === "Network.requestWillBeSent") {
      const { request, type } = message.params;
      requests.push({
        url: request.url,
        method: request.method,
        type: type ?? "",
        postData: request.postData ?? "",
        hasPostData: request.hasPostData === true,
      });
      return;
    }
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      problems.push(`log: ${message.params.entry.text}`);
      return;
    }
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
  });

  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });

  const release = owned(() => {
    try { socket.close(); } catch { /* already closed */ }
    try { browser.kill(); } catch { /* already gone */ }
    // The profile goes with the browser that made it.
    try { rmSync(userDataDir, { recursive: true, force: true }); } catch { /* in use */ }
  });

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);
  await send("Log.enable", {}, sessionId);
  // Off by default: only the case that asks a question about the network pays
  // for the events. "Answers never leave the device" is a promise about what
  // the page DOES, so the only honest check is what it actually sent
  // (human, 2026-09-08).
  if (network) await send("Network.enable", {}, sessionId);
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width, height: viewport.height, deviceScaleFactor: 2, mobile,
  }, sessionId);

  const page = {
    async goto(url, settleMs = 400) {
      problems.length = 0;
      await send("Page.navigate", { url }, sessionId);
      // The interview draws its screen from a module script; give it a turn.
      await new Promise((r) => setTimeout(r, settleMs));
    },
    async evaluate(expression) {
      const { result } = await send("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
      return result.value;
    },
    /** The screen as a PNG, for a record a reader can look at. */
    async screenshot({ fullPage = false } = {}) {
      const { data } = await send(
        "Page.captureScreenshot",
        { format: "png", captureBeyondViewport: fullPage },
        sessionId,
      );
      return Buffer.from(data, "base64");
    },
    problems: () => [...problems],
    requests: () => requests.map((r) => ({ ...r })),
    forgetRequests: () => { requests.length = 0; },
  };

  try {
    return await run(page);
  } finally {
    release();
  }
}

export { chromePath };
