import { afterEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { DEFAULT_ORIGIN, carryAssets, readAssetNames } from "../scripts/carry-assets.mjs";

/**
 * s33 — the carrier that lets a cached page still find its assets.
 *
 * Why the step exists, and what its ceilings are, is written once in
 * `scripts/carry-assets.mjs`'s own header. What is asserted here is the part
 * that only a running process can show: that it fetches from our origin and
 * nowhere else, that it writes only what the host served, and that there is no
 * way to make it exit anything but 0 — the promise the deploy rests on.
 *
 * Every case that has an exit code to assert drives the real script as a child
 * process against a local stand-in for the live origin: an exit code has no
 * meaning inside a test runner. The few that assert a promise the export makes
 * rather than one the process makes — that it throws nothing, that it holds a
 * budget it is handed — call `carryAssets` directly, because that is where the
 * promise lives.
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
type Answer = {
  status?: number;
  type?: string;
  body?: Buffer;
  /** Answer a redirect instead, to this address. */
  redirectTo?: string;
  /** Write this many bytes of the body, promise more, then drop the socket. */
  dropAfter?: number;
  /** Answer only after this long — a host that has stopped answering. */
  delayMs?: number;
  /** Answer gzip-encoded, the way a CDN answers a request it decides to compress. */
  gzip?: boolean;
};

/**
 * A local stand-in for the live origin: it answers exactly what a case tells it
 * to and records every path asked for — and what it was asked to encode it as —
 * so "it fetched only what was missing", "it never fetched that at all" and
 * "it asked for the bytes it would write" are measurements rather than
 * inferences.
 */
async function origin(answers: Record<string, Answer>): Promise<{
  url: string; asked: string[]; acceptEncoding: string[]; close: () => void;
}> {
  const asked: string[] = [];
  const acceptEncoding: string[] = [];
  const timers = new Set<NodeJS.Timeout>();
  const server: Server = createServer((req, res) => {
    const path = new URL(req.url ?? "/", "http://x").pathname;
    asked.push(path);
    acceptEncoding.push(String(req.headers["accept-encoding"] ?? ""));
    const answer = answers[path];
    const send = (): void => {
      try {
        if (!answer) { res.writeHead(404, { "content-type": "text/html" }); res.end("not found"); return; }
        if (answer.redirectTo) { res.writeHead(302, { location: answer.redirectTo }); res.end(); return; }
        const body = answer.body ?? Buffer.alloc(0);
        if (answer.dropAfter !== undefined) {
          // A promise of more than arrives: the shape of a CDN edge that dies
          // mid-response, which is where the first cut exited 1.
          res.writeHead(200, { "content-type": answer.type ?? "text/css", "content-length": String(body.length + 1000) });
          res.write(body.subarray(0, answer.dropAfter));
          res.socket?.destroy();
          return;
        }
        if (answer.gzip) {
          // Node writes the compressed length as `content-length`, which is the
          // whole point of the case: the declaration describes the transfer and
          // not the file.
          res.writeHead(answer.status ?? 200, { "content-type": answer.type ?? "text/css", "content-encoding": "gzip" });
          res.end(gzipSync(body));
          return;
        }
        res.writeHead(answer.status ?? 200, { "content-type": answer.type ?? "application/octet-stream" });
        res.end(body);
      } catch { /* the client gave up first; that is the case's point */ }
    };
    if (answer?.delayMs) timers.add(setTimeout(send, answer.delayMs));
    else send();
  });
  const port = await new Promise<number>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve((server.address() as { port: number }).port));
  });
  return {
    url: `http://127.0.0.1:${port}`,
    asked,
    acceptEncoding,
    close: () => {
      for (const timer of timers) clearTimeout(timer);
      server.closeAllConnections?.();
      server.close();
    },
  };
}

/**
 * The live page, naming its assets the way Astro writes them — root-absolute,
 * under the base the site is served from.
 */
const page = (names: string | string[], base = ""): Buffer => pageOf(
  [names].flat().map((n) => `${base}/_astro/${n}`),
);

/** The live page, naming whatever a case wants it to name, verbatim. */
const pageOf = (refs: string[]): Buffer => Buffer.from(
  `<!DOCTYPE html><html><head>${refs
    .map((ref) => (ref.endsWith(".css")
      ? `<link rel="stylesheet" href="${ref}">`
      : `<script type="module" src="${ref}"></script>`))
    .join("")}</head><body></body></html>`,
  "utf8",
);

const temporary: string[] = [];

/** A fresh temp directory, swept after the case. */
function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), "permit-rulebook-carry-"));
  temporary.push(dir);
  return dir;
}

