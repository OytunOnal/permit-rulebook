// CLS on the first paint, measured the way the counter measures it: layout
// shifts the reader did not cause, summed, from a cold load of the built site.
import { serve, withBrowser } from "file:///C:/Users/hoyti/OneDrive/Desktop/Projects/permit-rulebook/scripts/browser.mjs";
const dist = "C:/Users/hoyti/OneDrive/Desktop/Projects/permit-rulebook/dist";
const INSTALL = `(() => { window.__cls = []; new PerformanceObserver((l) => window.__cls.push(...l.getEntries().filter((e) => !e.hadRecentInput).map((e) => ({ value: e.value, nodes: (e.sources ?? []).map((s) => s.node ? (s.node.id ? "#" + s.node.id : s.node.tagName + (s.node.className ? "." + String(s.node.className).split(" ")[0] : "")) : "?").slice(0, 3) })))).observe({ type: "layout-shift", buffered: true }); return true; })()`;
const READ = `JSON.stringify({ cls: Math.round(window.__cls.reduce((s, e) => s + e.value, 0) * 1000) / 1000, shifts: window.__cls.map((e) => ({ value: Math.round(e.value * 1000) / 1000, nodes: e.nodes })) })`;

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
const DELAY_JS_MS = Number(process.env.DELAY_JS_MS ?? 700);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
const http = createServer(async (req, res) => {
  let file = join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname));
  try { if ((await stat(file)).isDirectory()) file = join(file, "index.html"); } catch {}
  try {
    const body = await readFile(file);
    if (extname(file) === ".js") await new Promise((r) => setTimeout(r, DELAY_JS_MS));
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }); res.end(body);
  } catch { res.writeHead(404); res.end("not found"); }
});
const port = await new Promise((r) => http.listen(0, "127.0.0.1", () => r(http.address().port)));
const server = { url: (path) => `http://127.0.0.1:${port}${path}`, close: () => http.close() };
console.log("js delayed by", DELAY_JS_MS, "ms");
try {
  for (const [label, path, record] of [
    ["/ cold, no record", "/", null],
    ["/?country=fr cold", "/?country=fr", null],
    ["/ with a saved record (France, Turkish passport, offer)", "/", { destination: "fr", citizenship: "TR", situation: "offer", situation_country: "fr" }],
  ]) {
    await withBrowser(async (page) => {
      if (record) {
        await page.goto(server.url("/404.html"), 300);
        await page.evaluate(`localStorage.setItem("permit-rulebook.record.v1", ${JSON.stringify(JSON.stringify({ version: 1, answers: record, history: Object.keys(record) }))})`);
      } else {
        await page.goto(server.url("/404.html"), 300);
        await page.evaluate(`localStorage.clear()`);
      }
      await page.goto(server.url(path), DELAY_JS_MS + 1500);
      await page.evaluate(INSTALL); await new Promise((r) => setTimeout(r, 400)); const r = JSON.parse(await page.evaluate(READ));
      console.log(`${label}\n  CLS ${r.cls}  ${r.shifts.map((s) => `[${s.value} ${s.nodes.join(",")}]`).join(" ")}`);
    });
  }
} finally { server.close(); }
