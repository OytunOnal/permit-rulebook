import { afterEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { carryAssets, readAssetNames, writeAssetDigests } from "../scripts/carry-assets.mjs";

/**
 * s33 — the carrier that lets a cached page still find its assets.
 *
 * Why the step exists, and what its ceilings are, is written once in
 * `scripts/carry-assets.mjs`'s own header. What is asserted here is the part
 * that only a running process can show: that it fetches from our origin and
 * nowhere else, that it writes only bytes our own previous build attested to,
 * and that there is no way to make it exit anything but 0 — the promise the
 * deploy rests on.
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

/**
 * The digest list a build publishes for the next deploy to check bytes against
 * (s33, review round 3). Its name and its two lines are spelled out here rather
 * than imported: it is a PUBLISHED file format, read by a deploy that ran days
 * before the code reading it, so a change to its shape has to go red here and
 * be made deliberately.
 */
const DIGESTS = "asset-digests.txt";
const HEADER = "permit-rulebook asset digests v1";
const listOf = (assets: Record<string, Buffer>): Buffer => Buffer.from(
  [HEADER, ...Object.entries(assets).map(([name, bytes]) => `${sha256(bytes)}  ${name}`), ""].join("\n"),
  "utf8",
);

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
  /**
   * Frame the answer by hand — exactly these headers, exactly these bytes, then
   * close. `res.writeHead` will not send a wrong `content-length` or leave one
   * out, and those are the shapes an origin uses to make HTTP attest to a file
   * it is not sending (Security review, 2026-09-23).
   */
  raw?: { headers: string[]; body: Buffer };
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
        if (answer.raw) {
          // Straight onto the socket: this is the one answer Node must not
          // frame for us. `connection: close` so a body with no declared
          // length ends where the socket does.
          const head = `HTTP/1.1 ${answer.status ?? 200} OK\r\n${[...answer.raw.headers, "connection: close"].join("\r\n")}\r\n\r\n`;
          res.socket?.write(head);
          // `end(body)` rather than a write and an end: a body past the socket
          // buffer is still queued when the FIN goes out, and the server drops
          // what it has not flushed — which reads as a client timeout and has
          // nothing to do with the case.
          res.socket?.end(answer.raw.body);
          return;
        }
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

/**
 * A whole live deploy: the page naming these assets, the digest list the build
 * that published that page wrote beside it, and the assets themselves. The
 * three travel together because on the live host they were published together
 * — a case that wants them to disagree says so by hand.
 */
function deploy(assets: Record<string, Buffer>, base = ""): Record<string, Answer> {
  const answers: Record<string, Answer> = {
    [`${base}/`]: { type: "text/html; charset=utf-8", body: page(Object.keys(assets), base) },
    [`${base}/${DIGESTS}`]: { type: "text/plain; charset=utf-8", body: listOf(assets) },
  };
  for (const [name, bytes] of Object.entries(assets))
    answers[`${base}/_astro/${name}`] = { type: name.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", body: bytes };
  return answers;
}

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
 * The script, run the way the workflow runs it: the origin through the
 * environment, and the command line for what only a test or a terminal passes.
 * Its exit code is an assertion.
 *
 * The origin is a parameter of its own and not part of `args`, because that is
 * the shape of the step: `pages.yml` sets `CARRY_ORIGIN` and passes no argv at
 * all. A repository variable that reached `argv` became a flag — `SITE_URL`
 * set to `--dry-run` made the step publish no digest list and stay green
 * (Security review, round 4) — so no case here may spell an origin on the
 * command line, and the one that tries is a case of its own.
 *
 * Asynchronously, and that is not a style choice: the stand-in origin above
 * listens on this very process, so a synchronous child would block the event
 * loop that has to answer it, and every case would read as a timeout.
 */
function carry(origin: string, args: string[] = []): Promise<{ status: number; out: string }> {
  return new Promise((resolve) => {
    const env = { ...process.env, CARRY_ORIGIN: origin };
    execFile(process.execPath, [carrier, ...args], { encoding: "utf8", env }, (error, stdout, stderr) => {
      const status = error ? ((error as { code?: number }).code ?? 1) : 0;
      resolve({ status, out: `${stdout}${stderr}` });
    });
  });
}

const carried = (dir: string): string[] => readdirSync(join(dir, "_astro")).sort();
const lastLine = (out: string): string => out.trim().split("\n").at(-1) ?? "";

afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/**
 * The step doing its job: which page it reads, which files it asks for, what it
 * writes when the host answers well — and, because most of what this step does
 * is decline to write, the refusals that turn on one asset's own answer or on
 * the run having nowhere to read from. They are the majority of the cases
 * below, which is the shape of the step and not an accident of this file.
 *
 * The three describes after this one take an axis each: what makes a carried
 * byte trustworthy at all, the one origin this may read, and what an origin
 * cannot make this step do to the deploy.
 */
describe("the carrier takes the live generation forward", () => {
  it("fetches only the assets this build does not already have", async () => {
    const live = await origin(deploy({ [CSS_NAME]: CSS, [JS_NAME]: JS }));
    const out = dist({ [JS_NAME]: JS });
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      // The page, the digest list, then the one missing file — and never the
      // one this build already has.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${CSS_NAME}`]);
      expect(carried(out)).toEqual([CSS_NAME, JS_NAME].sort());
    } finally { live.close(); }
  });

  it("writes the bytes the live host served, and says the name, the size and the digest", async () => {
    const live = await origin(deploy({ [CSS_NAME]: CSS }));
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      // Byte-identical: not re-encoded, not re-indented, not minified.
      expect(readFileSync(join(out, "_astro", CSS_NAME)).equals(CSS)).toBe(true);
      expect(run.out).toContain(CSS_NAME);
      expect(run.out).toContain(String(CSS.length));
      expect(run.out).toContain(sha256(CSS));
    } finally { live.close(); }
  });

  it("asks the origin for the bytes it is going to write, not a transfer of them", async () => {
    // What the live host answers each way, and why that matters, is the
    // reading in `scripts/carry-assets.mjs`'s header. This is no longer what
    // makes a carried byte trustworthy — the digest list is — but it is still
    // what makes the file on disk the file rather than an archive of it.
    const live = await origin(deploy({ [CSS_NAME]: CSS }));
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([CSS_NAME]);
      expect(live.acceptEncoding).toEqual(["identity", "identity", "identity"]);
    } finally { live.close(); }
  });

  it("carries nothing when the answer arrives encoded, whatever length it declared", async () => {
    // The refusal the header's `identity` reading argues for, on the asset it
    // was measured with.
    const asset = Buffer.alloc(104_000, 0x61);
    const answers = deploy({ [CSS_NAME]: asset });
    answers[`/_astro/${CSS_NAME}`] = { type: "text/css; charset=utf-8", body: asset, gzip: true };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
    } finally { live.close(); }
  });

  it("carries nothing and says so when the live host answers 404", async () => {
    const answers = deploy({ [CSS_NAME]: CSS });
    answers[`/_astro/${CSS_NAME}`] = { status: 404, type: "text/html; charset=utf-8", body: Buffer.from("gone") };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
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
    const answers = deploy({ [CSS_NAME]: CSS });
    answers[`/_astro/${CSS_NAME}`] = { type: "text/html; charset=utf-8", body: Buffer.from("<html>404</html>") };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
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
    const run = await carry("http://127.0.0.1:1", ["--dist", out]);
    expect(run.status, run.out).toBe(0);
    expect(carried(out)).toEqual([]);
    expect(run.out).toMatch(/could not/i);
  });

  it("reads the page the origin actually names, base path and all", async () => {
    // Without a custom domain the site is served from a subpath
    // (`https://oytunonal.github.io/permit-rulebook/`), and `SITE_URL` — which
    // is what the workflow hands this script — carries that path. Reading the
    // host root instead would read a stranger's page, or nothing; and the
    // digest list is published under that same base, beside the page.
    const base = "/permit-rulebook";
    const live = await origin(deploy({ [CSS_NAME]: CSS }, base));
    const out = dist();
    try {
      const run = await carry(`${live.url}${base}/`, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(live.asked).toEqual([`${base}/`, `${base}/${DIGESTS}`, `${base}/_astro/${CSS_NAME}`]);
      expect(carried(out)).toEqual([CSS_NAME]);
    } finally { live.close(); }
  });

  it("writes nothing under --dry-run, and still names what it would carry", async () => {
    const live = await origin(deploy({ [CSS_NAME]: CSS, [JS_NAME]: JS }));
    const out = dist({ [JS_NAME]: JS });
    try {
      const run = await carry(live.url, ["--dist", out, "--dry-run"]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([JS_NAME]);
      expect(readdirSync(out)).toEqual(["_astro"]);
      expect(run.out).toContain(CSS_NAME);
    } finally { live.close(); }
  });

  it("carries nothing when no origin is given, rather than falling back to production", async () => {
    // An empty origin used to fall through to a hard-coded production address,
    // so a build somewhere else quietly downloaded production's assets
    // (Standards review). There is no such fallback now — an origin the step
    // was not given is an origin it does not have. The decision is measured
    // where every other origin case measures it: nothing was asked of this
    // host, and nothing arrived in this build, which is where the live site's
    // stylesheet would be if the empty value had fallen through to it.
    const live = await origin(deploy({ [CSS_NAME]: CSS }));
    const out = dist();
    try {
      const run = await carry("", ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(live.asked).toEqual([]);
      expect(carried(out)).toEqual([]);
    } finally { live.close(); }
  });

  it("takes the origin from the environment, and nothing on the command line can move it", async () => {
    // The step passes no argv, and this is why. `pages.yml` used to splice a
    // repository variable into the command line — `node scripts/carry-assets.mjs
    // --origin "$SITE_URL"` — and the flag reader took any `--name value`, so
    // whoever could set that one variable could hand the script a flag instead
    // of an address (Security review, round 4). The variable is a value now,
    // read from the environment, and a command line that spells an origin is
    // inert: this case hands it one, pointing at a host that would answer, and
    // measures that not a packet reached it.
    const live = await origin(deploy({ [CSS_NAME]: CSS }));
    const decoy = await origin(deploy({ "index.DECOYAAA.css": CSS }));
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out, "--origin", decoy.url]);
      expect(run.status, run.out).toBe(0);
      expect(decoy.asked, "the command line moved the origin").toEqual([]);
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${CSS_NAME}`]);
      expect(carried(out)).toEqual([CSS_NAME]);
    } finally { live.close(); decoy.close(); }
  });

  it("refuses an origin that is not a web address, and still publishes this build's digest list", async () => {
    // The two values that disarmed the whole mechanism while the deploy stayed
    // green (Security review, round 4), measured on the real process with the
    // step's own argv: `--dry-run` made the step write no list at all, and
    // `--dist=<somewhere else>` put the list in that directory while the real
    // `dist/` shipped without one. Either way every LATER deploy has nothing to
    // check bytes against, so the window s33 closes is open again — green, from
    // a value no code review sees.
    //
    // So the list is the assertion. Whatever the origin turns out to be, the
    // build this step was pointed at leaves with the list the next deploy
    // reads, and the directory nobody named stays empty.
    for (const value of ["--dry-run", "--dist=", "//permitrulebook.com/", "ftp://permitrulebook.com/", "not a url"]) {
      const elsewhere = dist();
      const out = dist();
      const run = await carry(value === "--dist=" ? `--dist=${elsewhere}` : value, ["--dist", out]);
      expect(run.status, `${value}: ${run.out}`).toBe(0);
      expect(readdirSync(out).sort(), `${value}: ${run.out}`).toEqual([DIGESTS, "_astro"].sort());
      expect(readdirSync(elsewhere), `${value}: the list landed somewhere nobody named`).toEqual(["_astro"]);
      expect(carried(out), `${value}: ${run.out}`).toEqual([]);
    }
  });

  it("carries nothing when no build directory is given, rather than throwing", async () => {
    // `carryAssets` promises in its own words that it throws nothing and that
    // everything it could not do comes back in `problems`, while its signature
    // lets `dist` be left out — and `join(dist, …)` then threw a TypeError
    // (Standards review, 2026-09-23). The CLI always passes one; this is the
    // export's own promise, so it is asserted on the export.
    const live = await origin(deploy({ [CSS_NAME]: CSS }));
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
 * The authority for a carried byte: the digest list, and what it is and is not
 * worth. That reading is written once, in `scripts/carry-assets.mjs`'s header
 * under "What makes a carried byte trustworthy", and it is not repeated here
 * — the measurements that argue for each case are in the case.
 *
 * What these assert is the part only a running process can show: which bodies
 * are written, which are refused, and how few requests a refusal costs.
 */
describe("the carrier carries only what our own previous build attested to", () => {
  it("publishes the digest list this build's assets will be checked against", () => {
    const out = dist({ [CSS_NAME]: CSS, [JS_NAME]: JS });
    const result = writeAssetDigests(out);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(readFileSync(join(out, DIGESTS), "utf8")).toBe(
      `${HEADER}\n${sha256(CSS)}  ${CSS_NAME}\n${sha256(JS)}  ${JS_NAME}\n`,
    );
  });

  it("publishes it as part of the step, before it carries anything into the build", async () => {
    // The list describes what this build BUILT, so it is written before a
    // carried file lands in `_astro/` — and it is published whether or not
    // anything is carried, because the next deploy's whole check is this file.
    const live = await origin(deploy({ [CSS_NAME]: CSS }));
    const out = dist({ [JS_NAME]: JS });
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([CSS_NAME, JS_NAME].sort());
      // This build's own asset, and not the one it carried a moment later.
      expect(readFileSync(join(out, DIGESTS), "utf8")).toBe(`${HEADER}\n${sha256(JS)}  ${JS_NAME}\n`);
    } finally { live.close(); }
  });

  it("carries nothing when the live deploy published no digest list", async () => {
    // The first deploy after this slice merges is exactly this case: there is
    // no list live yet, so it carries nothing that once and publishes the list
    // the deploy after it will read (s33, review round 3).
    const answers = deploy({ [CSS_NAME]: CSS });
    delete answers[`/${DIGESTS}`];
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([]);
      // It asked for the list and stopped there: not one asset was fetched.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`]);
      expect(run.out).toContain(DIGESTS);
    } finally { live.close(); }
  });

  it("carries nothing when the digest list does not parse", async () => {
    // A list cut mid-line — a proxy that truncated it, a half-written file.
    const answers = deploy({ [CSS_NAME]: CSS });
    answers[`/${DIGESTS}`] = { type: "text/plain; charset=utf-8", body: listOf({ [CSS_NAME]: CSS }).subarray(0, HEADER.length + 20) };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([]);
      expect(live.asked).toEqual(["/", `/${DIGESTS}`]);
      expect(run.out).toContain(DIGESTS);
    } finally { live.close(); }
  });

  it("refuses the whole run when the list describes none of the names the page needs", async () => {
    // A proxy holding one and not the other, or a deploy that landed between
    // the two fetches: the page names a generation the list does not describe
    // at all, so there is nothing here this step can check any byte against.
    // The measurement is the decision, not the wording: it spent no request on
    // an asset, and it named what it could not check.
    const answers = deploy({ [CSS_NAME]: CSS });
    answers[`/${DIGESTS}`] = { type: "text/plain; charset=utf-8", body: listOf({ "index.ZZZZZZZZ.css": CSS }) };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([]);
      expect(live.asked).toEqual(["/", `/${DIGESTS}`]);
      expect(run.out).toContain(CSS_NAME);
    } finally { live.close(); }
  });

  it("leaves behind only the name the list lacks, and carries the ones it attests to", async () => {
    // One stray reference used to turn the whole slice off: a page reference
    // `/_astro/../../pwn.css` normalises to `pwn.css`, which no list of ours
    // carries, and BOTH real assets were left behind — the window s33 exists
    // to close, held open by one attribute in a page this step does not own
    // (Security review, round 4).
    //
    // The two cases the code used to merge are different questions. A name the
    // list lacks is that name not carried. NONE of the needed names being in
    // the list is the page and the list coming from different deploys, which
    // is the case above. So this one measures the split: the two attested
    // names are fetched and written, the third is never requested, and the
    // line that names it is not the line that refuses a run.
    const answers = deploy({ [CSS_NAME]: CSS, [JS_NAME]: JS });
    answers["/"] = {
      type: "text/html; charset=utf-8",
      body: pageOf([`/_astro/${CSS_NAME}`, `/_astro/${JS_NAME}`, "/_astro/../../pwn.css"]),
    };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([CSS_NAME, JS_NAME].sort());
      // `pwn.css` cost no request: it is named in a line, not fetched.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${CSS_NAME}`, `/_astro/${JS_NAME}`]);
      expect(run.out).toContain("pwn.css");
    } finally { live.close(); }
  });

  it("holds the list to the same rule for a name as the carrier does", async () => {
    // One rule, spelled once. It used to be spelled twice — the carrier's
    // `PLAIN_NAME` and the list's line pattern — and the two diverged: a list
    // line naming `..` parsed while `readAssetNames` refused the same string
    // (Standards review, round 4). Inert then, because a list name never
    // reached `join`; a claim the code did not hold either way.
    //
    // Measured from both ends of the same name: the page's reader refuses it,
    // and so does the list's, which fails the list whole.
    expect(readAssetNames(pageOf(["/_astro/.."]).toString("utf8"), "https://example.test/").names).toEqual([]);
    const answers = deploy({ [CSS_NAME]: CSS });
    answers[`/${DIGESTS}`] = {
      type: "text/plain; charset=utf-8",
      body: Buffer.from(`${HEADER}\n${sha256(CSS)}  ..\n${sha256(CSS)}  ${CSS_NAME}\n`, "utf8"),
    };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([]);
      // The list failed to parse, so not one asset was asked for.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`]);
      expect(run.out).toContain(DIGESTS);
    } finally { live.close(); }
  });

  it("carries a hand-framed answer that is whole, so the refusals below are about the bytes", async () => {
    // The control for the four cases after it: the same raw socket, the same
    // hand-written headers, a body that IS the file — carried. Whatever those
    // four refuse, it is not the framing.
    const asset = Buffer.alloc(104_000, 0x61);
    const answers = deploy({ [CSS_NAME]: asset });
    answers[`/_astro/${CSS_NAME}`] = {
      raw: { headers: ["content-type: text/css", `content-length: ${asset.length}`], body: asset },
    };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([CSS_NAME]);
      expect(readFileSync(join(out, "_astro", CSS_NAME)).equals(asset)).toBe(true);
    } finally { live.close(); }
  });

  it("refuses a body the digest list does not describe, when nothing declares a length", async () => {
    // The hole this round closed: with no `content-length` there was no length
    // to check, so 5,000 bytes of a 104,000-byte stylesheet were written under
    // the previous generation's exact name and reported carried (Security
    // review, 2026-09-23).
    const asset = Buffer.alloc(104_000, 0x61);
    const answers = deploy({ [CSS_NAME]: asset });
    answers[`/_astro/${CSS_NAME}`] = { raw: { headers: ["content-type: text/css"], body: asset.subarray(0, 5_000) } };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
    } finally { live.close(); }
  });

  it("refuses a body whose declared length lies low", async () => {
    // undici stops reading at the declaration, so the old check — that the
    // bytes counted are the bytes declared — was true of a file that was 5,000
    // bytes of 104,000 (Security review, 2026-09-23).
    const asset = Buffer.alloc(104_000, 0x61);
    const answers = deploy({ [CSS_NAME]: asset });
    answers[`/_astro/${CSS_NAME}`] = { raw: { headers: ["content-type: text/css", "content-length: 5000"], body: asset } };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
    } finally { live.close(); }
  });

  it("refuses an empty body even when the list attests to exactly those nought bytes", async () => {
    // `content-length: 0` used to agree with itself and be written: a 0-byte
    // file published under the previous generation's name, which answers 200
    // with nothing — worse than the 404 this slice exists to fix, and silent.
    //
    // The digest is what refuses a wrong body, so the way to measure that the
    // empty one is refused for being EMPTY is to take the digest out of the
    // argument: the list here names sha256 of nothing, the body is nothing,
    // and the two agree. Everything else about this answer is in order. It is
    // still not written.
    const empty = Buffer.alloc(0);
    const answers = deploy({ [CSS_NAME]: CSS });
    answers[`/${DIGESTS}`] = { type: "text/plain; charset=utf-8", body: listOf({ [CSS_NAME]: empty }) };
    answers[`/_astro/${CSS_NAME}`] = { raw: { headers: ["content-type: text/css", "content-length: 0"], body: empty } };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      // It went all the way to the asset and came back with nothing written.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${CSS_NAME}`]);
      expect(carried(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
    } finally { live.close(); }
  });

  it("refuses gzip bytes that call themselves identity", async () => {
    // The header says what the origin chose to say; the bytes are gzip. Nothing
    // in the exchange can tell them apart — the digest can.
    const answers = deploy({ [CSS_NAME]: CSS });
    answers[`/_astro/${CSS_NAME}`] = {
      raw: { headers: ["content-type: text/css", "content-encoding: identity"], body: gzipSync(CSS) },
    };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
    } finally { live.close(); }
  });

  it("says it carried nothing in different words from having nothing to carry", async () => {
    // Refusing everything and having no work to do used to print the same last
    // line, and nothing in this repository reads this step's output: a proxy
    // change in front of Pages would reopen the cached-page window silently,
    // and the first evidence would be a reader's unstyled page (Security
    // review, round 3). Still exit 0 either way — it never fails the deploy.
    const refusing = deploy({ [CSS_NAME]: CSS });
    refusing[`/_astro/${CSS_NAME}`] = { status: 500, type: "text/html", body: Buffer.from("no") };
    const bad = await origin(refusing);
    const idle = await origin(deploy({ [CSS_NAME]: CSS }));
    const nothingCarried = dist();
    const nothingToCarry = dist({ [CSS_NAME]: CSS });
    try {
      const alarm = await carry(bad.url, ["--dist", nothingCarried]);
      const quiet = await carry(idle.url, ["--dist", nothingToCarry]);
      expect(alarm.status, alarm.out).toBe(0);
      expect(quiet.status, quiet.out).toBe(0);
      expect(carried(nothingCarried)).toEqual([]);
      expect(lastLine(alarm.out), alarm.out).not.toBe(lastLine(quiet.out));
      // And the loud one names what the reader is going to ask for and not get.
      expect(lastLine(alarm.out)).toContain(CSS_NAME);
    } finally { bad.close(); idle.close(); }
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
    const answers = deploy({ [mine]: CSS });
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
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      // Ours, and only ours. Nothing was asked of this host on behalf of the
      // three foreign references either.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${mine}`]);
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
    const answers = deploy({ [moved]: CSS });
    answers[`/_astro/${moved}`] = { redirectTo: `${elsewhere.url}/pwn.css` };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
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
      const run = await carry(live.url, ["--dist", out]);
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
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      // Refused before the request: the page was read and nothing else was.
      expect(live.asked).toEqual(["/"]);
      expect(carried(out)).toEqual([]);
    } finally { live.close(); }
  });
});