/** A `dist/` holding whatever this build already produced. */
function dist(have: Record<string, Buffer> = {}): string {
  const dir = temp();
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

/**
 * The step doing its job: reading the live page, fetching the one generation
 * this build is missing, and writing it where the deploy will find it. These
 * are the cases where something is supposed to be carried — what the host has
 * to answer for a file to be written, and what it writes when the host does.
 * The two describes below are the other half: what it refuses, and what it
 * survives.
 */
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

  it("asks the origin for the bytes it is going to write, not a transfer of them", async () => {
    // What the step writes has to be what the declaration describes, or the
    // declaration attests to nothing. Measured against the live host
    // 2026-09-23: the default request is answered `content-encoding: gzip`
    // with `content-length: 5824` while 27,533 bytes arrive — the file is
    // right and the number beside it is about something else. Asked for
    // `identity`, the same host declares 27,533 and sends 27,533.
    const live = await origin({
      "/": { type: "text/html; charset=utf-8", body: page(CSS_NAME) },
      [`/_astro/${CSS_NAME}`]: { type: "text/css; charset=utf-8", body: CSS },
    });
    const out = dist();
    try {
      const run = await carry(["--origin", live.url, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([CSS_NAME]);
      expect(live.acceptEncoding).toEqual(["identity", "identity"]);
    } finally { live.close(); }
  });

  it("carries nothing when the answer arrives encoded, whatever length it declared", async () => {
    // A `content-length` that lies low (Security review, 2026-09-23). Measured
    // the same day: undici decompresses whatever arrives even when the request
    // asked for `identity`, so an origin that answers gzip declares the
    // compressed length — 137 bytes for a 104,000-byte asset — and a stream cut
    // at that declaration decodes to a partial file with nothing on the wire to
    // contradict it (a 40-byte declaration on this asset yielded 14,192 bytes,
    // no error). An encoded answer is therefore refused rather than carried:
    // the only length this step can check is one that describes the bytes it
    // writes.
    const asset = Buffer.alloc(104_000, 0x61);
    const live = await origin({
      "/": { type: "text/html; charset=utf-8", body: page(CSS_NAME) },
      [`/_astro/${CSS_NAME}`]: { type: "text/css; charset=utf-8", body: asset, gzip: true },
    });
    const out = dist();
    try {
      const run = await carry(["--origin", live.url, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
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

  it("carries nothing when no origin is given, rather than falling back to production", async () => {
    // `--origin ""` used to fall through to the default, so a build somewhere
    // else quietly downloaded the live site's assets (Standards review). The
    // decision is which origin the run used, and the summary names it: if the
    // empty flag fell through, the live site's address would be in this output.
    const out = dist();
    const run = await carry(["--origin", "", "--dist", out]);
    expect(run.status, run.out).toBe(0);
    expect(carried(out)).toEqual([]);
    expect(run.out, "the empty origin fell through to the live site").not.toContain(DEFAULT_ORIGIN);
  });

  it("carries nothing when no build directory is given, rather than throwing", async () => {
    // `carryAssets` promises in its own words that it throws nothing and that
    // everything it could not do comes back in `problems`, while its signature
    // lets `dist` be left out — and `join(dist, …)` then threw a TypeError
    // (Standards review, 2026-09-23). The CLI always passes one; this is the
    // export's own promise, so it is asserted on the export.
    const live = await origin({ "/": { type: "text/html; charset=utf-8", body: page(CSS_NAME) } });
    try {
      const result = await carryAssets({ origin: live.url });
      expect(result.carried).toEqual([]);
      expect(result.alreadyBuilt).toEqual([]);
      expect(result.problems).toHaveLength(1);
      // It gave up before spending a request on a build it could not fill.
      expect(live.asked).toEqual([]);
    } finally { live.close(); }
  });
});

/**
 * The page is a stranger's string, and a deploy is a bad place to trust one.
 * Every case here is a reference the live HTML could name and this step must
 * refuse — by name, on one line, without a single packet to the host it names
 * (Security review, 2026-09-23: three of these reached the network).
 */
describe("the carrier fetches from our origin and nowhere else", () => {
  it("refuses a reference to another host, another scheme, or no host at all", async () => {
    const mine = "index.CCCCCCCC.css";
    const answers: Record<string, Answer> = {
      [`/_astro/${mine}`]: { type: "text/css; charset=utf-8", body: CSS },
    };
    const live = await origin(answers);
    try {
      // The page is written once the port is known, because the scheme case has
      // to name this very host and port: then only the `https:` makes it
      // foreign — the mirror of an `http://` reference on the live site, which
      // is https.
      answers["/"] = {
        type: "text/html; charset=utf-8",
        body: pageOf([
          "https://evil.example/_astro/absolute.DDDDDDDD.js",
          "//evil.example/_astro/protocol-relative.EEEEEEEE.js",
          `https://127.0.0.1:${new URL(live.url).port}/_astro/scheme.FFFFFFFF.js`,
          `/_astro/${mine}`,
        ]),
      };
      const out = dist();
      const run = await carry(["--origin", live.url, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      // Ours, and only ours. Nothing was asked of this host on behalf of the
      // three foreign references either.
      expect(live.asked).toEqual(["/", `/_astro/${mine}`]);
      expect(carried(out)).toEqual([mine]);
      for (const name of ["absolute.DDDDDDDD.js", "protocol-relative.EEEEEEEE.js", "scheme.FFFFFFFF.js"])
        expect(run.out, `${name} was not reported`).toContain(name);
    } finally { live.close(); }
  });

  it("refuses to follow a redirect off the host, rather than fetching where it points", async () => {
    // A same-origin name, so nothing above refuses it, answering a redirect to
    // a host we can watch — and that host serves a perfectly good stylesheet,
    // so the only reason it goes uncarried is that the redirect was refused.
    const moved = "index.GGGGGGGG.css";
    const elsewhere = await origin({ "/pwn.css": { type: "text/css; charset=utf-8", body: CSS } });
    const live = await origin({
      "/": { type: "text/html; charset=utf-8", body: page(moved) },
      [`/_astro/${moved}`]: { redirectTo: `${elsewhere.url}/pwn.css` },
    });
    const out = dist();
    try {
      const run = await carry(["--origin", live.url, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(elsewhere.asked, "the carrier followed the redirect off the host").toEqual([]);
      expect(carried(out)).toEqual([]);
      expect(run.out).toContain(moved);
    } finally { live.close(); elsewhere.close(); }
  });

  it("keeps only the names under our own origin, and hands back every reference it refused", () => {
    // The parsing rule itself, where the three foreign shapes can be read one
    // beside the other. What the process does with them is the case above.
    const refs = [
      "https://evil.example/_astro/absolute.js",
      // A protocol-relative reference inherits the page's scheme, so only the
      // host makes this one foreign — and the host is enough.
      "//evil.example/_astro/protocol-relative.js",
      // Same host, plaintext: the scheme is part of the origin, and an https
      // site whose page names an http asset is a page to distrust.
      "http://example.test/_astro/plaintext.js",
      "/_astro/index.HHHHHHHH.css",
    ];
    const { names, refused } = readAssetNames(pageOf(refs).toString("utf8"), "https://example.test/");
    expect(names).toEqual(["index.HHHHHHHH.css"]);
    // Refused by name: every reference that did not become a name is handed
    // back, so the caller can print it and nothing is dropped in silence.
    expect(refused.map((r) => r.ref)).toEqual(refs.slice(0, 3));
  });

  it("refuses four hundred foreign references without a packet or four hundred lines", async () => {
    // The other half of the ceiling: a reference that never becomes a name
    // costs no request, but it used to cost a line, and a page is a stranger's
    // string. Neither the network nor the log is the page's to fill.
    const live = await origin({
      "/": {
        type: "text/html; charset=utf-8",
        body: pageOf(Array.from({ length: 400 }, (_, i) => `https://evil.example/_astro/pwn.${i}.js`)),
      },
    });
    const out = dist();
    try {
      const run = await carry(["--origin", live.url, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(live.asked).toEqual(["/"]);
      expect(carried(out)).toEqual([]);
      const lines = run.out.trim().split("\n");
      expect(lines.length, run.out).toBeLessThanOrEqual(25);
    } finally { live.close(); }
  });

  it("refuses a name longer than the filesystem would take, without fetching it", async () => {
    // 300 characters made `writeFileSync` throw ENAMETOOLONG and the process
    // exit 1 — a page could kill the deploy with an attribute (Spec review).
    const long = `${"a".repeat(300)}.css`;
    const live = await origin({ "/": { type: "text/html; charset=utf-8", body: page(long) } });
    const out = dist();
    try {
      const run = await carry(["--origin", live.url, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      // Refused before the request: the page was read and nothing else was.
      expect(live.asked).toEqual(["/"]);
      expect(carried(out)).toEqual([]);
    } finally { live.close(); }
  });
});

/**
 * What one origin may cost this build. Each ceiling is a case, and each case
 * ends the same way: exit 0, nothing written that should not be, and a line
 * naming what was left behind.
 */
describe("the carrier cannot fail the deploy", () => {
  it("survives a body that stops halfway", async () => {
    const live = await origin({
      "/": { type: "text/html; charset=utf-8", body: page(CSS_NAME) },
      [`/_astro/${CSS_NAME}`]: { type: "text/css; charset=utf-8", body: CSS, dropAfter: 4 },
    });
    const out = dist();
    try {
      const run = await carry(["--origin", live.url, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      // Not a truncated stylesheet on disk: nothing at all.
      expect(carried(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
    } finally { live.close(); }
  });

  it("survives a dist it cannot write into", async () => {
    const live = await origin({
      "/": { type: "text/html; charset=utf-8", body: page(CSS_NAME) },
      [`/_astro/${CSS_NAME}`]: { type: "text/css; charset=utf-8", body: CSS },
    });
    // `_astro` as a FILE: portable across platforms, where a permission bit is
    // not — Windows lets a process write into its own read-only directory.
    const out = temp();
    writeFileSync(join(out, "_astro"), "not a directory");
    try {
      const run = await carry(["--origin", live.url, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(statSync(join(out, "_astro")).isFile(), "the carrier replaced the path it could not write").toBe(true);
      expect(readFileSync(join(out, "_astro"), "utf8"), "the carrier wrote over the path").toBe("not a directory");
      // And it left nothing else behind in the build it could not fill.
      expect(readdirSync(out)).toEqual(["_astro"]);
      expect(run.out).toContain(CSS_NAME);
    } finally { live.close(); }
  });

  it("survives a body larger than the ceiling, without holding it in memory to find out", async () => {
    // Chunked, so there is no content-length to refuse it by: the ceiling has
    // to hold while the bytes are arriving.
    const live = await origin({
      "/": { type: "text/html; charset=utf-8", body: page(CSS_NAME) },
      [`/_astro/${CSS_NAME}`]: { type: "text/css; charset=utf-8", body: Buffer.alloc(5 * 1024 * 1024, 0x61) },
    });
    const out = dist();
    try {
      const run = await carry(["--origin", live.url, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
    } finally { live.close(); }
  });

  /**
   * Four hundred references, because the ceiling used to count what was
   * carried rather than what was asked for: 400 that all answered cost 21
   * requests, and 400 that all 404'd cost 401 requests, 401 printed lines and
   * 6.1 seconds — a tampered page turned into a request generator against our
   * own origin and an unbounded Actions log (Security review, 2026-09-23).
   * What a page can make this step do is measured in requests, so both shapes
   * are measured the same way.
   */
  const manyNames = Array.from({ length: 400 }, (_, i) => `index.${String(i).padStart(8, "0")}.css`);

  it("asks for twenty assets at most, however many the page names", async () => {
    const answers: Record<string, Answer> = {
      "/": { type: "text/html; charset=utf-8", body: page(manyNames) },
    };
    for (const name of manyNames) answers[`/_astro/${name}`] = { type: "text/css; charset=utf-8", body: CSS };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(["--origin", live.url, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      // The page, then twenty assets, and not a packet more.
      expect(live.asked).toHaveLength(21);
      expect(carried(out)).toHaveLength(20);
    } finally { live.close(); }
  });

  it("asks for twenty at most when every one of them 404s, and prints a bounded list", async () => {
    const live = await origin({ "/": { type: "text/html; charset=utf-8", body: page(manyNames) } });
    const out = dist();
    try {
      const run = await carry(["--origin", live.url, "--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(live.asked).toHaveLength(21);
      expect(carried(out)).toEqual([]);
      // One line per request it spent, one for the rest, one summary — not one
      // line per reference a stranger's page happened to name.
      const lines = run.out.trim().split("\n");
      expect(lines.length, run.out).toBeLessThanOrEqual(25);
    } finally { live.close(); }
  });

  it("gives up when the run's time budget is spent, without waiting out a silent host", async () => {
    // The budget is a ceiling the scenario sets, not a knob: there is no
    // `--budget-ms`, so no edit to `pages.yml` can shrink it to 1 and turn the
    // step into a silent no-op (Spec review, 2026-09-23). It is the exported
    // function that takes it, and the exported function this case drives.
    const live = await origin({
      "/": { type: "text/html; charset=utf-8", body: page(CSS_NAME) },
      [`/_astro/${CSS_NAME}`]: { type: "text/css; charset=utf-8", body: CSS, delayMs: 5_000 },
    });
    const out = dist();
    try {
      const began = Date.now();
      const result = await carryAssets({ origin: live.url, dist: out, budgetMs: 500 });
      const took = Date.now() - began;
      expect(result.carried).toEqual([]);
      expect(carried(out)).toEqual([]);
      expect(result.problems).toHaveLength(1);
      // It gave up on its own clock rather than the host's.
      expect(took, `the run took ${took} ms`).toBeLessThan(4_000);
    } finally { live.close(); }
  });
});
