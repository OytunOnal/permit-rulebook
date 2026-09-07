import { spawn } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { chromePath } from "./chrome.mjs";

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

/** A static server over a directory, on a port the OS picks. */
export async function serve(dir) {
  const server = createServer((req, res) => {
    let file = join(dir, decodeURIComponent(new URL(req.url, "http://x").pathname));
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
  return { port, origin: `http://127.0.0.1:${port}`, close };
}

/**
 * Headless Chrome, attached over CDP, handed to `run` as a small page object:
 *
 *   goto(url)        navigate and settle
 *   evaluate(expr)   run an expression in the page, return its value
 *   problems()       everything the page has thrown or logged as an error
 */
export async function withBrowser(run, { viewport = { width: 390, height: 844 }, mobile = true } = {}) {
  const userDataDir = join(process.cwd(), "node_modules", ".cache", "browser-harness");
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
  });

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);
  await send("Log.enable", {}, sessionId);
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
    problems: () => [...problems],
  };

  try {
    return await run(page);
  } finally {
    release();
  }
}

export { chromePath };
