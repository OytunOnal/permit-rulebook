import { afterEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { bodyWithin, carryAssets, readAssetNames, writeAssetDigests } from "../scripts/carry-assets.mjs";

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
 * A page of distinct `/_astro/` references, about `bytes` long. Distinct,
 * because the cost a case measures with this is per NAME kept, not per byte
 * scanned.
 */
const pageOfSize = (bytes: number): string => {
  const refs: string[] = [];
  for (let i = 0, n = 0; n < bytes; i += 1) {
    refs.push(`/_astro/index.${String(i).padStart(8, "0")}.css`);
    n += refs.at(-1)!.length + 30;
  }
  return pageOf(refs).toString("utf8");
};

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
 * all. Why it must stay that way is the script header's "Where the address
 * comes from"; the consequence for this file is that no case may spell an
 * origin on the command line, and the one that tries is a case of its own.
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
/**
 * The refusal a case is actually about, in the step's own words.
 *
 * Every refusal in this file looks the same from outside: nothing in `_astro/`
 * and the name on a line. So does the step's clock running out — measured, on
 * an origin that sent headers and then went quiet: `could not carry
 * index.AAAAAAAA.css: its body The operation was aborted due to timeout`,
 * exit 0, `_astro/` empty. A case asserting only "nothing carried, and the
 * name is printed" is therefore green either way, and on a starved runner the
 * second route is real. Each refusal below names the thing its verdict turns
 * on instead — the digest the build recorded, the ceiling, the word for the
 * shape it refused — so a case that passes because the origin was slow goes
 * red here rather than quietly (round 7).
 *
 * `mark` is the assertion and `decision` is only ever a message, which is the
 * right shape for both and not an argument left unbound. The mark is the
 * evidence — a string this step prints on one route and no other — and it is
 * the only half a test can check. The decision is what that string MEANS, and
 * it has no spelling in the output to be compared against: it exists so that
 * the one person who will ever read it, looking at a red run, is told what the
 * case was about rather than being handed a substring and left to work it out.
 * Binding it to something would mean inventing a second place for the step's
 * own wording to live, which is the defect this helper was written to catch.
 */
const refusedOver = (out: string, mark: string, decision: string): void => {
  expect(out, `nothing was carried, but the step never got as far as ${decision}`).toContain(mark);
};
const lastLine = (out: string): string => out.trim().split("\n").at(-1) ?? "";
/** The run's counted line, wherever the annotations after it leave it. */
const summary = (out: string): string => out.split("\n").find((line) => line.includes("left behind")) ?? "";
/**
 * Every annotation the run summary carries, as one block, or "" when the step
 * ended quiet. `::warning::` at the start of a line is the workflow command
 * Actions reads, so they are read here the same way Actions reads them: line by
 * line, anchored. Every, and not the first, because one page can be wrong in
 * more than one way at once and each way sends the reader somewhere else
 * (round 6).
 */
const annotations = (out: string): string => out.split("\n").filter((line) => line.startsWith("::warning::")).join("\n");

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
      // Refused unread, on the encoding it declared — 104,000 bytes of 'a'
      // compress to 342 on the wire, so this case holds the attack's size
      // without ever draining it. See `refusedOver`.
      refusedOver(run.out, "gzip-encoded", "reading the encoding it declared");
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
    // repository variable into the command line, where the flag reader took
    // any `--name value` — the script header's "Where the address comes from".
    // The variable is a value now, read from the environment, and a command
    // line that spells an origin is inert: this case hands it one, pointing at
    // a host that would answer, and measures that not a packet reached it.
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
    // green, if either reached argv: `--dry-run`, and `--dist=<somewhere
    // else>`. What that costs every later deploy is the script header's "Where
    // the address comes from".
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
      // On the list's own 404, and not on the clock: a list request that times
      // out leaves `live.asked` and the printed name exactly as this does —
      // measured against a starved origin, round 7, where all three of this
      // case's assertions held on `asset-digests.txt: its body The operation
      // was aborted due to timeout`. See `refusedOver`.
      refusedOver(run.out, "published no digest list", "learning that the live deploy published no list");
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
      // On the cut line, and not on the clock — the same starved origin turns
      // this case green for the wrong reason too. See `refusedOver`.
      refusedOver(run.out, "is not a sha256 and a name", "reading the list far enough to fail on a line");
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
      // On the two generations disagreeing, and not on the clock: a starved
      // list request leaves this case's other three assertions exactly as they
      // are here. See `refusedOver`.
      refusedOver(run.out, "different deploys", "comparing the list against the page's whole reference set");
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
      // On the line the list's own reader refused, and not on the clock — the
      // same shape as the two list cases above, and the same starved origin
      // turns it green without the list ever being read. See `refusedOver`.
      refusedOver(run.out, "is not a sha256 and a name", "reading the list and refusing the name it holds");
    } finally { live.close(); }
  });

  it("carries a hand-framed answer that is whole, so the refusals below are about the bytes", async () => {
    // The control for the four cases after it: the same raw socket, the same
    // hand-written headers, a body that IS the file — carried. Whatever those
    // four refuse, it is not the framing.
    //
    // The decision here is that an honest origin serving a whole body is
    // carried and its digest matches — the one case that keeps the eight
    // refusals around it from being a blanket refusal. The body's SIZE is no
    // part of that decision, so this is the same small stylesheet every other
    // honest case uses. The attack's own 104,000 bytes are still proved, by
    // the two refusals below that carry them.
    //
    // It was 104,000 bytes here until this round, and that is why it moved.
    // Measured on loopback: 104,000 is the only body in this file that arrives
    // in two stream chunks — 65,536, then 38,464 — so it was the only case
    // whose client ever waited idle for an origin to produce more, and that
    // origin is a server on the test worker's own event loop. Healthy it cost
    // 187 ms. On the two-vCPU runner `pages.yml` builds on, it reached the
    // step's 10 s clock: the step refused, correctly, and this case went red —
    // s33's own test intermittently failing s33's own deploy. Three failures
    // in five full runs, measured here, 2026-09-23.
    //
    // What shrinking gave up was named wrongly when it was done: it was said
    // to be "a multi-chunk reassembly that nothing ever asserted", and the
    // deleted line asserted exactly that — 104,000 bytes off the wire, read
    // back off disk, compared byte for byte. Verified after the shrink: no
    // body left in this file was both multi-chunk and successfully
    // reassembled, so `Buffer.concat(chunks, total)` went unproven, and a
    // wrong `total` there is a truncated or padded file on disk under a name
    // the deploy swears by. The proof is back, four cases down, where it is
    // made of three chunks handed straight to `bodyWithin` and has no origin,
    // no socket and no clock in it (round 7). What shrinking cost, correctly
    // stated, is that this case no longer carries the attack's byte count;
    // what it bought is a deploy this case cannot fail.
    const answers = deploy({ [CSS_NAME]: CSS });
    answers[`/_astro/${CSS_NAME}`] = {
      raw: { headers: ["content-type: text/css", `content-length: ${CSS.length}`], body: CSS },
    };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      // With the step's own reason, because the only interesting way for a
      // hand-framed answer to fail is one the step will have printed.
      expect(carried(out), run.out).toEqual([CSS_NAME]);
      expect(readFileSync(join(out, "_astro", CSS_NAME)).equals(CSS), run.out).toBe(true);
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
      // The 104,000 bytes this case is named for live in the digest, not on the
      // wire: 5,000 of them are sent, and the step's verdict is that they are
      // not what the build recorded. See `refusedOver`.
      refusedOver(run.out, `sha256:${sha256(asset)}`, "checking the digest the build recorded");
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
      // The origin writes all 104,000; the client stops at the 5,000 it was
      // promised and never waits on the rest, which is why this case can hold
      // the attack's size and the control above cannot. See `refusedOver`.
      refusedOver(run.out, `sha256:${sha256(asset)}`, "checking the digest the build recorded");
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
      // For being empty, which is the whole of this case, and not for the
      // clock — the digest agrees here, so emptiness is the only verdict left
      // that is about the body. See `refusedOver`.
      refusedOver(run.out, "empty body", "finding the body empty");
    } finally { live.close(); }
  });

  it("puts a body that arrives in several chunks back together byte for byte", async () => {
    // The proof the control above gave up when it shrank, rebuilt where a clock
    // cannot reach it. `Buffer.concat(chunks, total)` is handed a length this
    // step counted itself, and a wrong one is not an error: too small truncates
    // the file, too large pads it with zeroes — either way a file of the wrong
    // bytes on disk under a name the deploy swears by, which is this step's own
    // threat. Verified independently after the shrink: no body left in this
    // file is both multi-chunk and successfully reassembled.
    //
    // So the chunks are handed over directly: no server on this worker's event
    // loop, no socket, no clock, nothing a loaded runner can slow down. Three
    // of them, of three different lengths and three different fills, so a
    // reassembly that dropped one, reordered them or mis-counted the total
    // fails on the bytes rather than on the length alone.
    const chunks = [Buffer.alloc(65_536, 0x61), Buffer.alloc(38_463, 0x62), Buffer.from("ü\r\n", "utf8")];
    const whole = Buffer.concat(chunks);
    const body = await bodyWithin(
      {
        headers: { get: (name: string) => (name.toLowerCase() === "content-length" ? String(whole.length) : null) },
        body: (async function* stream() { for (const chunk of chunks) yield chunk; })(),
      },
      4 * 1024 * 1024,
    );
    expect(body.ok, JSON.stringify(body)).toBe(true);
    expect(body.bytes!.length).toBe(whole.length);
    expect(body.bytes!.equals(whole), "the reassembled body is not the bytes that arrived").toBe(true);
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
      // By the digest — the point of the case is that nothing else could have
      // caught it, so the digest is the verdict to assert. See `refusedOver`.
      refusedOver(run.out, `sha256:${sha256(CSS)}`, "checking the digest the build recorded");
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
    const answers = deploy({ [mine]: CSS });
    const live = await origin(answers);
    try {
      // The page is written once the port is known, because the scheme case has
      // to name this very host and port: then only the `https:` makes it
      // foreign — the mirror of an `http://` reference on the live site, which
      // is https.
      const foreign = [
        "https://evil.example/_astro/absolute.DDDDDDDD.js",
        "//evil.example/_astro/protocol-relative.EEEEEEEE.js",
        `https://127.0.0.1:${new URL(live.url).port}/_astro/scheme.FFFFFFFF.js`,
      ];
      answers["/"] = { type: "text/html; charset=utf-8", body: pageOf([...foreign, `/_astro/${mine}`]) };
      const out = dist();
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      // Ours, and only ours. Nothing was asked of this host on behalf of the
      // three foreign references either.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${mine}`]);
      expect(carried(out)).toEqual([mine]);
      // Each of the three is reported, and each is reported as much of itself
      // as a log line can afford: a page chooses how long its references are,
      // so a refusal prints a bounded head of one rather than the whole of it
      // (Security review, round 5).
      for (const ref of foreign)
        expect(run.out, `${ref} was not reported`).toContain(ref.slice(0, 30));
    } finally { live.close(); }
  });

  it("counts a reference as ours only when it resolves to this page's own `_astro/`", async () => {
    // The step read the basename out of the reference and threw the resolved
    // path away, so `/_astro/../real.css` — which resolves to `/real.css`, a
    // URL this deploy does not publish — scored as "already in this build"
    // against `dist/_astro/real.css`. Measured, round 6: `0 carried, 1 already
    // in this build, 0 left behind`, no annotation, and the reader holding that
    // page 404s. A name is one of this deploy's assets only when the whole
    // resolved path is the one this step would build for that name.
    const real = "index.IIIIIIII.css";
    const answers = deploy({ [real]: CSS });
    answers["/"] = { type: "text/html; charset=utf-8", body: pageOf([`/_astro/../${real}`]) };
    const live = await origin(answers);
    const out = dist({ [real]: CSS });
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      // Never fetched, and never counted as built: the page, and nothing else.
      expect(live.asked, run.out).toEqual(["/"]);
      expect(summary(run.out), run.out).toContain("0 already in this build");
      expect(summary(run.out), run.out).toContain("1 left behind");
      expect(annotations(run.out), "the reader 404s on a URL and the run said nothing").toContain(real);
    } finally { live.close(); }
  });

  it("counts a root-absolute reference as ours only under the base this deploy serves", async () => {
    // Without a custom domain the site is served from a subpath, so a page
    // carrying a root-absolute `/_astro/old.css` names a URL the host 404s.
    // The step took the basename and rebuilt it under the base: measured,
    // round 6, it fetched `/base/_astro/old.css`, carried it, and reported
    // `1 carried, 0 left behind` for a URL the deploy will never serve.
    const base = "/permit-rulebook";
    const stale = "index.JJJJJJJJ.css";
    // The live deploy has both, under its base, and its digest list names both:
    // nothing else refuses this one, so what the step does with it is decided
    // by where the reference resolves and by nothing else. The host 404s the
    // root-absolute path, the way Pages does.
    const answers = deploy({ [CSS_NAME]: CSS, [stale]: Buffer.from("/* the stale one */\n", "utf8") }, base);
    answers[`${base}/`] = {
      type: "text/html; charset=utf-8",
      body: pageOf([`${base}/_astro/${CSS_NAME}`, `/_astro/${stale}`]),
    };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(`${live.url}${base}/`, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(live.asked, run.out).not.toContain(`${base}/_astro/${stale}`);
      expect(carried(out), run.out).toEqual([CSS_NAME]);
      expect(annotations(run.out), run.out).toContain(stale);
    } finally { live.close(); }
  });

  it("annotates every reference that resolves under our own origin to a URL this deploy does not publish", async () => {
    // Which refusals predict a reader's 404 used to be decided by which branch
    // of the reader they fell out of rather than by where they resolve, and the
    // comment beside the split claimed the others did not predict one. Measured
    // on the real process, round 7, each of these beside one healthy asset in a
    // healthy `dist/`: a refusal line and no annotation at all — while the
    // reference resolves under our own origin to a path this deploy does not
    // publish, which is a 404 for the reader holding that page and is the
    // failure this step exists not to be silent about.
    //
    // The rule the code holds now is where the reference RESOLVES: under our
    // origin and not to one of this deploy's assets is the reader's 404,
    // whatever made it one. Another host's is that host's business, and a
    // reference that resolves nowhere is a request no browser makes either.
    const mine = "index.KKKKKKKK.css";
    for (const [label, ref, mark] of [
      ["a percent-encoded separator", "/_astro/sub%2Fold.css", "/_astro/sub%2Fold.css"],
      ["a trailing dot segment", "/_astro/old.css/.", "/_astro/old.css/."],
      ["the directory itself", "/_astro/", "/_astro/"],
      ["a name over the 128-character ceiling", `/_astro/${"a".repeat(136)}.css`, "a".repeat(40)],
    ] as [string, string, string][]) {
      const answers = deploy({ [mine]: CSS });
      answers["/"] = { type: "text/html; charset=utf-8", body: pageOf([`/_astro/${mine}`, ref]) };
      const live = await origin(answers);
      // This build already has the healthy one, so nothing else can raise an
      // annotation: no name is missing and the page does reference one of ours.
      const out = dist({ [mine]: CSS });
      try {
        const run = await carry(live.url, ["--dist", out]);
        expect(run.status, `${label}: ${run.out}`).toBe(0);
        // Not fetched, either: a URL this deploy does not publish is named, not
        // asked for.
        expect(live.asked, `${label}: ${run.out}`).toEqual(["/"]);
        expect(annotations(run.out), `${label} left the reader's 404 unannounced: ${run.out}`).toContain(mark);
        expect(annotations(run.out), `${label}: ${run.out}`).toContain("gets a 404");
      } finally { live.close(); }
    }
  });

  it("keeps a credential in the address out of the deploy log, whatever the password is made of", async () => {
    // `CARRY_ORIGIN` is a repository variable, and the parse that clears the
    // fragment and the query left `user:password@` in. Measured, round 6:
    // `http://user:s3cr3t@host/` echoed the secret four times, once onto the
    // run summary — a secret reaching a deploy log, which is the whole of the
    // effect, since undici refuses to fetch such a URL at all.
    //
    // The redaction that closed it then held only for passwords made of
    // characters it happened to allow: it stopped at the first `/`, `?` or `#`,
    // which is exactly what a password may carry, and a value carrying one also
    // fails `new URL` — so it took the unparsed path and printed itself whole.
    // Measured on the real process, round 7, thirteen password shapes: three
    // leaked (`?`, `#`, `/`), three echoes each, one of them the run summary.
    // So the shapes are the case, and a guard that depends on what the secret
    // is made of is not a guard.
    const secret = "s3cr3tPW";
    const live = await origin(deploy({ [CSS_NAME]: CSS }));
    const out = dist();
    try {
      // The four the finding named, each one a character the old rule ended at
      // or an `@` inside the password, which is where "the last `@`" is the
      // only reading that does not cut the secret in half.
      for (const [label, password] of [
        ["a question mark", `${secret}?x`],
        ["a hash", `${secret}#x`],
        ["a space", `${secret} x`],
        ["an at sign", `${secret}@x`],
      ] as [string, string][]) {
        const run = await carry(`http://reader:${password}@${new URL(live.url).host}/`, ["--dist", dist()]);
        expect(run.status, `${label}: ${run.out}`).toBe(0);
        expect(run.out, `${label}: the repository variable's secret reached the deploy log`).not.toContain(secret);
      }
      // Dropped, not the address with them: what is left is still the page this
      // step was pointed at, and it is read.
      const plain = await carry(`http://reader:${secret}@${new URL(live.url).host}/`, ["--dist", out]);
      expect(plain.status, plain.out).toBe(0);
      expect(plain.out, "the repository variable's secret reached the deploy log").not.toContain(secret);
      expect(carried(out), plain.out).toEqual([CSS_NAME]);
      // And on the paths that print the value as it arrived, before any parse
      // has had a chance to clean it.
      const refused = await carry(`ftp://reader:${secret}@permitrulebook.com/`, ["--dist", dist()]);
      expect(refused.status, refused.out).toBe(0);
      expect(refused.out, "a value refused unparsed took the secret into the log with it").not.toContain(secret);
    } finally { live.close(); }
  });

  it("reads the address it checked, whitespace and all", async () => {
    // The boundary tested `origin.trim()` twice and then built the page URL out
    // of `origin`, so the value that was checked and the value that was used
    // were two different strings. Measured, round 5: `CARRY_ORIGIN` with a
    // space at each end fetched `…/%20%20/` and answered 404 — a failure with
    // no explanation in it, on a step whose whole job is to say what it could
    // not do. One parse now, and what that parse returns is what is fetched.
    const live = await origin(deploy({ [CSS_NAME]: CSS }));
    const out = dist();
    try {
      const run = await carry(`  ${live.url}/  `, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(live.asked, run.out).toEqual(["/", `/${DIGESTS}`, `/_astro/${CSS_NAME}`]);
      expect(carried(out)).toEqual([CSS_NAME]);
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
      // On the redirect, and not on the clock. Measured against a starved
      // origin, round 7: all three assertions above held while the step
      // printed `index.…css: its body The operation was aborted due to
      // timeout` and never saw a `location:` header at all. The mark is the
      // concept rather than the sentence, because the words belong to undici
      // — today `fetch failed (unexpected redirect)` — and a dependency's
      // wording is not this step's decision. See `refusedOver`.
      refusedOver(run.out, "redirect", "refusing the redirect instead of following it");
    } finally { live.close(); elsewhere.close(); }
  });

  it("keeps only the names under our own origin, and hands back every reference it refused", () => {
    // The parsing rule itself, where the three foreign shapes can be read one
    // beside the other. What the process does with them is the case above.
    const refs = [
      "https://evil.example/_astro/absolute.js",
      // A protocol-relative reference inherits the page's scheme, so only the
      // host makes this one foreign — and the host is enough.
      "//evil.example/_astro/relative.js",
      // Same host, plaintext: the scheme is part of the origin, and an https
      // site whose page names an http asset is a page to distrust.
      "http://example.test/_astro/plaintext.js",
      "/_astro/index.HHHHHHHH.css",
    ];
    const { names, refused, unserved } = readAssetNames(pageOf(refs).toString("utf8"), "https://example.test/");
    expect(names).toEqual(["index.HHHHHHHH.css"]);
    // Refused by name: every reference that did not become a name is handed
    // back, so the caller can print it and nothing is dropped in silence. All
    // three name a host that is not ours, which is the bucket that predicts no
    // request to our origin and therefore no annotation — where they resolve
    // is what decides that, so a case about the three foreign shapes is also
    // the case that says `unserved` stays empty for them (round 7).
    //
    // These three are short enough to come back whole, and that is deliberate:
    // the bound on a printed reference is `short`'s and is spelled there, once.
    // It used to be re-typed here as a 40-and-ellipsis rule beside a reference
    // two characters over it, which is the same rule in two places (Standards
    // review, round 7). Where it is MEASURED is on the real process, three
    // describes down, against a 430-character reference that takes the same
    // refusal branch as these.
    expect(refused.map(({ ref }) => ref)).toEqual(refs.slice(0, 3));
    expect(unserved).toEqual([]);
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
      // This case has no `refusedOver` mark of its own, and that is a decision
      // rather than an omission. A socket that dies mid-body and a clock that
      // runs out reach the same line of this step by the same route, and the
      // only string that tells them apart is the underlying cause — undici's
      // `fetch failed (other side closed)` against Node's `The operation was
      // aborted due to timeout`. Pinning the first makes a dependency's
      // wording a red deploy; so what is asserted is the second's ABSENCE,
      // which can only ever weaken if that wording moves, never go red for it.
      // The origin here destroys the socket in the same tick as the headers,
      // so a starved runner has almost nothing to starve (round 7).
      expect(run.out, "the socket died on the step's own clock, not on the origin's silence")
        .not.toContain("aborted due to timeout");
    } finally { live.close(); }
  });

  it("prints nothing that can become a line of its own in the deploy log", async () => {
    // In Actions a line beginning `::` is a workflow command, and this step
    // prints values it did not write. Measured, round 5: an origin of
    // `http://host/\r\n::error::…` printed a second line, and Actions would
    // have read it as a command of ours. Only someone who can already set a
    // repository variable can reach this — the page's own strings cannot,
    // because a reference with whitespace in it never becomes a name — so it
    // is the printing that is fixed rather than the trust: whatever this step
    // is handed, it says on one line.
    const out = dist();
    const run = await carry("http://host.invalid/\r\n::error::title=pwn::injected", ["--dist", out]);
    expect(run.status, run.out).toBe(0);
    const commands = run.out.split("\n").filter((line) => line.startsWith("::"));
    // The step's own annotation is a workflow command and is allowed to be
    // one; a line the value wrote is not.
    expect(commands.every((line) => line.startsWith("::warning::")), run.out).toBe(true);
    expect(run.out, "the injected text was dropped instead of being shown on one line").toContain("injected");
  });

  it("keeps a reference a page names out of the log's length as well as out of the network", async () => {
    // Three refusal branches printed the reference whole and one truncated it,
    // so a page could put as many 400-character lines in a deploy's log as it
    // could name references. A log nobody can read is the same as no log
    // (Security review, round 5: a 430-character reference printed a
    // 502-character line).
    const long = `https://evil.example/_astro/${"a".repeat(400)}.js`;
    const live = await origin({ "/": { type: "text/html; charset=utf-8", body: pageOf([long]) } });
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(live.asked, "a refused reference cost a request").toEqual(["/"]);
      const longest = Math.max(...run.out.trim().split("\n").map((line) => line.length));
      expect(longest, run.out).toBeLessThan(200);
      // Still reported, and still recognisable as the reference it refused.
      expect(run.out).toContain("evil.example");
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

  it("reads a page at its ceiling in time that grows with the page, not with its square", () => {
    // Reading the names out of a page was quadratic in how many distinct ones
    // it held, and uninterruptible: the budget sizes request timeouts, and this
    // loop runs after the body is in hand. Why that is worth a case, and what
    // bounds it now, is the script header's "What a page may cost this build";
    // this asserts the SHAPE, which is the part only a running clock shows.
    //
    // A clock is the instrument because there is no other one here: the cost is
    // CPU inside a pure function, and nothing it returns differs when it is
    // slow. So the margin carries the honesty instead. Four times the page is
    // about four times the work when the cost is linear and sixteen times when
    // it is quadratic, and the bound sits between them, at eight. Each page is
    // read three times and the fastest read is the measurement — a loaded
    // runner can only add time to a run, never take it away — and the
    // hundred-millisecond floor keeps timer noise from deciding a case about a
    // shape. Reproduced on these two exact pages, 2026-09-23: 96 ms and
    // 1,684 ms with the quadratic in, 4 ms and 17 ms without it; put back to
    // check that this bound can fail, the quadratic failed it at 1,684 ms
    // against 768 ms.
    const quarter = pageOfSize(128 * 1024);
    const whole = pageOfSize(512 * 1024);
    const fastestOf = (html: string): { ms: number; names: number } => {
      let ms = Number.POSITIVE_INFINITY;
      let names = 0;
      for (let run = 0; run < 3; run += 1) {
        const began = Date.now();
        names = readAssetNames(html, "https://example.test/").names.length;
        ms = Math.min(ms, Date.now() - began);
      }
      return { ms, names };
    };
    const small = fastestOf(quarter).ms;
    const large = fastestOf(whole);
    // The cost is per distinct name kept, so this is only measuring a shape if
    // the page holds thousands of them.
    expect(large.names, `a ${whole.length}-byte page held ${large.names} names`).toBeGreaterThan(9_000);
    expect(large.ms, `${whole.length} bytes took ${large.ms} ms; ${quarter.length} bytes took ${small} ms`)
      .toBeLessThan(Math.max(small * 8, 100));
  });

  it("refuses a page over the ceiling, so the reading above is the worst case there is", async () => {
    // The ceiling on the page is the ceiling on that parse, and it used to be
    // 4 MB — a number chosen for an asset and applied to a page. A page is an
    // index.html: today's is 11,569 bytes.
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
      // This is the largest drain in the file — measured, 4 MB of the 5 reach
      // the child before the ceiling trips — and it is safe for the reason the
      // control above was not: the client never waits, it aborts the moment
      // the count passes. Asserting the ceiling is what says so. See
      // `refusedOver`.
      refusedOver(run.out, String(4 * 1024 * 1024), "counting the body past the asset ceiling");
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

/**
 * Which of the three things happened, and whether the deploy log says so.
 *
 * Nothing in this repository reads this step's output, so the run summary is
 * the only place a reader's broken page is ever going to be predicted: the
 * quiet outcome has to be rare and true, and both loud ones have to be loud.
 * When the step ends quiet and when it raises the annotation is one rule,
 * written where the verdict is computed in `scripts/carry-assets.mjs`; these
 * cases measure the real process against it.
 *
 * All three verdicts were computed from the wrong set before round 5, and each
 * error is a case below.
 */
describe("the step says which of the three things happened", () => {
  it("is quiet only when this build already has everything the live page names", async () => {
    const live = await origin(deploy({ [CSS_NAME]: CSS }));
    const out = dist({ [CSS_NAME]: CSS });
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      // It read the page and found nothing to do: one request, no annotation.
      expect(live.asked).toEqual(["/"]);
      expect(annotations(run.out), run.out).toBe("");
    } finally { live.close(); }
  });

  it("raises the annotation on every path that gives up before it can look", async () => {
    // The alarm used to be `needed.length && carried.length === 0`, and
    // `needed` is filled only after the page has been fetched and parsed —
    // so every return before that was as quiet as a healthy deploy. Measured
    // on the real process, round 5: all seven, exit 0, no annotation. When the
    // step could not look, it does not know whether the window is open, and
    // that is exactly when it has to say so.
    const stopped = await origin({ "/": { status: 503, type: "text/html", body: Buffer.from("down") } });
    const flood = await origin({ "/": { type: "text/html; charset=utf-8", body: Buffer.from(pageOfSize(1024 * 1024), "utf8") } });
    try {
      const cases: [string, string][] = [
        ["no origin at all", ""],
        ["a value that is not an address", "ftp://permitrulebook.com/"],
        ["an address that does not parse", "http://["],
        ["a host that answers nothing", "http://127.0.0.1:1"],
        ["a page that answers 503", stopped.url],
        ["a page over the 512 KB ceiling", flood.url],
      ];
      for (const [label, value] of cases) {
        const out = dist();
        const run = await carry(value, ["--dist", out]);
        expect(run.status, `${label}: ${run.out}`).toBe(0);
        expect(annotations(run.out), `${label} ended as quiet as a healthy deploy: ${run.out}`).not.toBe("");
        // And it says which of the three it is: it could not look, so it does
        // not claim to know what a reader will find.
        expect(annotations(run.out), `${label}: ${run.out}`).toContain("could not read the live page");
      }
      // The seventh return is the export's own: the CLI always passes a build
      // directory, so `looked` is where that path is measured.
      const live = await origin(deploy({ [CSS_NAME]: CSS }));
      try {
        expect((await carryAssets({ origin: live.url })).looked).toBe(false);
      } finally { live.close(); }
    } finally { stopped.close(); flood.close(); }
  });

  it("raises the annotation for a name it left behind, even when it carried another", async () => {
    // `carried.length === 0` was the wrong predicate the day partial carrying
    // became the normal outcome. Measured, round 5: the page named two, the
    // list named one, one was carried and one left behind — and the step said
    // nothing, while a reader holding that page still 404s on the one left.
    const stale = "index.STALE001.css";
    const shared = "index.SHARED02.js";
    const answers = deploy({ [stale]: CSS, [shared]: JS });
    answers[`/${DIGESTS}`] = { type: "text/plain; charset=utf-8", body: listOf({ [shared]: JS }) };
    const live = await origin(answers);
    const out = dist();
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(carried(out)).toEqual([shared]);
      expect(annotations(run.out), run.out).toContain(stale);
      // The one it did carry is not what the reader is missing, so it is not
      // in the line that names what the reader is missing.
      expect(annotations(run.out), run.out).not.toContain(shared);
    } finally { live.close(); }
  });

  it("does not call a healthy deploy a disagreement over one reference it could never carry", async () => {
    // "The page and the list are from different deploys" was decided on
    // `needed` — what the page names MINUS what this build already has. On the
    // ordinary deploy that changed neither asset, both real names are already
    // built, so one stray reference was the whole of `needed` and one equalled
    // one: measured, round 5, a page naming both real assets and
    // `/_astro/../../pwn.css` refused the entire run on a build that had
    // nothing at risk. The verdict is about the page's WHOLE reference set
    // against the list — those are the two things that either describe the
    // same deploy or do not.
    const answers = deploy({ [CSS_NAME]: CSS, [JS_NAME]: JS });
    answers["/"] = {
      type: "text/html; charset=utf-8",
      body: pageOf([`/_astro/${CSS_NAME}`, `/_astro/${JS_NAME}`, "/_astro/../../pwn.css"]),
    };
    const live = await origin(answers);
    const out = dist({ [CSS_NAME]: CSS, [JS_NAME]: JS });
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(run.out, "a healthy deploy was called a disagreement between two generations")
        .not.toContain("different deploys");
      expect(carried(out)).toEqual([CSS_NAME, JS_NAME].sort());
      // It still says what it could not carry, and still says it plainly: the
      // reader's page asks for a name nothing here can account for.
      expect(annotations(run.out), run.out).toContain("pwn.css");
    } finally { live.close(); }
  });

  it("does not end quiet on a 200 page that names none of this deploy's assets", async () => {
    // The step returned before the digest list when nothing was needed, so a
    // proxy notice, a maintenance page or an error page answered 200 was
    // granted the silence of a healthy deploy on evidence it never validated
    // (Security review, round 6). Our own `/` always names assets; a live page
    // that names none is not this site's deploy answering.
    const live = await origin({
      "/": { type: "text/html; charset=utf-8", body: Buffer.from("<!DOCTYPE html><html><body>back soon</body></html>", "utf8") },
    });
    const out = dist({ [CSS_NAME]: CSS });
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(live.asked, run.out).toEqual(["/"]);
      expect(annotations(run.out), `a page with nothing in it ended as quiet as a healthy deploy: ${run.out}`).not.toBe("");
      // And it says which outcome this is: the page was read, so the step does
      // not claim it could not look.
      expect(annotations(run.out), run.out).not.toContain("could not read the live page");
    } finally { live.close(); }
  });

  it("raises the annotation when this build could not publish its own digest list", async () => {
    // A failed publish printed a plain line. On a deploy whose page names are
    // all already built the run is then indistinguishable from a healthy one —
    // while the NEXT deploy is guaranteed to carry nothing, which is the window
    // this slice exists to close (Spec review, round 6).
    const live = await origin(deploy({ [CSS_NAME]: CSS }));
    // The shape the finding names, and the reason it was invisible: this build
    // already has every name the live page references, so there is nothing to
    // carry, nothing missing and nothing else for the step to say. The list's
    // own path is a DIRECTORY — portable, where a permission bit is not — so
    // the publish is the one thing that fails.
    const out = dist({ [CSS_NAME]: CSS });
    mkdirSync(join(out, DIGESTS));
    try {
      const run = await carry(live.url, ["--dist", out]);
      expect(run.status, run.out).toBe(0);
      expect(live.asked, "the run had nothing to carry, which is what hid this").toEqual(["/"]);
      expect(annotations(run.out), run.out).toContain(DIGESTS);
    } finally { live.close(); }
  });

  it("tells the three outcomes apart in the deploy log", async () => {
    // Refusing everything, having no work to do, and never reaching the page
    // used to print the same last line, and the first evidence of a silent
    // step is a reader's unstyled page (Security review, rounds 3 and 5).
    // Still exit 0 on all three: it never fails the deploy.
    const refusing = deploy({ [CSS_NAME]: CSS });
    refusing[`/_astro/${CSS_NAME}`] = { status: 500, type: "text/html", body: Buffer.from("no") };
    const bad = await origin(refusing);
    const idle = await origin(deploy({ [CSS_NAME]: CSS }));
    const missing = dist();
    const nothingToCarry = dist({ [CSS_NAME]: CSS });
    const blind = dist();
    try {
      const alarm = await carry(bad.url, ["--dist", missing]);
      const quiet = await carry(idle.url, ["--dist", nothingToCarry]);
      const unseen = await carry("http://127.0.0.1:1", ["--dist", blind]);
      for (const run of [alarm, quiet, unseen]) expect(run.status, run.out).toBe(0);
      expect(carried(missing)).toEqual([]);
      const said = [alarm, quiet, unseen].map((run) => lastLine(run.out));
      expect(new Set(said).size, said.join("\n")).toBe(3);
      // And the loud one names what the reader is going to ask for and not get.
      expect(annotations(alarm.out), alarm.out).toContain(CSS_NAME);
      expect(annotations(quiet.out), quiet.out).toBe("");
      expect(annotations(unseen.out), unseen.out).not.toBe("");
    } finally { bad.close(); idle.close(); }
  });
});
