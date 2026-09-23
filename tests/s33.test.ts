import { afterEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * s33 — the carrier that lets a cached page still find its assets.
 *
 * `/` is served with `Cache-Control: max-age=600` — GitHub Pages' header, not
 * ours — so a reader's browser may hold the page for ten minutes, while the
 * two files that page needs are content-hashed and leave the tree on the next
 * deploy that changes them. Measured live on 2026-09-23:
 * `/_astro/index.CpGG1ZDr.css`, `/_astro/index.BcmUcb7-.css` and
 * `/_astro/index.qYLZ_mcb.js` all answered 404, which is an unstyled page
 * whose interview never runs.
 *
 * `scripts/carry-assets.mjs` reads the LIVE page, takes the `/_astro/` names it
 * references, and copies into the fresh `dist/` the ones that build does not
 * already have. It runs inside a deploy, so two properties matter more than
 * what it carries: it never fails the deploy, and it never writes anything the
 * live host did not serve as a 200 CSS or JavaScript response.
 *
 * The cases below drive the real script as a child process against a local
 * origin — the exit code is half of what is being asserted, and only a real
 * process has one.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const carrier = join(root, "scripts", "carry-assets.mjs");

/** A stylesheet with a multi-byte character and a CRLF: nothing may normalise it. */
const CSS = Buffer.from("/* ü */\r\n.a{color:red}\n", "utf8");
const JS = Buffer.from("export const n = 1; // é\n", "utf8");
const CSS_NAME = "index.AAAAAAAA.css";
const JS_NAME = "index.BBBBBBBB.js";

const sha256 = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");

/** What the live host answers for one path. */
type Answer = { status?: number; type?: string; body?: Buffer };

/**
 * A local stand-in for the live origin: it answers exactly what a case tells it
 * to and records every path asked for, so "it fetched only what was missing" is
 * a measurement rather than an inference.
 */
async function origin(answers: Record<string, Answer>): Promise<{ url: string; asked: string[]; close: () => void }> {
  const asked: string[] = [];
  const server: Server = createServer((req, res) => {
    const path = new URL(req.url ?? "/", "http://x").pathname;
    asked.push(path);
    const answer = answers[path];
    if (!answer) { res.writeHead(404, { "content-type": "text/html" }); res.end("not found"); return; }
    res.writeHead(answer.status ?? 200, { "content-type": answer.type ?? "application/octet-stream" });
    res.end(answer.body ?? Buffer.alloc(0));
  });
  const port = await new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve((server.address() as { port: number }).port));
  });
  return {
    url: `http://127.0.0.1:${port}`,
    asked,
    close: () => { server.closeAllConnections?.(); server.close(); },
  };
}

/**
 * The live page, naming its assets the way Astro writes them — root-absolute,
 * under the base the site is served from.
 */
const page = (names: string | string[], base = ""): Buffer => Buffer.from(
  `<!DOCTYPE html><html><head>${[names].flat()
    .map((n) => (n.endsWith(".css")
      ? `<link rel="stylesheet" href="${base}/_astro/${n}">`
      : `<script type="module" src="${base}/_astro/${n}"></script>`))
    .join("")}</head><body></body></html>`,
  "utf8",
);

const temporary: string[] = [];

/** A `dist/` holding whatever this build already produced. */
function dist(have: Record<string, Buffer> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "permit-rulebook-carry-"));
  temporary.push(dir);
  mkdirSync(join(dir, "_astro"), { recursive: true });
  for (const [name, bytes] of Object.entries(have)) writeFileSync(join(dir, "_astro", name), bytes);
  return dir;
}

/**
 * The script, run the way the workflow runs it. Its exit code is an assertion.
 *
 * Asynchronously, and that is not a style choice: the stand-in origin above
 * listens on this very process, so a synchronous child would block the event
 * loop that has to answer it, and every case would read as a timeout.
 */
function carry(args: string[]): Promise<{ status: number; out: string }> {
  return new Promise((resolve) => {
    execFile(process.execPath, [carrier, ...args], { encoding: "utf8" }, (error, stdout, stderr) => {
      const status = error ? ((error as { code?: number }).code ?? 1) : 0;
      resolve({ status, out: `${stdout}${stderr}` });
    });
  });
}

const carried = (dir: string): string[] => readdirSync(join(dir, "_astro")).sort();

afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("the carrier takes the live generation forward", () => {
  it("fetches only the assets this build does not already have", async () => {
    const live = await origin({
      "/": { type: "text/html; charset=utf-8", body: page([CSS_NAME, JS_NAME]) },
      [`/_astro/${CSS_NAME}`]: { type: "text/css; charset=utf-8", body: CSS },
      [`/_astro/${JS_NAME}`]: { type: "text/javascript; charset=utf-8", body: JS },
    });
    const out = dist({ [JS_NAME]: JS });
    try {
      const run = await carry(["--origin", live.url, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      // The page, then the one missing file — and never the one already built.
      expect(live.asked).toEqual(["/", `/_astro/${CSS_NAME}`]);
      expect(carried(out)).toEqual([CSS_NAME, JS_NAME].sort());
    } finally { live.close(); }
  });

  it("writes the bytes the live host served, and says the name, the size and the digest", async () => {
    const live = await origin({
      "/": { type: "text/html; charset=utf-8", body: page(CSS_NAME) },
      [`/_astro/${CSS_NAME}`]: { type: "text/css; charset=utf-8", body: CSS },
    });
    const out = dist();
    try {
      const run = await carry(["--origin", live.url, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      // Byte-identical: not re-encoded, not re-indented, not minified.
      expect(readFileSync(join(out, "_astro", CSS_NAME)).equals(CSS)).toBe(true);
      expect(run.out).toContain(CSS_NAME);
      expect(run.out).toContain(String(CSS.length));
      expect(run.out).toContain(sha256(CSS));
    } finally { live.close(); }
  });

  it("carries nothing and says so when the live host answers 404", async () => {
    const live = await origin({
      "/": { type: "text/html; charset=utf-8", body: page(CSS_NAME) },
      [`/_astro/${CSS_NAME}`]: { status: 404, type: "text/html; charset=utf-8", body: Buffer.from("gone") },
    });
    const out = dist();
    try {
      const run = await carry(["--origin", live.url, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
      expect(run.out).toContain("404");
    } finally { live.close(); }
  });

  it("carries nothing and says so when the answer is 200 but not a stylesheet or a module", async () => {
    // What a host that has lost the file actually does: 200, and an HTML page
    // saying it is missing. Writing that into `dist/_astro/` would replace a
    // stylesheet with a web page and break the deploy this step exists to save.
    const live = await origin({
      "/": { type: "text/html; charset=utf-8", body: page(CSS_NAME) },
      [`/_astro/${CSS_NAME}`]: { type: "text/html; charset=utf-8", body: Buffer.from("<html>404</html>") },
    });
    const out = dist();
    try {
      const run = await carry(["--origin", live.url, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
      expect(run.out).toContain("text/html");
    } finally { live.close(); }
  });

  it("exits 0 when the live origin answers nothing at all", async () => {
    // The deploy must survive a host that is down, a DNS failure, a timeout.
    // Port 1 on loopback refuses instantly, which is the same shape.
    const out = dist();
    const run = await carry(["--origin", "http://127.0.0.1:1", "--dist", out]);
    expect(run.status, run.out).toBe(0);
    expect(carried(out)).toEqual([]);
    expect(run.out).toMatch(/could not/i);
  });

  it("reads the page the origin actually names, base path and all", async () => {
    // Without a custom domain the site is served from a subpath
    // (`https://oytunonal.github.io/permit-rulebook/`), and `SITE_URL` — which
    // is what the workflow hands this script — carries that path. Reading the
    // host root instead would read a stranger's page, or nothing.
    const base = "/permit-rulebook";
    const live = await origin({
      [`${base}/`]: { type: "text/html; charset=utf-8", body: page(CSS_NAME, base) },
      [`${base}/_astro/${CSS_NAME}`]: { type: "text/css; charset=utf-8", body: CSS },
    });
    const out = dist();
    try {
      const run = await carry(["--origin", `${live.url}${base}/`, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(live.asked).toEqual([`${base}/`, `${base}/_astro/${CSS_NAME}`]);
      expect(carried(out)).toEqual([CSS_NAME]);
    } finally { live.close(); }
  });

  it("writes nothing under --dry-run, and still names what it would carry", async () => {
    const live = await origin({
      "/": { type: "text/html; charset=utf-8", body: page([CSS_NAME, JS_NAME]) },
      [`/_astro/${CSS_NAME}`]: { type: "text/css; charset=utf-8", body: CSS },
      [`/_astro/${JS_NAME}`]: { type: "text/javascript; charset=utf-8", body: JS },
    });
    const out = dist({ [JS_NAME]: JS });
    try {
      const run = await carry(["--origin", live.url, "--dist", out, "--dry-run"]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([JS_NAME]);
      expect(run.out).toContain(CSS_NAME);
    } finally { live.close(); }
  });
});