/**
 * What an origin cannot make this step do to the deploy. Two kinds of case,
 * and both end the same way: exit 0, nothing written that should not be, and a
 * line naming what was left behind.
 *
 * The failures it survives — a body that stops halfway, a `dist/` it cannot
 * write into — and the ceilings that bound what a page may cost: how long the
 * parse takes, how large a page may be, how large an asset may be, how many
 * requests a page may spend, and how long the whole run may last.
 */
describe("the carrier cannot fail the deploy", () => {
  it("survives a body that stops halfway", async () => {
    const answers = deploy({ [CSS_NAME]: CSS });
    answers[`/_astro/${CSS_NAME}`] = { type: "text/css; charset=utf-8", body: CSS, dropAfter: 4 };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      // Not a truncated stylesheet on disk: nothing at all.
      expect(carried(out)).toEqual([]);
      expect(run.out).toContain(CSS_NAME);
    } finally { live.close(); }
  });

  it("survives a dist it cannot write into", async () => {
    const live = await origin(deploy({ [CSS_NAME]: CSS }));
    // `_astro` as a FILE: portable across platforms, where a permission bit is
    // not — Windows lets a process write into its own read-only directory.
    const out = temp();
    writeFileSync(join(out, "_astro"), "not a directory");
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(statSync(join(out, "_astro")).isFile(), "the carrier replaced the path it could not write").toBe(true);
      expect(readFileSync(join(out, "_astro"), "utf8"), "the carrier wrote over the path").toBe("not a directory");
      // And it left nothing else behind in the build it could not fill — not
      // even the digest list, which it could not honestly write either: the
      // assets it would describe are behind the same unreadable path.
      expect(readdirSync(out)).toEqual(["_astro"]);
      expect(run.out).toContain(DIGESTS);
      expect(run.out).toContain(CSS_NAME);
    } finally { live.close(); }
  });

  /**
   * A page of distinct `/_astro/` references, about `bytes` long. Distinct,
   * because the cost this measures is per NAME kept, not per byte scanned.
   */
  const pageOfSize = (bytes: number): string => {
    const refs: string[] = [];
    for (let i = 0, n = 0; n < bytes; i += 1) {
      refs.push(`/_astro/index.${String(i).padStart(8, "0")}.css`);
      n += refs.at(-1)!.length + 30;
    }
    return pageOf(refs).toString("utf8");
  };

  it("reads a page at its ceiling in time that grows with the page, not with its square", () => {
    // `readAssetNames` kept its names in an array and asked `includes` before
    // each push, so a page with many distinct names cost the square of their
    // number — and none of it was interruptible, because the budget only sizes
    // request timeouts and this loop runs after the body is read. A 1 MB page
    // cost 76.1 s inside a 5,000 ms budget and reported no problem at all, and
    // the 4 MB ceiling a page then had was about twenty minutes of CPU in a
    // deploy job that, with `cancel-in-progress: false`, queues the next
    // deploy behind it (Security review, round 4). Why that is so, and what
    // the ceilings are now, is the script header's "What a page may cost this
    // build".
    //
    // So this measures the SHAPE, not a speed. Four times the page is about
    // four times the work when the cost is linear and sixteen times when it is
    // quadratic. Measured on these two exact pages, 2026-09-23: 96 ms and
    // 1,684 ms before the repair, 4 ms and 17 ms after. The
    // hundred-millisecond floor is there so that timer noise cannot decide a
    // case about a shape — it did not carry this one, which failed at 1,684 ms
    // against a bound of 768 ms when the quadratic was put back to check that
    // it could.
    const quarter = pageOfSize(128 * 1024);
    const whole = pageOfSize(512 * 1024);
    const took = (html: string): { ms: number; names: number } => {
      const began = Date.now();
      const { names } = readAssetNames(html, "https://example.test/");
      return { ms: Date.now() - began, names: names.length };
    };
    took(quarter); // warm, so the first run's compilation is not the measurement
    const small = took(quarter).ms;
    const large = took(whole);
    // The cost is per distinct name kept, so this is only measuring a shape if
    // the page holds thousands of them.
    expect(large.names, `a ${whole.length}-byte page held ${large.names} names`).toBeGreaterThan(9_000);
    expect(large.ms, `${whole.length} bytes took ${large.ms} ms; ${quarter.length} bytes took ${small} ms`)
      .toBeLessThan(Math.max(small * 8, 100));
  });

  it("refuses a page over the ceiling, so the reading above is the worst case there is", async () => {
    // The ceiling on the page is the ceiling on that parse, and it was 4 MB —
    // a number chosen for an asset and applied to a page, which is how seven
    // minutes of parsing became reachable. A page is an index.html: today's is
    // 11,569 bytes.
    const live = await origin({ "/": { type: "text/html; charset=utf-8", body: Buffer.from(pageOfSize(1024 * 1024), "utf8") } });
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      // Read and refused: the list was never even asked for.
      expect(live.asked).toEqual(["/"]);
      expect(carried(out)).toEqual([]);
    } finally { live.close(); }
  });

  it("survives a body larger than the ceiling, without holding it in memory to find out", async () => {
    // Chunked, so there is no content-length to refuse it by: the ceiling has
    // to hold while the bytes are arriving.
    const big = Buffer.alloc(5 * 1024 * 1024, 0x61);
    const answers = deploy({ [CSS_NAME]: big });
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
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
   *
   * The counts moved by one in review round 3: a run now asks for the page,
   * the digest list, and then at most twenty assets.
   */
  const manyNames = Array.from({ length: 400 }, (_, i) => `index.${String(i).padStart(8, "0")}.css`);
  const many = Object.fromEntries(manyNames.map((name) => [name, CSS]));

  it("asks for twenty assets at most, however many the page names", async () => {
    const live = await origin(deploy(many));
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      // The page, the list, then twenty assets, and not a packet more.
      expect(live.asked).toHaveLength(22);
      expect(carried(out)).toHaveLength(20);
    } finally { live.close(); }
  });

  it("asks for twenty at most when every one of them 404s, and prints a bounded list", async () => {
    const answers = deploy(many);
    for (const name of manyNames) delete answers[`/_astro/${name}`];
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(live.asked).toHaveLength(22);
      expect(carried(out)).toEqual([]);
      // One line per request it spent, one for the rest, one summary — not one
      // line per reference a stranger's page happened to name.
      const lines = run.out.trim().split("\n");
      expect(lines.length, run.out).toBeLessThanOrEqual(25);
    } finally { live.close(); }
  });

  it("gives up when the run's time budget is spent, without waiting out a silent host", async () => {
    // The budget is a ceiling the scenario sets, not a knob: there is no
    // `--budget-ms`, and since round 4 the deploy passes no argv at all, so
    // nothing reachable from `pages.yml` can shrink it to 1 and turn the step
    // into a silent no-op (Spec review, 2026-09-23). It is the exported
    // function that takes it, and the exported function this case drives.
    //
    // What it bounds is waiting on the network, which is what this case
    // measures: a host that has stopped answering. It does not bound the
    // step's own work — the ceiling on that is the ceiling on the page, three
    // cases above.
    const answers = deploy({ [CSS_NAME]: CSS });
    answers[`/_astro/${CSS_NAME}`] = { type: "text/css; charset=utf-8", body: CSS, delayMs: 5_000 };
    const live = await origin(answers);
    const out = dist();
    try {
      const began = Date.now();
      const result = await carryAssets({ origin: live.url, dist: out, budgetMs: 500 });
      const took = Date.now() - began;
      expect(result.carried).toEqual([]);
      expect(carried(out)).toEqual([]);
      // Point 2 asks for a line NAMING what it could not carry, so that is what
      // this asserts: a lone unrelated problem used to satisfy it.
      expect(result.problems).toEqual([expect.stringContaining(CSS_NAME)]);
      // It gave up on its own clock rather than the host's.
      expect(took, `the run took ${took} ms`).toBeLessThan(4_000);
    } finally { live.close(); }
  });
});
