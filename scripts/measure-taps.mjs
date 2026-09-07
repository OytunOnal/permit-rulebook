/**
 * The tap floor, measured rather than argued.
 *
 * `tests/route-page.test.ts` holds the invariant the way a suite can: every
 * control carries one of the two declared tap classes, and both classes are
 * written in `--tap-min`. That is a check over markup and stylesheet, and it is
 * honest about being one. This is the other half — real layout, real fonts,
 * a real 390 px viewport, over every built page.
 *
 *   npm run build && npm run measure:taps
 *
 * Two things it does that a simpler harness cannot, both learned the hard way:
 * it serves `dist/` over HTTP, because a module script does not run from
 * `file://` and the interview screen would measure as five static links; and it
 * sets the viewport through CDP's `Emulation.setDeviceMetricsOverride`, because
 * `--window-size` does not reach a `--dump-dom` render — the first cut of this
 * script reported `innerWidth 500` while claiming to measure at 390.
 *
 * It prints, per page: the viewport it actually got, how many controls it found,
 * the document's scroll width (anything over the viewport is horizontal
 * overflow), and every control under the floor with its height and its text.
 */
import { spawn } from "node:child_process";
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { chromePath } from "./chrome.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");

/** The token's own value. A control measured against a number typed here would
 * not notice the token moving, so it is asserted against the stylesheet below. */
const TAP_MIN = 44;
const VIEWPORT = { width: 390, height: 844 };

let chrome;
try { chrome = chromePath(); } catch (e) { console.error(e.message); process.exit(2); }
if (!existsSync(dist)) { console.error("no dist/ — run npm run build first"); process.exit(2); }

// ---------------------------------------------------------------------------
// A static server over dist/
// ---------------------------------------------------------------------------

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".ico": "image/x-icon", ".map": "application/json",
};

const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join(dist, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});

const port = await new Promise((resolve) => {
  server.listen(0, "127.0.0.1", () => resolve(server.address().port));
});

// ---------------------------------------------------------------------------
// Chrome, over CDP
// ---------------------------------------------------------------------------

const userDataDir = join(root, "node_modules", ".cache", "measure-taps-profile");
const browser = spawn(chrome, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  "--remote-debugging-port=0", `--user-data-dir=${userDataDir}`, "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

const wsUrl = await new Promise((resolve, reject) => {
  let buffer = "";
  const timer = setTimeout(() => reject(new Error("Chrome did not report a DevTools endpoint")), 20000);
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
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(`${message.error.message} (${JSON.stringify(message.error.data ?? "")})`));
  else waiter.resolve(message.result);
});

const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", {
  width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 2, mobile: true,
}, sessionId);

// ---------------------------------------------------------------------------

const PROBE = `(() => {
  const floor = ${TAP_MIN};
  const bad = [];
  let n = 0;
  for (const el of document.querySelectorAll("a, button, summary, input, select, [role='button'], [role='option']")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    n++;
    if (r.height + 0.5 < floor)
      bad.push(Math.round(r.height) + "px \\u00b7 " + (el.textContent || el.tagName).trim().replace(/\\s+/g, " ").slice(0, 34));
  }
  return JSON.stringify({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    controls: n,
    bad,
    tapMin: getComputedStyle(document.documentElement).getPropertyValue("--tap-min").trim(),
  });
})()`;

const pages = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (entry.endsWith(".html")) pages.push(full);
  }
})(dist);
pages.sort();

let failures = 0;
let overflows = 0;
for (const page of pages) {
  const url = `http://127.0.0.1:${port}/${relative(dist, page).replace(/\\/g, "/").replace(/index\.html$/, "")}`;
  await send("Page.navigate", { url }, sessionId);
  // The interview draws its screen from a module script; give it a turn.
  await new Promise((r) => setTimeout(r, 350));
  const { result } = await send("Runtime.evaluate", { expression: PROBE, returnByValue: true }, sessionId);
  const m = JSON.parse(result.value);
  const name = relative(dist, page).replace(/\\/g, "/");
  const overflow = m.scrollWidth > m.innerWidth + 1;
  if (overflow) overflows++;
  if (m.bad.length || overflow) {
    failures++;
    console.log(`FAIL ${name}`);
    console.log(`     viewport ${m.innerWidth}px · scrollWidth ${m.scrollWidth}px · ${m.controls} controls · --tap-min ${m.tapMin}`);
    for (const b of m.bad) console.log(`     under the floor: ${b}`);
    if (overflow) console.log(`     horizontal overflow: ${m.scrollWidth - m.innerWidth}px`);
  } else {
    console.log(`ok   ${name} — ${m.innerWidth}px, ${m.controls} controls, none under ${TAP_MIN}px, no overflow`);
  }
}

socket.close();
browser.kill();
server.close();

console.log(`\n${pages.length} pages at ${VIEWPORT.width} px — ${failures} with a problem (${overflows} overflowing)`);
process.exit(failures === 0 ? 0 : 1);
